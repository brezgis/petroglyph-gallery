// The engraving engine. Petroglyphs are drawn as thousands of little "peck
// marks" along author-defined polylines, composited onto a procedurally
// weathered rock face, then embossed into a normal map so the sconce light
// catches the grooves.

import * as THREE from 'three';
import { mulberry, fbm2, TAU, DEG, clamp, makeCanvas } from '../util.js';

// Rock finishes. `engrave` is the exposed color of a fresh peck; on desert
// varnish it is lighter than the crust, on plain sandstone the groove reads
// darker.
export const STYLES = {
  varnish:   { base: '#4a3728', mottleA: '#5c4531', mottleB: '#3a2b1e', engrave: '#c9a97f', dark: false },
  varnish2:  { base: '#584130', mottleA: '#6a5038', mottleB: '#453224', engrave: '#d4b087', dark: false },
  redpatina: { base: '#5e3226', mottleA: '#6f3d2c', mottleB: '#4a2820', engrave: '#d9b48f', dark: false },
  sandstone: { base: '#b08a5e', mottleA: '#bd9668', mottleB: '#9a7850', engrave: '#6e4f30', dark: true },
  paleSand:  { base: '#8a6a48', mottleA: '#97764f', mottleB: '#77593c', engrave: '#54402a', dark: true },
  basalt:    { base: '#4f4a44', mottleA: '#5a554e', mottleB: '#413d38', engrave: '#c9bda6', dark: false },
  darkBasalt:{ base: '#454039', mottleA: '#504a42', mottleB: '#38342e', engrave: '#bfae92', dark: false },
  slate:     { base: '#5a6058', mottleA: '#646a60', mottleB: '#4b514a', engrave: '#d8d2bc', dark: false },
  granite:   { base: '#787066', mottleA: '#847c72', mottleB: '#645d54', engrave: '#a5392c', dark: true },
  paleGrey:  { base: '#8a857a', mottleA: '#959085', mottleB: '#767166', engrave: '#5c4a3c', dark: true },
  vermilion: { base: '#6e4034', mottleA: '#7d4b3c', mottleB: '#57332c', engrave: '#e6c2a2', dark: false },
};

