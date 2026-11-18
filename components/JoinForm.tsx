"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { count, ordinal } from "@/lib/format";
import { cameBy, joined, show, useMine, type Mine } from "@/lib/mine";
import { share } from "@/lib/share";

/* The site's own route (app/api/waitlist) unless another service is named. */
const ENDPOINT = process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT || "/api/waitlist";

/*
  The field for an email: on the first screen (Hero.tsx), at the end of the cut (Cut.tsx), and
  again at the foot of the page (WhyNow.tsx). id keeps each one's status line its own. Once the
  visitor is on the list, each of them says their place instead (Standing, below).

  Pressing the button is the consent to be emailed. The form does that one thing, and the line
  under the field says what will be sent, that it can be stopped, and where the rest is written,
  before anything is pressed. There was a box to tick as well, which asked for the same thing
  twice; it was taken out on 18 November 2026. If the form is ever made to do a second thing,
  the box comes back.
*/
export function JoinForm({ id = "join" }: { id?: string }) {
  const mine = useMine();
  const [status, setStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  /* Whether it was this field the visitor used: the place that takes its place is then where they are left. */
  const [used, setUsed] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    /* A refusal puts the visitor on the field that needs them. On a phone that also folds the keyboard away from the message. */
    const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus({ text: "Enter a valid email address.", error: true });
      field("email").focus();
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        /* `consent` says the visitor pressed the button under the line that says what it is for. `from` is the link they came by, if they came by one: they are counted for whoever it belongs to. */
        body: JSON.stringify({ email, consent: true, from: cameBy() }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const answer = (await res.json().catch(() => null)) as Partial<Mine> | null;
      form.reset();
      /* The answer is the visitor's place and their link's code. Another service at ENDPOINT may send neither. */
      setUsed(true);
      if (answer && typeof answer.code === "string" && typeof answer.place === "number") joined({ code: answer.code, place: answer.place, brought: Number(answer.brought) || 0 });
      else setStatus({ text: "You are on the list." });
    } catch {
      setStatus({ text: "We could not add you. Please try again.", error: true });
    } finally {
      setBusy(false);
    }
  }

  if (mine) return <Standing mine={mine} id={id} focus={used} />;

  return (
    <form onSubmit={submit} noValidate data-join className="w-full max-w-[24rem]">
      <div className="field flex items-end border-b border-bone/35">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email"
          aria-label="Email address"
          aria-describedby={`${id}-status`}
          className="h-12 min-w-0 flex-1 rounded-none border-0 bg-transparent text-[1.125rem] text-bone placeholder:italic placeholder:text-ash"
        />
        <button type="submit" disabled={busy} className="label quiet-link h-12 shrink-0 pl-4 disabled:opacity-50">
          {busy ? "Adding" : "Notify me"}
        </button>
      </div>
      <p className="join-note mt-4 text-[0.9375rem] leading-snug text-ash">
        We will email you when the first specimen is revealed. Unsubscribe at any time.{" "}
        <a href="/legal#privacy" className="quiet-link whitespace-nowrap underline decoration-ash/40 underline-offset-[0.2em]">
          Privacy
        </a>
      </p>
      <p id={`${id}-status`} role="status" className={`mt-3 min-h-5 text-[1rem] ${status?.error ? "text-[#E09A8B]" : "text-bone/85"}`}>
        {status?.text}
      </p>
    </form>
  );
}

/*
  What the field becomes for someone on the list: their place, said the way the page has always
  said it. The form used to answer "You will be the first to know." Now the line corrects itself,
  as the hero's does: "first" is struck and their own place written in. Whoever is first has
  nothing struck. Under it, how many have joined by their link, once any have, and what to do
  about it: invite friends. The list is in order of how many each has brought (lib/list.ts has the
  rule, and these words have to stay true to it), so that is how a place moves up, and whoever is
  first can only be passed. Then the ways to pass the link on: a post on X, the link itself, and
  the card, which is put before them once as they join (components/ListPlate.tsx) and again
  whenever they ask for it here.
*/
function Standing({ mine, id, focus }: { mine: Mine; id: string; focus: boolean }) {
  const [copied, setCopied] = useState(false);
  /* The field and its button are gone, and the keyboard with them: whoever was using them is put on the line that answers. */
  const said = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (focus) said.current?.focus({ preventScroll: true });
  }, [focus]);
  const place = ordinal(mine.place);
  const line = `You will be the ${place} to know.`;
  /* The same words as the email's (lib/confirmation.ts). */
  const why = mine.place === 1 ? "to stay first" : "to move up the list";
  const { link, post } = share(mine, window.location.origin);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      /* The browser will not let the page copy: the link is in the email, and X is given it with the post. */
    }
  }

  return (
    <div className={`standing w-full max-w-[24rem] ${mine.fresh ? "settle" : ""}`} data-fresh={mine.fresh ? "" : undefined}>
      <p ref={said} tabIndex={-1} id={`${id}-status`} role="status" className="font-serif text-[clamp(1.5rem,2.1vw,1.875rem)] leading-[1.2] outline-none">
        <span className="sr-only">{line}</span>
        <span aria-hidden="true">
          You will be the{" "}
          {mine.place === 1 ? (
            "first"
          ) : (
            <>
              <span className="struck">
                first
                <svg viewBox="0 0 100 30" preserveAspectRatio="none">
                  <path d="M-3 18.6C13 15.9 29 18.7 52 16.2S87 13.6 104 13.1L104 14.5C87 15.5 71 17.6 52 17.9S15 17.5-3 20Z" fill="currentColor" />
                </svg>
              </span>
              <span className="inserted">{place}</span>
            </>
          )}{" "}
          to know.
        </span>
      </p>
      <p className="mt-3 text-[0.9375rem] leading-snug text-ash">
        {mine.brought > 0
          ? `${mine.brought === 1 ? "One person has" : `${count(mine.brought)} people have`} joined by your link. Invite more ${why}.`
          : `Invite friends ${why}.`}
      </p>
      <p className="label mt-4 flex flex-wrap gap-x-6 gap-y-1 text-bone/85">
        <a href={post} target="_blank" rel="noopener" className="quiet-link -my-2 py-2">
          Post on X
        </a>
        <button type="button" onClick={copy} className="quiet-link -my-2 py-2">
          <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
        </button>
        <button type="button" onClick={show} className="quiet-link -my-2 py-2">
          Your card
        </button>
      </p>
    </div>
  );
}
