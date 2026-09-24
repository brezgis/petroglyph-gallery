// First-person walker: pointer-lock mouse look (drag-look fallback), WASD +
// shift or double-tap-W to run, terrain following, circle-collider push-out,
// gentle head bob with step events, and bench sitting.

import * as THREE from 'three';
import { clamp, lerp } from './util.js';
import { SPAWN, WORLD_R } from './layout.js';
import { terrainHeight } from './world/terrain.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.camera = world.camera;
    this.canvas = world.renderer.domElement;
    this.pos = new THREE.Vector3(SPAWN.x, 0, SPAWN.z);
    this.vel = new THREE.Vector3();
    this.yaw = SPAWN.yaw;
    this.pitch = -0.02;
    this.keys = {};
    this.locked = false;
    this.entered = false;
    this.dragging = false;
    this.onStep = null;
    this.bobPhase = 0;
    this._prevBob = 0;
    this.autoRun = false;
    this._lastW = 0;
    this.sitting = null;          // {x, z} while seated
    this._smoothY = null;
    this.camera.rotation.order = 'YXZ';

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
    });
    document.addEventListener('pointerlockerror', () => { this.locked = false; });

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.entered || this.world.state.frozen) return;
      if (!this.locked) {
        this.lock();
        this.dragging = true;
        this._lx = e.clientX; this._ly = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => (this.dragging = false));
    window.addEventListener('mousemove', (e) => {
      if (!this.entered || this.world.state.frozen) return;
      if (this.locked) {
        this.yaw -= e.movementX * 0.0022;
        this.pitch = clamp(this.pitch - e.movementY * 0.0022, -1.5, 1.5);
      } else if (this.dragging) {
        this.yaw -= (e.clientX - this._lx) * 0.004;
        this.pitch = clamp(this.pitch - (e.clientY - this._ly) * 0.004, -1.5, 1.5);
        this._lx = e.clientX; this._ly = e.clientY;
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' && this.locked) e.preventDefault();
      if (e.code === 'KeyW' && !this.keys.KeyW && !e.repeat) {
        const now = performance.now();
        if (now - this._lastW < 280) this.autoRun = true;   // double-tap to run
        this._lastW = now;
      }
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'KeyW') this.autoRun = false;
    });
    window.addEventListener('blur', () => { this.keys = {}; this.autoRun = false; this._lastW = 0; });
    this._setupTouch();
  }

  // Touch: left half of the screen is a floating thumbstick (walk; push it
  // to the rim to run), right half drags the view. Buttons for E / G live
  // in the UI layer and are wired in ui.touchButtons().
  _setupTouch() {
    this.stick = { id: null, x0: 0, y0: 0, x: 0, y: 0 };
    this.lookTouch = { id: null, x: 0, y: 0 };
    const c = this.canvas;
    const R = 56;
    const knob = () => document.getElementById('stick');
    c.addEventListener('touchstart', (e) => {
      if (!this.entered || this.world.state.frozen) return;
      for (const t of e.changedTouches) {
        if (t.clientX < innerWidth * 0.45 && this.stick.id === null) {
          Object.assign(this.stick, { id: t.identifier, x0: t.clientX, y0: t.clientY, x: 0, y: 0 });
          const k = knob();
          if (k) { k.style.left = t.clientX + 'px'; k.style.top = t.clientY + 'px'; k.classList.add('on'); }
        } else if (this.lookTouch.id === null) {
          Object.assign(this.lookTouch, { id: t.identifier, x: t.clientX, y: t.clientY });
        }
      }
      e.preventDefault();
    }, { passive: false });
    c.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stick.id) {
          let dx = t.clientX - this.stick.x0, dy = t.clientY - this.stick.y0;
          const d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          this.stick.x = dx / R; this.stick.y = dy / R;
          const k = knob();
          if (k) k.style.setProperty('--kx', dx + 'px'), k.style.setProperty('--ky', dy + 'px');
        } else if (t.identifier === this.lookTouch.id && !this.world.state.frozen) {
          this.yaw -= (t.clientX - this.lookTouch.x) * 0.0055;
          this.pitch = clamp(this.pitch - (t.clientY - this.lookTouch.y) * 0.0055, -1.4, 1.4);
          this.lookTouch.x = t.clientX; this.lookTouch.y = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.stick.id) {
          this.stick.id = null; this.stick.x = this.stick.y = 0;
          const k = knob();
          if (k) { k.classList.remove('on'); k.style.setProperty('--kx', '0px'); k.style.setProperty('--ky', '0px'); }
        }
        if (t.identifier === this.lookTouch.id) this.lookTouch.id = null;
      }
    };
    c.addEventListener('touchend', end);
    c.addEventListener('touchcancel', end);
  }

  lock() {
    // touch devices have no pointer lock; elsewhere it can be refused (e.g.
    // right after Esc) — both are fine, the drag-look fallback still works
    if (!this.canvas.requestPointerLock || document.body.classList.contains('touch')) return;
    const quiet = (p) => { if (p && p.catch) p.catch(() => {}); };
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { quiet(this.canvas.requestPointerLock()); } catch (_) {} });
    } catch (_) {
      try { quiet(this.canvas.requestPointerLock()); } catch (_) {}
    }
  }

  sit(spot) {
    this.sitting = { x: spot.x, z: spot.z };
    this.pos.set(spot.x, 0, spot.z);
    this.vel.set(0, 0, 0);
    if (spot.yaw !== undefined) this.yaw = spot.yaw;
  }

  stand() {
    if (!this.sitting) return;
    // step off the bench toward wherever you're looking
    this.pos.x += -Math.sin(this.yaw) * 0.55;
    this.pos.z += -Math.cos(this.yaw) * 0.55;
    this.sitting = null;
  }

  get moving() {
    return this.vel.lengthSq() > 0.5;
  }

  update(dt) {
    const k = this.keys;
    const frozen = this.world.state.frozen || !this.entered;
    if (frozen) this.vel.set(0, 0, 0);   // no residual drift while reading
    let ix = 0, iz = 0;
    if (!frozen) {
      if (k.KeyW || k.ArrowUp) iz += 1;
      if (k.KeyS || k.ArrowDown) iz -= 1;
      if (k.KeyA || k.ArrowLeft) ix -= 1;
      if (k.KeyD || k.ArrowRight) ix += 1;
      if (this.stick && this.stick.id !== null) {
        const dead = 0.15;
        if (Math.abs(this.stick.x) > dead) ix += this.stick.x;
        if (Math.abs(this.stick.y) > dead) iz -= this.stick.y;
      }
    }

    if (this.sitting) {
      if (ix !== 0 || iz !== 0) this.stand();
      else {
        const ground = terrainHeight(this.sitting.x, this.sitting.z);
        const eye = ground + 1.16;
        this._smoothY = this._smoothY === null ? eye : lerp(this._smoothY, eye, 1 - Math.exp(-8 * dt));
        this.camera.position.set(this.sitting.x, this._smoothY, this.sitting.z);
        this.camera.rotation.set(this.pitch, this.yaw, 0);
        return;
      }
    }

    const stickRun = this.stick && this.stick.id !== null && Math.hypot(this.stick.x, this.stick.y) > 0.95;
    const run = k.ShiftLeft || k.ShiftRight || this.autoRun || stickRun;
    const speed = run ? 6.1 : 3.3;
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rX = -fz, rZ = fx;
    let dx = fx * iz + rX * ix;
    let dz = fz * iz + rZ * ix;
    const dl = Math.max(1, Math.hypot(dx, dz));   // keys: unit speed; thumbstick: analog
    dx /= dl; dz /= dl;
    const has = ix !== 0 || iz !== 0;
    const kk = 1 - Math.exp(-6.5 * dt);
    this.vel.x = lerp(this.vel.x, has ? dx * speed : 0, kk);
    this.vel.z = lerp(this.vel.z, has ? dz * speed : 0, kk);

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    for (const c of this.world.state.colliders) {
      const ddx = this.pos.x - c.x, ddz = this.pos.z - c.z;
      const d = Math.hypot(ddx, ddz);
      const min = c.r + 0.38;
      if (d < min && d > 1e-4) {
        this.pos.x = c.x + (ddx / d) * min;
        this.pos.z = c.z + (ddz / d) * min;
      }
    }
    const r = Math.hypot(this.pos.x, this.pos.z);
    if (r > WORLD_R) {
      this.pos.x *= WORLD_R / r;
      this.pos.z *= WORLD_R / r;
    }

    const sp = Math.hypot(this.vel.x, this.vel.z);
    this.bobPhase += sp * dt * 1.5;
    const bobAmp = 0.026 * clamp(sp / 3.3, 0, 1.3);
    const bob = Math.sin(this.bobPhase * Math.PI) * bobAmp;
    // distance-based stride: frame-rate independent footstep events
    this._stride = (this._stride || 0) + sp * dt;
    const strideLen = sp > 4.5 ? 2.1 : 1.55;
    if (this._stride > strideLen && sp > 0.8) {
      this._stride = 0;
      if (this.onStep) this.onStep(sp > 4.5);
    }

    // smooth the eye height so terrain steps never thump the camera
    const eye = terrainHeight(this.pos.x, this.pos.z) + 1.7;
    this._smoothY = this._smoothY === null ? eye : lerp(this._smoothY, eye, 1 - Math.exp(-11 * dt));
    this.camera.position.set(this.pos.x, this._smoothY + bob, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
