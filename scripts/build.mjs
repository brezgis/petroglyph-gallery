// Build script — bundles src/main.js with esbuild and assembles the HTML
// shells: index.html (dev, external bundle), dist/petroglyph-gallery.html
// and docs/index.html (the single self-contained file GitHub Pages serves).

import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = process.argv[2] || '';

const TITLE = 'FIRST MARKS — an open-air gallery of the world’s petroglyphs';

// Favicon: a hand-pecked spiral (after the Fajada Butte sun dagger spiral) on
// night-sky rock, generated as an inline SVG data URI — no asset files.
const FAVICON = (() => {
  const pts = [];
  const cx = 16, cy = 16.4, turns = 2.55, steps = 100;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = t * turns * 2 * Math.PI - Math.PI * 0.5;
    const r = 0.8 + t * 11.6 + Math.sin(a * 3.1 + 1.7) * 0.14; // wobble = pecked line
    pts.push((cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1));
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="%23151024"/><path d="M${pts.join(' L')}" fill="none" stroke="%23efe3cc" stroke-width="1.9" stroke-linecap="round" opacity="0.95"/></svg>`;
  return `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/"/g, "'")}">`;
})();

const CSS = `
:root{
  --night:#16121e;      /* dusk sky, just above the rim */
  --peck:#ecdfc6;       /* a fresh hammer strike */
  --peck-dim:#b9ad97;
  --dust:#8e8597;
  --ochre:#d9a95f;      /* sconce light */
  --varnish:#2a211b;
  --serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;
}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;background:var(--night)}
body{font-family:var(--serif);color:var(--peck);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility}
canvas.gl{position:fixed;inset:0;display:block;touch-action:none}
#ui{position:fixed;inset:0;pointer-events:none;z-index:10}
[hidden]{display:none!important}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
kbd{display:inline-block;min-width:1.7em;padding:0 .45em;margin:0 .1em;border:1px solid rgba(236,223,198,.38);border-bottom-width:2px;border-radius:5px;font:600 11px/1.6 var(--sans);text-align:center;color:var(--peck);background:rgba(236,223,198,.07);vertical-align:1px}

/* ---- title veil: the live scene shows through ---- */
#intro{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;text-align:center;padding:0 24px clamp(44px,11vh,120px);background:linear-gradient(180deg,rgba(22,18,30,.1) 0%,rgba(22,18,30,.2) 50%,rgba(12,10,18,.88) 100%);pointer-events:auto;cursor:pointer;transition:opacity .8s ease;z-index:5}
#intro.gone{opacity:0;pointer-events:none}
.intro-inner{max-width:640px;display:flex;flex-direction:column;align-items:center}
#intro h1{margin:0 0 14px;line-height:0}
#peck{display:block;width:min(520px,84vw);height:clamp(70px,10vw,112px);filter:drop-shadow(0 2px 10px rgba(0,0,0,.6))}
#intro .sub{font-size:clamp(16px,1.5vw,19px);line-height:1.5;color:var(--peck-dim);font-style:italic;max-width:34em;margin-bottom:26px;text-shadow:0 1px 10px rgba(0,0,0,.8)}
#enter{all:unset;cursor:pointer;font:400 13px/1 var(--serif);letter-spacing:.32em;text-transform:uppercase;color:var(--peck);padding:6px 0 9px .32em;background:radial-gradient(circle,currentColor 1px,transparent 1.4px) 0 100%/7px 3px repeat-x;text-shadow:0 1px 10px rgba(0,0,0,.9);animation:ember 3.2s ease-in-out infinite;transition:color .3s}
@keyframes ember{50%{opacity:.62}}
#intro:hover #enter,#enter:focus-visible{color:var(--ochre);animation:none;text-shadow:0 0 14px rgba(217,169,95,.55),0 1px 10px rgba(0,0,0,.9)}
#intro .sound{margin-top:14px;font:12px/1.4 var(--sans);color:var(--dust)}

/* ---- HUD ---- */
#crosshair{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:rgba(236,223,198,.85);box-shadow:0 0 0 1px rgba(0,0,0,.35)}
.pill{position:absolute;left:50%;transform:translateX(-50%);background:rgba(18,14,24,.62);border-radius:999px;padding:8px 16px;font:14px/1.4 var(--sans);color:var(--peck);white-space:nowrap;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);opacity:0;transition:opacity .25s}
#prompt{bottom:12%}
#prompt i{font-family:var(--serif);font-size:15px}
#hint{bottom:calc(12% + 52px);background:none;-webkit-backdrop-filter:none;backdrop-filter:none;color:var(--peck-dim);text-shadow:0 1px 8px rgba(0,0,0,.9);transition:opacity .8s}
#prompt.on,#hint.on{opacity:1}
#region{position:absolute;top:10%;left:0;right:0;text-align:center;opacity:0;transition:opacity 1s;pointer-events:none;text-shadow:0 2px 18px rgba(0,0,0,.85)}
#region .rname{font-size:clamp(24px,3vw,34px);letter-spacing:.01em;color:var(--peck)}
#region .rsub{font-style:italic;font-size:15px;color:var(--peck-dim);margin-top:4px}
#region.on{opacity:1}
#toast{position:absolute;left:50%;bottom:20%;transform:translateX(-50%);font-style:italic;font-size:17px;color:var(--peck);text-shadow:0 2px 12px rgba(0,0,0,.95);opacity:0;transition:opacity .5s;text-align:center;max-width:min(60ch,88vw);pointer-events:none}
#toast.on{opacity:1}
#drink{position:absolute;left:22px;bottom:22px;background:rgba(18,14,24,.62);border-radius:12px;padding:10px 14px;font:13px/1.4 var(--sans);color:var(--peck-dim);display:none;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
#drink .dname{font-family:var(--serif);color:var(--peck);font-size:16px}
#drink .dhint{margin-top:3px}
#mute{position:absolute;right:22px;top:20px;font:12px var(--sans);color:var(--dust);opacity:0;transition:.4s}
#mute.on{opacity:1}
#vign{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(140,52,14,.38) 100%);opacity:0;transition:opacity .45s;pointer-events:none}
#vign.on{opacity:1}
#dim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,8,14,0) 30%,rgba(10,8,14,.55) 70%);opacity:0;transition:opacity .35s;pointer-events:none}
#dim.on{opacity:1;pointer-events:auto;cursor:pointer}

/* ---- the reading card: beside the stone, not over it ---- */
#card{position:absolute;top:0;right:0;bottom:0;width:min(440px,92vw);overflow-y:auto;overscroll-behavior:contain;padding:clamp(28px,7vh,72px) 36px 28px 38px;background:rgba(21,17,26,.9);-webkit-backdrop-filter:blur(14px) saturate(.8);backdrop-filter:blur(14px) saturate(.8);border-left:1px solid rgba(236,223,198,.1);color:var(--peck);opacity:0;transform:translateX(24px);pointer-events:none;transition:opacity .28s ease,transform .28s ease;display:flex;flex-direction:column;scrollbar-width:thin;scrollbar-color:rgba(236,223,198,.2) transparent}
#card.on{opacity:1;transform:none;pointer-events:auto}
#card .where{font:13px/1.4 var(--sans);color:var(--ochre);margin-bottom:10px}
#card h2{font-size:30px;line-height:1.15;font-weight:400;letter-spacing:-.005em;text-wrap:balance}
#card .titlesub{font-style:italic;color:var(--peck-dim);font-size:15px;line-height:1.45;margin-top:6px}
#card .facts{font:13px/1.5 var(--sans);color:var(--dust);margin-top:10px}
#card .photo{margin:20px 0 0}
#card .photo img{display:block;width:100%;max-height:46vh;object-fit:contain;border-radius:2px}
#card .body{font-size:17px;line-height:1.62;color:#e4d8c1}
#card .body p+p{margin-top:.8em}
#card .lede{margin-top:22px;padding-top:20px;border-top:1px solid rgba(236,223,198,.12)}
#card details{margin-top:18px}
#card details>.body{margin-top:-2px}
#card .unfolded>.body p{margin-top:.8em}
#card summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:8px;font:14px/1 var(--sans);color:var(--peck);padding:9px 14px 9px 12px;border:1px solid rgba(236,223,198,.24);border-radius:999px;margin-bottom:18px;transition:background .2s,border-color .2s}
#card summary::-webkit-details-marker{display:none}
#card summary::before{content:'';width:6px;height:6px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .2s}
#card details[open] summary::before{transform:translateY(1px) rotate(-135deg)}
#card summary:hover,#card summary:focus-visible{background:rgba(236,223,198,.08);border-color:rgba(236,223,198,.45);outline:none}
#card details:not([open]) .less,#card details[open] .more{display:none}
#card details[open] summary{order:9}
#card .meta{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:22px 0 0;padding-top:16px;border-top:1px solid rgba(236,223,198,.12);font:13px/1.5 var(--sans)}
#card .meta dt{color:var(--dust)}
#card .meta dd{color:var(--peck-dim)}
#card .src{margin-top:16px;font:12.5px/1.55 var(--sans);color:var(--dust)}
#card .src.credit{margin-top:8px;font-size:12px}
#card a{color:var(--ochre);text-decoration:underline;text-decoration-color:rgba(217,169,95,.45);text-underline-offset:3px}
#card a:hover{text-decoration-color:currentColor}
#card .close{all:unset;cursor:pointer;margin-top:auto;padding-top:22px;align-self:flex-start;font:12px/1 var(--sans);color:var(--dust)}
#card .close:hover,#card .close:focus-visible{color:var(--peck)}

#err{position:absolute;top:0;left:0;right:0;background:#5c1010;color:#ffd9d9;font:12px/1.5 monospace;padding:10px 14px;display:none;white-space:pre-wrap;z-index:99;pointer-events:auto}
#stick{position:absolute;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;border:1px solid rgba(236,223,198,.3);background:rgba(18,14,24,.22);opacity:0;transition:opacity .2s;pointer-events:none;--kx:0px;--ky:0px}
#stick::after{content:'';position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px;border-radius:50%;background:rgba(236,223,198,.42);transform:translate(var(--kx),var(--ky))}
#stick.on{opacity:1}
#tbtns{position:absolute;right:18px;bottom:22px;display:none;gap:10px;flex-direction:column;align-items:flex-end;pointer-events:auto}
#tbtns button{width:54px;height:54px;border-radius:50%;border:1px solid rgba(236,223,198,.35);background:rgba(18,14,24,.5);color:var(--peck);font:600 17px/1 var(--sans);touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#tbtns button:first-child{width:70px;height:70px;font-size:21px;background:rgba(217,169,95,.32)}
body.touch #tbtns{display:flex}
body.touch #drink{bottom:auto;top:18px;left:18px}
@media (max-width:700px){
  .pill{white-space:normal;max-width:88vw;text-align:center}
  #prompt{bottom:18%}
  #card{top:auto;left:0;width:auto;max-height:78vh;border-left:0;border-top:1px solid rgba(236,223,198,.12);border-radius:16px 16px 0 0;padding:26px 22px 20px;transform:translateY(24px)}
  #card h2{font-size:25px}
  #dim{background:rgba(10,8,14,.35)}
}
@media (prefers-reduced-motion:reduce){*{transition-duration:.01s!important;animation:none!important}}
`;

