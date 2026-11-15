"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal, preload } from "react-dom";
import { createProgram, FULLSCREEN_VERTEX } from "@/lib/gl";
import { sound } from "@/lib/sound";

/* A still of the stone, for where it cannot be drawn. */
const STILL = "/assets/stone-still.webp";
const STACKED = "(max-aspect-ratio: 11/10), (max-width: 559px)";

/*
  The stone is a lunar meteorite, a breccia of the Moon's crust cut and polished to a sphere, drawn
  as a real sphere so a lamp can move around it. Its skin is one photograph of such a stone, lit
  afresh; its inside, once it is cut, another disc of the same photograph, since a breccia is the
  same stone all the way through. It opens in eclipse. Left alone, the lamp circles it like the
  phases of a moon. The pointer takes the lamp, or the tilt of a phone does, and dragging turns the
  stone. Scrolling on cuts it in two, and the cut face becomes the mark.

  Across the cut face run veins of black glass, melted by the blows that made the breccia. Some of
  them are the bars of the mark.
*/
const CUT_PLANE = `
/* The stone is cut square to this axis. The other two run across the cut face: right and down, as the mark is read. */
const vec3 AX0 = vec3(-0.1801, -0.1601, 0.9705);
const vec3 FACE_RIGHT = vec3(0.9832, 0.0, 0.1825);
const vec3 FACE_DOWN = vec3(-0.0292, 0.9871, 0.1574);
`;

/*
  The mark in its own drawing units: fifteen bars in three directions, clipped by a ring. On the
  cut face they are veins of glass among others, which is how the face can become the mark.
*/
const MARK = `
float bar(vec2 l, vec4 ends, float width, float soft) {
  vec2 d = ends.zw - ends.xy;
  float len = length(d);
  vec2 r = l - ends.xy;
  float along = dot(r, d) / len;
  float across = abs(r.x * d.y - r.y * d.x) / len;
  return clamp(0.5 + (width * 0.5 - across) / soft, 0.0, 1.0) * clamp(0.5 + along / soft, 0.0, 1.0) * clamp(0.5 + (len - along) / soft, 0.0, 1.0);
}

/* x: the level bars. y: those that fall to the left. z: those that fall to the right. */
vec3 bars(vec2 l, float soft) {
  float level = max(max(bar(l, vec4(54.19, 513.0, 601.49, 513.0), 40.0, soft), bar(l, vec4(499.3, 690.0, 902.86, 690.0), 22.0, soft)),
                max(max(bar(l, vec4(59.13, 567.0, 570.32, 567.0), 13.0, soft), bar(l, vec4(719.85, 308.0, 901.9, 308.0), 13.0, soft)),
                    max(bar(l, vec4(700.22, 342.0, 916.65, 342.0), 13.0, soft), bar(l, vec4(471.59, 738.0, 876.08, 738.0), 13.0, soft))));
  float left = max(max(bar(l, vec4(799.63, 169.82, 363.87, 924.57), 46.0, soft), bar(l, vec4(597.15, 64.99, 413.5, 383.09), 13.0, soft)),
               max(max(bar(l, vec4(469.29, 56.1, 347.0, 267.91), 13.0, soft), bar(l, vec4(519.59, 738.0, 405.52, 935.58), 13.0, soft)),
                   bar(l, vec4(261.32, 567.0, 144.76, 768.88), 13.0, soft)));
  float right = max(max(bar(l, vec4(262.9, 122.25, 488.51, 513.0), 36.0, soft), bar(l, vec4(223.85, 149.86, 433.51, 513.0), 13.0, soft)),
                max(bar(l, vec4(152.19, 221.48, 320.51, 513.0), 13.0, soft), bar(l, vec4(672.41, 738.0, 748.73, 870.19), 13.0, soft)));
  return vec3(level, left, right) * clamp(0.5 + (440.0 - length(l - 500.0)) / soft, 0.0, 1.0);
}
`;

