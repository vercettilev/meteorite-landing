import { standing } from "@/lib/list";

/*
  The place a link holds on the list today, for the page to show to whoever the link belongs to.
  It is the same thing the link's card shows to anyone, and nothing more: no address, no date.
*/
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const found = await standing(code);
    if (!found) return Response.json({ ok: false }, { status: 404, headers: { "Cache-Control": "no-store" } });
    /* A place moves when someone arrives, and whoever brought them looks for it at once: it is kept only for the few seconds that spare the list a rush of the same question. */
    return Response.json({ ok: true, ...found }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=5" } });
  } catch (error) {
    console.error("list", error);
    return Response.json({ ok: false }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
