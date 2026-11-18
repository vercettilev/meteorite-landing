/*
  Makes the two grounds of the list's card (app/list/[code]/card): the stone on the page's black,
  where it stands on the share image, with no words on it. One is the whole stone, for whoever
  has brought no one yet. The other is the stone cut and polished, for whoever has.

  Both are drawn from stills of the stone as the page draws it. With `npm run still` waiting and
  the dev server open in a browser, in its console:

    __stone.still(2400, [-1.3, -1.5, 1.5], 0.36, "http://127.0.0.1:8791/save?name=still.png")
    __stone.still(2400, [-0.8, -1.8, 1.8], 0.36, "http://127.0.0.1:8791/save?name=still-cut.png", 0.58)

  Then: node scripts/list-card.mjs public/assets   (the folder the two PNGs were saved to)
  The PNGs are not kept: delete them afterwards. The grounds are adaptations of the photograph
  the stone is drawn from, so the card carries its credit (see the README).
*/
import path from "node:path";
import sharp from "sharp";

const from = process.argv[2] ?? "public/assets";
const out = "app/list/[code]/card";

/* The card, and where the stone stands on it: the same place as on public/og.jpg. */
const W = 1200, H = 630;
const CENTRE = { x: 903.5, y: 298.5 }, RADIUS = 243.5;
/* A still is 3.7236 radii wide, with the stone's centre 1.8385 radii in and 1.4596 down (HeroStone.tsx). */
const STILL = { across: 3.7236, cx: 1.8385, cy: 1.4596 };
const BASALT = [15, 14, 12];
/*
  The wall behind the stone is faintly lit, and the still ends 1.84 radii to the left of the stone's
  centre. So to the left the light is let die away in a circle, from this many radii out to this
  many, and no straight edge shows where the still stops.
*/
const FADE = { from: 1.12, to: 1.8 };

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

async function ground(still, name) {
  const width = Math.round(RADIUS * STILL.across);
  const { data, info } = await sharp(path.join(from, still)).removeAlpha().resize({ width, kernel: "lanczos3" }).raw().toBuffer({ resolveWithObject: true });
  const left = Math.round(CENTRE.x - RADIUS * STILL.cx);
  const top = Math.round(CENTRE.y - RADIUS * STILL.cy);
  const card = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = x - left, sy = y - top;
      const inside = sx >= 0 && sx < info.width && sy >= 0 && sy < info.height;
      const away = Math.hypot(x - CENTRE.x, y - CENTRE.y) / RADIUS;
      const weight = !inside ? 0 : x >= CENTRE.x ? 1 : 1 - smooth((away - FADE.from) / (FADE.to - FADE.from));
      for (let c = 0; c < 3; c++) {
        const lit = inside ? Math.max(0, data[(sy * info.width + sx) * 3 + c] - BASALT[c]) : 0;
        card[(y * W + x) * 3 + c] = Math.round(BASALT[c] + lit * weight);
      }
    }
  }
  const file = path.join(out, name);
  const saved = await sharp(card, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true }).toFile(file);
  console.log("saved", file, `${Math.round(saved.size / 1024)} KB`);
}

await ground("still.png", "ground-whole.jpg");
await ground("still-cut.png", "ground-cut.jpg");
