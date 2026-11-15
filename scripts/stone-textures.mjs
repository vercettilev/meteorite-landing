/*
  Makes the two textures the stone is drawn from, out of a photograph of a lunar breccia:

    stone-skin.webp   a disc of the photograph with the studio light taken back out of it, so
                      that the lamp on the page can light it afresh. The page wraps it round the sphere.
    stone-face.webp   another disc of the same photograph, for the cut face. A breccia is the same
                      stone all the way through, so the inside is cut from the same picture as the skin.

  Both are 2048 texels across, as many as the page's largest cube. The stone is the cut face of the
  lunar meteorite NWA 10665, a feldspathic breccia, photographed by Raimond Spekking
  (https://commons.wikimedia.org/wiki/File:Lunar_meteorite_NWA_10665,_Feldspathic_breccia-8937.jpg,
  CC BY-SA 4.0). Its discs are some 2500 pixels across, so the textures are made smaller, never
  larger, and they are under the same licence as the photograph.

  Run with: node scripts/stone-textures.mjs
  STONE=lunar takes the generated picture 06_nwa_14127.png instead, and STONE=sphere the polished
  sphere of 01_meteorite_hero.png. Their discs are only 500 to 650 pixels across, so once the light
  is out each is drawn again at full size (redraw below). Another photograph goes in the same way:
  add it below, with the centre and radius of a disc that lies within the stone.
*/
import sharp from "sharp";

const OUT = 2048;
/* The light is measured on a smaller copy, 1024 across, where the sigma below is counted, and laid on the full size from there. */
const FIELD = 1024;
/* How much of the square the disc fills, leaving a rim of mean colour for the sampler to run into. */
const DISK = 0.985;
/*
  For each photograph: where the two discs are, in its own pixels; how far the light is divided out
  over (sigma), and how far the division may go (gain), and how far the contrast of a neighbourhood
  may be brought to the mean (spread). The breccia keeps its contrast as it is, so that the white
  clasts keep their edge against the matrix; the sphere's photograph has a reflection of the studio
  light that washed its detail out, which spread brings back.
*/
const STONES = {
  /* The photograph is evenly lit, so the light is only evened a little, and its contrast is left as it is. */
  nwa10665: {
    file: "scripts/sources/nwa-10665.jpg",
    skin: { cx: 1880, cy: 1920, r: 1290 },
    face: { cx: 1900, cy: 1950, r: 1240 },
    sigma: 150,
    gain: [0.8, 1.25],
    spread: [0.95, 1.05],
  },
  lunar: {
    file: "scripts/sources/06_nwa_14127.png",
    skin: { cx: 570, cy: 690, r: 270 },
    face: { cx: 640, cy: 700, r: 240 },
    sigma: 150,
    gain: [0.6, 1.7],
    spread: [0.9, 1.15],
    redraw: true,
  },
  sphere: {
    file: "scripts/sources/01_meteorite_hero.png",
    skin: { cx: 592, cy: 470, r: 322 },
    face: { cx: 592, cy: 470, r: 322 },
    sigma: 40,
    gain: [0.4, 3.5],
    spread: [0.7, 1.8],
    redraw: true,
    /* The brass ring that crosses the bottom of the sphere is painted over with the mean colour. Its upper edge is an arc of this circle, with a margin above it for its shadow. */
    ring: { cx: 592, cy: 432, r: 343, margin: 10 },
  },
};
const STONE = STONES[process.env.STONE ?? "nwa10665"];

