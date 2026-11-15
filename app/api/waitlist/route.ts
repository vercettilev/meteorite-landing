import { createHash } from "node:crypto";
import { head, put } from "@vercel/blob";

/*
  The waitlist. Each address is kept as one private file in the project's Blob store
  (meteorite-waitlist), named by a hash of the address, so signing up twice keeps the first
  date and no list of names sits in a path. Only someone holding the store's token can read
  it: `npm run waitlist` prints the list. The privacy notice on /legal describes exactly this.
*/
export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  /* Only this site's own form: a browser always names the page's origin on a cross-site post. */
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return reply(403);
  if (Number(request.headers.get("content-length") ?? 0) > 1024) return reply(413);

  let body: { email?: unknown; consent?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply(400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL.test(email) || body.consent !== true) return reply(400);

  const pathname = `waitlist/${createHash("sha256").update(email).digest("hex")}.json`;
  try {
    if (await exists(pathname)) return reply(200);
    const record = { email, consent: true, at: new Date().toISOString() };
    await put(pathname, JSON.stringify(record), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return reply(200);
  } catch (error) {
    console.error("waitlist", error);
    return reply(500);
  }
}

async function exists(pathname: string) {
  try {
    await head(pathname);
    return true;
  } catch {
    return false;
  }
}

function reply(status: number) {
  return Response.json({ ok: status === 200 }, { status, headers: { "Cache-Control": "no-store" } });
}