/*
  The stone's two surfaces are drawn once, when the page opens, so that every frame after only has
  to light them. The skin of the sphere goes into the six faces of a cube: its colour, taken from
  the photograph with the studio light divided out (scripts/stone-textures.mjs), and in the last
  channel mostly where its pale clasts are, which stands in for its small relief. The face of the
  cut goes into one flat sheet: its colour, with the veins of glass laid across it, and in the last
  channel where the glass is. uKind says which of the two is being drawn.
*/
const BAKE = `
precision highp float;
uniform sampler2D uSkinSrc, uFaceSrc;
uniform vec3 uForward, uRight, uUp;
uniform float uSize, uKind;
${MARK}
/* How much of its square the disc of each photograph fills. */
const float DISK = 0.985;
const vec3 GLASS = vec3(0.012, 0.011, 0.010);

float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

/* A point q of a disc, after q is turned by a, scaled by s and moved by c, where the disc's texture is read. */
vec2 within(vec2 q, float a, float s, vec2 c) {
  float ca = cos(a), sa = sin(a);
  return (vec2(ca * q.x - sa * q.y, sa * q.x + ca * q.y) * s + c) * 0.5 * DISK + 0.5;
}

/* The photograph of the stone at a point of its disc. */
vec3 photo(vec2 q, float a, float s, vec2 c) {
  return pow(texture2D(uSkinSrc, within(q, a, s, c)).rgb, vec3(2.2));
}

/*
  The skin at a point P of the sphere. The front is the disc of the photograph as it is, the back
  the same turned round, and the sides are taken from a smaller disc within it, each side turned
  its own way, so that no clast is seen twice at once. Where two of these meet, the pale clasts win
  over the dark matrix, which hides the join.
*/
vec4 skinAt(vec3 P) {
  vec3 cz = photo(P.xy, P.z > 0.0 ? 0.0 : 3.1416, 1.0, vec2(0.0));
  vec3 cx = photo(vec2(P.z, P.y), P.x > 0.0 ? 1.1 : 2.7, 0.75, vec2(-0.2, 0.1));
  vec3 cy = photo(vec2(P.x, P.z), P.y > 0.0 ? 4.3 : 5.6, 0.75, vec2(-0.2, 0.1));
  vec3 w = pow(abs(P), vec3(8.0));
  w *= pow(vec3(lum(cx), lum(cy), lum(cz)) + 0.03, vec3(2.0));
  w /= w.x + w.y + w.z + 0.00001;
  vec3 col = cx * w.x + cy * w.y + cz * w.z;
  return vec4(col, lum(col));
}

/* Value noise over four octaves, each finer and fainter, from 0 to 1. */
float fbm(vec2 p) {
  return noise(p) * 0.533 + noise(p * 2.03 + 17.0) * 0.267 + noise(p * 4.07 + 31.0) * 0.133 + noise(p * 8.11 + 47.0) * 0.067;
}

/*
  A vein of glass that runs straight through p at angle a, of a given width, in the mark's drawing
  units, thinning to nothing len away either side: how far inside it a point is.
*/
float veinlet(vec2 l, vec2 p, float a, float width, float len) {
  vec2 d = l - p;
  float across = abs(dot(d, vec2(-sin(a), cos(a))));
  float along = abs(dot(d, vec2(cos(a), sin(a))));
  return width * 0.5 * (1.0 - smoothstep(len * 0.35, len, along)) - across;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize * 2.0 - 1.0;
  if (uKind < 0.5) {
    /*
      The cut face: the second disc of the photograph, turned so that the clasts of the skin are
      not met again, and across it the veins of glass. Fifteen of them are the bars of the mark,
      four are not. They are melt that ran into cracks and froze: black glass with a ragged edge,
      swelling and pinching along its length and here and there giving out, a dark margin either
      side where it chilled against the stone, and the stone's own grains caught up in it.
    */
    vec2 at = within(uv, 0.9, 1.0, vec2(0.0));
    vec3 ground = pow(texture2D(uFaceSrc, at).rgb, vec3(2.2));
    /* The same a few sizes blurrier: what ground has beyond it is its finest grains. */
    vec3 blurred = pow(texture2D(uFaceSrc, at, 3.0).rgb, vec3(2.2));
    vec2 l = uv * 449.0 + 500.0;
    vec2 wandered = l + (vec2(noise(l * 0.011), noise(l * 0.011 + 37.0)) - 0.5) * 12.0;
    /* How far inside a vein each point is. Read so softly, bars() rises evenly across each edge, so it gives the distance to it. */
    const float WIDE = 24.0;
    vec3 b = bars(wandered, WIDE);
    float inside = (max(b.x, max(b.y, b.z)) - 0.5) * WIDE;
    inside = max(inside, veinlet(wandered, vec2(300.0, 700.0), 0.45, 8.0, 330.0));
    inside = max(inside, veinlet(wandered, vec2(640.0, 420.0), 1.65, 11.0, 260.0));
    inside = max(inside, veinlet(wandered, vec2(520.0, 300.0), 2.6, 6.0, 300.0));
    inside = max(inside, veinlet(wandered, vec2(780.0, 600.0), 1.05, 9.0, 240.0));
    inside += (fbm(l * 0.6) - 0.5) * 2.6 + (noise(l * 0.04 + 5.0) - 0.5) * 5.0 - 9.0 * smoothstep(0.8, 0.97, noise(l * 0.018 + 11.0));
    float texel = 898.0 / uSize;
    float glass = smoothstep(-texel, texel, inside) * clamp(0.5 + (440.0 - length(l - 500.0)) / 3.0, 0.0, 1.0);
    ground *= 1.0 - 0.45 * smoothstep(-3.5, 0.0, inside) * (1.0 - glass);
    /* The blow that melted the glass also cracked the stone beside it: hairlines that wander off the veins and die away. */
    float hair = (1.0 - smoothstep(0.0, 0.03, abs(fbm(l * 0.045 + 21.0) - 0.5))) * smoothstep(-36.0, -3.0, inside) * (1.0 - glass);
    ground *= 1.0 - 0.6 * hair;
    /* Black glass, warming to a dark brown where it ran thick, with grains of the stone caught up in it. */
    vec3 melt = mix(GLASS, vec3(0.022, 0.016, 0.011), smoothstep(0.35, 0.8, fbm(l * 0.05 + 3.0)));
    float caught = smoothstep(0.12, 0.3, lum(ground) - lum(blurred)) * smoothstep(0.78, 0.9, noise(l * 0.18 + 9.0));
    melt = mix(melt, ground * 0.6, caught);
    gl_FragColor = vec4(pow(mix(ground, melt, glass), vec3(1.0 / 2.2)), glass * (1.0 - 0.8 * caught));
    return;
  }
  /* One face of the cube: where this texel is on the sphere. Stored the way a picture is, so the dark ground keeps its shades. */
  vec4 s = skinAt(normalize(uForward + uv.x * uRight + uv.y * uUp));
  /*
    The last channel stands in for the relief. A clast stands a hair proud of the matrix, but the
    polish leaves each of them level, so most of the shading inside a clast is taken out of it.
  */
  float proud = smoothstep(0.06, 0.2, s.w);
  gl_FragColor = vec4(pow(s.rgb, vec3(1.0 / 2.2)), mix(sqrt(s.w), 0.15 + 0.6 * proud, 0.85));
}`;

