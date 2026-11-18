import { locate, onward } from "./card";

/*
  A link's card, asked for without the ending that says which place it shows (and the address the
  first cards had, which ended "?42"): sent on to where the card is today. card.tsx has the rest.
*/
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const found = await locate(code, request);
  return found instanceof Response ? found : onward(found, request);
}