const BODY = `<div id="ui"></div>`;

const fullPage = (js, inline) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${TITLE}</title>
${FAVICON}
<style>${CSS}</style>
</head>
<body>
${BODY}
${inline ? `<script>${js}</script>` : `<script src="bundle.js"></script>`}
</body>
</html>`;

const opts = (minify) => ({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  outfile: path.join(root, 'bundle.js'),
  minify,
  sourcemap: false,
  logLevel: 'info',
});

if (arg === '--serve') {
  const ctx = await esbuild.context(opts(false));
  fs.writeFileSync(path.join(root, 'index.html'), fullPage('', false));
  await ctx.watch();
  const { hosts, port } = await ctx.serve({ servedir: root, host: '0.0.0.0', port: 8123 });
  console.log(`serving http://localhost:${port}/ (hosts: ${(hosts || []).join(', ')})`);
} else if (arg === '--dist') {
  await esbuild.build(opts(true));
  const js = fs.readFileSync(path.join(root, 'bundle.js'), 'utf8');
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(root, 'dist/petroglyph-gallery.html'), fullPage(js, true));
  fs.writeFileSync(path.join(root, 'dist/index.html'), fullPage(js, true));
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/index.html'), fullPage(js, true));   // GitHub Pages
  console.log(`dist + docs written (${(js.length / 1024).toFixed(0)} KB bundle)`);
} else {
  await esbuild.build(opts(false));
  fs.writeFileSync(path.join(root, 'index.html'), fullPage('', false));
  console.log('built bundle.js + index.html');
}
