// Center-screen raycast interaction: read plaques and cards, pick up pottery,
// sip, set down. Also owns the E/G/N/M keys.

import * as THREE from 'three';
import { clamp } from './util.js';
import { REGIONS } from './layout.js';

const REGION_OF = {};
for (const r of REGIONS) for (const id of r.panels) REGION_OF[id] = r.name;

const K = (k) => `<span class="key">${k}</span>`;

export function setupInteract(world, player, ui, audio) {
  const ray = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  const state = world.state;
  let current = null;
  let sipT = -1, sipCool = 0, rayTimer = 0;

  const heldGroup = new THREE.Group();
  world.camera.add(heldGroup);
  heldGroup.position.set(0.33, -0.35, -0.62);
  heldGroup.rotation.set(0.12, -0.25, 0.05);

  function maxDistFor(it) {
    if (it.type === 'panel') return 6.0;
    if (it.type === 'vessel') return 3.4;
    return 3.2;
  }

  function pickup(mesh, v) {
    state.held = { v, mesh };
    mesh.userData.home.parent.remove(mesh);
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    heldGroup.add(mesh);
    // a held vessel shouldn't catch the interaction ray in front of your face
    const idx = state.interactables.indexOf(mesh);
    if (idx !== -1) state.interactables.splice(idx, 1);
    ui.setDrink(v);
    ui.toast(`${v.drink}. ${v.notes[0]}`);
    audio.uiTick();
  }

  function setDown() {
    const { v, mesh } = state.held;
    heldGroup.remove(mesh);
    const home = mesh.userData.home;
    home.parent.add(mesh);
    mesh.position.copy(home.pos);
    mesh.rotation.set(0, home.rot, 0);
    state.interactables.push(mesh);
    state.held = null;
    ui.setDrink(null);
    ui.toast('Returned to the bar. The next visitor thanks you.');
    audio.uiTick();
  }

  function sip() {
    if (sipCool > 0 || sipT >= 0) return;
    sipT = 0;
    sipCool = 1.6;
    const v = state.held.v;
    v._noteIdx = ((v._noteIdx ?? 0) + 1) % v.notes.length;
    setTimeout(() => {
      if (!state.held || state.held.v !== v || ui.overlayOpen) return;   // vessel changed / reading
      audio.sip();
      ui.sipFlash();
      ui.toast(v.notes[v._noteIdx]);
    }, 260);
  }

  let relock = false;

  function closeOverlay() {
    ui.closeCard();
    state.frozen = false;
    audio.uiTick();
    if (relock) player.lock();     // only restore lock if the reader had it
    relock = false;
  }

  function openOverlay(show) {
    relock = !!document.pointerLockElement;
    show();
    state.frozen = true;
    audio.uiTick();
    // free the cursor so source links are clickable
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function act() {
    if (ui.overlayOpen) {
      closeOverlay();
      return;
    }
    if (current) {
      const it = current.userData.interact;
      if (it.type === 'panel') {
        openOverlay(() => ui.showPanel(it.def, REGION_OF[it.id]));
      } else if (it.type === 'overlay') {
        openOverlay(() => ui.showCard(it.data));
      } else if (it.type === 'vessel') {
        if (state.held) ui.toast('Hands full — G to set the other one down.');
        else pickup(current, it.v);
      } else if (it.type === 'bench') {
        if (player.sitting) player.stand();
        else {
          player.sit(it.spot);
          ui.toast('You sit by the fire. Move to stand up.');
          audio.uiTick();
        }
      }
      return;
    }
    if (state.held) { sip(); return; }
    if (player.sitting) player.stand();
  }

  window.addEventListener('keydown', (e) => {
    if (!player.entered || e.repeat) return;
    if (e.code === 'KeyE') act();
    else if (e.code === 'KeyG' && state.held && !ui.overlayOpen) setDown();
    else if (e.code === 'KeyN') {
      state.nightTarget = state.nightTarget > 0.5 ? 0.18 : 1.0;
      ui.toast(state.nightTarget > 0.5 ? 'Night falls over the field.' : 'The dusk returns.');
      audio.uiTick();
    } else if (e.code === 'KeyM') {
      ui.muteBadge(audio.toggleMute());
    } else if (e.code === 'Escape' && ui.overlayOpen) {
      ui.closeCard();
      state.frozen = false;
      relock = false;    // Esc means "give me my cursor" — don't re-lock later
    }
  });

  // clicking the dim backdrop also closes the card (handy once the cursor is free)
  document.getElementById('dim').addEventListener('click', () => {
    if (ui.overlayOpen) closeOverlay();
  });

  function update(dt) {
    sipCool = Math.max(0, sipCool - dt);
    // sip animation: raise & tilt the held vessel
    if (sipT >= 0) {
      sipT += dt / 0.85;
      const t = sipT >= 1 ? 1 : sipT;
      const a = Math.sin(t * Math.PI);
      heldGroup.position.set(0.33 - 0.19 * a, -0.35 + 0.24 * a, -0.62 + 0.2 * a);
      heldGroup.rotation.set(0.12 - 0.9 * a, -0.25, 0.05);
      if (sipT >= 1) {
        sipT = -1;
        heldGroup.position.set(0.33, -0.35, -0.62);
        heldGroup.rotation.set(0.12, -0.25, 0.05);
      }
    } else if (state.held) {
      const b = Math.sin(player.bobPhase * Math.PI) * 0.008;
      heldGroup.position.set(0.33, -0.35 + b, -0.62);
    }

    if (ui.overlayOpen || !player.entered) {
      ui.setPrompt(null);
      current = null;
      rayTimer = 0;
      return;
    }
    // hit-testing at 8 Hz is indistinguishable from per-frame and much cheaper
    rayTimer -= dt;
    if (rayTimer > 0) return;
    rayTimer = 0.12;
    ray.setFromCamera(center, world.camera);
    const hits = ray.intersectObjects(state.interactables, false);
    current = null;
    for (const h of hits) {
      const it = h.object.userData.interact;
      if (!it) continue;
      if (h.distance <= maxDistFor(it)) current = h.object;
      break;
    }
    if (current) {
      const it = current.userData.interact;
      if (it.type === 'panel') ui.setPrompt(`${K('E')} read — <i>${it.def.title}</i>`);
      else if (it.type === 'overlay') ui.setPrompt(`${K('E')} read — <i>${it.data.title}</i>`);
      else if (it.type === 'bench') ui.setPrompt(player.sitting ? `${K('E')} stand up` : `${K('E')} sit by the fire`);
      else if (it.type === 'vessel')
        ui.setPrompt(state.held ? `hands full — ${K('G')} set down first` : `${K('E')} take the ${it.v.name} — <i>${it.v.drink}</i>`);
    } else if (state.held) {
      ui.setPrompt(`${K('E')} take a sip · ${K('G')} set it down`);
    } else {
      ui.setPrompt(null);
    }
  }

  return { update };
}
