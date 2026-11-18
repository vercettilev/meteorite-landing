import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { BlobPreconditionFailedError, del, get, list, put } from "@vercel/blob";

/*
  The list, and each person's place on it. Everything is kept in the project's private Blob store
  (meteorite-waitlist), which only someone holding its token can read.

  Each address is one file, named by a hash of the address, so no list of names sits in a path:
  the address, the consent, when it came, the code of its own link, and the code of the link it
  came by, if it came by one. These files are the record. Nothing else here is needed to rebuild
  the rest.

  The register is one more file: every code in the order it came, and how many have come by its
  link. A place is read off it. The order of the list is by how many people each has brought, most
  first, and among those who have brought the same number, in the order they came. The reveal is
  sent in this order (`npm run waitlist` prints it), which is what makes "the 42nd to know" true:
  change the order here and the words on the page, the card and the legal page change with it.

  A code is what a link carries (/list/k7m2q9). It says nothing of the address, and anyone who
  has it can see its place and nothing more.

  A key is what only the address's own inbox is sent, in the link that takes it off the list
  (/leave/<the name of its file>/<its key>). A link's code, which anyone may have, takes no one
  off. The key is never part of an answer to the page.

  This file reads only the store and Node itself, so scripts/waitlist.mjs can run it as it is.
*/

export type Standing = {
  /* The code of this person's own link. */
  code: string;
  /* Their place on the list, from 1. */
  place: number;
  /* How many people have come by their link. */
  brought: number;
};

type Member = { email: string; consent: true; at: string; code?: string; by?: string; key?: string };
/* A code, and how many have come by its link. In the order they came. */
type Entry = [code: string, brought: number];
type Register = { entries: Entry[]; index: Map<string, number>; etag: string | null };

const REGISTER = "list/register.json";
const MEMBERS = "waitlist/";
/* A place may be this many seconds old when it is only being shown: someone who has just brought a friend looks for it at once. Anything that writes reads afresh. */
const FRESH = 10;
/* A code this server does not know is looked for afresh, but no more often than this many seconds. */
const RECHECK = 3;
/* Without a register, the list is read through to make one, unless it has grown past this: then `npm run waitlist rebuild` does it. */
const SEED_LIMIT = 500;

/* No vowels, so a code never spells a word, and none of the letters that are mistaken for a digit. */
const ALPHABET = "23456789bcdfghjkmnpqrstvwxyz";
const CODE = /^[23456789bcdfghjkmnpqrstvwxyz]{6}$/;

export const isCode = (value: unknown): value is string => typeof value === "string" && CODE.test(value);

/* An address's file is named by a hash of the address, and that name is its id. */
const ID = /^[0-9a-f]{64}$/;
const KEY = /^[0-9a-f]{32}$/;
const idOf = (email: string) => createHash("sha256").update(email).digest("hex");
const memberPath = (id: string) => `${MEMBERS}${id}.json`;
const isKey = (value: unknown): value is string => typeof value === "string" && KEY.test(value);
const mintKey = () => randomBytes(16).toString("hex");
/* The address of the page that takes an address off the list (app/leave). */
const leavePath = (id: string, key: string) => `/leave/${id}/${key}`;

function mint(taken: Map<string, number>) {
  for (;;) {
    let code = "";
    for (let i = 0; i < 6; i++) code += ALPHABET[randomInt(ALPHABET.length)];
    if (!taken.has(code)) return code;
  }
}

/* The place of the entry at this point of the register. */
function placeOf(entries: Entry[], at: number) {
  const mine = entries[at][1];
  let ahead = 0;
  for (let i = 0; i < entries.length; i++) {
    /* Whoever has brought more is ahead, whenever they came. Among those who have brought as many, whoever came first. */
    if (entries[i][1] === mine ? i < at : entries[i][1] > mine) ahead++;
  }
  return ahead + 1;
}

const standingOf = (register: Register, code: string): Standing | null => {
  const at = register.index.get(code);
  return at === undefined ? null : { code, place: placeOf(register.entries, at), brought: register.entries[at][1] };
};

/* The whole list in the order the reveal is sent: each code with its place. */
export function order(entries: Entry[]) {
  return entries
    .map(([code, brought], at) => ({ code, brought, at }))
    .sort((a, b) => b.brought - a.brought || a.at - b.at)
    .map((entry, i) => ({ code: entry.code, brought: entry.brought, place: i + 1 }));
}

async function readJson<T>(pathname: string, etag?: string | null): Promise<{ value: T; etag: string } | "same" | null> {
  const found = await get(pathname, { access: "private", useCache: false, ...(etag ? { ifNoneMatch: etag } : {}) });
  if (!found) return null;
  if (found.statusCode === 304) return "same";
  return { value: JSON.parse(await new Response(found.stream).text()) as T, etag: found.blob.etag };
}

const asRegister = (entries: Entry[], etag: string | null): Register => ({ entries, index: new Map(entries.map(([code], i) => [code, i])), etag });

/* What this server last read of the register, and when. */
let held: { register: Register; read: number } | null = null;

