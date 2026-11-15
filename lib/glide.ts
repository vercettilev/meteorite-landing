/*
  Takes the page to a place on it by travelling, not jumping. The way down to the form runs through
  the cut, so on the way the visitor watches the stone being cut: the glide sets off gently, keeps
  one pace through the cut so that each beat of it gets its share, and comes to rest slowly while
  the mark forms. While it travels, data-glide on the root keeps the cut's three lines away
  (globals.css): at this pace they would only flicker past. A wheel, a touch or a key of the
  visitor's own stops it where it is. With motion reduced it jumps, as a plain link would.
*/
let frame = 0;
let stop: () => void = () => {};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/*
  How far along the way the glide is at a share u of its time. Its pace rises smoothly over the
  first part, holds, and falls smoothly over the last, longer part; this is that pace summed.
*/
const RISE = 0.2;
const FALL = 0.4;
function along(u: number) {
  const ramp = (t: number) => t * t * t - (t * t * t * t) / 2;
  const whole = 1 - RISE / 2 - FALL / 2;
  let d: number;
  if (u < RISE) d = RISE * ramp(u / RISE);
  else if (u <= 1 - FALL) d = RISE / 2 + (u - RISE);
  else {
    const w = u - (1 - FALL);
    d = RISE / 2 + (1 - RISE - FALL) + w - FALL * ramp(w / FALL);
  }
  return d / whole;
}

/* Travels to target, then puts its hash in the address and, with a mouse, focus in the field given. */
export function glide(target: HTMLElement, hash: string, field?: string) {
  stop();
  const root = document.documentElement;
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const padding = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
  const from = window.scrollY;
  const to = clamp(target.getBoundingClientRect().top + from - margin - padding, 0, root.scrollHeight - window.innerHeight);

  const arrive = () => {
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    const input = field ? document.querySelector<HTMLElement>(field) : null;
    /* The field shows only once the mark has formed, a frame or two after the glide comes to rest. */
    if (input && window.matchMedia("(pointer: fine)").matches) window.setTimeout(() => input.focus({ preventScroll: true }), 160);
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || Math.abs(to - from) < 2) {
    window.scrollTo(0, to);
    arrive();
    return;
  }

  /* About seven tenths of a second for each screen's height of the way, within bounds: the whole cut takes some three seconds. */
  const seconds = clamp(1 + (0.7 * Math.abs(to - from)) / window.innerHeight, 1.2, 4.5);
  const begun = performance.now();
  const halt = ["wheel", "touchstart", "keydown", "mousedown"] as const;
  stop = () => {
    cancelAnimationFrame(frame);
    halt.forEach((type) => window.removeEventListener(type, stop));
    delete root.dataset.glide;
    stop = () => {};
  };
  halt.forEach((type) => window.addEventListener(type, stop, { passive: true }));
  root.dataset.glide = "";

  const step = (now: number) => {
    const u = Math.min((now - begun) / (seconds * 1000), 1);
    window.scrollTo(0, from + (to - from) * along(u));
    if (u < 1) frame = requestAnimationFrame(step);
    else {
      stop();
      arrive();
    }
  };
  frame = requestAnimationFrame(step);
}
