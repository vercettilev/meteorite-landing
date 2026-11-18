import { leave } from "@/lib/list";

/*
  Takes an address off the list. The address of this route is the secret: it names the address's
  file and carries the key that only its own inbox was sent (lib/list.ts), so nothing else is
  asked, and no other site is kept from posting here. That is deliberate: a mail program that is
  told of this address in an email's List-Unsubscribe header posts to it by itself, from its own
  servers, when its reader presses "unsubscribe". Only a post does it: a link merely opened, as
  mail scanners open every link, takes no one off.

  The page at /leave posts here from its button, and is sent on to say it is done. Anything else
  is answered in JSON, and "ok" either way once the address is not on the list.
*/
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const { id, key } = await params;
  let done: boolean;
  try {
    done = await leave(id, key);
  } catch (error) {
    console.error("leave", error);
    return Response.json({ ok: false }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  const form = (request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded") ? await request.formData().catch(() => null) : null;
  /* From the page's own button: on to the page that says it is done, or back to the one that says there is nothing to remove. */
  if (form?.get("page")) return Response.redirect(new URL(done ? "/leave/gone" : `/leave/${id}/${key}`, request.url), 303);
  return Response.json({ ok: done }, { headers: { "Cache-Control": "no-store" } });
}
