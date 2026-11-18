import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { ordinal } from "@/lib/format";
import { standing, type Standing } from "@/lib/list";
import { cardPath, ending } from "@/lib/share";
import { STONE_PHOTO } from "@/lib/site";

/*
  The card a link on the list carries when it is shared: the share image (public/og.jpg) with the
  place of whoever the link belongs to where the headline was. It says what the page said to
  them: the line "the first to know", with "first" struck and their own place written in, as the
  hero strikes "world" and writes "space". Whoever is first has nothing struck.

  The stone is whole for whoever has brought no one yet, and cut and polished for whoever has.
  Both grounds are made by scripts/list-card.mjs from stills of the stone, which is drawn from a
  photograph under CC BY-SA 4.0: its credit is on the card, since the card travels without the
  site. The type is the page's own, as files here (OFL.txt is their licence).

  A card's address ends in the place it shows (lib/share.ts): /list/k7m2q9/card/42.png, or
  7c.png once the stone is cut. The two routes beside this file answer for it. [as]/route.tsx
  draws the card under that address and sends any other ending on to it, so a card kept by X or
  anyone else is never mistaken for today's, and asking for cards under made-up endings draws
  nothing. route.tsx is the address without an ending, which is sent on in the same way.
*/
const HERE = join(process.cwd(), "app/list/[code]/card");
const [serif, italic, caps, whole, cut, logo] = await Promise.all(
  ["im-fell-double-pica.woff", "im-fell-double-pica-italic.woff", "im-fell-dw-pica-sc.woff", "ground-whole.jpg", "ground-cut.jpg", "../../../../public/assets/meteorite-logo-horizontal-bone.svg"].map((name) =>
    readFile(join(HERE, name)),
  ),
);
const GROUND = { whole: `data:image/jpeg;base64,${whole.toString("base64")}`, cut: `data:image/jpeg;base64,${cut.toString("base64")}` };
const LOGO = `data:image/svg+xml;base64,${logo.toString("base64")}`;
const FONTS = [
  { name: "Double Pica", data: serif, weight: 400 as const, style: "normal" as const },
  { name: "Double Pica", data: italic, weight: 400 as const, style: "italic" as const },
  { name: "Pica Caps", data: caps, weight: 400 as const, style: "normal" as const },
];

const BONE = "#E9E3D6";
const ASH = "#A9A397";
/* The headline's size for a place of so many characters ("7th" is 3, "128,483rd" 9), found by eye against the stone's edge. */
const SIZES: (number | undefined)[] = [104, 104, 104, 104, 94, 86, 84, 81, 76, 71];
/* The pen's stroke through "first": the one the hero draws through "world" (components/Hero.tsx). */
const STROKE = "M-3 18.6C13 15.9 29 18.7 52 16.2S87 13.6 104 13.1L104 14.5C87 15.5 71 17.6 52 17.9S15 17.5-3 20Z";

/*
  The place a link's card is to show. Or, in its stead, the answer to give: nothing, for a link
  that is not on the list, and the site's own card if the list cannot be read just now, so the
  link still carries one.
*/
export async function locate(code: string, request: Request): Promise<Standing | Response> {
  try {
    return sample(code) ?? (await standing(code)) ?? new Response(null, { status: 404 });
  } catch (error) {
    console.error("card", error);
    return Response.redirect(new URL("/og.jpg", request.url), 302);
  }
}

/* The way on to where a link's card is today. */
export const onward = (found: Standing, request: Request) => Response.redirect(new URL(cardPath(found), request.url), 302);

/* A card says a place and whether the stone is cut, and nothing of whose it is: one drawn for a place serves whoever holds that place next. The last few are kept as they were drawn. */
const drawn = new Map<string, ArrayBuffer>();
const KEPT = 48;

export async function draw(found: Standing): Promise<Response> {
  const key = ending(found);
  let card = drawn.get(key);
  if (!card) {
    /* Drawn through to the end before anything is answered, so a card that fails is an error and not half a picture. */
    card = await picture(found).arrayBuffer();
    if (drawn.size >= KEPT) drawn.delete(drawn.keys().next().value as string);
    drawn.set(key, card);
  }
  /* Under this address the card never changes, so it is kept a day. A browser asks again sooner, in case the place has moved on. */
  return new Response(card, { headers: { "Content-Type": "image/png", "Content-Length": String(card.byteLength), "Cache-Control": "public, max-age=300, s-maxage=86400" } });
}

function picture(found: Standing) {
  const place = ordinal(found.place);
  const first = found.place === 1;
  /* The headline at the share image's size, which gives way to a longer place so the line never reaches the stone: "7th" is set at 104, "1,204th" at 81. */
  const size = SIZES[place.length] ?? 64;

  return new ImageResponse(
    (
      <div style={{ position: "relative", display: "flex", width: 1200, height: 630, backgroundColor: "#0F0E0C", color: BONE }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={found.brought > 0 ? GROUND.cut : GROUND.whole} width={1200} height={630} style={{ position: "absolute", left: 0, top: 0 }} />
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={LOGO} width={205} height={47} style={{ position: "absolute", left: 80, top: 72 }} />

        <div style={{ position: "absolute", left: 80, top: 352 - size * 1.02, display: "flex", flexDirection: "column", fontFamily: "Double Pica", fontSize: size, lineHeight: 1.02 }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span>The</span>
            {first ? (
              <span style={{ marginLeft: size * 0.24 }}>first</span>
            ) : (
              <span style={{ position: "relative", display: "flex", marginLeft: size * 0.24, color: ASH }}>
                first
                <svg width="106%" height="100%" viewBox="-3 0 107 30" preserveAspectRatio="none" style={{ position: "absolute", left: "-3%", top: 0 }}>
                  <path d={STROKE} fill={BONE} />
                </svg>
              </span>
            )}
            {!first && <span style={{ marginLeft: size * 0.24, fontStyle: "italic" }}>{place}</span>}
          </div>
          <span>to know.</span>
        </div>

        <span style={{ position: "absolute", left: 82, top: 484, fontFamily: "Pica Caps", fontSize: 20, letterSpacing: "0.04em", color: ASH }}>Own a piece of space.</span>
        <span style={{ position: "absolute", left: 82, top: 584, fontFamily: "Pica Caps", fontSize: 12.5, letterSpacing: "0.04em", color: ASH, opacity: 0.62 }}>
          {`The stone is drawn from a photograph by ${STONE_PHOTO.author}, ${STONE_PHOTO.licence}.`}
        </span>
      </div>
    ),
    { width: 1200, height: 630, fonts: FONTS },
  );
}

/* Only while developing, cards are drawn without asking the list: /list/sample/card is the 42nd, /list/sample7c/card the 7th with its stone cut. */
function sample(code: string): Standing | null {
  const asked = process.env.NODE_ENV === "production" ? null : code.match(/^sample(\d*)(c?)$/);
  return asked ? { code, place: Number(asked[1]) || 42, brought: asked[2] ? 1 : 0 } : null;
}
