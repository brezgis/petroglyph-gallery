// FIRST MARKS — entry point. Paints the title veil first, builds the valley
// and hearth, starts rendering at once, then carves the groves a few stones
// per frame, nearest first. Keeps the frame rate honest: pooled sconce
// lights, shadows baked only on change, adaptive render resolution, and a
// Q-key performance mode that also engages itself if the machine struggles.

import * as THREE from 'three';
import { clamp, lerp } from './util.js';
import { REGIONS, regionCenter } from './layout.js';
import { buildSky } from './world/sky.js';
import { buildTerrain } from './world/terrain.js';
import { buildGallery } from './world/rocks.js';
import { buildPlaza, ABOUT } from './world/plaza.js';
import { buildCritters } from './world/critters.js';
import { PANELS } from './art/panels.js';
import { setMaxAnisotropy } from './art/glyphs.js';
import { Player } from './player.js';
import { setupInteract } from './interact.js';
import { AudioEngine } from './audio.js';
import { UI, K } from './ui.js';

const params = new URLSearchParams(location.search);
const SHOT = params.has('cam');
// ?cam=…&live=1: screenshot mode but with the walker + interactions running,
// so scripted key presses can exercise pick-up / sip / eat
const LIVE = SHOT && params.has('live');

// startup timings, readable from the console as window.__fm
const fm = (window.__fm = { t: {} });
const mark = (k) => (fm.t[k] = Math.round(performance.now()));

const HELP = {
  where: 'Controls',
  title: 'Getting around',
  body: 'Walk with W A S D and look with the mouse. Hold Shift, or double-tap W, to run.',
  meta: [
    ['E', 'Read a label; take a cup or a dish; sip, eat, or sit by the fire'],
    ['G', 'Set down what you are holding'],
    ['N', 'Dusk or night'],
    ['M', 'Sound on or off'],
    ['Q', 'Performance mode (turns itself on if needed)'],
    ['Esc', 'Free the cursor'],
    ['H', 'This list'],
  ],
  unfold: true,
};

const ui = new UI();
window.addEventListener('error', (e) => ui.error(String(e.message || e)));
mark('veil');

// Let the browser paint the title veil before any heavy lifting.
const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

