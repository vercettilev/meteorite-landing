import { after } from "next/server";
import { sendConfirmation } from "@/lib/confirmation";
import { join } from "@/lib/list";

/*
  The waitlist. An address is kept in the project's private Blob store and given a place on the
  list and a link of its own (lib/list.ts says how, and what the order is). The answer is that
  place, so the page can say it. An address that is already on the list gets the same answer and
  changes nothing: typing it in again is how someone finds their place on another device. A new
  address is sent one email to say it is on the list (lib/confirmation.ts), with the link that
  takes it off again (app/leave); an address already there is sent nothing. The privacy notice
  on /legal describes exactly this.
*/
export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  /* Only this site's own form: a browser always names the page's origin on a cross-site post. */
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return reply(403);
  if (Number(request.headers.get("content-length") ?? 0) > 1024) return reply(413);

  let body: { email?: unknown; consent?: unknown; from?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply(400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  /* `consent` is the form saying its button was pressed, under the line that says what pressing it is for (components/JoinForm.tsx). */
  if (email.length > 254 || !EMAIL.test(email) || body.consent !== true) return reply(400);

  try {
    /* `from` is the code of the link the visitor came by, if they came by one. One that is not on the list is passed over. */
    const { fresh, leave, ...standing } = await join(email, typeof body.from === "string" ? body.from : undefined);
    /* Once the form has its answer, so a slow or failed email never turns a kept address into an error. `leave` is the way off the list: it goes in the email, to the address's own inbox, and never in the answer to the page. */
    if (fresh) after(() => sendConfirmation(email, standing, leave));
    return reply(200, standing);
  } catch (error) {
    console.error("waitlist", error);
    return reply(500);
  }
}

function reply(status: number, more?: object) {
  return Response.json({ ok: status === 200, ...more }, { status, headers: { "Cache-Control": "no-store" } });
}