const SCENE = `
precision highp float;
uniform sampler2D uStand, uFace;
uniform samplerCube uSkin;
uniform vec2 uRes, uC;
uniform float uR, uPower, uLoaded, uTime, uFloor, uOpen, uSeam;
/* x: how far the lid has lifted. y: how much of the lid still shows. z: how far the polish has crossed the face. w: how far the face has become the mark. */
uniform vec4 uCut;
uniform vec3 uLamp;
uniform mat3 uRot;
${CUT_PLANE}
${MARK}

const vec3 BASALT = vec3(15.0, 14.0, 12.0) / 255.0;
/* The same black as light, before the film roll-off below: what the wall adds to. */
const vec3 BASALT_LIN = vec3(0.00164, 0.00141, 0.001);
const vec3 WARM = vec3(1.0, 0.89, 0.74);
const vec3 EMBER = vec3(1.0, 0.66, 0.4);
/* Bone, as it must be before the film roll-off below to come out as #E9E3D6. */
const vec3 BONE = vec3(1.429, 1.239, 0.9495);
const vec2 PHOTO = vec2(1199.0, 1312.0);
const vec3 PHOTO_SPHERE = vec3(592.0, 470.0, 322.0);

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float h3(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

float ggx(float ndh, float a) {
  float a2 = a * a;
  float k = ndh * ndh * (a2 - 1.0) + 1.0;
  return a2 / (3.14159 * k * k);
}

/* How much of the lamp a point can see past the stone. */
float clearOfStone(vec3 q, vec3 toLamp, float dist2) {
  vec3 dir = toLamp / sqrt(dist2);
  float along = -dot(q, dir);
  if (along < 0.0 || along * along > dist2) return 1.0;
  return smoothstep(0.86, 1.22, length(q + dir * along));
}

/* The lamp as one point of the stone sees it, turned into the stone's own frame. */
void lampAt(vec3 X, out vec3 Lo, out vec3 Ho, out float reach) {
  vec3 toLamp = uLamp - X;
  float d2 = dot(toLamp, toLamp);
  Lo = uRot * (toLamp / sqrt(d2));
  Ho = normalize(Lo + uRot * vec3(0.0, 0.0, 1.0));
  reach = uPower / (0.24 + 0.34 * d2);
}

/*
  The stone's skin: the colour of the photograph, lit afresh by the lamp. N points out from the
  centre of the piece, and X is where that point is.
*/
vec3 skin(vec3 N, vec3 X) {
  vec3 P = uRot * N;
  vec4 c = textureCube(uSkin, P);
  vec3 ground = pow(c.rgb, vec3(2.2));
  /* Just before the stone opens, the line of the cut shows as a hair of light. */
  float along = dot(P, AX0);
  vec3 glow = EMBER * uSeam * 1.4 * exp(-along * along / 0.00002);
  /* And another where the lamp grazes the limb. */
  float limb = pow(max(1.0 - N.z, 0.0), 6.0);
  float toward = max(dot(normalize(N.xy + 0.0001), normalize(uLamp.xy + 0.0001)), 0.0);
  glow += EMBER * limb * toward * toward * toward * uPower * 0.34 * smoothstep(-0.2, 0.9, length(uLamp.xy));

  vec3 Lo, Ho;
  float reach;
  lampAt(X, Lo, Ho, reach);
  if (dot(P, Lo) < -0.45) return ground * 0.03 + glow;

  /* The polish leaves only a grain of relief, from the brightness either side, taken softly. */
  vec3 tu = normalize(cross(P, abs(P.y) < 0.8 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 tv = cross(P, tu);
  float hu = textureCube(uSkin, P + tu * 0.004, 2.0).w - textureCube(uSkin, P - tu * 0.004, 2.0).w;
  float hv = textureCube(uSkin, P + tv * 0.004, 2.0).w - textureCube(uSkin, P - tv * 0.004, 2.0).w;
  vec3 n = normalize(P - (tu * hu + tv * hv) * 0.3);
  float ndl = max(dot(n, Lo), 0.0);
  float wrap = max((dot(n, Lo) + 0.1) / 1.1, 0.0);
  /* The whole stone still falls off into the dark on the side away from the lamp. */
  float side = max((dot(P, Lo) + 0.2) / 1.2, 0.0);
  /* The polished stone throws the lamp back as a sheen, the glassy clasts a little more than the matrix. */
  float ndh = max(dot(n, Ho), 0.0);
  float gloss = 1.0 + 0.5 * smoothstep(0.3, 0.7, c.w);
  float sheen = (ggx(ndh, 0.13) * 0.06 + ggx(ndh, 0.4) * 0.04) * ndl * gloss;
  vec3 lit = (ground * wrap * (0.55 + 0.45 * side) + WARM * sheen) * WARM * 1.4 * reach;
  return lit + ground * 0.03 + glow;
}

/* The flat face of the cut. X is a point on it, and soft is how far one pixel reaches across it. */
vec3 face(vec3 X, float soft) {
  vec3 P = uRot * X;
  vec2 uv = vec2(dot(P, FACE_RIGHT), dot(P, FACE_DOWN));
  vec3 Lo, Ho;
  float reach;
  lampAt(X, Lo, Ho, reach);
  float ndl = max((dot(AX0, Lo) + 0.03) / 1.03, 0.0);
  float ndh = max(dot(AX0, Ho), 0.0);
  vec4 c = texture2D(uFace, uv * 0.5 + 0.5);
  vec3 ground = pow(c.rgb, vec3(2.2));
  float glass = c.w;

  /*
    Fresh from the saw the face is pale and dull: every grain scatters the light alike, so the
    clasts barely show against the matrix and the veins are only grey. The polish wets it: the
    colours come up, the veins turn to black glass, and the face gives the lamp back as a sheen,
    the glass most sharply of all.
  */
  float fine = clamp(1.0 - soft * 420.0, 0.0, 1.0);
  float grain = 1.0 + (h3(vec3(floor(uv * 520.0), 3.0)) - 0.5) * 0.22 * fine;
  vec3 sawn = (mix(ground, vec3(lum(ground)), 0.6) * 0.6 + 0.12) * grain * ndl;
  float sheen = (ggx(ndh, 0.3) * 0.045 + ggx(ndh, 0.6) * 0.03) * (1.0 - glass) + ggx(ndh, 0.25) * 0.035 * glass;
  vec3 polished = (ground + WARM * sheen) * ndl;
  float front = uCut.z * 1.7 - 0.6 - 0.5 * dot(uv, vec2(0.8, 0.6)) + 0.07 * sin(uv.x * 7.0 - uv.y * 5.0);
  vec3 lit = mix(sawn, polished, smoothstep(0.0, 0.35, front));
  /* The wet edge of the polish. */
  lit += 0.1 * ndl * smoothstep(0.0, 0.1, front) * (1.0 - smoothstep(0.1, 0.35, front));
  /* It lies in the lid's shadow until the lid is clear. */
  lit *= WARM * 1.4 * reach * (0.3 + 0.7 * smoothstep(0.0, 0.5, uCut.x));

  /* At the last the stone goes dark, the veins that are the mark fill with light, and the rim of the stone is its ring. */
  if (uCut.w > 0.0) {
    vec2 l = uv * 449.0 + 500.0;
    vec3 b = bars(l, soft * 449.0);
    float ring = clamp(0.5 + (length(l - 500.0) - 431.0) / (soft * 449.0), 0.0, 1.0);
    lit = lit * (1.0 - uCut.w) + BONE * max(max(b.x, b.y), max(b.z, ring)) * uCut.w;
  }
  return lit;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (px - uC) / uR;
  float rad = length(p);
  vec3 col = vec3(0.0);

  /* When the lamp passes behind the stone, a corona: bright at the limb, gone within a radius. */
  if (rad > 0.97 && uLamp.z < 0.0) {
    float limbGap = max(rad - 1.0, 0.0);
    float toward = 0.5 + 0.5 * dot(p / rad, normalize(uLamp.xy + 0.0001));
    float behind = smoothstep(0.1, 0.9, -uLamp.z / length(uLamp));
    col += vec3(1.0, 0.8, 0.62) * uPower * behind * toward * toward * (0.06 * exp(-limbGap * 11.0) + 0.016 * exp(-limbGap * 3.0));
  }

  /*
    The wall some way behind the stone. The lamp leaves a faint pool of warm light on it, and the
    stone throws its shadow there, wide and soft, on the side away from the lamp, so the dark is a
    room and not a void. The pool dies away as a circle, never along a line: the canvas reaches the
    page's left edge, and the pool is gone well before its foot. The page's own black is the floor
    it sits on, so it can never show a seam.
  */
  /* Everywhere, the inside of the stone's circle too: once the lid lifts away, the wall shows there. */
  {
    float front = max(uLamp.z, 0.0);
    float back = 1.7;
    float reach = max(front, 0.35);
    vec2 pool = clamp(uLamp.xy * 0.8, vec2(-1.6, -1.4), vec2(1.6, 0.9));
    vec2 shade = -uLamp.xy * back / reach;
    float grow = (reach + back) / reach;
    float lit = exp(-dot(p - pool, p - pool) / 1.5) * smoothstep(0.7 * grow, 1.35 * grow, length(p - shade));
    lit *= smoothstep(0.05, 0.5, front) * (1.0 - smoothstep(1.8, 2.6, rad));
    col += BASALT_LIN + WARM * 0.0045 * lit * uPower * uLoaded;
  }

  /* The brass stand and floor, from the photograph, lit only as the lamp comes near. */
  vec2 suv = (PHOTO_SPHERE.xy + p * PHOTO_SPHERE.z) / PHOTO;
  if (rad > 0.97 && suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) {
    vec3 photo = pow(texture2D(uStand, suv).rgb, vec3(2.2)) * uLoaded;
    float edge = (1.0 - smoothstep(1.3, 1.84, abs(p.x))) * (1.0 - smoothstep(2.1, 2.61, p.y));
    float metal = smoothstep(0.008, 0.1, lum(photo));
    vec3 q = vec3(p, 0.1);
    vec3 toLamp = uLamp - q;
    float d2 = dot(toLamp, toLamp);
    float near = clearOfStone(q, toLamp, d2) / (1.0 + d2 * 1.4);
    float sweep = fract(uTime * 0.031);
    float glintAt = (p.y - mix(1.0, 2.5, sweep)) / 0.1;
    float glint = exp(-glintAt * glintAt) * sin(sweep * 3.14159);
    vec3 lit = photo * (0.05 + uPower * (0.25 + 3.2 * near) * metal);
    lit += photo * metal * glint * 1.4 * EMBER;
    col = max(col, lit * edge * smoothstep(1.0, 1.02, rad));
  }

  col *= 1.0 - smoothstep(uFloor - uR * 0.42, uFloor, px.y);

  float rim = 1.5 / uR;
  if (uOpen < 0.5) {
    if (rad < 1.0) {
      vec3 N = vec3(p, sqrt(1.0 - rad * rad));
      col = mix(col, skin(N, N), 1.0 - smoothstep(1.0 - rim, 1.0, rad));
    }
  } else {
    /* The stone in two. The lower half keeps its place, and the lid lifts straight off the plane between them. */
    vec3 nv = AX0 * uRot;
    if (rad < 1.0) {
      vec3 Xs = vec3(p, sqrt(1.0 - rad * rad));
      /* Which side of the cut this point of the skin is on, softened over one pixel. */
      float w = length(nv.xy - nv.z * p / max(Xs.z, 0.02)) / uR + 0.00001;
      float below = clamp(0.5 - dot(Xs, nv) / w, 0.0, 1.0);
      float cover = below * (1.0 - smoothstep(1.0 - rim, 1.0, rad));
      vec3 piece = vec3(0.0);
      if (cover > 0.0) piece = skin(Xs, Xs) * cover;
      /* Past the skin of the missing half, the eye lands on the flat face. */
      if (below < 1.0 && nv.z > 0.001) {
        vec3 Xf = vec3(p, -dot(p, nv.xy) / nv.z);
        float rf = length(Xf);
        float wf = length(p - Xf.z * nv.xy / nv.z) / (max(rf, 0.001) * uR) + 0.00001;
        float onFace = (1.0 - below) * clamp(0.5 + (1.0 - rf) / wf, 0.0, 1.0);
        if (onFace > 0.0) {
          piece += face(Xf, 1.0 / (uR * max(nv.z, 0.2))) * onFace;
          cover += onFace;
        }
      }
      col = col * (1.0 - cover) + piece;
    }
    if (uCut.y > 0.0) {
      vec3 o = nv * uCut.x;
      vec2 q = p - o.xy;
      float qr = length(q);
      if (qr < 1.0) {
        vec3 Ns = vec3(q, sqrt(1.0 - qr * qr));
        float w = length(nv.xy - nv.z * q / max(Ns.z, 0.02)) / uR + 0.00001;
        float lid = clamp(0.5 + dot(Ns, nv) / w, 0.0, 1.0) * (1.0 - smoothstep(1.0 - rim, 1.0, qr)) * uCut.y;
        if (lid > 0.0) col = mix(col, skin(Ns, o + Ns), lid);
      }
    }
  }

  /* Film-like roll-off, so a close lamp never burns the stone out. */
  col = 1.0 - exp(-col * 1.2);
  vec3 shown = pow(max(col, 0.0), vec3(1.0 / 2.2));
  float noise = (hash(px) + hash(px + 3.17) - 1.0) / 255.0;
  gl_FragColor = vec4(max(shown + noise, BASALT), 1.0);
}`;

