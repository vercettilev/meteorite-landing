import { useSyncExternalStore } from "react";

/*
  What this device remembers of the list, so the page can say it again without asking for an
  address: the code of the visitor's own link, the place it last held and how many had come by it,
  kept in the browser until its site data is cleared. And, only until the tab is closed, the code of the link the
  visitor came by, so that joining after a look round the site still counts for whoever brought them.
  Neither is sent anywhere but to this site, and the privacy notice on /legal says so.

  The place moves, so it is asked for again: each time the page opens, each time the visitor comes
  back to it (a friend may have joined in another window, or on their own phone, a moment ago),
  and now and then while it stays open. If the list no longer knows the code (the address was
  taken off), the device forgets it and the field comes back.
*/
export type Mine = {
  code: string;
  place: number;
  brought: number;
  /* What puts the card before the visitor (components/ListPlate.tsx): they have just joined, someone has joined by their link since they last looked, or they asked to see it. None of these is kept. */
  fresh?: boolean;
  moved?: boolean;
  shown?: boolean;
};

const KEY = "meteorite:list";
const FROM = "meteorite:from";
const LINK = /^\/list\/([23456789bcdfghjkmnpqrstvwxyz]{6})\/?$/;

let mine: Mine | null = null;
let opened = false;
let asked = false;
/* When the place was last asked for. While the page stays open it is asked for this often, and a return to the page asks at once unless it was asked this lately. */
let last = 0;
const EVERY = 60_000;
const LATELY = 5_000;
const listeners = new Set<() => void>();

function keep(next: Mine | null) {
  mine = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify({ code: next.code, place: next.place, brought: next.brought }));
    else localStorage.removeItem(KEY);
  } catch {
    /* Storage may be refused (a private window): the page still says the place, and forgets it on leaving. */
  }
  /* The fields were held back while this was read (components/Landing.tsx). With nothing to say they are shown again. */
  if (!next) delete document.documentElement.dataset.listed;
  for (const listener of listeners) listener();
}

function open() {
  opened = true;
  try {
    const kept = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (kept && typeof kept.code === "string" && Number.isInteger(kept.place)) mine = { code: kept.code, place: kept.place, brought: Number(kept.brought) || 0 };
    const by = location.pathname.match(LINK)?.[1];
    if (by) sessionStorage.setItem(FROM, by);
  } catch {
    /* Nothing kept, or nothing can be. */
  }
}

async function ask(code: string) {
  last = Date.now();
  try {
    const res = await fetch(`/api/list/${code}`, { headers: { Accept: "application/json" } });
    if (res.status === 404) return keep(null);
    if (!res.ok) return;
    const now = (await res.json()) as Mine;
    if (mine?.code !== code) return;
    /* Someone has joined by their link since this device last looked: that is news, and the card has changed with it. */
    if (now.brought > mine.brought) keep({ ...mine, place: now.place, brought: now.brought, moved: true });
    else if (now.place !== mine.place || now.brought !== mine.brought) keep({ ...mine, place: now.place, brought: now.brought });
  } catch {
    /* Offline: what was kept still stands. */
  }
}

/* Asks again, if there is a place to ask about, the page is being looked at, and it was not asked a moment ago. */
function again() {
  if (mine && document.visibilityState !== "hidden" && Date.now() - last >= LATELY) void ask(mine.code);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!asked) {
    asked = true;
    if (mine) void ask(mine.code);
    else delete document.documentElement.dataset.listed;
    document.addEventListener("visibilitychange", again);
    window.addEventListener("focus", again);
    window.setInterval(again, EVERY);
  }
  return () => void listeners.delete(listener);
}

function current() {
  if (!opened) open();
  return mine;
}

/* The visitor's own place on the list, if this device has one. Null on the server and until the page has woken. */
export const useMine = () => useSyncExternalStore(subscribe, current, () => null);

/* The form's answer: the place just taken, or found again. */
export const joined = (standing: Pick<Mine, "code" | "place" | "brought">) => keep({ ...standing, fresh: true });

/* The visitor asks to see their card. */
export const show = () => void (mine && keep({ ...mine, shown: true }));

/* The card has been put away: nothing is left to say until something changes. */
export const seen = () => void (mine && (mine.fresh || mine.moved || mine.shown) && keep({ code: mine.code, place: mine.place, brought: mine.brought }));

/* The code of the link the visitor came by, if they came by one: the page they are on, or one they opened earlier in this tab. */
export function cameBy(): string | undefined {
  try {
    return location.pathname.match(LINK)?.[1] ?? sessionStorage.getItem(FROM) ?? undefined;
  } catch {
    return undefined;
  }
}
