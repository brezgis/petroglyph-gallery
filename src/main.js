// FIRST MARKS — entry point. Builds the world, runs the loop, keeps the
// frame rate honest: pooled sconce lights, shadows baked only on change,
// adaptive render resolution, and a Q-key performance mode that also engages
// itself if the machine is struggling.

import * as THREE from 'three';
import { clamp, lerp } from './util.js';
import { REGIONS, regionCenter } from './layout.js';
import { buildSky } from './world/sky.js';
import { buildTerrain } from './world/terrain.js';
import { buildGallery } from './world/rocks.js';
import { buildPlaza, ABOUT } from './world/plaza.js';
import { buildCritters } from './world/critters.js';
import { PANELS } from './art/panels.js';
import { Player } from './player.js';
import { setupInteract } from './interact.js';
import { AudioEngine } from './audio.js';
import { UI } from './ui.js';

const params = new URLSearchParams(location.search);
const SHOT = params.has('cam');

const ui = new UI();
window.addEventListener('error', (e) => ui.error(String(e.message || e)));

const BASE_CAP = Math.min(window.devicePixelRatio || 1, 1.5);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(BASE_CAP);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;    // the scene is static — bake on demand
renderer.domElement.className = 'gl';
document.body.appendChild(renderer.domElement);

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
};
const world = { scene, renderer, camera, state };

const sky = buildSky(world);
const terrain = buildTerrain(world);
const gallery = buildGallery(world);
const plaza = buildPlaza(world);
const critters = buildCritters(world);

const audio = new AudioEngine();
const player = new Player(world);
player.onStep = (run) => audio.step(run);
const interact = setupInteract(world, player, ui, audio);

const courts = REGIONS.map((r) => ({ ...regionCenter(r), name: r.name, sub: r.sub, shown: false }));

if (SHOT) {
  ui.hideIntro();
  let [cx, cy, cz, cyaw, cpitch] = (params.get('cam') || '0,3,-20,180,0').split(',').map(Number);
  if (![cx, cy, cz].every(Number.isFinite)) { cx = 0; cy = 3; cz = -20; cyaw = 180; cpitch = 0; }
  camera.position.set(cx, cy, cz);
  camera.rotation.order = 'YXZ';
  camera.rotation.set((cpitch || 0) * Math.PI / 180, (cyaw || 0) * Math.PI / 180, 0);
  const label = params.get('label');
  if (label === 'about') ui.showCard(ABOUT);
  else if (label && PANELS[label]) ui.showPanel(PANELS[label], '');
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
  renderer.setPixelRatio(clamp(resScale, 0.55, 1) * cap);
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
      ? (auto ? 'Framerate low — performance mode is on. Q toggles it.' : 'Performance mode on.')
      : 'Full quality restored.');
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyQ' && !e.repeat && player.entered && !ui.overlayOpen) {
    autoLiteArmed = false;
    setLite(!lite);
  }
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
let time = 0;
let frameN = 0;
let shotFrames = 0;

renderer.setAnimationLoop(() => {
  const dt = clamp(clock.getDelta(), 0, 0.05);
  time += dt;
  frameN++;
  emaDt += (dt - emaDt) * 0.05;
  state.night = lerp(state.night, state.nightTarget, 1 - Math.exp(-1.2 * dt));

  if (!SHOT) {
    player.update(dt);
    interact.update(dt);
    audio.update(dt, player.pos.x, player.pos.z, state.night);
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
  gallery.update(dt, time, state.night, camera.position);
  plaza.update(dt, time, state.night);
  critters.update(dt, time, SHOT ? camera.position : player.pos);

  // shadows: rebake only while the light is actually moving (night fades)
  if (renderer.shadowMap.enabled &&
      (frameN < 4 || Math.abs(state.night - state.nightTarget) > 0.004)) {
    renderer.shadowMap.needsUpdate = true;
  }

  // adaptive resolution: nudge every ~2s toward a smooth frame time
  if (!SHOT && frameN % 120 === 0) {
    if (emaDt > 0.026 && resScale > 0.56) { resScale *= 0.85; applyRes(); }
    else if (emaDt < 0.015 && resScale < 1) { resScale = Math.min(1, resScale * 1.08); applyRes(); }
    if (autoLiteArmed && !lite && time > 8 && emaDt > 0.034) {
      autoLiteArmed = false;
      setLite(true, true);
    }
  }

  renderer.render(scene, camera);
  if (SHOT && ++shotFrames === 45) {
    window.__READY = true;
    document.title = 'READY';
  }
});