// ---------------------------------------------------------------- glyph API
function makeGlyph(ctx, wM, hM, ppm, rng, yOff = 0) {
  const X = (x) => (x + wM / 2) * ppm;
  const Y = (y) => (hM / 2 - y - yOff) * ppm;

  function dot(px, py, r, a) {
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, TAU);
    ctx.fill();
  }

  function peck(pts, wMet) {
    const wPx = Math.max(1.6, wMet * ppm);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const px0 = X(x0), py0 = Y(y0), px1 = X(x1), py1 = Y(y1);
      const len = Math.hypot(px1 - px0, py1 - py0);
      const steps = Math.max(1, Math.round(len / (wPx * 0.45)));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const cx = px0 + (px1 - px0) * t, cy = py0 + (py1 - py0) * t;
        for (let k = 0; k < 2; k++) {
          dot(cx + (rng() - 0.5) * wPx * 0.9, cy + (rng() - 0.5) * wPx * 0.9,
            wPx * (0.30 + rng() * 0.32), 0.30 + rng() * 0.45);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function fillPoly(pts, wMet) {
    const wPx = Math.max(1.6, wMet * ppm);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
    ctx.closePath();
    ctx.clip();
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const [x, y] of pts) {
      minx = Math.min(minx, X(x)); maxx = Math.max(maxx, X(x));
      miny = Math.min(miny, Y(y)); maxy = Math.max(maxy, Y(y));
    }
    ctx.fillStyle = '#fff';
    const step = wPx * 0.75;
    for (let gy = miny; gy <= maxy; gy += step)
      for (let gx = minx; gx <= maxx; gx += step)
        if (rng() < 0.92)
          dot(gx + (rng() - 0.5) * step, gy + (rng() - 0.5) * step,
            wPx * (0.35 + rng() * 0.4), 0.35 + rng() * 0.45);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  const arc = (c, r, a0, a1, n = 16) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (a0 + ((a1 - a0) * i) / n) * DEG;
      pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
    }
    return pts;
  };

  const g = {
    rng, arc,
    line: (pts, w = 0.03) => peck(pts, w),
    poly: (pts, o = {}) => {
      const closed = [...pts, pts[0]];
      if (o.fill) fillPoly(pts, o.w || 0.03);
      peck(closed, o.w || 0.03);
    },
    circle: (c, r, o = {}) => {
      const pts = arc(c, r, o.a0 ?? 0, o.a1 ?? 360, o.n ?? Math.max(10, Math.round(r * 40)));
      if (o.fill) fillPoly(pts, o.w || 0.03);
      peck(pts, o.w || 0.03);
    },
    disc: (c, r, w = 0.03) => {
      const pts = arc(c, r, 0, 360, Math.max(8, Math.round(r * 40)));
      fillPoly(pts, w);
    },
    spiral: (c, o = {}) => {
      const { turns = 4, r0 = 0.01, r1 = 0.2, w = 0.028, ccw = false } = o;
      const pts = [];
      const steps = Math.round(turns * 26);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = t * turns * TAU * (ccw ? -1 : 1);
        const r = r0 + (r1 - r0) * t;
        pts.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
      }
      peck(pts, w);
    },
    zig: (a, b, n, amp, w = 0.03) => {
      const pts = [];
      const dx = (b[0] - a[0]) / n, dy = (b[1] - a[1]) / n;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
      for (let i = 0; i <= n; i++) {
        const s = i % 2 === 0 ? 1 : -1;
        pts.push([a[0] + dx * i + nx * amp * s * (i > 0 && i < n ? 1 : 0),
                  a[1] + dy * i + ny * amp * s * (i > 0 && i < n ? 1 : 0)]);
      }
      peck(pts, w);
    },
    dots: (c, n, spread, r = 0.02) => {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < n; i++) {
        const a = rng() * TAU, d = Math.sqrt(rng()) * spread;
        dot(X(c[0] + Math.cos(a) * d), Y(c[1] + Math.sin(a) * d), r * ppm * (0.7 + rng() * 0.6), 0.5 + rng() * 0.4);
      }
      ctx.globalAlpha = 1;
    },
    wash: (pts, alpha = 0.22) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };

  // ---- figure helpers ----
  g.quad = (o) => {
    const {
      at = [0, 0], L = 0.5, dir = 1, w = 0.03, fill = false,
      B = L * 0.42, leg = L * 0.42, neck = L * 0.26, neckAng = 55,
      head = L * 0.2, headAng = -5, horn = null, hornSize = L * 0.4,
      tail = null, stripes = 0, ears = 0,
    } = o;
    const T = (p) => [at[0] + dir * p[0], at[1] + p[1]];
    const bt = B / 2, bb = -B / 2;
    const body = [
      [-L / 2, bt * 0.5], [-L * 0.15, bt], [L * 0.28, bt * 0.88], [L * 0.48, bt * 0.35],
      [L * 0.5, bb * 0.5], [L * 0.3, bb * 0.95], [-L * 0.28, bb], [-L / 2, bb * 0.4],
    ];
    g.poly(body.map(T), { w, fill });
    for (const lx of [L * 0.36, -L * 0.36])
      for (const k of [-1, 1])
        g.line([[lx + k * L * 0.05, bb * 0.7], [lx + k * L * 0.10, bb - leg]].map(T), w * 0.95);
    const nb = [L * 0.44, bt * 0.45];
    const na = neckAng * DEG;
    const hb = [nb[0] + Math.cos(na) * neck, nb[1] + Math.sin(na) * neck];
    g.line([nb, hb].map(T), w * 1.35);
    const ha = headAng * DEG;
    const he = [hb[0] + Math.cos(ha) * head, hb[1] + Math.sin(ha) * head];
    g.line([hb, he].map(T), w * 1.2);
    if (ears) {
      g.line([hb, [hb[0] - head * 0.15, hb[1] + ears]].map(T), w * 0.8);
      g.line([[hb[0] + head * 0.12, hb[1]], [hb[0] + head * 0.05, hb[1] + ears * 0.9]].map(T), w * 0.8);
    }
    if (horn === 'curl') {
      const c = [hb[0] - hornSize * 0.28, hb[1] + hornSize * 0.10];
      g.line(arc(c, hornSize * 0.42, 70, -175).map(T), w * 1.1);
      g.line(arc([c[0] - hornSize * 0.05, c[1]], hornSize * 0.30, 70, -160).map(T), w * 0.9);
    } else if (horn === 'lyre') {
      g.line(arc([hb[0] + hornSize * 0.1, hb[1] + hornSize * 0.35], hornSize * 0.45, -60, 110).map(T), w);
      g.line(arc([hb[0] - hornSize * 0.15, hb[1] + hornSize * 0.32], hornSize * 0.40, -70, 100).map(T), w);
    } else if (horn === 'antler') {
      const beam = arc([hb[0] - hornSize * 0.55, hb[1] + hornSize * 0.1], hornSize * 0.62, 75, 168, 10).map(T);
      g.line(beam, w * 0.9);
      for (const t of [0.25, 0.5, 0.75]) {
        const i = Math.floor(t * (beam.length - 1));
        const p = beam[i];
        g.line([p, [p[0] + dir * hornSize * 0.16, p[1] + hornSize * 0.22]], w * 0.75);
      }
    } else if (horn === 'ibex') {
      g.line(arc([hb[0] - hornSize * 0.5, hb[1] + hornSize * 0.05], hornSize * 0.58, 60, 195).map(T), w * 1.15);
    } else if (horn === 'ossicone') {
      g.line([[hb[0], hb[1]], [hb[0] - head * 0.1, hb[1] + head * 0.5]].map(T), w * 0.7);
      g.line([[hb[0] + head * 0.14, hb[1]], [hb[0] + head * 0.1, hb[1] + head * 0.48]].map(T), w * 0.7);
    }
    if (tail) {
      const ta = (tail.ang ?? -30) * DEG;
      const te = [-L / 2 - Math.cos(ta) * tail.len, bt * 0.3 + Math.sin(ta) * tail.len];
      if (tail.kink) {
        const mid = [-L / 2 - tail.len * 0.4, bt * 0.3 + tail.len * 0.75];
        const end = [mid[0] - tail.len * 0.45, mid[1] + tail.len * 0.1];
        g.line([[-L / 2, bt * 0.3], mid, end].map(T), w * 0.9);
        if (tail.pug) {
          g.circle(T([end[0] - 0.02, end[1] + 0.02]), 0.045, { w: w * 0.8 });
          for (let i = 0; i < 5; i++)
            g.disc(T([end[0] - 0.06 + i * 0.026, end[1] + 0.085]), 0.011, w * 0.5);
        }
      } else {
        g.line([[-L / 2, bt * 0.3], te].map(T), w * 0.9);
      }
    }
    for (let i = 0; i < stripes; i++) {
      const x = -L * 0.46 + (i / Math.max(1, stripes - 1)) * L * 0.5;
      g.line([[x, bt * 0.8], [x, bb * 0.55]].map(T), w * 0.85);
    }
    return { headBase: [at[0] + dir * hb[0], at[1] + hb[1]], muzzle: [at[0] + dir * he[0], at[1] + he[1]] };
  };

  g.human = (o) => {
    const { at = [0, 0], h = 0.4, pose = 'stand', dir = 1, w = 0.028, solidHead = true } = o;
    const T = (p) => [at[0] + dir * p[0], at[1] + p[1]];
    const hip = [0, h * 0.42], sh = [0, h * 0.70], hc = [0, h * 0.85], hr = h * 0.105;
    if (pose === 'flute') {
      // recumbent flute player, back arched (Basketmaker style)
      g.line(arc([0, -h * 0.1], h * 0.62, 20, 128, 12).map(T), w * 1.3); // humped back
      const headP = [Math.cos(125 * DEG) * h * 0.62, -h * 0.1 + Math.sin(125 * DEG) * h * 0.62];
      if (solidHead) g.disc(T([headP[0] - 0.02, headP[1] + hr]), hr, w); else g.circle(T(headP), hr, { w });
      g.line([[headP[0], headP[1] + hr * 0.4], [headP[0] + h * 0.42, headP[1] - h * 0.18]].map(T), w); // flute
      g.line([[headP[0] + h * 0.1, headP[1] - h * 0.05], [headP[0] + h * 0.24, headP[1] - h * 0.1]].map(T), w * 0.8); // arm
      g.line([[Math.cos(30 * DEG) * h * 0.62, -h * 0.1 + Math.sin(30 * DEG) * h * 0.62], [h * 0.72, h * 0.05]].map(T), w); // leg fold
      return;
    }
    if (solidHead) g.disc(T(hc), hr, w); else g.circle(T(hc), hr, { w });
    g.line([T(hip), T(sh), T([hc[0], hc[1] - hr])], w * 1.15);
    const legSpread = h * 0.16;
    if (pose === 'dance') {
      g.line([T(hip), T([legSpread, h * 0.2]), T([legSpread * 1.4, 0])], w);
      g.line([T(hip), T([-legSpread, h * 0.2]), T([-legSpread * 1.4, 0])], w);
    } else {
      g.line([T(hip), T([legSpread, 0])], w);
      g.line([T(hip), T([-legSpread, 0])], w);
    }
    const arm = h * 0.30;
    if (pose === 'armsup' || pose === 'dance') {
      g.line([T(sh), T([arm * 0.7, h * 0.8]), T([arm * 0.85, h * 0.98])], w);
      g.line([T(sh), T([-arm * 0.7, h * 0.8]), T([-arm * 0.85, h * 0.98])], w);
    } else if (pose === 'archer') {
      const bx = arm * 1.15;
      g.line([T(sh), T([bx, sh[1] - h * 0.02])], w);                      // bow arm
      g.line([T(sh), T([arm * 0.4, sh[1] + h * 0.04])], w);               // draw arm
      g.line(arc([bx, sh[1]], h * 0.30, -78, 78).map(T), w);              // bow
      g.line([T([bx + Math.cos(78 * DEG) * h * 0.30 - 0.001, sh[1] + Math.sin(78 * DEG) * h * 0.30]),
              T([bx + Math.cos(-78 * DEG) * h * 0.30, sh[1] + Math.sin(-78 * DEG) * h * 0.30])], w * 0.6); // string
      g.line([T([arm * 0.3, sh[1]]), T([bx + h * 0.34, sh[1]])], w * 0.7); // arrow
    } else if (pose === 'spear') {
      g.line([T(sh), T([arm * 0.8, h * 0.85])], w);
      g.line([T([arm * 0.5, h * 0.72]), T([arm * 1.15, h * 1.05])], w * 0.8);
      g.line([T(sh), T([-arm * 0.6, sh[1] - h * 0.1])], w);
    } else if (pose === 'link') {
      g.line([T(sh), T([arm * 1.15, sh[1] - h * 0.06])], w);
      g.line([T(sh), T([-arm * 1.15, sh[1] - h * 0.06])], w);
    } else { // stand
      g.line([T(sh), T([arm * 0.75, h * 0.5])], w);
      g.line([T(sh), T([-arm * 0.75, h * 0.5])], w);
    }
  };

  g.boat = (o) => {
    const { at = [0, 0], len = 1, curl = 0.16, crew = 0, w = 0.03, animalHead = false, double = true } = o;
    const T = (p) => [at[0] + p[0], at[1] + p[1]];
    const keel = [], gun = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, x = (t - 0.5) * len;
      const endRise = Math.pow(Math.abs(t - 0.5) * 2, 3.2);
      keel.push([x, endRise * len * curl]);
      gun.push([x * 0.97, endRise * len * curl * 0.75 + len * 0.045]);
    }
    g.line(keel.map(T), w);
    if (double) g.line(gun.map(T), w);
    g.line([keel[0], [keel[0][0] - len * 0.05, keel[0][1] + len * 0.1]].map(T), w);
    const prow = [keel[16][0] + len * 0.04, keel[16][1] + len * 0.11];
    g.line([keel[16], prow].map(T), w);
    if (animalHead) {
      g.line([prow, [prow[0] + len * 0.07, prow[1] + len * 0.05], [prow[0] + len * 0.115, prow[1] + len * 0.035]].map(T), w * 0.9);
      g.line([[prow[0] + len * 0.05, prow[1] + len * 0.05], [prow[0] + len * 0.06, prow[1] + len * 0.1]].map(T), w * 0.7);
    }
    for (let i = 0; i < crew; i++) {
      const t = 0.12 + (0.76 * i) / Math.max(1, crew - 1);
      const x = (t - 0.5) * len;
      const y = len * 0.05 + Math.pow(Math.abs(t - 0.5) * 2, 3.2) * len * curl * 0.75;
      g.line([[x, y], [x, y + len * 0.085]].map(T), w * 0.8);
    }
  };

  g.whale = (o) => {
    // Bangudae whales are plan-view: symmetric body, swept side-flippers.
    const { at = [0, 0], len = 1, ang = 90, w = 0.035, fill = true, calf = false, harpoon = false } = o;
    const a = ang * DEG, ca = Math.cos(a), sa = Math.sin(a);
    const T = (p) => [at[0] + p[0] * ca - p[1] * sa, at[1] + p[0] * sa + p[1] * ca];
    const body = [
      [len * 0.5, 0], [len * 0.4, len * 0.11], [len * 0.16, len * 0.165], [-len * 0.16, len * 0.13],
      [-len * 0.34, len * 0.05],
      [-len * 0.52, len * 0.17], [-len * 0.43, len * 0.01], [-len * 0.52, -len * 0.15],   // flukes
      [-len * 0.34, -len * 0.05],
      [-len * 0.16, -len * 0.13], [len * 0.16, -len * 0.165], [len * 0.4, -len * 0.11],
    ];
    g.poly(body.map(T), { w, fill });
    for (const s of [1, -1]) {
      g.line([[len * 0.14, s * len * 0.15], [-len * 0.02, s * len * 0.31], [-len * 0.08, s * len * 0.15]].map(T), w * 0.8);
    }
    if (calf) {
      const c = [at[0] - sa * len * 0.34, at[1] + ca * len * 0.34];
      g.whale({ at: c, len: len * 0.4, ang: ang - 8, w: w * 0.8, fill });
    }
    if (harpoon) {
      const tip = T([len * 0.12, len * 0.15]);
      const pts = [tip];
      for (let i = 1; i <= 6; i++)
        pts.push([tip[0] + i * len * 0.13 + (i % 2 ? 0.02 : -0.02), tip[1] + i * len * 0.10]);
      g.line(pts, w * 0.6);
      g.circle(pts[3], len * 0.05, { w: w * 0.6 }); // float
      return pts[6];
    }
  };

  g.footprint3 = (at, size, dir = 1) => {
    for (const a of [-28, 0, 28])
      g.line([at, [at[0] + dir * Math.cos(a * DEG) * size, at[1] - Math.abs(Math.sin(a * DEG)) * size * 0.4 - size * (a === 0 ? 1 : 0.7)]], 0.02);
  };

  return g;
}