async function load(fresh: boolean): Promise<Register> {
  if (held && !fresh && Date.now() - held.read < FRESH * 1000) return held.register;
  const found = await readJson<{ entries: Entry[] }>(REGISTER, held?.register.etag);
  if (found === "same" && held) {
    held.read = Date.now();
    return held.register;
  }
  /* No register yet: the first time the list is asked for, or after the file was deleted to have it made again. */
  const register = found && found !== "same" ? asRegister(found.value.entries, found.etag) : await seed();
  held = { register, read: Date.now() };
  return register;
}

/* Writes the register only if no one else has written it since it was read. False means someone has: read it again. */
async function save(entries: Entry[], etag: string | null): Promise<boolean> {
  try {
    const written = await put(REGISTER, JSON.stringify({ entries }), {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/json",
      cacheControlMaxAge: 60,
      ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
    });
    held = { register: asRegister(entries, written.etag), read: Date.now() };
    return true;
  } catch (error) {
    /* Someone else wrote first: the file has changed since it was read, or, where there was none, it has just been made. */
    const taken = etag ? error instanceof BlobPreconditionFailedError : Boolean(await readJson(REGISTER).catch(() => null));
    if (!taken) throw error;
    held = null;
    return false;
  }
}

/*
  The register as the addresses themselves give it: in the order they came, each with a code and
  a key (an address from before there were codes or keys is given them), and with it how many
  others came by its link.
*/
async function gather(limit: number): Promise<Entry[]> {
  const paths: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: MEMBERS, cursor, limit: 1000 });
    for (const blob of page.blobs) paths.push(blob.pathname);
    cursor = page.hasMore ? page.cursor : undefined;
    if (paths.length > limit) throw new Error(`The list has no register and more than ${limit} addresses: run "npm run waitlist rebuild".`);
  } while (cursor);

  const members: { path: string; member: Member }[] = [];
  for (const path of paths) {
    const found = await readJson<Member>(path);
    if (found && found !== "same") members.push({ path, member: found.value });
  }
  members.sort((a, b) => a.member.at.localeCompare(b.member.at));

  const taken = new Map<string, number>();
  members.forEach(({ member }, i) => isCode(member.code) && !taken.has(member.code) && taken.set(member.code, i));
  for (const [i, { path, member }] of members.entries()) {
    const coded = isCode(member.code) && taken.get(member.code) === i;
    if (coded && isKey(member.key)) continue;
    if (!coded) {
      member.code = mint(taken);
      taken.set(member.code, i);
    }
    /* An address from before there were keys is given one, so the next email to it can carry the link that takes it off. */
    if (!isKey(member.key)) member.key = mintKey();
    await put(path, JSON.stringify(member), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json" });
  }
  const brought = new Map<string, number>();
  for (const { member } of members) if (isCode(member.by)) brought.set(member.by, (brought.get(member.by) ?? 0) + 1);
  return members.map(({ member }): Entry => [member.code as string, brought.get(member.code as string) ?? 0]);
}

/* Where there is no register, makes one, while the list is small enough to read through. If another server makes it first, theirs is taken. */
async function seed(): Promise<Register> {
  if (await save(await gather(SEED_LIMIT), null)) return held!.register;
  const found = await readJson<{ entries: Entry[] }>(REGISTER);
  if (!found || found === "same") throw new Error("The register could not be made.");
  return asRegister(found.value.entries, found.etag);
}

/*
  Makes the register again, whatever it holds now: `npm run waitlist rebuild`. Run it after
  deleting an address's file, so that its place closes up and whoever brought it is no longer
  counted for it.
*/
export async function rebuild(): Promise<Register> {
  for (let attempt = 0; attempt < 4; attempt++) {
    /* Read before the addresses are: anyone who arrives in between then fails this writing, and it starts again. */
    const before = await readJson<{ entries: Entry[] }>(REGISTER);
    const etag = before && before !== "same" ? before.etag : null;
    if (await save(await gather(Infinity), etag)) return held!.register;
  }
  throw new Error("The register kept changing while it was being rebuilt. Try again.");
}

/*
  Puts an address on the list, or finds it there. `from` is the code of the link the person came
  by, if any. `fresh` is true only the first time an address comes, which is when it is written to
  and when it is counted for whoever brought it. An address that is already on the list is told its place
  again and changes nothing, so typing it in again is how someone finds their place on another
  device. `leave` is the address of the page that takes this address off the list. It is given
  only with a fresh address, to go in the email to it and nowhere else: whoever types in an
  address that is already on the list must not be handed the way to take it off.
*/
export async function join(email: string, from?: string): Promise<Standing & { fresh: boolean; leave?: string }> {
  const id = idOf(email);
  const path = memberPath(id);
  const found = await readJson<Member>(path);
  let member = found && found !== "same" ? found.value : null;
  let fresh = false;

  if (!member || !isCode(member.code)) {
    const register = await load(true);
    const by = !member && isCode(from) && register.index.has(from) ? from : undefined;
    const next: Member = { ...(member ?? { email, consent: true, at: new Date().toISOString(), key: mintKey() }), code: mint(register.index), ...(by ? { by } : {}) };
    try {
      /* A new address never overwrites: if the same address comes twice at once, the second finds the first. */
      await put(path, JSON.stringify(next), { access: "private", addRandomSuffix: false, allowOverwrite: Boolean(member), contentType: "application/json" });
      fresh = !member;
      member = next;
    } catch (error) {
      const again = await readJson<Member>(path);
      if (!again || again === "same" || !isCode(again.value.code)) throw error;
      member = again.value;
    }
  }

  /* The address is kept by now. Its place in the register follows. */
  return { ...(await seat(member)), fresh, ...(fresh && isKey(member.key) ? { leave: leavePath(id, member.key) } : {}) };
}

