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

export function makePlaqueTexture(def) {
  const W = 512, H = 360;
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = mulberry(def.seed * 17 + 3);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#eadfc4'); grad.addColorStop(1, '#dcccab');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, rng, 700, 0.04);
  ctx.strokeStyle = '#8a6f4a'; ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, W - 20, H - 20);
  ctx.strokeStyle = 'rgba(138,111,74,0.55)'; ctx.lineWidth = 1;
  ctx.strokeRect(16, 16, W - 32, H - 32);

  ctx.fillStyle = '#a1471f';
  ctx.font = `11px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(def.location.toUpperCase().split('').join(' '), W / 2, 52);

  ctx.fillStyle = '#241c12';
  const ts = fitText(ctx, def.title, W - 70, 34, '');
  ctx.font = `${ts}px ${SERIF}`;
  ctx.fillText(def.title, W / 2, 100);

  ctx.font = `italic 15px ${SERIF}`;
  ctx.fillStyle = '#5c4c34';
  const siteLines = wrap(ctx, def.site, W - 90);
  let y = 138;
  for (const l of siteLines.slice(0, 2)) { ctx.fillText(l, W / 2, y); y += 22; }

  y += 4;
  ctx.strokeStyle = '#8a6f4a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2 - 70, y); ctx.lineTo(W / 2 - 12, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 + 12, y); ctx.lineTo(W / 2 + 70, y); ctx.stroke();
  ctx.save();
  ctx.translate(W / 2, y); ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-4, -4, 8, 8);
  ctx.restore();

  y += 34;
  ctx.font = `15px ${SERIF}`;
  ctx.fillStyle = '#33291b';
  ctx.fillText(def.culture.length > 52 ? def.culture.slice(0, 50) + '…' : def.culture, W / 2, y);
  y += 24;
  ctx.fillText(def.date, W / 2, y);

  ctx.font = `12px ${SERIF}`;
  ctx.fillStyle = '#7a6444';
  ctx.fillText('E  —  R E A D   T H E   L A B E L', W / 2, H - 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeCardTexture(title, sub) {
  const W = 256, H = 180;
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = mulberry(title.length * 71 + 9);
  ctx.fillStyle = '#c8b190'; ctx.fillRect(0, 0, W, H);
  speckle(ctx, W, H, rng, 420, 0.05);
  ctx.strokeStyle = 'rgba(90,70,45,0.8)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(7, 7, W - 14, H - 14);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3a2c1a';
  const ts = fitText(ctx, title, W - 34, 26);
  ctx.font = `${ts}px ${SERIF}`;
  const lines = wrap(ctx, title, W - 34);
  let y = lines.length > 1 ? 66 : 80;
  for (const l of lines.slice(0, 2)) { ctx.fillText(l, W / 2, y); y += ts + 4; }
  if (sub) {
    ctx.font = `italic 14px ${SERIF}`;
    ctx.fillStyle = '#5f4a30';
    ctx.fillText(sub, W / 2, y + 6);
  }
  ctx.font = `11px ${SERIF}`;
  ctx.fillStyle = '#6e563a';
  ctx.fillText('E — read', W / 2, H - 22);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
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
