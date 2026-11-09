// DOM overlay: the title veil, a few self-dismissing hints, the HUD (dot
// crosshair / interaction prompt / toasts / grove names / held-item chip),
// and the reading card. Cards open short — a lede and the essentials — and
// expand to the full fact-checked text, details and sources.

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const K = (k) => `<kbd>${k}</kbd>`;

// "Engraving after …" line: which image the carved glyph was extracted from
function glyphCreditHtml(def) {
  const c = def.glyphCredit;
  if (!c) return 'Engraving: hand-drawn after published photographs (no openly licensed image was available).';
  const parts = c.images.map((im) => {
    const who = esc(im.author) + (im.license ? `, ${esc(im.license)}` : '');
    return im.page
      ? `<a href="${esc(im.page)}" target="_blank" rel="noopener">${esc(im.title)}</a> (${who}, Wikimedia Commons)`
      : `a photograph by ${who}`;
  });
  const how = c.traced ? 'traced by hand over' : 'extracted from';
  return `Engraving ${how} ${parts.join(' and ')}.`;
}

// Split a label body into a lede (its first sentence) and the rest. A
// sentence ends at . ! or ? after a lowercase letter, digit or bracket —
// so "c. 950" and "U.S. Bureau" never cut a sentence short.
export function splitLede(body) {
  const text = String(body || '');
  const m = /^([\s\S]{40,}?[a-z0-9)’'”][.!?])\s+(?=\S)/.exec(text);
  if (!m || m[1].includes('\n\n')) {
    const [first, ...rest] = text.split('\n\n');
    return { lede: first, rest: rest.join('\n\n') };
  }
  return { lede: m[1], rest: text.slice(m[0].length) };
}

const titleCase = (s) => s.toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());
const coarse = () => matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// The title, pecked into the veil dot by dot like the engravings themselves.
function peckTitle(canvas, text) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || 600, cssH = canvas.clientHeight || 110;
  canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  const W = canvas.width, H = canvas.height;
  // rasterise the words once, then sample them as a mask
  const m = document.createElement('canvas');
  m.width = W; m.height = H;
  const mc = m.getContext('2d');
  let size = H * 0.78;
  const font = (s) => `400 ${s}px "Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif`;
  mc.font = font(size);
  const maxW = W * 0.98;
  while (mc.measureText(text).width > maxW && size > 12) mc.font = font(--size);
  mc.textBaseline = 'alphabetic';
  mc.fillStyle = '#fff';
  mc.textAlign = 'center';
  mc.fillText(text, W / 2, H * 0.78);
  const mask = mc.getImageData(0, 0, W, H).data;
  // deterministic jittered grid of hammer strikes
  let s = 1234567;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const step = Math.max(1.5 * dpr, size * 0.029);   // strikes scale with the letters
  const dots = [];
  for (let y = 0; y < H; y += step)
    for (let x = 0; x < W; x += step) {
      const jx = x + (rnd() - 0.5) * step, jy = y + (rnd() - 0.5) * step;
      const xi = Math.min(W - 1, Math.max(0, jx | 0)), yi = Math.min(H - 1, Math.max(0, jy | 0));
      if (mask[(yi * W + xi) * 4 + 3] < 128 || rnd() < 0.1) continue;
      dots.push([jx, jy, step * (0.3 + rnd() * 0.24), 0.7 + rnd() * 0.3, x / W + rnd() * 0.08]);
    }
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ecdfc6';
  const draw = (upTo) => {
    ctx.clearRect(0, 0, W, H);
    for (const [x, y, r, a, t] of dots) {
      if (t > upTo) continue;
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    }
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { draw(2); return; }
  const t0 = performance.now();
  const tick = (now) => {
    const p = (now - t0) / 1100;            // a left-to-right pass, ~1.1 s
    draw(p * 1.1);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export class UI {
  constructor() {
    const root = document.getElementById('ui');
    root.innerHTML = `
      <div id="vign"></div>
      <div id="crosshair" hidden></div>
      <div id="region"><div class="rname"></div><div class="rsub"></div></div>
      <div id="prompt" class="pill"></div>
      <div id="hint" class="pill"></div>
      <div id="toast"></div>
      <div id="drink"><div class="dname"></div><div class="dhint"></div></div>
      <div id="mute">Sound off</div>
      <div id="stick"></div>
      <div id="tbtns"><button data-k="KeyE" aria-label="Interact">E</button><button data-k="KeyG" aria-label="Set down">G</button><button data-k="KeyN" aria-label="Dusk or night">&#9790;</button><button data-k="KeyM" aria-label="Sound on or off">&#9835;</button></div>
      <div id="dim"></div>
      <article id="card" role="dialog" aria-modal="false" aria-live="polite"></article>
      <div id="err"></div>
      <div id="intro">
        <div class="intro-inner">
          <h1><canvas id="peck" aria-hidden="true"></canvas><span class="sr">First Marks</span></h1>
          <p class="sub">Twenty-one of the world’s petroglyphs, recarved in an open field at dusk.</p>
          <button id="enter" type="button"><span class="act">${coarse() ? 'Tap' : 'Click'} to enter</span></button>
        </div>
      </div>`;
    this.el = {};
    for (const id of ['vign', 'crosshair', 'region', 'prompt', 'hint', 'toast', 'drink', 'mute', 'dim', 'card', 'err', 'intro'])
      this.el[id] = document.getElementById(id);
    this._toastTimer = null;
    this._regionTimer = null;
    this._hintTimer = null;
    this.overlayOpen = false;
    peckTitle(document.getElementById('peck'), 'First Marks');
  }

  // on-screen buttons for touch devices: they synthesise the same key
  // presses the keyboard would, so every handler stays in one place
  touchButtons() {
    if (!coarse()) return;
    document.body.classList.add('touch');
    for (const b of document.querySelectorAll('#tbtns button')) {
      const fire = (e) => {
        e.preventDefault();
        window.dispatchEvent(new KeyboardEvent('keydown', { code: b.dataset.k, key: b.dataset.k.slice(3).toLowerCase() }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code: b.dataset.k, key: b.dataset.k.slice(3).toLowerCase() }));
      };
      b.addEventListener('touchstart', fire, { passive: false });
      b.addEventListener('click', fire);
    }
  }

  // The whole veil is the button: any click or Enter/Space goes in.
  intro(onEnter) {
    let done = false;
    const go = (e) => {
      if (done) return;
      if (e && e.type === 'keydown' && !['Enter', 'Space'].includes(e.code)) return;
      done = true;
      removeEventListener('keydown', go);
      this.el.intro.classList.add('gone');
      this.el.crosshair.hidden = false;
      this.touchButtons();
      setTimeout(() => (this.el.intro.style.display = 'none'), 900);
      onEnter();
    };
    this.el.intro.addEventListener('click', go);
    addEventListener('keydown', go);
  }

  hideIntro() {
    this.el.intro.style.display = 'none';
    this.el.crosshair.hidden = false;
  }

  // A quiet one-line hint above the prompt; dismissed by the caller or after
  // `dur` seconds.
  hint(html, dur = 7) {
    this.el.hint.innerHTML = html || '';
    this.el.hint.classList.toggle('on', !!html);
    clearTimeout(this._hintTimer);
    if (html && dur) this._hintTimer = setTimeout(() => this.el.hint.classList.remove('on'), dur * 1000);
  }

  setPrompt(html) {
    if (html === this._prompt) return;
    this._prompt = html;
    if (!html) this.el.prompt.classList.remove('on');
    else {
      this.el.prompt.innerHTML = html;
      this.el.prompt.classList.add('on');
    }
  }

  toast(text, dur = 2.8) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('on');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.el.toast.classList.remove('on'), dur * 1000);
  }

  region(name, sub) {
    this.el.region.querySelector('.rname').textContent = titleCase(name);
    this.el.region.querySelector('.rsub').textContent = sub;
    this.el.region.classList.add('on');
    clearTimeout(this._regionTimer);
    this._regionTimer = setTimeout(() => this.el.region.classList.remove('on'), 3200);
  }

  // where: small line above the title; facts: one line under it; body: the
  // label text (lede shown, rest folded); meta/source/credit fold away too.
  showCard({ where, title, titlesub, facts, meta = [], body, source, link, img, credit, unfold = false }) {
    const { lede, rest } = splitLede(body);
    const paras = (t) => (t ? t.split('\n\n').map((p) => `<p>${p}</p>`).join('') : '');
    const metaHtml = meta.length
      ? `<dl class="meta">${meta.map(([k, v]) => `<dt>${k === k.toUpperCase() ? k[0] + k.slice(1).toLowerCase() : k}</dt><dd>${v}</dd>`).join('')}</dl>`
      : '';
    let linkHtml = '';
    if (link) {
      let host = link;
      try { host = new URL(link).hostname.replace(/^www\./, ''); } catch (_) {}
      linkHtml = ` <a href="${esc(link)}" target="_blank" rel="noopener">${esc(host)}</a>`;
    }
    const more = rest || metaHtml || source || credit;
    this.el.card.innerHTML = `
      ${where ? `<p class="where">${where}</p>` : ''}
      <h2>${title}</h2>
      ${titlesub ? `<p class="titlesub">${titlesub}</p>` : ''}
      ${facts ? `<p class="facts">${facts}</p>` : ''}
      ${img ? `<figure class="photo"><img src="${img}" alt=""></figure>` : ''}
      <div class="body"><p class="lede">${lede}</p></div>
      ${more ? `${unfold ? '<div class="unfolded">' : `<details>
        <summary><span class="more">Full label and sources</span><span class="less">Less</span></summary>`}
        <div class="body">${paras(rest)}</div>
        ${metaHtml}
        ${source ? `<p class="src">Source: ${source}.${linkHtml}</p>` : ''}
        ${credit ? `<p class="src credit">${credit}</p>` : ''}
      ${unfold ? '</div>' : '</details>'}` : ''}
      <button class="close" type="button" aria-label="Close">${coarse() ? 'Close' : `${K('E')} close`}</button>`;
    this.el.card.scrollTop = 0;
    this.el.card.querySelector('.close').addEventListener('click', () => this.onClose && this.onClose());
    this.el.card.classList.add('on');
    this.el.dim.classList.add('on');
    this.overlayOpen = true;
    // focus the fold so Enter/Space expands it straight from the keyboard
    const s = this.el.card.querySelector('summary');
    if (s) s.focus({ preventScroll: true });
  }

  showPanel(def, regionName) {
    this.showCard({
      where: `${regionName ? titleCase(regionName) + ', ' : ''}${def.location}`,
      title: def.title,
      titlesub: def.site,
      facts: `${def.culture}, ${def.date}`,
      meta: [
        ['Medium', def.medium],
        ['Scale', def.scale],
      ],
      body: def.desc,
      source: def.source,
      link: def.link,
      credit: glyphCreditHtml(def),
    });
  }

  closeCard() {
    this.el.card.classList.remove('on');
    this.el.dim.classList.remove('on');
    this.overlayOpen = false;
    if (document.activeElement && this.el.card.contains(document.activeElement)) document.activeElement.blur();
  }

  // the little "in your hand" chip, bottom left
  setHeld(name, hintHtml = '') {
    if (!name) this.el.drink.style.display = 'none';
    else {
      this.el.drink.querySelector('.dname').textContent = name;
      this.el.drink.querySelector('.dhint').innerHTML = hintHtml;
      this.el.drink.style.display = 'block';
    }
  }

  sipFlash() {
    this.el.vign.classList.add('on');
    setTimeout(() => this.el.vign.classList.remove('on'), 650);
  }

  muteBadge(on) {
    this.el.mute.classList.toggle('on', on);
  }

  error(msg) {
    this.el.err.style.display = 'block';
    this.el.err.textContent += msg + '\n';
  }
}

export { K };
