// Shared math, RNG and value-noise helpers. Everything deterministic — the
// whole gallery must look identical on every visit.

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Mulberry32 — small seedable PRNG.
export function mulberry(seed) {
  let a = seed >>> 0 || 1;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const fract = (x) => x - Math.floor(x);
const fade = (t) => t * t * (3 - 2 * t);

export const hash2 = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
const hash3 = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123);

export function vnoise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const u = fade(x - xi), v = fade(y - yi);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (lerp(lerp(a, b, u), lerp(c, d, u), v)) * 2 - 1;
}

export function fbm2(x, y, oct = 4) {
  let f = 0, amp = 0.5, tot = 0;
  for (let i = 0; i < oct; i++) {
    f += vnoise2(x, y) * amp; tot += amp;
    x = x * 2.03 + 11.7; y = y * 2.03 + 5.2; amp *= 0.5;
  }
  return f / tot;
}

export function vnoise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
  const n = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  const lo = lerp(lerp(n(0, 0, 0), n(1, 0, 0), u), lerp(n(0, 1, 0), n(1, 1, 0), u), v);
  const hi = lerp(lerp(n(0, 0, 1), n(1, 0, 1), u), lerp(n(0, 1, 1), n(1, 1, 1), u), v);
  return lerp(lo, hi, w) * 2 - 1;
}

export function fbm3(x, y, z, oct = 3) {
  let f = 0, amp = 0.5, tot = 0;
  for (let i = 0; i < oct; i++) {
    f += vnoise3(x, y, z) * amp; tot += amp;
    x = x * 2.11 + 9.1; y = y * 2.11 + 3.7; z = z * 2.11 + 1.3; amp *= 0.5;
  }
  return f / tot;
}

export function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d') };
}