type Vec3 = [number, number, number];
type Mat3 = number[];
type Quat = [number, number, number, number];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const between = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* The six faces of a cube map, in WebGL's order: where each looks, and which way its texels run. */
const FACES: [Vec3, Vec3, Vec3][] = [
  [[1, 0, 0], [0, 0, -1], [0, -1, 0]],
  [[-1, 0, 0], [0, 0, 1], [0, -1, 0]],
  [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
  [[0, -1, 0], [1, 0, 0], [0, 0, -1]],
  [[0, 0, 1], [1, 0, 0], [0, -1, 0]],
  [[0, 0, -1], [-1, 0, 0], [0, -1, 0]],
];
/* The plane of the cut, as FACE_RIGHT and FACE_DOWN in the shaders. */
const FACE_RIGHT: Vec3 = [0.9832, 0, 0.1825];
const FACE_DOWN: Vec3 = [-0.0292, 0.9871, 0.1574];

/* The photographs the stone is drawn from, and the texture units they are read from. See scripts/stone-textures.mjs. */
const SOURCES: [string, number][] = [
  ["/assets/stone-skin.webp", 3],
  ["/assets/stone-face.webp", 4],
];

/*
  Puts a loaded picture on a texture unit, to be read as it is. The photographs of the stone are
  squares of a power of two, so they also get their smaller sizes, for a cube smaller than they are.
*/
function upload(gl: WebGLRenderingContext, unit: number, image: HTMLImageElement) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  const square = image.naturalWidth === image.naturalHeight && (image.naturalWidth & (image.naturalWidth - 1)) === 0;
  if (square) gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, square ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

/*
  Draws the cut face into a sheet on texture unit 0 and the skin into a cube map on unit 2, one
  piece per call so that opening the page never stalls. Each call returns true once all seven are
  done. Until then both read as black, which the opening eclipse hides.
*/
function baker(gl: WebGLRenderingContext, size: number) {
  const program = createProgram(gl, FULLSCREEN_VERTEX, BAKE);
  const uForward = gl.getUniformLocation(program, "uForward");
  const uRight = gl.getUniformLocation(program, "uRight");
  const uUp = gl.getUniformLocation(program, "uUp");
  const uKind = gl.getUniformLocation(program, "uKind");
  gl.uniform1f(gl.getUniformLocation(program, "uSize"), size);
  gl.uniform1i(gl.getUniformLocation(program, "uSkinSrc"), SOURCES[0][1]);
  gl.uniform1i(gl.getUniformLocation(program, "uFaceSrc"), SOURCES[1][1]);

  const cube = gl.createTexture();
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube);
  for (let i = 0; i < 6; i++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const sheet = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sheet);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const frame = gl.createFramebuffer();

  const finish = (target: number) => {
    gl.generateMipmap(target);
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    /* Sharper where the surface turns away from the eye. */
    const sharper = gl.getExtension("EXT_texture_filter_anisotropic");
    if (sharper) gl.texParameterf(target, sharper.TEXTURE_MAX_ANISOTROPY_EXT, 4);
  };

  let piece = 0;
  return () => {
    if (piece === 7) return true;
    /* The sheet, then the six faces of the cube. */
    const [forward, right, up] = FACES[Math.max(piece - 1, 0)];
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
    if (piece === 0) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sheet, 0);
    else gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + piece - 1, cube, 0);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, size, size);
    gl.uniform1f(uKind, piece === 0 ? 0 : 1);
    gl.uniform3fv(uForward, forward);
    gl.uniform3fv(uRight, right);
    gl.uniform3fv(uUp, up);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (++piece < 7) return false;

    gl.deleteFramebuffer(frame);
    gl.deleteProgram(program);
    gl.activeTexture(gl.TEXTURE2);
    finish(gl.TEXTURE_CUBE_MAP);
    gl.activeTexture(gl.TEXTURE0);
    finish(gl.TEXTURE_2D);
    return true;
  };
}

/* The lamp's path when left alone: higher as it comes round to the front, lower behind the stone. */
function orbit(angle: number, t: number): Vec3 {
  const y = -0.7 - 0.3 * Math.cos(angle) - 0.1 * Math.sin(t * 0.05);
  return [-Math.sin(angle) * 2.35, y, Math.cos(angle) * 2.35];
}