async function boot() {
  await nextPaint();
  mark('painted');

  // Crisp on a Retina screen (DPR 2) without paying for 3x phones; the
  // adaptive scaler below trims it if the GPU can't keep up.
  const BASE_CAP = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(BASE_CAP);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Neutral tone mapping keeps hues true: under ACES the sconce pools went
  // orange and the pale pecking merged with the varnish.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;    // the scene is static: bake on demand
  renderer.domElement.className = 'gl';
  document.body.prepend(renderer.domElement);
  setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 700);
  scene.add(camera);

  const nightParam = clamp(parseFloat(params.get('night') ?? '0.18') || 0.18, 0, 1);
  const state = {
    night: SHOT ? nightParam : 0.18,
    nightTarget: SHOT ? nightParam : 0.18,
    frozen: false,
    held: null,
    colliders: [],
    interactables: [],
    panelViews: {},
  };
  const world = { scene, renderer, camera, state };

  const sky = buildSky(world); mark('sky');
  const terrain = buildTerrain(world); mark('terrain');
  const plaza = buildPlaza(world); mark('plaza');
  const critters = buildCritters(world);
  const gallery = buildGallery(world);
  const jobs = gallery.jobs;
  fm.jobs = [];
  const runJob = () => {
    const t0 = performance.now();
    jobs.shift().run();
    fm.jobs.push(Math.round(performance.now() - t0));
    gallery.shadowsDirty();
    if (!jobs.length) mark('complete');
  };
  if (SHOT) while (jobs.length) runJob();   // screenshots want the whole field

  const audio = new AudioEngine();
  const player = new Player(world);
  player.onStep = (run) => audio.step(run);
  const interact = setupInteract(world, player, ui, audio);
  // the camera starts where the walker stands, so the first frame is the view
  player.update(0);

  const courts = REGIONS.map((r) => ({ ...regionCenter(r), name: r.name, sub: r.sub, shown: false }));

  // first-run hints: shown once, dismissed by doing the thing
  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const tips = { stage: 0, walked: 0, t: 0 };
  function updateTips(dt) {
    if (!player.entered || ui.overlayOpen) return;
    tips.t += dt;
    tips.walked += Math.hypot(player.vel.x, player.vel.z) * dt;
    if (tips.stage === 0 && tips.t > 0.6) {
      ui.hint(touch ? 'Left thumb walks, right thumb looks'
        : `${K('W')}${K('A')}${K('S')}${K('D')} to walk, mouse to look`, 0);
      tips.stage = 1;
    } else if (tips.stage === 1 && tips.walked > 4) {
      ui.hint(touch ? '' : `Hold ${K('Shift')} to run`, 4);
      tips.stage = 2;
    } else if (tips.stage === 2 && tips.walked > 40) {
      ui.hint(touch ? '' : `${K('H')} shows every control`, 5);
      tips.stage = 3;
    }
    // lost the cursor (Esc) outside a card: say how to get it back. Pointer
    // lock lands a moment after the click, so give it two seconds first.
    if (player.locked) tips.everLocked = true;
    if (!touch && tips.stage > 0 && (tips.everLocked || tips.t > 2)) {
      const lost = !player.locked && !player.dragging;
      if (lost !== tips.lost) {
        tips.lost = lost;
        if (lost) ui.hint('Click to look around', 0);
        else if (tips.stage <= 1) ui.hint(`${K('W')}${K('A')}${K('S')}${K('D')} to walk, mouse to look`, 0);
        else ui.hint('');
      }
    }
  }

  if (SHOT) {
    window.__dbg = { camera, state, scene, player, renderer };   // screenshot/debug hook (SHOT mode only)
    if (LIVE) player.entered = true;
    ui.hideIntro();
    let [cx, cy, cz, cyaw, cpitch] = (params.get('cam') || '0,3,-20,180,0').split(',').map(Number);
    if (![cx, cy, cz].every(Number.isFinite)) { cx = 0; cy = 3; cz = -20; cyaw = 180; cpitch = 0; }
    camera.position.set(cx, cy, cz);
    camera.rotation.order = 'YXZ';
    camera.rotation.set((cpitch || 0) * Math.PI / 180, (cyaw || 0) * Math.PI / 180, 0);
    // ?panel=<id>[&dist=m] frames one stone square-on (for screenshots/checks)
    const pv = state.panelViews[params.get('panel')];
    // ?tex=1 additionally overlays the raw colour + normal textures (debug)
    if (pv && params.get('tex')) {
      for (const [i, t] of [pv.tex.map, pv.tex.normalMap].entries()) {
        const c = t.image;
        c.style.cssText = `position:fixed;z-index:50;top:0;left:${i * 50}vw;width:50vw;height:auto;background:#000`;
        document.body.appendChild(c);
      }
    }
    if (pv) {
      const vfov = camera.fov * Math.PI / 180;
      const d = parseFloat(params.get('dist')) || (pv.size * 0.62) / Math.tan(vfov / 2) + (pv.front || 0);
      if (pv.dais) {
        camera.position.set(pv.x + Math.sin(pv.yaw) * d * 0.35, pv.y + d * 0.95, pv.z + Math.cos(pv.yaw) * d * 0.35);
        camera.rotation.set(-1.22, pv.yaw, 0);
      } else {
        camera.position.set(pv.x + Math.sin(pv.yaw) * d, pv.y, pv.z + Math.cos(pv.yaw) * d);
        camera.rotation.set(0, pv.yaw, 0);
      }
    }
    // ?lectern=<id> looks down at a stone's plaque, as a reader would
    const lv = state.panelViews[params.get('lectern')];
    if (lv && lv.lectern) {
      const p = lv.lectern;
      camera.position.set(p.x + Math.sin(lv.yaw) * 0.55, p.y + 0.5, p.z + Math.cos(lv.yaw) * 0.55);
      camera.lookAt(p);
    }
    const label = params.get('label');
    if (label === 'about') ui.showCard(ABOUT);
    else if (label === 'help') ui.showCard(HELP);
    else if (label && PANELS[label]) ui.showPanel(PANELS[label], '');
    if (params.has('more')) document.querySelector('#card details')?.setAttribute('open', '');
  } else {
    ui.intro(() => {
      audio.init();
      player.entered = true;
      player.lock();
    });
  }

  // ---------------- performance manager ----------------
  let resScale = 1, cap = BASE_CAP, emaDt = 1 / 60, lite = false, autoLiteArmed = !SHOT;

  function applyRes() {
    // setPixelRatio re-applies the stored drawing-buffer size itself
    renderer.setPixelRatio(clamp(resScale, 0.5, 1) * cap);
  }

  function refreshMaterials() {
    const seen = new Set();
    scene.traverse((o) => {
      if (!o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (!seen.has(m)) { seen.add(m); m.needsUpdate = true; }
    });
  }

  function setLite(on, auto = false) {
    if (lite === on) return;
    lite = on;
    cap = on ? Math.min(BASE_CAP, 1.0) : BASE_CAP;
    if (!on) resScale = 1;      // entering lite keeps any adaptive reduction
    applyRes();
    terrain.setGrassFraction(on ? 0.35 : 1);
    gallery.setEffects(!on);
    renderer.shadowMap.enabled = !on;
    refreshMaterials();
    renderer.shadowMap.needsUpdate = true;
    if (!SHOT) {
      ui.toast(on
        ? (auto ? 'Lower detail for a smoother walk. Q switches back.' : 'Performance mode on.')
        : 'Full detail.');
    }
  }

  window.addEventListener('keydown', (e) => {
    if (!player.entered || e.repeat) return;
    if (e.code === 'KeyQ' && !ui.overlayOpen) {
      autoLiteArmed = false;
      setLite(!lite);
    } else if (e.code === 'KeyH' && !ui.overlayOpen) {
      interact.openCard(HELP);
    }
  });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const timer = new THREE.Timer();
  timer.connect?.(document);          // pauses cleanly when the tab is hidden
  let time = 0;
  let frameN = 0;
  let shotFrames = 0;
  let slowFrames = 0;

  // compile every shader the opening view needs off the main thread where
  // the browser supports it, so the first frame doesn't hitch
  scene.add(gallery.warmup);
  if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(scene, camera).catch(() => {});
  else renderer.compile(scene, camera);
  scene.remove(gallery.warmup);
  mark('compiled');

  // Carve the remaining groves between frames: in generous slices while the
  // title veil is up, one stone at a time once the visitor is walking.
  function pump() {
    if (!jobs.length) return;
    const t0 = performance.now();
    do runJob(); while (jobs.length && !player.entered && performance.now() - t0 < 40);
    if (jobs.length) setTimeout(pump, player.entered ? 50 : 0);
  }

  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = clamp(timer.getDelta(), 0, 0.05);
    time += dt;
    frameN++;
    // the frame-time average ignores frames spent building groves
    if (!jobs.length) emaDt += (dt - emaDt) * 0.05;
    state.night = lerp(state.night, state.nightTarget, 1 - Math.exp(-1.2 * dt));

    if (!SHOT || LIVE) {
      player.update(dt);
      interact.update(dt);
      audio.update(dt, player.pos.x, player.pos.z, state.night);
      updateTips(dt);
      for (const c of courts) {
        const d = Math.hypot(player.pos.x - c.x, player.pos.z - c.z);
        if (d < 16 && !c.shown) {
          c.shown = true;
          ui.region(c.name, c.sub);
        } else if (d > 30) c.shown = false;
      }
    }

    sky.update(dt, time, state.night);
    terrain.update(dt, time, state.night, scene.fog);
    gallery.update(dt, time, state.night, SHOT ? camera.position : player.pos);
    plaza.update(dt, time, state.night);
    critters.update(dt, time, SHOT ? camera.position : player.pos);

    // shadows: rebake only while the light is actually moving (night fades)
    if (renderer.shadowMap.enabled &&
        (frameN < 4 || Math.abs(state.night - state.nightTarget) > 0.004)) {
      renderer.shadowMap.needsUpdate = true;
    }

    // adaptive resolution: nudge every ~2 s toward a smooth frame time.
    // Thresholds are absolute, so 120 Hz screens keep full resolution as
    // long as they hold ~60 fps.
    if (!SHOT && frameN % 120 === 0 && !jobs.length) {
      if (emaDt > 0.026 && resScale > 0.51) { resScale *= 0.85; applyRes(); }
      else if (emaDt < 0.015 && resScale < 1) { resScale = Math.min(1, resScale * 1.08); applyRes(); }
      if (emaDt > 0.034) slowFrames++; else slowFrames = 0;
      if (autoLiteArmed && !lite && time > 8 && slowFrames >= 2) {
        autoLiteArmed = false;
        setLite(true, true);
      }
    }

    renderer.render(scene, camera);
    if (fm.t.firstFrame === undefined) {
      mark('firstFrame');
      setTimeout(pump, 0);
      fm.info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
    }

    if (SHOT && ++shotFrames === 45) {
      fm.info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
      window.__READY = true;
      document.title = 'READY';
    }
  });
}

boot().catch((e) => ui.error(String(e && e.stack || e)));
