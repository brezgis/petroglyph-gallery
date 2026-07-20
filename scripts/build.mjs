// Build script — bundles src/main.js with esbuild and assembles the HTML
// shells: index.html (dev, external bundle), dist/petroglyph-gallery.html
// (single self-contained file) and dist/artifact.html (same, minus the
// document wrapper, for publishing as a Claude artifact).

import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = process.argv[2] || '';

const TITLE = 'FIRST MARKS — an open-air gallery of the world’s petroglyphs';

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%;overflow:hidden;background:#0d0b14}
body{font-family:Georgia,'DejaVu Serif','Times New Roman',serif;color:#efe3cc;-webkit-font-smoothing:antialiased}
canvas.gl{position:fixed;inset:0;display:block}
#ui{position:fixed;inset:0;pointer-events:none;z-index:10}
.key{display:inline-block;border:1px solid rgba(239,227,204,.42);border-bottom-width:2px;border-radius:4px;padding:0 7px;margin:0 2px;font:600 11px/18px 'DejaVu Sans',system-ui,sans-serif;letter-spacing:.03em;color:#f4ecd9;background:rgba(255,255,255,.06);vertical-align:1px}
#intro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:radial-gradient(120% 90% at 50% 18%,#241c3a 0%,#151024 45%,#0a0812 100%);pointer-events:auto;transition:opacity 1.2s ease;text-align:center;padding:24px;z-index:5}
#intro.gone{opacity:0;pointer-events:none}
#intro h1{font-size:clamp(32px,6vw,58px);font-weight:400;letter-spacing:.42em;text-indent:.42em;color:#efe3cc;text-shadow:0 0 38px rgba(255,190,120,.28)}
#intro .sub{font-style:italic;color:#b7a98c;font-size:16px;letter-spacing:.08em}
#intro .glyphrow{opacity:.75;margin:4px 0}
#intro .controls{display:grid;grid-template-columns:auto auto;gap:7px 26px;margin-top:12px;font-size:13px;color:#9b8fae;align-items:center;text-align:left}
#intro .controls b{font-weight:400;color:#d8cbb0}
#intro .note{max-width:66ch;font-size:12px;line-height:1.7;color:#6f6880;margin-top:10px}
#enter{pointer-events:auto;cursor:pointer;margin-top:16px;background:none;border:1px solid #b7a98c;color:#e8d9b8;font:inherit;font-size:14px;letter-spacing:.32em;text-indent:.32em;padding:14px 36px;transition:.3s;animation:pulse 2.8s infinite}
#enter:hover{background:rgba(231,217,184,.12);box-shadow:0 0 28px rgba(255,200,130,.22)}
@keyframes pulse{50%{border-color:#7d7264}}
#crosshair{position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2px;border-radius:50%;background:rgba(244,236,217,.8);box-shadow:0 0 6px rgba(0,0,0,.7)}
#prompt{position:absolute;left:50%;bottom:11%;transform:translateX(-50%);background:rgba(18,14,26,.74);border:1px solid rgba(231,217,184,.22);border-radius:99px;padding:9px 20px;font-size:14px;letter-spacing:.04em;color:#efe3cc;opacity:0;transition:opacity .25s;white-space:nowrap;backdrop-filter:blur(4px)}
#prompt.on{opacity:1}
#region{position:absolute;top:9%;left:0;right:0;text-align:center;opacity:0;transition:opacity 1s;pointer-events:none}
#region .rname{font-size:25px;letter-spacing:.5em;text-indent:.5em;color:#efe3cc;text-shadow:0 2px 18px rgba(0,0,0,.85)}
#region .rsub{font-style:italic;font-size:14px;color:#c9b896;margin-top:6px;letter-spacing:.12em}
#region.on{opacity:1}
#toast{position:absolute;left:50%;bottom:19%;transform:translateX(-50%);font-style:italic;font-size:16px;color:#f4e8cf;text-shadow:0 2px 12px rgba(0,0,0,.9);opacity:0;transition:opacity .5s;text-align:center;max-width:70ch;pointer-events:none}
#toast.on{opacity:1}
#drink{position:absolute;left:26px;bottom:22px;background:rgba(18,14,26,.72);border:1px solid rgba(231,217,184,.25);border-radius:10px;padding:10px 16px;font-size:13px;color:#d8cbb0;display:none;backdrop-filter:blur(4px)}
#drink .dname{color:#efe3cc;font-size:15px}
#drink .dhint{font-size:11px;color:#9b8fae;margin-top:3px}
#mute{position:absolute;right:26px;top:22px;font-size:11px;letter-spacing:.24em;color:#8d8298;opacity:0;transition:.4s}
#mute.on{opacity:1}
#vign{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 50%,rgba(140,52,14,.42) 100%);opacity:0;transition:opacity .45s;pointer-events:none}
#vign.on{opacity:1}
#dim{position:absolute;inset:0;background:rgba(6,4,10,.5);opacity:0;transition:.35s;backdrop-filter:blur(3px);pointer-events:none}
#dim.on{opacity:1;pointer-events:auto;cursor:pointer}
#card{position:absolute;left:50%;top:50%;transform:translate(-50%,-48%) scale(.97);width:min(660px,90vw);max-height:84vh;overflow:auto;background:linear-gradient(168deg,#f4e9d3,#e7d8bb);color:#241c12;border:1px solid #9c8158;box-shadow:0 30px 90px rgba(0,0,0,.65),inset 0 0 0 3px rgba(255,252,244,.5),inset 0 0 0 4px #b49a72;padding:34px 42px 24px;opacity:0;pointer-events:none;transition:opacity .3s,transform .3s}
#card.on{opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto}
#card a{color:#a1471f;text-decoration:underline;text-underline-offset:2px}
#card a:hover{color:#7c3413}
#card .photo{margin:12px 0 4px}
#card .photo img{display:block;width:62%;margin:0 auto;border:1px solid #9c8158;box-shadow:0 10px 28px rgba(40,25,10,.35);background:#fff;padding:5px}
#card .kicker{font-size:11px;letter-spacing:.34em;color:#a1471f;margin-bottom:9px}
#card h2{font-size:26px;font-weight:400;letter-spacing:.02em;margin-bottom:2px}
#card .titlesub{font-style:italic;color:#6b5c42;font-size:14px;margin-bottom:6px}
#card .meta{display:grid;grid-template-columns:auto 1fr;gap:3px 18px;font-size:13px;margin:12px 0 13px;border-top:1px solid #c3ad87;border-bottom:1px solid #c3ad87;padding:10px 0}
#card .meta dt{letter-spacing:.14em;font-size:10.5px;color:#8a7454;padding-top:2px}
#card .meta dd{color:#33291b}
#card .body{font-size:15px;line-height:1.66}
#card .body p+p{margin-top:9px}
#card .src{margin-top:13px;padding-top:9px;border-top:1px dashed #b49a72;font-style:italic;font-size:12px;color:#6b5c42}
#card .hint{margin-top:11px;text-align:center;font-size:11px;letter-spacing:.18em;color:#8a7454}
#err{position:absolute;top:0;left:0;right:0;background:#5c1010;color:#ffd9d9;font:12px/1.5 monospace;padding:10px 14px;display:none;white-space:pre-wrap;z-index:99;pointer-events:auto}
@media (max-width:700px){#intro h1{letter-spacing:.2em;text-indent:.2em}#card{padding:24px 22px 18px}}
`;

const BODY = `<div id="ui"></div>`;

const fullPage = (js, inline) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${TITLE}</title>
<style>${CSS}</style>
</head>
<body>
${BODY}
${inline ? `<script>${js}</script>` : `<script src="bundle.js"></script>`}
</body>
</html>`;

// Artifact pages are wrapped in a document skeleton at publish time, so this
// variant has no doctype/html/head/body tags of its own.
const artifactPage = (js) => `<title>${TITLE}</title>
<style>${CSS}</style>
${BODY}
<script>${js}</script>`;

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
  fs.writeFileSync(path.join(root, 'dist/artifact.html'), artifactPage(js));
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/index.html'), fullPage(js, true));   // GitHub Pages
  console.log(`dist + docs written (${(js.length / 1024).toFixed(0)} KB bundle)`);
} else {
  await esbuild.build(opts(false));
  fs.writeFileSync(path.join(root, 'index.html'), fullPage('', false));
  console.log('built bundle.js + index.html');
}
