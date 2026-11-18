import { ordinal } from "@/lib/format";

/*
  How a place on the list is passed on: where its card is, the link, and the post on X. The page
  (components/JoinForm.tsx, components/ListPlate.tsx), the link's own page and the card's routes
  (app/list/[code]) all take their addresses from here, so they cannot fall out of step.
*/
type Place = { code: string; place: number; brought: number };

/*
  The page's three claims, each able to stand alone. The page shows them in turn while the stone
  is cut (components/Cut.tsx), and a post on X opens with one of them: a line that says what this
  is without saying it, over the card, which shows it.
*/
export const CLAIMS = ["The rarest thing you can own is not from here.", "It cannot be minted. Only found.", "Older than anything you own."] as const;

/* A place as an address ends in it: "42", or "7c" once someone has joined by the link and the card's stone is cut. */
export const ending = (at: { place: number; brought: number }) => `${at.place}${at.brought > 0 ? "c" : ""}`;

/*
  Where a link's card is today. The ending is part of the path, so the address changes when the
  place does, and whoever keeps cards (X does, for days) is given the new one. It was once a bare
  query ("card?42"), which Next.js hands on as "card?42=": never compare an address's raw query.
*/
export const cardPath = (at: Place) => `/list/${at.code}/card/${ending(at)}.png`;

export function share(at: Place, origin: string) {
  const link = `${origin}/list/${at.code}`;
  const place = ordinal(at.place);
  /* A link opens with the same claim every time, and the three are spread across the list, so a run of posts does not say one thing. */
  const claim = CLAIMS[at.code.charCodeAt(0) % CLAIMS.length];
  return {
    link,
    card: cardPath(at),
    /* The name the card is saved under. */
    file: `meteorite-${place.replace(/,/g, "")}.png`,
    /* X adds the link after the words. Its ending is the place as it stands, which the link's page does not read: it only makes the link new to X, which would otherwise show the card it kept. */
    post: `https://x.com/intent/post?text=${encodeURIComponent(`${claim}\n\nI'm ${place} on the list.`)}&url=${encodeURIComponent(`${link}?n=${ending(at)}`)}`,
  };
}