/* Near the stone the lamp hangs in front of it. Further out it drops to a grazing light. */
function pointerLamp(x: number, y: number): Vec3 {
  const d = Math.hypot(x, y);
  const limit = d > 3 ? 3 / d : 1;
  return [x * limit, y * limit, 1.55 - 0.5 * smooth(0, 1, d) - 0.65 * smooth(1, 2.8, d)];
}

/*
  How the stone is turned: three rows that take its own frame to the viewer's. Handed to the shader
  as they stand, they read there as the opposite turn, from the viewer back to the stone.
*/
function turned(yaw: number, pitch: number): Mat3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  return [cy, sp * sy, -cp * sy, 0, cp, sp, sy, -sp * cy, cp * cy];
}

/* The cut face square to the eye and reading as the mark. Then the same, tipped back so the face looks up. */
const FACING: Mat3 = [...FACE_RIGHT, ...FACE_DOWN, -0.1801, -0.1601, 0.9705];
function tipped(angle: number): Mat3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const f = FACING;
  return [f[0], f[1], f[2], c * f[3] - s * f[6], c * f[4] - s * f[7], c * f[5] - s * f[8], s * f[3] + c * f[6], s * f[4] + c * f[7], s * f[5] + c * f[8]];
}

function quatOf(m: Mat3): Quat {
  const trace = m[0] + m[4] + m[8];
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    return [(m[7] - m[5]) * s, (m[2] - m[6]) * s, (m[3] - m[1]) * s, 0.25 / s];
  }
  if (m[0] > m[4] && m[0] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[0] - m[4] - m[8]);
    return [0.25 * s, (m[1] + m[3]) / s, (m[2] + m[6]) / s, (m[7] - m[5]) / s];
  }
  if (m[4] > m[8]) {
    const s = 2 * Math.sqrt(1 + m[4] - m[0] - m[8]);
    return [(m[1] + m[3]) / s, 0.25 * s, (m[5] + m[7]) / s, (m[2] - m[6]) / s];
  }
  const s = 2 * Math.sqrt(1 + m[8] - m[0] - m[4]);
  return [(m[2] + m[6]) / s, (m[5] + m[7]) / s, 0.25 * s, (m[3] - m[1]) / s];
}

function matOf([x, y, z, w]: Quat): Mat3 {
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
    2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
    2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
  ];
}

/* The shortest turn from one way of facing to another, taken part of the way. */
function slerp(a: Quat, b: Quat, t: number): Quat {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const sign = dot < 0 ? -1 : 1;
  dot *= sign;
  const angle = Math.acos(Math.min(dot, 1));
  const [wa, wb] = angle < 0.001 ? [1 - t, t] : [Math.sin((1 - t) * angle) / Math.sin(angle), Math.sin(t * angle) / Math.sin(angle)];
  const q = a.map((v, i) => v * wa + b[i] * wb * sign);
  const length = Math.hypot(...q);
  return q.map((v) => v / length) as Quat;
}

/* How far back the face is tipped while the stone is being cut, and the lamp's place for the cut and for the face. */
const TIP = 1.15;
const CUT_POSE = quatOf(tipped(TIP));
const CUT_LAMP: Vec3 = [-1.2, -2.0, 1.5];
const FACE_LAMP: Vec3 = [-0.4, -1.6, 2.1];

/*
  Where each part of the cut falls along the scroll, from 0 at the top of the page to 1 where the
  stone lets go. The captions in Cut.tsx keep time with these.
*/
function beats(cut: number) {
  return {
    /* The stone turns to offer the plane of the cut, which glows for a moment. */
    pose: smooth(0, 0.2, cut),
    seam: smooth(0.1, 0.2, cut) * (1 - smooth(0.22, 0.32, cut)),
    /* The lid lifts off and is lost in the dark. */
    lift: 1.15 * smooth(0.21, 0.47, cut),
    lid: 1 - smooth(0.27, 0.42, cut),
    /* The polish crosses the face while the half tips forward to show it. */
    polish: smooth(0.42, 0.68, cut),
    turn: smooth(0.47, 0.75, cut),
    /* The stone goes dark and leaves the mark. */
    mark: smooth(0.78, 0.93, cut),
  };
}

