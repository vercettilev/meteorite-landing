import { cardPath } from "@/lib/share";
import { draw, locate, onward } from "../card";

/*
  A link's card under the address that says which place it shows: /list/k7m2q9/card/42.png. Any
  other ending is yesterday's place, or made up, and is sent on to today's. card.tsx has the rest.
*/
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ code: string; as: string }> }) {
  const { code, as } = await params;
  const found = await locate(code, request);
  if (found instanceof Response) return found;
  return cardPath(found).endsWith(`/${as}`) ? draw(found) : onward(found, request);
}
