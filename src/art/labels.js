// Canvas-drawn text surfaces: lectern plaques, hearth cards, region steles.

import * as THREE from 'three';
import { makeCanvas, mulberry, TAU } from '../util.js';

const SERIF = 'Georgia, "DejaVu Serif", "Times New Roman", serif';

function fitText(ctx, text, maxW, px, weight = '', italic = '') {
  let size = px;
  do {
    ctx.font = `${italic} ${weight} ${size}px ${SERIF}`.trim();
    if (ctx.measureText(text).width <= maxW) break;
    size -= 1;
  } while (size > 9);
  return size;
}

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function speckle(ctx, W, H, rng, n, a = 0.05) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rng() > 0.5 ? `rgba(60,45,25,${a})` : `rgba(255,250,240,${a})`;
    ctx.fillRect(rng() * W, rng() * H, 1.5, 1.5);
  }
}

// The lectern plaque: a dark bronze plate with the label's essentials cut in
// pale letters, drawn at 2× so it stays sharp up close. The full text lives
// on the reading card (E).
export function makePlaqueTexture(def) {
  const W = 1024, H = 720;
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = mulberry(def.seed * 17 + 3);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#2f2720'); grad.addColorStop(1, '#231d18');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, rng, 1400, 0.035);
  ctx.strokeStyle = 'rgba(217,169,95,0.35)'; ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, W - 52, H - 52);

  const L = 84;                     // left margin: labels read left-aligned
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#d9a95f';
  ctx.font = `30px ${SERIF}`;
  ctx.fillText(def.location, L, 130);

  ctx.fillStyle = '#efe3cc';
  const ts = fitText(ctx, def.title, W - L * 2, 76);
  ctx.font = `${ts}px ${SERIF}`;
  ctx.fillText(def.title, L, 130 + 22 + ts);

  ctx.font = `italic 32px ${SERIF}`;
  ctx.fillStyle = '#b9ad97';
  let y = 130 + 22 + ts + 62;
  for (const l of wrap(ctx, def.site, W - L * 2).slice(0, 2)) { ctx.fillText(l, L, y); y += 44; }

  ctx.font = `30px ${SERIF}`;
  ctx.fillStyle = '#d8ccb4';
  y = Math.max(y + 30, H - 170);
  const culture = def.culture.length > 48 ? def.culture.slice(0, 46) + '…' : def.culture;
  ctx.fillText(culture, L, y);
  ctx.fillText(def.date, L, y + 44);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// The little tent cards on the bar and the foods table, drawn at 2×.
export function makeCardTexture(title, sub) {
  const W = 512, H = 360;
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = mulberry(title.length * 71 + 9);
  ctx.fillStyle = '#cdb795'; ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, rng, 900, 0.05);
  ctx.strokeStyle = 'rgba(90,70,45,0.7)'; ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2e2315';
  const ts = fitText(ctx, title, W - 68, 54);
  ctx.font = `${ts}px ${SERIF}`;
  const lines = wrap(ctx, title, W - 68);
  let y = lines.length > 1 ? 150 : 180;
  for (const l of lines.slice(0, 2)) { ctx.fillText(l, W / 2, y); y += ts + 8; }
  if (sub) {
    const ss = fitText(ctx, sub, W - 68, 28, '', 'italic');
    ctx.font = `italic ${ss}px ${SERIF}`;
    ctx.fillStyle = '#5a4630';
    ctx.fillText(sub, W / 2, y + 14);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeSteleTexture(name, sub) {
  const W = 512, H = 760;
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = mulberry(name.length * 313 + 41);
  ctx.fillStyle = '#6f6a60'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 520; i++) {
    ctx.fillStyle = rng() > 0.5 ? 'rgba(130,124,112,0.14)' : 'rgba(74,70,62,0.15)';
    ctx.beginPath();
    ctx.arc(rng() * W, rng() * H, 3 + rng() * 20, 0, TAU);
    ctx.fill();
  }
  speckle(ctx, W, H, rng, 1600, 0.05);

  ctx.textAlign = 'center';
  const words = name.split(' ');
  let y = 190;
  for (const word of words) {
    const ts = fitText(ctx, word, W - 90, 74, 'bold');
    ctx.font = `bold ${ts}px ${SERIF}`;
    // chisel: light below-right, dark main
    ctx.fillStyle = 'rgba(190,182,165,0.75)';
    ctx.fillText(word, W / 2 + 2, y + 3);
    ctx.fillStyle = '#332e26';
    ctx.fillText(word, W / 2, y);
    y += 92;
  }
  y += 6;
  const ss = fitText(ctx, sub, W - 56, 24, '', 'italic');
  ctx.font = `italic ${ss}px ${SERIF}`;
  ctx.fillStyle = 'rgba(196,188,170,0.8)';
  ctx.fillText(sub, W / 2 + 1, y + 2);
  ctx.fillStyle = '#3d382f';
  ctx.fillText(sub, W / 2, y);

  // a little pecked motif row
  y += 90;
  ctx.fillStyle = '#3a352c';
  for (let k = -1; k <= 1; k++) {
    const cx = W / 2 + k * 70;
    for (let i = 0; i < 26; i++) {
      const a = rng() * TAU, r = Math.sqrt(rng()) * 18;
      ctx.globalAlpha = 0.4 + rng() * 0.4;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * (k === 0 ? 1 : 0.55), y + Math.sin(a) * r * (k === 0 ? 0.55 : 1), 1.6 + rng() * 1.6, 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