const toLinear = (v) => (v /= 255) <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const toByte = (v) => Math.round(255 * ((v = Math.min(Math.max(v, 0), 1)) <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const lumOf = (rgb, i) => 0.2126 * rgb[i * 3] + 0.7152 * rgb[i * 3 + 1] + 0.0722 * rgb[i * 3 + 2];

/* The square round a disc of the photograph, as linear floats, size texels across. */
async function disc({ cx, cy, r }, size) {
  const side = Math.round((2 * r) / DISK);
  const raw = await sharp(STONE.file)
    .extract({ left: Math.round(cx - side / 2), top: Math.round(cy - side / 2), width: side, height: side })
    .resize(size, size, { kernel: "lanczos3" })
    .removeAlpha()
    .raw()
    .toBuffer();
  const rgb = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) rgb[i] = toLinear(raw[i]);
  return rgb;
}

/* A Gaussian blur of one square plane, size texels across, each way in turn. */
function blur(src, sigma, size = FIELD) {
  const reach = Math.ceil(sigma * 3);
  const kernel = new Float32Array(reach * 2 + 1);
  let sum = 0;
  for (let i = -reach; i <= reach; i++) sum += kernel[i + reach] = Math.exp((-i * i) / (2 * sigma * sigma));
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  const pass = (from, stride, step) => {
    const to = new Float32Array(from.length);
    for (let line = 0; line < size; line++) {
      const base = line * step;
      for (let x = 0; x < size; x++) {
        let v = 0;
        for (let k = -reach; k <= reach; k++) {
          const xi = Math.min(Math.max(x + k, 0), size - 1);
          v += from[base + xi * stride] * kernel[k + reach];
        }
        to[base + x * stride] = v;
      }
    }
    return to;
  };
  return pass(pass(src, 1, size), size, 1);
}

/*
  Divides out the slow change of light across the picture, so what is left is the stone's own
  colour: gain brings each neighbourhood to the mean brightness, and spread brings the detail of
  each neighbourhood toward the mean contrast, as far as the stone's settings allow.
*/
function flatten(lum, valid) {
  const { sigma } = STONE;
  const weight = blur(valid, sigma);
  const low = blur(lum.map((v, i) => v * valid[i]), sigma).map((v, i) => v / Math.max(weight[i], 0.001));
  let total = 0, count = 0;
  for (let i = 0; i < lum.length; i++) {
    total += lum[i] * valid[i];
    count += valid[i];
  }
  const target = total / count;
  const gain = new Float32Array(lum.length);
  for (let i = 0; i < lum.length; i++) gain[i] = clamp(Math.pow(target / Math.max(low[i], 0.004), 0.9), ...STONE.gain);

  const away = blur(lum.map((v, i) => (v * gain[i] - target) ** 2 * valid[i]), sigma).map((v, i) => Math.sqrt(v / Math.max(weight[i], 0.001)));
  const usual = Array.from(away).filter((_, i) => valid[i] > 0.99).sort((a, b) => a - b);
  const typical = usual[Math.floor(usual.length / 2)];
  const spread = new Float32Array(lum.length);
  for (let i = 0; i < lum.length; i++) spread[i] = clamp(Math.pow(typical / Math.max(away[i], 0.001), 0.6), ...STONE.spread);
  return { gain, spread, target };
}

/* 1 inside the disc, feathered over two texels at its edge. */
function inside(x, y, size) {
  const r = Math.hypot(x - size / 2 + 0.5, y - size / 2 + 0.5);
  return clamp((0.5 * DISK * size - 1 - r) / 2, 0, 1);
}

/* A plane of the small copy read at a point of the full size, between its texels. */
function lift(plane, x, y) {
  const fx = Math.min(Math.max(((x + 0.5) * FIELD) / OUT - 0.5, 0), FIELD - 1), fy = Math.min(Math.max(((y + 0.5) * FIELD) / OUT - 0.5, 0), FIELD - 1);
  const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(x0 + 1, FIELD - 1), y1 = Math.min(y0 + 1, FIELD - 1), tx = fx - x0, ty = fy - y0;
  const top = plane[y0 * FIELD + x0] * (1 - tx) + plane[y0 * FIELD + x1] * tx;
  const bottom = plane[y1 * FIELD + x0] * (1 - tx) + plane[y1 * FIELD + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

/* A number from 0 to 1 that stays the same for the same texel, for the grain. */
function hash(x, y, seed) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* The smallest, or the largest, of a full-size plane over a disc of the given radius round each texel. */
function rank(src, radius, smallest) {
  const out = new Float32Array(src.length), reach = [];
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) if (dx * dx + dy * dy <= radius * radius + radius) reach.push(dx, dy);
  for (let y = 0; y < OUT; y++) {
    for (let x = 0; x < OUT; x++) {
      let v = smallest ? Infinity : -Infinity;
      for (let k = 0; k < reach.length; k += 2) {
        const w = src[Math.min(Math.max(y + reach[k + 1], 0), OUT - 1) * OUT + Math.min(Math.max(x + reach[k], 0), OUT - 1)];
        if (smallest ? w < v : w > v) v = w;
      }
      out[y * OUT + x] = v;
    }
  }
  return out;
}

/*
  The full-size disc drawn again where the photograph has nothing left to give, as linear colour,
  three planes. Only for the generated pictures, whose discs are a quarter of the size. First the cracks: the picture lays a net of fine dark lines over every pale clast,
  which no polished stone shows. Closing the brightness (its largest over a small disc, then the
  smallest of that) fills any dark line narrower than the disc, and only well inside a clast, so
  that the matrix between two clasts stays. Then the edges: enlarging the photograph four times
  over softened every edge across four texels, and a sharpening held to the range of each texel's
  neighbours brings it back without a halo. Last the grain, finer than the photograph's pixels, and
  only in the dark matrix: a speckle, and here and there a single pale grain.
*/
function redraw(rgb) {
  const n = OUT * OUT;
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = lumOf(rgb, i);
  const closed = rank(rank(lum, 4, false), 4, true);
  const near = blur(lum, 6, OUT);
  for (let i = 0; i < n; i++) {
    const clast = smoothstep(0.1, 0.22, near[i]);
    const fill = 1 + clast * (closed[i] / Math.max(lum[i], 0.0005) - 1);
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] *= Math.min(fill, 2.5);
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let c = 0; c < 3; c++) {
      const plane = new Float32Array(n);
      for (let i = 0; i < n; i++) plane[i] = rgb[i * 3 + c];
      const soft = blur(plane, 1.6, OUT);
      for (let y = 0; y < OUT; y++) {
        for (let x = 0; x < OUT; x++) {
          const i = y * OUT + x;
          let lo = Infinity, hi = -Infinity;
          for (let dy = -1; dy <= 1; dy++) {
            const row = Math.min(Math.max(y + dy, 0), OUT - 1) * OUT;
            for (let dx = -1; dx <= 1; dx++) {
              const v = plane[row + Math.min(Math.max(x + dx, 0), OUT - 1)];
              if (v < lo) lo = v;
              if (v > hi) hi = v;
            }
          }
          rgb[i * 3 + c] = clamp(plane[i] + 1.2 * (plane[i] - soft[i]), lo, hi);
        }
      }
    }
  }
  for (let i = 0; i < n; i++) lum[i] = lumOf(rgb, i);
  const ground = blur(lum, 3, OUT);
  for (let y = 0; y < OUT; y++) {
    for (let x = 0; x < OUT; x++) {
      const i = y * OUT + x;
      const matrix = 1 - smoothstep(0.03, 0.12, ground[i]);
      let grain = 1 + matrix * 0.1 * (hash(x, y, 1) + 0.5 * hash(x + 1, y, 1) + 0.5 * hash(x, y + 1, 1) - 1);
      if (hash(x, y, 2) < 0.0025 * matrix) grain *= 2.2 + 2 * hash(x, y, 3);
      for (let c = 0; c < 3; c++) rgb[i * 3 + c] *= grain;
    }
  }
  return rgb;
}

