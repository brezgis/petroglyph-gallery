// Center-screen raycast interaction: read plaques and cards, pick up pottery
// and sip, take food from the foods table and eat it, set things down. Also
// owns the E/G/N/M keys.

import * as THREE from 'three';
import { clamp } from './util.js';
import { REGIONS } from './layout.js';
import { buildBite } from './world/plaza.js';
import { K } from './ui.js';

const REGION_OF = {};
for (const r of REGIONS) for (const id of r.panels) REGION_OF[id] = r.name;


export function setupInteract(world, player, ui, audio) {
  const ray = new THREE.Raycaster();
  const center = new THREE.Vector2(0, 0);
  const state = world.state;
  let current = null;
  let sipCool = 0, rayTimer = 0;

  const heldGroup = new THREE.Group();
  world.camera.add(heldGroup);
  // resting pose: low and to the right of view
  const REST_P = new THREE.Vector3(0.33, -0.35, -0.62);
  const REST_R = new THREE.Euler(0.12, -0.25, 0.05);
  // at the lips: centred just under the eye, close in. A cup tips its rim
  // TOWARD the drinker (+x rotation brings the top toward the camera); the
  // old animation tipped it away, pouring the drink out over the table.
  const SIP_P = new THREE.Vector3(0.0, -0.22, -0.36);
  const SIP_R = new THREE.Euler(1.05, -0.05, 0.0);
  const BITE_P = new THREE.Vector3(0.0, -0.13, -0.26);
  const BITE_R = new THREE.Euler(0.35, -0.1, 0.0);
  heldGroup.position.copy(REST_P);
  heldGroup.rotation.copy(REST_R);
  let actT = -1, actKind = null;

  function maxDistFor(it) {
    if (it.type === 'panel') return 6.0;
    if (it.type === 'vessel' || it.type === 'food') return 3.4;
    return 3.2;
  }

  // the scene's shadow map is baked on demand; anything that leaves or
  // returns to a table must trigger a re-bake, and nothing in your hand
  // should cast a shadow into the world
  const rebake = () => { world.renderer.shadowMap.needsUpdate = true; };
  const setCast = (o, on) => o.traverse((m) => { if (m.isMesh) m.castShadow = on; });

  function pickup(mesh, v) {
    state.held = { kind: 'vessel', v, mesh };
    setCast(mesh, false);
    rebake();
    mesh.userData.home.parent.remove(mesh);
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    heldGroup.add(mesh);
    // a held vessel shouldn't catch the interaction ray in front of your face
    const idx = state.interactables.indexOf(mesh);
    if (idx !== -1) state.interactables.splice(idx, 1);
    ui.setHeld(v.name, `${K('E')} sip &nbsp; ${K('G')} set down`);
    ui.toast(`${v.drink}. ${v.notes[0]}`);
    audio.uiTick();
  }

  function takeFood(f) {
    const mesh = buildBite(f);
    heldGroup.add(mesh);
    state.held = { kind: 'food', f, mesh, bites: 0 };
    ui.setHeld(`${f.bite[0].toUpperCase()}${f.bite.slice(1)}`, `${K('E')} bite &nbsp; ${K('G')} put back`);
    ui.toast(`You take ${f.bite}.`);
    audio.uiTick();
  }

  function setDown() {
    const held = state.held;
    heldGroup.remove(held.mesh);
    state.held = null;
    actT = -1;
    heldGroup.position.copy(REST_P);
    heldGroup.rotation.copy(REST_R);
    ui.setHeld(null);
    audio.uiTick();
    if (held.kind === 'food') {
      ui.toast(held.bites ? 'You set the rest aside for later.' : 'Back on the table it goes.');
      return;
    }
    const { mesh } = held;
    setCast(mesh, true);
    rebake();
    const home = mesh.userData.home;
    home.parent.add(mesh);
    mesh.position.copy(home.pos);
    mesh.rotation.set(0, home.rot, 0);
    state.interactables.push(mesh);
    ui.toast('Returned to the bar. The next visitor thanks you.');
  }

  // E with something in hand: raise it to your mouth. The sip/bite lands at
  // the top of the motion (see update), so sound and toast match the picture.
  function consume() {
    if (sipCool > 0 || actT >= 0) return;
    actT = 0;
    actKind = state.held.kind;
    sipCool = 1.3;
  }

  function atMouth() {
    const held = state.held;
    if (!held || ui.overlayOpen) return;
    if (held.kind === 'vessel') {
      const v = held.v;
      v._noteIdx = ((v._noteIdx ?? 0) + 1) % v.notes.length;
      audio.sip();
      ui.sipFlash();
      ui.toast(v.notes[v._noteIdx]);
    } else {
      const f = held.f;
      audio.bite(f.soft);
      ui.toast(f.notes[Math.min(held.bites, f.notes.length - 1)]);
      held.bites++;
      const left = 3 - held.bites;
      if (left <= 0) {
        held.finish = true;          // vanishes as the hand comes back down
      } else {
        held.mesh.scale.setScalar(0.45 + 0.55 * (left / 3));
      }
    }
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
        if (state.held) ui.toast('Your hands are full. G sets it down.');
        else pickup(current, it.v);
      } else if (it.type === 'food') {
        if (state.held) ui.toast('Your hands are full. G sets it down.');
        else takeFood(it.f);
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
    if (state.held) { consume(); return; }
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

  // clicking the dim backdrop or the close button also closes the card
  document.getElementById('dim').addEventListener('click', () => {
    if (ui.overlayOpen) closeOverlay();
  });
  ui.onClose = () => { if (ui.overlayOpen) closeOverlay(); };

  function update(dt) {
    sipCool = Math.max(0, sipCool - dt);
    // raise to the mouth, pause, lower: 0→0.4 up, 0.4→0.6 hold, 0.6→1 down
    if (actT >= 0) {
      const prev = actT;
      actT += dt / 1.0;
      if (prev < 0.42 && actT >= 0.42) atMouth();
      const t = Math.min(actT, 1);
      const up = t < 0.4 ? t / 0.4 : t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
      const a = up * up * (3 - 2 * up);
      const P = actKind === 'food' ? BITE_P : SIP_P, R = actKind === 'food' ? BITE_R : SIP_R;
      heldGroup.position.lerpVectors(REST_P, P, a);
      heldGroup.rotation.set(
        REST_R.x + (R.x - REST_R.x) * a,
        REST_R.y + (R.y - REST_R.y) * a,
        REST_R.z + (R.z - REST_R.z) * a);
      if (actT >= 1) {
        actT = -1;
        heldGroup.position.copy(REST_P);
        heldGroup.rotation.copy(REST_R);
        if (state.held && state.held.finish) {
          const f = state.held.f;
          heldGroup.remove(state.held.mesh);
          state.held = null;
          ui.setHeld(null);
          ui.toast(`Finished. The table has more ${f.title.split(' ')[0].toLowerCase()} whenever you like.`);
        }
      }
    } else if (state.held) {
      const b = Math.sin(player.bobPhase * Math.PI) * 0.008;
      heldGroup.position.set(REST_P.x, REST_P.y + b, REST_P.z);
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
      // with something already in hand, looking at the bar or the food table
      // shouldn't hijack E — you meant to sip / take a bite
      if (state.held && (it.type === 'vessel' || it.type === 'food')) break;
      if (h.distance <= maxDistFor(it)) current = h.object;
      break;
    }
    if (current) {
      const it = current.userData.interact;
      if (it.type === 'panel') ui.setPrompt(`${K('E')} Read <i>${it.def.title}</i>`);
      else if (it.type === 'overlay') ui.setPrompt(`${K('E')} Read <i>${it.data.title}</i>`);
      else if (it.type === 'bench') ui.setPrompt(player.sitting ? `${K('E')} Stand up` : `${K('E')} Sit by the fire`);
      else if (it.type === 'vessel')
        ui.setPrompt(`${K('E')} Take the ${it.v.name}`);
      else if (it.type === 'food')
        ui.setPrompt(`${K('E')} Take ${it.f.bite}`);
    } else if (state.held) {
      ui.setPrompt(null);      // the held-item chip already says what E and G do
    } else {
      ui.setPrompt(null);
    }
  }

  return { update, openCard: (data) => openOverlay(() => ui.showCard(data)) };
}