/* Whoever holds this key, if it is the key of the address this id names. */
async function holder(id: string, key: string): Promise<Member | null> {
  if (!ID.test(id) || !KEY.test(key)) return null;
  const found = await readJson<Member>(memberPath(id));
  if (!found || found === "same") return null;
  const kept = found.value.key;
  return isKey(kept) && timingSafeEqual(Buffer.from(kept), Buffer.from(key)) ? found.value : null;
}

/* Whether a link to leave still leads to an address on the list: the page asks before it offers to take it off. */
export const leaving = async (id: string, key: string) => Boolean(await holder(id, key));

/*
  Takes an address off the list, for whoever holds its key: its file is deleted, its place in the
  register closes up, and whoever brought it is no longer counted for it. False if there is no
  such address, or the key is not its own. The address is gone once its file is; if the register
  is too busy to be written, the place closes up at the next rebuild.
*/
export async function leave(id: string, key: string): Promise<boolean> {
  const member = await holder(id, key);
  if (!member) return false;
  await del(memberPath(id));
  const code = member.code;
  if (!isCode(code)) return true;
  for (let attempt = 0; attempt < 10; attempt++) {
    const register = await load(true);
    const at = register.index.get(code);
    if (at === undefined) return true;
    const host = member.by === undefined ? undefined : register.index.get(member.by);
    const entries = register.entries.map((entry, i): Entry => (i === host ? [entry[0], Math.max(0, entry[1] - 1)] : entry)).filter((_, i) => i !== at);
    if (await save(entries, register.etag)) return true;
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 90 * (attempt + 1)));
  }
  return true;
}

/*
  Places in the register are written one writing at a time on each server: whoever arrives while
  one is under way is written together in the next. So a rush of arrivals is a few writings and
  not one each, and they only ever wait on other servers, never on each other.
*/
type Waiting = { member: Member; done: (standing: Standing) => void; fail: (error: unknown) => void };
let waiting: Waiting[] = [];
let writing = false;

function seat(member: Member): Promise<Standing> {
  return new Promise((done, fail) => {
    waiting.push({ member, done, fail });
    void write();
  });
}

async function write() {
  if (writing) return;
  writing = true;
  while (waiting.length) {
    const batch = waiting;
    waiting = [];
    try {
      const register = await seatAll(batch.map((one) => one.member));
      for (const one of batch) one.done(standingOf(register, one.member.code as string) as Standing);
    } catch (error) {
      for (const one of batch) one.fail(error);
    }
  }
  writing = false;
}

/* Adds whoever is not yet in the register, counts each for whoever brought them, and writes until it holds. */
async function seatAll(members: Member[]): Promise<Register> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const register = await load(true);
    const entries = [...register.entries];
    const index = new Map(register.index);
    for (const member of members) {
      const code = member.code as string;
      if (index.has(code)) continue;
      index.set(code, entries.length);
      entries.push([code, 0]);
      const host = member.by === undefined ? undefined : index.get(member.by);
      if (host !== undefined) entries[host] = [entries[host][0], entries[host][1] + 1];
    }
    if (entries.length === register.entries.length) return register;
    if (await save(entries, register.etag)) return held!.register;
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 90 * (attempt + 1)));
  }
  throw new Error("The register was too busy to take a new place.");
}

/*
  The place a link's code holds, or null if no such link is on the list. A link made a moment ago
  may not be in what this server last read, so before saying there is no such link it reads again,
  though not more than once every few seconds, whoever asks.
*/
export async function standing(code: string): Promise<Standing | null> {
  if (!isCode(code)) return null;
  const found = standingOf(await load(false), code);
  if (found || !held || Date.now() - held.read < RECHECK * 1000) return found;
  return standingOf(await load(true), code);
}

/* For scripts/waitlist.mjs: every address with its place and the link that takes it off, in the order the reveal is sent. */
export async function roll() {
  const register = await load(true);
  const places = new Map(order(register.entries).map((entry) => [entry.code, entry]));
  const rows: (Member & { place: number | null; brought: number; leave: string })[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: MEMBERS, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const found = await readJson<Member>(blob.pathname);
      if (!found || found === "same") continue;
      const entry = found.value.code ? places.get(found.value.code) : undefined;
      const leave = isKey(found.value.key) ? leavePath(blob.pathname.slice(MEMBERS.length, -".json".length), found.value.key) : "";
      rows.push({ ...found.value, place: entry?.place ?? null, brought: entry?.brought ?? 0, leave });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return rows.sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity) || a.at.localeCompare(b.at));
}