const smoothstep = (a, b, v) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Where a disc of the photograph is the stone, on a square of the given size. */
function validity(crop, size) {
  const n = size * size;
  const scale = crop.r / (0.5 * DISK * size);
  const valid = new Float32Array(n);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let ring = 1;
      if (STONE.ring) {
        /* Back in the photograph's own pixels, to find the ring. */
        const px = (x - size / 2 + 0.5) * scale, py = crop.cy - STONE.ring.cy + (y - size / 2 + 0.5) * scale;
        const under = Math.sqrt(Math.max(STONE.ring.r ** 2 - px ** 2, 0)) - STONE.ring.margin;
        ring = py <= under - 4 ? 1 : py > under ? 0 : (under - py) / 4;
      }
      valid[i] = inside(x, y, size) * ring;
    }
  }
  return valid;
}

/* One disc of the photograph, with its light divided out and drawn again at full size, as a WebP. */
async function texture(crop, file) {
  const small = await disc(crop, FIELD);
  const smallValid = validity(crop, FIELD);
  const lum = new Float32Array(FIELD * FIELD);
  for (let i = 0; i < lum.length; i++) lum[i] = lumOf(small, i);
  const { gain, spread, target } = flatten(lum, smallValid);

  const rgb = await disc(crop, OUT);
  const valid = validity(crop, OUT);
  const n = OUT * OUT;
  const g = new Float32Array(n), sp = new Float32Array(n);
  for (let y = 0; y < OUT; y++) {
    for (let x = 0; x < OUT; x++) {
      g[y * OUT + x] = lift(gain, x, y);
      sp[y * OUT + x] = lift(spread, x, y);
    }
  }
  const mean = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) mean[c] += rgb[i * 3 + c] * g[i] * valid[i];
    count += valid[i];
  }
  for (let c = 0; c < 3; c++) mean[c] /= count;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) rgb[i * 3 + c] = mean[c] + (rgb[i * 3 + c] * g[i] - mean[c]) * sp[i];
  }
  if (STONE.redraw) redraw(rgb);
  const out = Buffer.alloc(n * 3);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) out[i * 3 + c] = toByte(rgb[i * 3 + c] * valid[i] + mean[c] * (1 - valid[i]));
  }
  await sharp(out, { raw: { width: OUT, height: OUT, channels: 3 } }).webp({ quality: 85 }).toFile(file);
  console.log(`${file}: mean luminance ${target.toFixed(4)} in the photograph, mean colour after ${mean.map((v) => v.toFixed(4)).join(" ")}`);
}

await texture(STONE.skin, "public/assets/stone-skin.webp");
await texture(STONE.face, "public/assets/stone-face.webp");