export function HeroStone() {
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [moved, setMoved] = useState(false);
  const [away, setAway] = useState(false);
  /* Whether a phone's tilt moves the lamp: not at all, only once the visitor allows it, or already. */
  const [tilt, setTilt] = useState<"off" | "ask" | "on">("off");
  const startTilt = useRef(() => {});
  /* On a phone the hint shows among the hero's lines, in a place Hero.tsx leaves for it. */
  const [slot, setSlot] = useState<Element | null>(null);
  /*
    The browser is told of the photographs before the script that will ask for them has arrived, but
    behind the type: on a slow line the headline comes first, and the stone opens in eclipse anyway.
  */
  for (const [src] of SOURCES) preload(src, { as: "image", fetchPriority: "low" });

  useEffect(() => {
    /*
      Everything that draws the stone: the context, the shaders, the listeners. Compiling the shaders
      holds the page for a moment, so it waits until the type has its faces and the first frame with
      the headline is on the screen. The stone opens in eclipse, so the wait is never seen.
    */
    const init = () => {
      const pin = pinRef.current;
      const canvas = canvasRef.current;
      const anchor = anchorRef.current;
      const track = pin?.parentElement;
      const stage = pin?.closest<HTMLElement>(".stage");
      if (!pin || !canvas || !anchor || !track || !stage) return;

      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      /* Where the browser could only draw this in software the scene would crawl, so it is asked to decline and the still is shown. */
      const options = { alpha: false, antialias: false, preserveDrawingBuffer: still || process.env.NODE_ENV !== "production", failIfMajorPerformanceCaveat: true };
      const gl = (canvas.getContext("webgl2", options) ?? canvas.getContext("webgl", options)) as WebGLRenderingContext | null;
      if (!gl) {
        delete stage.dataset.cut;
        setFailed(true);
        return;
      }
      let program: WebGLProgram;
      let bakeNext: (() => boolean) | null;
      try {
        /*
          A face of the cube needs about as many texels across as the stone has pixels: 2048 for a
          large stone on a sharp screen, as far as this machine allows, down to 512 on a small one.
        */
        const across = anchor.getBoundingClientRect().width * Math.min(window.devicePixelRatio || 1, 2);
        const most = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE) as number;
        bakeNext = baker(gl, Math.min(across > 1100 ? 2048 : across > 620 ? 1024 : 512, most));
        program = createProgram(gl, FULLSCREEN_VERTEX, SCENE);
      } catch (error) {
        console.error(error);
        delete stage.dataset.cut;
        setFailed(true);
        return;
      }
      const u = (name: string) => gl.getUniformLocation(program, name);
      const uRes = u("uRes"), uC = u("uC"), uR = u("uR"), uPower = u("uPower"), uLoaded = u("uLoaded");
      const uTime = u("uTime"), uFloor = u("uFloor"), uLamp = u("uLamp"), uRot = u("uRot");
      const uOpen = u("uOpen"), uSeam = u("uSeam"), uCut = u("uCut");
      gl.uniform1i(u("uFace"), 0);
      gl.uniform1i(u("uStand"), 1);
      gl.uniform1i(u("uSkin"), 2);
      gl.clearColor(15 / 255, 14 / 255, 12 / 255, 1);

      /* With the stone alive and motion allowed, the page holds it in place and cuts it as it scrolls. A script in page.tsx has usually set this already. */
      if (!still) stage.dataset.cut = "live";
      setSlot(stage.querySelector("[data-stone-hint]"));

      /* The stone's place comes from the CSS anchor. Radius and centre here are in CSS pixels, from the corner of the pinned box. */
      let quality = 1;
      let radius = 1;
      let centre = { x: 0, y: 0 };
      let edge = 0;
      let density = 1;
      /* On a narrow screen the stone runs off the side. For the cut it draws in until the whole face fits. */
      let fit = { scale: 1, shift: 0 };
      /* Where the held box stops against the top of the screen. It is above the top when the hero is taller than the screen. */
      let hold = 0;
      const measure = () => {
        const box = pin.getBoundingClientRect();
        const mark = anchor.getBoundingClientRect();
        const stacked = window.matchMedia(STACKED).matches;
        radius = mark.width / 2;
        centre = { x: mark.left - box.left + radius, y: mark.top - box.top + radius };

        /* From the page's left edge, so the light on the wall behind the stone dies away on its own and is never cut short by the canvas. */
        const left = 0;
        const right = Math.min(box.width, centre.x + radius * 2.1);
        const height = stacked ? pin.offsetHeight : centre.y + radius * 2.66;
        canvas.style.left = `${left}px`;
        canvas.style.width = `${right - left}px`;
        canvas.style.height = `${height}px`;
        hold = parseFloat(getComputedStyle(pin).top) || 0;

        edge = left;
        density = Math.min(window.devicePixelRatio || 1, 2) * quality;
        fit = stacked ? { scale: Math.min(1, (box.width * 0.86) / (radius * 2)), shift: box.width / 2 - centre.x } : { scale: 1, shift: 0 };
        canvas.width = Math.max(2, Math.round((right - left) * density));
        canvas.height = Math.max(2, Math.round(height * density));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uFloor, stacked ? canvas.height : canvas.height * 2);
      };

      /* How far the page has scrolled through the cut: 0 until the stone is held, 1 where it is let go. */
      const scrolled = () => {
        const box = track.getBoundingClientRect();
        const span = box.height - pin.offsetHeight;
        if (still || span <= 0) return 0;
        return clamp((hold - box.top) / span, 0, 1);
      };

      /* Scene state. */
      let t = 0;
      let angle = Math.PI * 0.94;
      const lamp: Vec3 = still ? [-1.75, -1.3, 1.1] : orbit(angle, 0);
      const velocity: Vec3 = [0, 0, 0];
      let goal: Vec3 = [...lamp];
      let held = false;
      let lastPointer = -Infinity;
      let yaw = 0, pitch = 0.06;
      let spinYaw = 0, spinPitch = 0;
      let dragging = false;
      let dragId = -1;
      let dragX = 0, dragY = 0, dragTime = 0;
      let travel = 0;
      let loaded = 0;
      let stand = false;
      /* How many of the photographs the stone is drawn from have arrived, and how long the lamp has been up since they were drawn. */
      let sources = 0;
      let lit = 0;
      let stale = false;
      let cut = 0;
      let far = false;
      let joined = false;
      let tiltHolds = false;
      let beat = beats(0);
      let facing = turned(yaw, pitch);

      /* One more piece of the stone, once the photographs are here, then back to the scene. */
      const bake = () => {
        if (!bakeNext || sources < SOURCES.length) return;
        if (bakeNext()) bakeNext = null;
        gl.useProgram(program);
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      const bakeAll = () => {
        while (bakeNext && sources === SOURCES.length) bake();
      };

      const draw = () => {
        /* Shade only what is near the viewport. The stand can run far below the fold. With motion reduced nothing is drawn again on scrolling, so all of it is shaded. */
        const box = canvas.getBoundingClientRect();
        const scale = canvas.height / box.height;
        const margin = window.innerHeight * 0.3;
        const from = still ? 0 : Math.max(0, -box.top - margin);
        const to = still ? box.height : Math.min(box.height, window.innerHeight - box.top + margin);
        gl.disable(gl.SCISSOR_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(0, Math.floor(canvas.height - to * scale), canvas.width, Math.ceil(Math.max(0, to - from) * scale));

        gl.uniform2f(uC, (centre.x + fit.shift * beat.pose - edge) * density, centre.y * density);
        gl.uniform1f(uR, radius * (1 + (fit.scale - 1) * beat.pose) * density);
        gl.uniform3f(uLamp, lamp[0], lamp[1], lamp[2]);
        gl.uniformMatrix3fv(uRot, false, facing);
        gl.uniform1f(uOpen, cut > 0 ? 1 : 0);
        gl.uniform1f(uSeam, beat.seam);
        gl.uniform4f(uCut, beat.lift, beat.lid, beat.polish, beat.mark);
        gl.uniform1f(uTime, t);
        gl.uniform1f(uPower, still ? 1 : smooth(0, 2.6, lit));
        gl.uniform1f(uLoaded, loaded);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      /* Moves the scene on by a moment: where the scroll has reached, the lamp, and how the stone is turned. */
      const advance = (now: number, dt: number) => {
        t += dt;
        /* The lamp comes up only once there is a stone to light. */
        if (!bakeNext) lit += dt;
        const reached = scrolled();
        if (reached !== cut) {
          cut = reached;
          beat = beats(cut);
          stage.style.setProperty("--cut", cut.toFixed(4));
          if (cut > 0.02 !== far) {
            far = !far;
            setAway(far);
          }
          /* The name and the field at the end of the cut are only there to be used once the mark is forming. */
          if (cut > 0.8 !== joined) {
            joined = !joined;
            if (joined) stage.dataset.join = "";
            else delete stage.dataset.join;
          }
        }
        sound.scene(beat, dt);

        /* The pointer holds the lamp for a while. Then it goes back to circling from wherever it was left. */
        const wasHeld = held;
        held = dragging || now - lastPointer < 6000;
        if (!held) {
          tiltHolds = false;
          if (wasHeld) angle = Math.atan2(-lamp[0], lamp[2]);
          angle -= dt * (0.08 + 0.23 * Math.exp(-t / 4.5));
          goal = orbit(angle, t);
        }
        /* Through the cut the lamp mostly keeps to its marks, above the stone and then before the face. */
        const staged = 0.8 * smooth(0, 0.14, cut);
        const target = staged > 0 ? between(goal, between(CUT_LAMP, FACE_LAMP, beat.turn), staged) : goal;
        const stiffness = held || staged > 0 ? 3.4 : 1.4;
        for (let i = 0; i < 3; i++) {
          velocity[i] += (stiffness * stiffness * (target[i] - lamp[i]) - 2 * stiffness * velocity[i]) * dt;
          lamp[i] += velocity[i] * dt;
        }

        if (!dragging) {
          const friction = Math.exp(-dt * 1.4);
          spinYaw *= friction;
          spinPitch *= friction;
          yaw += (0.03 + spinYaw) * dt;
          pitch = clamp(pitch + spinPitch * dt + (0.06 - pitch) * (1 - Math.exp(-dt * 0.5)), -0.7, 0.7);
        }
        /* The stone turns freely, then turns to offer the cut, then tips forward to show the face. */
        if (cut <= 0) facing = turned(yaw, pitch);
        else if (beat.pose < 1) facing = matOf(slerp(quatOf(turned(yaw, pitch)), CUT_POSE, beat.pose));
        else facing = tipped(TIP * (1 - beat.turn));
        if (stand) loaded = Math.min(1, loaded + dt / 1.6);
      };

      let raf = 0;
      let visible = true;
      let last = 0;
      let frames = 0, spent = 0;
      const tick = (now: number) => {
        raf = 0;
        if (!visible || still) return;
        raf = requestAnimationFrame(tick);
        /* Left alone the scene moves slowly, so half the frames are enough. */
        const calm = scrolled() === cut && !held && !dragging && Math.abs(spinYaw) < 0.02 && Math.abs(spinPitch) < 0.02;
        if (calm && now - last < 30) return;
        const real = (now - last) / 1000;
        last = now;
        advance(now, Math.min(real, 0.05));

        if (stale) {
          measure();
          stale = false;
        }
        bake();
        draw();

        /*
          Step the resolution down if this machine cannot keep up. A phone that is saving power draws
          thirty frames a second however light the work, so that pace is let be. A pace near one frame
          a second is a tab the browser is holding back, not a slow machine.
        */
        frames++;
        spent += Math.min(real, 1);
        if (frames === 40) {
          const pace = spent / frames;
          if (pace > (calm ? 0.052 : 0.042) && pace < 0.6 && quality > 0.55) {
            quality *= 0.82;
            stale = true;
          }
          frames = 0;
          spent = 0;
        }
      };
      const wake = () => {
        if (still) draw();
        else if (!raf && visible) {
          last = performance.now();
          raf = requestAnimationFrame(tick);
        }
      };

      /* Pointer: the lamp follows it, and dragging the stone turns it. Once the cut has begun the stone is no longer free to turn. */
      const toStone = (e: PointerEvent) => {
        const box = pin.getBoundingClientRect();
        const r = radius * (1 + (fit.scale - 1) * beat.pose);
        return { x: (e.clientX - box.left - centre.x - fit.shift * beat.pose) / r, y: (e.clientY - box.top - centre.y) / r };
      };
      const noticed = (distance: number) => {
        travel += distance;
        if (travel > 2.5) setMoved(true);
      };
      const holdLamp = (x: number, y: number) => {
        goal = pointerLamp(x, y);
        tiltHolds = false;
        lastPointer = performance.now();
        if (still) lamp.splice(0, 3, ...goal);
      };
      const onMove = (e: PointerEvent) => {
        const s = toStone(e);
        /* While the stone is being turned, only the finger that took it counts. */
        const turning = dragging && e.pointerId === dragId;
        if (turning) {
          const now = performance.now();
          const dx = (e.clientX - dragX) / radius, dy = (e.clientY - dragY) / radius;
          const step = Math.max((now - dragTime) / 1000, 0.004);
          dragX = e.clientX;
          dragY = e.clientY;
          dragTime = now;
          yaw -= dx * 0.9;
          pitch = clamp(pitch + dy * 0.9, -0.7, 0.7);
          spinYaw = clamp(spinYaw * 0.6 - (dx * 0.9 * 0.4) / step, -5, 5);
          spinPitch = clamp(spinPitch * 0.6 + (dy * 0.9 * 0.4) / step, -1.5, 1.5);
          noticed(Math.hypot(dx, dy) * 3);
          if (still) facing = turned(yaw, pitch);
        }
        if (dragging ? turning : e.pointerType === "mouse") {
          holdLamp(s.x, s.y);
          if (!dragging) noticed(Math.hypot(e.movementX, e.movementY) / radius);
        }
        if (e.pointerType === "mouse" && !dragging) stage.style.cursor = cut <= 0.01 && Math.hypot(s.x, s.y) < 1.02 ? "grab" : "";
        if (still) wake();
      };
      const onDown = (e: PointerEvent) => {
        /* One finger, or the main button of the mouse. */
        if (dragging || !e.isPrimary || e.button !== 0) return;
        if (cut > 0.01 || (e.target as HTMLElement).closest("a, button, input, label")) return;
        const s = toStone(e);
        if (Math.hypot(s.x, s.y) > 1.02) return;
        dragging = true;
        dragId = e.pointerId;
        dragX = e.clientX;
        dragY = e.clientY;
        dragTime = performance.now();
        spinYaw = 0;
        spinPitch = 0;
        holdLamp(s.x, s.y);
        stage.setPointerCapture(e.pointerId);
        if (e.pointerType === "mouse") {
          stage.style.cursor = "grabbing";
          e.preventDefault();
        }
        if (still) wake();
      };
      const onUp = (e: PointerEvent) => {
        if (!dragging || e.pointerId !== dragId) return;
        dragging = false;
        if (performance.now() - dragTime > 90) {
          spinYaw = 0;
          spinPitch = 0;
        }
        stage.style.cursor = e.pointerType === "mouse" && cut <= 0.01 ? "grab" : "";
      };
      const onLeave = () => {
        if (!dragging) lastPointer = -Infinity;
      };
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerdown", onDown);
      stage.addEventListener("pointerup", onUp);
      stage.addEventListener("pointercancel", onUp);
      stage.addEventListener("pointerleave", onLeave);

      /*
        Tilting a phone moves the lamp, as the pointer does on a desktop. The reading used is which way
        is down across the face of the phone, which stays steady however upright the phone is held.
      */
      let rest: { x: number; y: number } | null = null;
      let lastTilt = { x: 0, y: 0 };
      let tiltTime = 0;
      let sensed = false;
      const onTilt = (e: DeviceOrientationEvent) => {
        if (e.beta === null || e.gamma === null) return;
        if (!sensed) {
          sensed = true;
          setTilt("on");
        }
        const b = (e.beta * Math.PI) / 180, g = (e.gamma * Math.PI) / 180;
        const gx = Math.cos(b) * Math.sin(g), gy = -Math.sin(b);
        /* The same, as the screen is turned. */
        const turn = (((window.screen.orientation?.angle ?? window.orientation ?? 0) % 360) + 360) % 360;
        const [x, y] = turn === 90 ? [-gy, -gx] : turn === 180 ? [-gx, gy] : turn === 270 ? [gy, gx] : [gx, -gy];
        const now = performance.now();
        if (!rest) {
          rest = { x, y };
          lastTilt = { x, y };
          tiltTime = now;
          return;
        }
        /* The resting pose drifts toward however the phone is being held, so a new posture becomes the new neutral. */
        const drift = 1 - Math.exp(-(now - tiltTime) / 10000);
        tiltTime = now;
        rest.x += (x - rest.x) * drift;
        rest.y += (y - rest.y) * drift;
        /* A tremor of the hand does not take the lamp, and nothing does until the opening eclipse has passed. */
        const shift = Math.hypot(x - lastTilt.x, y - lastTilt.y);
        if (shift > 0.02) {
          lastTilt = { x, y };
          if (t > 5 && !dragging) {
            tiltHolds = true;
            lastPointer = now;
            noticed(shift * 4);
          }
        }
        if (tiltHolds && !dragging) goal = pointerLamp(-0.55 + clamp((x - rest.x) * 4.5, -2.2, 2.2), -0.6 + clamp((y - rest.y) * 4.5, -2.2, 2.2));
      };
      startTilt.current = () => window.addEventListener("deviceorientation", onTilt);
      if (!still && window.matchMedia("(hover: none)").matches && typeof window.DeviceOrientationEvent !== "undefined") {
        /* An iPhone must be asked, and only when the visitor taps. Elsewhere the readings simply start. */
        if (typeof (window.DeviceOrientationEvent as unknown as { requestPermission?: unknown }).requestPermission === "function") setTilt("ask");
        else startTilt.current();
      }

      /* The photographs. The stone is drawn as soon as its two are here; the stand's can come later, and the eclipse can open before it. */
      let disposed = false;
      const picture = (src: string, onto: (image: HTMLImageElement) => void) => {
        const image = new window.Image();
        image.onload = () => {
          if (disposed) return;
          onto(image);
          wake();
        };
        image.src = src;
        return image;
      };
      for (const [src, unit] of SOURCES) {
        picture(src, (image) => {
          upload(gl, unit, image);
          sources++;
          /* With motion reduced there is no opening to hide behind, so the whole stone is drawn first. */
          if (still) {
            bakeAll();
            draw();
          }
        }).onerror = () => {
          if (disposed) return;
          stop();
          setFailed(true);
        };
      }
      picture("/assets/stand.webp", (image) => {
        upload(gl, 1, image);
        stand = true;
        if (still) {
          loaded = 1;
          draw();
        }
      });

      measure();
      draw();

      const resize = new ResizeObserver(() => {
        measure();
        draw();
      });
      resize.observe(stage);
      const watch = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) wake();
      });
      watch.observe(canvas);
      /* Everything that draws or listens stops here: when the page is left, or when the graphics context is lost and the still takes over. */
      const stop = () => {
        disposed = true;
        cancelAnimationFrame(raf);
        resize.disconnect();
        watch.disconnect();
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerdown", onDown);
        stage.removeEventListener("pointerup", onUp);
        stage.removeEventListener("pointercancel", onUp);
        stage.removeEventListener("pointerleave", onLeave);
        window.removeEventListener("deviceorientation", onTilt);
        startTilt.current = () => {};
        canvas.removeEventListener("webglcontextlost", onLost);
        stage.style.cursor = "";
        stage.style.removeProperty("--cut");
        delete stage.dataset.cut;
        delete stage.dataset.join;
      };
      const onLost = (e: Event) => {
        e.preventDefault();
        stop();
        setFailed(true);
      };
      canvas.addEventListener("webglcontextlost", onLost);
      wake();

      /*
        Only while developing: window.__stone lets the console run the scene on, or save a still of
        the stone, which is how public/assets/stone-still.webp and the share image are made. See the README.
      */
      if (process.env.NODE_ENV !== "production") {
        /* Runs the scene on by so many seconds, finishes the bake, and draws. */
        const settle = (seconds = 8) => {
          bakeAll();
          for (let i = 0; i < seconds * 20; i++) advance(performance.now(), 0.05);
          measure();
          draw();
          return { cut: +cut.toFixed(3), lamp: lamp.map((v) => +v.toFixed(2)), t: +t.toFixed(1), quality };
        };
        (window as unknown as { __stone: unknown }).__stone = {
          settle,
          /* Scrolls to a point of the cut, 0 to 1, and settles there. */
          go(p: number, seconds = 6) {
            document.documentElement.style.scrollBehavior = "auto";
            window.scrollTo(0, Math.round(p * (track.getBoundingClientRect().height - pin.offsetHeight) - hold));
            return settle(seconds);
          },
          /* Draws the whole stone, its stand and foot, at a given width, and posts the PNG to a local address. */
          still(width = 2400, at: Vec3 = [-1.3, -1.5, 1.5], yaw = 0.36, url = "http://127.0.0.1:8791/save?name=still.png") {
            bakeAll();
            const R = width / 3.7236;
            const height = Math.round(R * 4.0745);
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, width, height);
            gl.uniform2f(uRes, width, height);
            gl.uniform1f(uFloor, height * 2);
            gl.disable(gl.SCISSOR_TEST);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform2f(uC, R * 1.8385, R * 1.4596);
            gl.uniform1f(uR, R);
            gl.uniform3f(uLamp, at[0], at[1], at[2]);
            gl.uniformMatrix3fv(uRot, false, turned(yaw, 0.06));
            gl.uniform1f(uOpen, 0);
            gl.uniform1f(uSeam, 0);
            gl.uniform4f(uCut, 0, 0, 0, 0);
            gl.uniform1f(uTime, 20);
            gl.uniform1f(uPower, 1);
            gl.uniform1f(uLoaded, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
            return new Promise<string>((resolve) =>
              canvas.toBlob(async (blob) => {
                const res = await fetch(url, { method: "POST", body: blob });
                stale = true;
                resolve(`${width}x${height}, ${blob?.size} bytes, saved ${res.status}`);
              }, "image/png"),
            );
          },
        };
      }

      return stop;
    };

    let cancelled = false;
    let frame = 0;
    let stopStone: (() => void) | undefined;
    const ready = document.fonts?.ready ?? Promise.resolve();
    void ready.then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!cancelled) stopStone = init();
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stopStone?.();
    };
  }, []);

  const allowTilt = async () => {
    try {
      const answer = await (window.DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
      if (answer !== "granted") throw new Error(answer);
      startTilt.current();
      setTilt("on");
    } catch {
      setTilt("off");
    }
  };
  /* A hint goes once it has been taken, or once the page has moved on. The one that asks for the tilt waits at the top until it is answered. */
  const hidden = away || (tilt !== "ask" && moved);
  const fading = `italic text-ash transition-opacity duration-1000 ${hidden ? "opacity-0" : ""}`;
  /* The same hint in two places, and CSS shows one: under the stone, or on a phone at the end of the hero's last line, where there is room for fewer words. */
  const hint = (brief: boolean) => (
    <span className="stone-hint-in">
      <span className="stone-hint-mouse" aria-hidden="true">
        Move the light.
      </span>
      <span className="stone-hint-touch">
        {tilt === "ask" ? (
          <button type="button" className="stone-tilt" onClick={allowTilt} disabled={hidden}>
            {brief ? "Tap to tilt the light." : "Tap, then tilt to move the light."}
          </button>
        ) : (
          <span aria-hidden="true">{tilt === "on" ? "Tilt to move the light." : "Turn the stone."}</span>
        )}
      </span>
    </span>
  );

  return (
    <div ref={pinRef} className="stone-pin">
      <div ref={anchorRef} className="stone-anchor" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A sphere of lunar meteorite on a brass stand, lit by a moving light. As the page scrolls it is cut in two, and the cut face becomes the Meteorite mark."
        className={`absolute top-0 ${failed ? "hidden" : ""}`}
      />
      {failed && <Image src={STILL} alt="A sphere of lunar meteorite on a brass stand" width={2400} height={2626} sizes="100vw" quality={90} loading="eager" fetchPriority="high" className="stone-fallback" />}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={STILL} alt="A sphere of lunar meteorite on a brass stand" className="stone-fallback" />
      </noscript>
      {!failed && <p className={`stone-hint ${fading}`}>{hint(false)}</p>}
      {!failed && slot && createPortal(<p className={fading}>{hint(true)}</p>, slot)}
    </div>
  );
}
