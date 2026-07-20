// DOM overlay: intro, HUD (crosshair / prompt / toasts / region titles /
// held-drink chip), and the museum label card.

export class UI {
  constructor() {
    const root = document.getElementById('ui');
    root.innerHTML = `
      <div id="vign"></div>
      <div id="crosshair" style="display:none"></div>
      <div id="region"><div class="rname"></div><div class="rsub"></div></div>
      <div id="prompt"></div>
      <div id="toast"></div>
      <div id="drink"><div class="dname"></div><div class="dhint"><span class="key">E</span> sip · <span class="key">G</span> set down</div></div>
      <div id="mute">MUTED</div>
      <div id="dim"></div>
      <div id="card"></div>
      <div id="err"></div>
      <div id="intro">
        <div class="glyphrow">
          <svg width="150" height="26" viewBox="0 0 150 26" fill="none" stroke="#8d7f9d" stroke-width="1.6" stroke-linecap="round">
            <path d="M14 20 c-6 -1 -8 -7 -3 -10 c5 -3 9 2 5 5 c-2.5 2 -6 0.5 -5 -2"/>
            <path d="M60 19 l4 -9 l4 9 M61.5 15.5 l5 0"/>
            <circle cx="103" cy="13" r="6"/><path d="M103 5.5 v-3 M103 20.5 v3 M95.5 13 h-3 M110.5 13 h3 M97.8 7.8 l-2 -2 M108.2 18.2 l2 2 M97.8 18.2 l-2 2 M108.2 7.8 l2 -2"/>
            <path d="M130 16 q5 -8 10 0 q-5 6 -10 0 Z M143 12 l4 4"/>
          </svg>
        </div>
        <h1>FIRST MARKS</h1>
        <div class="sub">an open-air gallery of the world&rsquo;s petroglyphs</div>
        <div class="controls">
          <span><b>Walk</b></span><span><span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> + mouse &nbsp;·&nbsp; <span class="key">Shift</span> run</span>
          <span><b>Read &amp; interact</b></span><span><span class="key">E</span> plaques, pottery, foods</span>
          <span><b>Set down / night / music</b></span><span><span class="key">G</span> · <span class="key">N</span> · <span class="key">M</span></span>
          <span><b>Performance mode</b></span><span><span class="key">Q</span> (auto-engages if needed)</span>
          <span><b>Free the cursor</b></span><span><span class="key">Esc</span></span>
        </div>
        <div class="note">Twenty-one real petroglyphs, redrawn by hand at (or near) true scale — six regions of the world, plus two stones the curator met in person. Each has its site, culture and sources on the lectern beside it. There is a fire, and there are refreshments. Headphones recommended.</div>
        <button id="enter">E N T E R &nbsp; T H E &nbsp; F I E L D</button>
      </div>`;
    this.el = {};
    for (const id of ['vign', 'crosshair', 'region', 'prompt', 'toast', 'drink', 'mute', 'dim', 'card', 'err', 'intro'])
      this.el[id] = document.getElementById(id);
    this._toastTimer = null;
    this._regionTimer = null;
    this.overlayOpen = false;
  }

  intro(onEnter) {
    document.getElementById('enter').addEventListener('click', () => {
      this.el.intro.classList.add('gone');
      this.el.crosshair.style.display = 'block';
      setTimeout(() => (this.el.intro.style.display = 'none'), 1400);
      onEnter();
    });
  }

  hideIntro() {
    this.el.intro.style.display = 'none';
    this.el.crosshair.style.display = 'block';
  }

  setPrompt(html) {
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
    this.el.region.querySelector('.rname').textContent = name;
    this.el.region.querySelector('.rsub').textContent = sub;
    this.el.region.classList.add('on');
    clearTimeout(this._regionTimer);
    this._regionTimer = setTimeout(() => this.el.region.classList.remove('on'), 3400);
  }

  showCard({ kicker, title, titlesub, meta = [], body, source, link, img, hint }) {
    const paras = (body || '').split('\n\n').map((p) => `<p>${p}</p>`).join('');
    const metaHtml = meta.length
      ? `<dl class="meta">${meta.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`
      : '';
    let linkHtml = '';
    if (link) {
      let host = link;
      try { host = new URL(link).hostname.replace(/^www\./, ''); } catch (_) {}
      linkHtml = ` — <a href="${link}" target="_blank" rel="noopener">${host} ↗</a>`;
    }
    this.el.card.innerHTML = `
      <div class="kicker">${kicker || ''}</div>
      <h2>${title}</h2>
      ${titlesub ? `<div class="titlesub">${titlesub}</div>` : ''}
      ${img ? `<div class="photo"><img src="${img}" alt=""></div>` : ''}
      ${metaHtml}
      <div class="body">${paras}</div>
      ${source ? `<div class="src">Source: ${source}${linkHtml}</div>` : ''}
      <div class="hint">${hint || (link ? 'E — CLOSE · SOURCE LINK OPENS IN A NEW TAB' : 'E — CLOSE')}</div>`;
    this.el.card.classList.add('on');
    this.el.dim.classList.add('on');
    this.overlayOpen = true;
  }

  showPanel(def, regionName) {
    this.showCard({
      kicker: regionName || def.location.toUpperCase(),
      title: def.title,
      titlesub: def.site,
      meta: [
        ['LOCATION', def.location],
        ['CULTURE', def.culture],
        ['DATE', def.date],
        ['MEDIUM', def.medium],
        ['SCALE', def.scale],
      ],
      body: def.desc,
      source: def.source,
      link: def.link,
    });
  }

  closeCard() {
    this.el.card.classList.remove('on');
    this.el.dim.classList.remove('on');
    this.overlayOpen = false;
  }

  setDrink(v) {
    if (!v) this.el.drink.style.display = 'none';
    else {
      this.el.drink.querySelector('.dname').textContent = `${v.name} — ${v.drink}`;
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