// ------------------------------------------------------- texture generation
function heightToNormal(height, W, H, strength) {
  const img = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const xm = Math.max(x - 1, 0), xp = Math.min(x + 1, W - 1);
      const ym = Math.max(y - 1, 0), yp = Math.min(y + 1, H - 1);
      const dx = (height[y * W + xp] - height[y * W + xm]) * strength;
      const dy = (height[yp * W + x] - height[ym * W + x]) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const i = (y * W + x) * 4;
      img[i] = (-dx * inv * 0.5 + 0.5) * 255;
      img[i + 1] = (dy * inv * 0.5 + 0.5) * 255;
      img[i + 2] = inv * 255;
      img[i + 3] = 255;
    }
  }
  return img;
}

export function renderPanelTexture({ wM, hM, style, seed = 1, draw, glow = true, yOff = 0 }) {
  const st = STYLES[style] || STYLES.varnish;
  const ppm = Math.min(220, 1100 / Math.max(wM, hM));
  const W = Math.round(wM * ppm), H = Math.round(hM * ppm);
  const rng = mulberry(seed * 7919 + 13);

  // --- base rock color ---
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = st.base;
  ctx.fillRect(0, 0, W, H);
  const blotches = Math.round((W * H) / 700);
  for (let i = 0; i < blotches; i++) {
    ctx.fillStyle = rng() > 0.5 ? st.mottleA : st.mottleB;
    ctx.globalAlpha = 0.05 + rng() * 0.11;
    ctx.beginPath();
    ctx.arc(rng() * W, rng() * H, 2 + rng() * rng() * 16, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // cracks
  const cracks = 3 + Math.floor(rng() * 4);
  for (let i = 0; i < cracks; i++) {
    let x = rng() * W, y = rng() > 0.5 ? 0 : rng() * H;
    let a = (rng() * 0.6 + 1.2) * (rng() > 0.5 ? 1 : -1) * 0.9;
    ctx.strokeStyle = 'rgba(10,8,6,0.35)';
    ctx.lineWidth = 1 + rng() * 1.4;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let s = 0; s < 26; s++) {
      a += (rng() - 0.5) * 0.7;
      x += Math.cos(a) * (6 + rng() * 12); y += Math.sin(a) * (6 + rng() * 12);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // lichen at the margins
  for (let i = 0; i < 7; i++) {
    const edge = rng();
    const lx = edge < 0.5 ? rng() * W : (rng() > 0.5 ? rng() * W * 0.15 : W - rng() * W * 0.15);
    const ly = edge < 0.5 ? (rng() > 0.5 ? rng() * H * 0.15 : H - rng() * H * 0.15) : rng() * H;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(138,143,106,0.16)' : 'rgba(154,160,122,0.13)';
    for (let k = 0; k < 16; k++) {
      ctx.beginPath();
      ctx.arc(lx + (rng() - 0.5) * 34, ly + (rng() - 0.5) * 34, 1.5 + rng() * 4, 0, TAU);
      ctx.fill();
    }
  }
  // grain
  for (let i = 0; i < (W * H) / 190; i++) {
    ctx.fillStyle = rng() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(rng() * W, rng() * H, 1.5, 1.5);
  }

  // --- glyph layer (white alpha marks) ---
  const gl = makeCanvas(W, H);
  const g = makeGlyph(gl.ctx, wM, hM, ppm, mulberry(seed * 131 + 7), yOff);
  draw(g);
  // repatination — age the marks patchily
  gl.ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) {
    gl.ctx.globalAlpha = 0.12 + rng() * 0.30;
    gl.ctx.beginPath();
    gl.ctx.arc(rng() * W, rng() * H, 3 + rng() * 13, 0, TAU);
    gl.ctx.fill();
  }
  gl.ctx.globalCompositeOperation = 'source-over';
  gl.ctx.globalAlpha = 1;

  // --- composite: shadow pass then tinted engraving ---
  const tint = makeCanvas(W, H);
  tint.ctx.fillStyle = st.dark ? 'rgba(12,8,5,1)' : 'rgba(20,13,8,1)';
  tint.ctx.fillRect(0, 0, W, H);
  tint.ctx.globalCompositeOperation = 'destination-in';
  tint.ctx.drawImage(gl.canvas, 0, 0);
  ctx.globalAlpha = 0.5;
  ctx.drawImage(tint.canvas, 1.5, 2.5);
  ctx.globalAlpha = 1;

  tint.ctx.globalCompositeOperation = 'source-over';
  tint.ctx.fillStyle = st.engrave;
  tint.ctx.fillRect(0, 0, W, H);
  tint.ctx.globalCompositeOperation = 'destination-in';
  tint.ctx.drawImage(gl.canvas, 0, 0);
  ctx.globalAlpha = 0.95;
  ctx.drawImage(tint.canvas, 0, 0);
  ctx.globalAlpha = 1;

  // --- baked sconce glow + vignette ---
  if (glow) {
    const gr = ctx.createRadialGradient(W / 2, H * 0.24, H * 0.05, W / 2, H * 0.3, H * 0.85);
    gr.addColorStop(0, 'rgba(255,205,150,0.15)');
    gr.addColorStop(1, 'rgba(255,205,150,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(8,5,3,0)');
  vg.addColorStop(1, 'rgba(8,5,3,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // --- normal map: rock micro-relief minus engraved grooves ---
  // Built at half resolution: visually identical once filtered, quarter the
  // GPU memory and 4x faster to generate.
  const W2 = Math.ceil(W / 2), H2 = Math.ceil(H / 2);
  const bl = makeCanvas(W2, H2);
  bl.ctx.filter = 'blur(1px)';
  bl.ctx.drawImage(gl.canvas, 0, 0, W2, H2);
  const glyphData = bl.ctx.getImageData(0, 0, W2, H2).data;
  const height = new Float32Array(W2 * H2);
  for (let y = 0; y < H2; y++)
    for (let x = 0; x < W2; x++)
      height[y * W2 + x] =
        fbm2((x + seed * 37) * 0.036, y * 0.036, 3) * 4 +
        fbm2(x * 0.14, (y + seed * 11) * 0.14, 2) * 1.3 -
        (glyphData[(y * W2 + x) * 4 + 3] / 255) * 7;
  const nImg = heightToNormal(height, W2, H2, 0.85);
  const nCanvas = makeCanvas(W2, H2);
  nCanvas.ctx.putImageData(new ImageData(nImg, W2, H2), 0, 0);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const normalMap = new THREE.CanvasTexture(nCanvas.canvas);
  normalMap.anisotropy = 2;
  return { map, normalMap };
}

// Tiling rock texture for boulder sides/backs.
const sideCache = new Map();
export function makeRockTexture(style, seed = 1) {
  const key = style + seed;
  if (sideCache.has(key)) return sideCache.get(key);
  const st = STYLES[style] || STYLES.varnish;
  const S = 512;
  const rng = mulberry(seed * 331 + 5);
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.fillStyle = st.base;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 420; i++) {
    ctx.fillStyle = rng() > 0.5 ? st.mottleA : st.mottleB;
    ctx.globalAlpha = 0.06 + rng() * 0.12;
    ctx.beginPath();
    ctx.arc(rng() * S, rng() * S, 3 + rng() * rng() * 22, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = rng() > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.045)';
    ctx.fillRect(rng() * S, rng() * S, 1.5, 1.5);
  }
  const height = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      height[y * S + x] = fbm2(x * 0.02 + seed * 3, y * 0.02, 3) * 5 + fbm2(x * 0.09, y * 0.09, 2) * 1.6;
  const nImg = heightToNormal(height, S, S, 0.8);
  const nCanvas = makeCanvas(S, S);
  nCanvas.ctx.putImageData(new ImageData(nImg, S, S), 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = new THREE.CanvasTexture(nCanvas.canvas);
  const out = { map, normalMap };
  sideCache.set(key, out);
  return out;
}
