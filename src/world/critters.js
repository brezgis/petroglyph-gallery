// Desert lizards: rare, small, skittish. They bask near the groves, do their
// little push-up displays, and dart for cover when you come close.

import * as THREE from 'three';
import { mulberry, TAU, clamp } from '../util.js';
import { REGIONS, regionCenter } from '../layout.js';
import { terrainHeight } from './terrain.js';

export function buildCritters(world) {
  const { scene } = world;
  const rng = mulberry(2024);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6b5a42, roughness: 1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x554634, roughness: 1 });

  const lizards = [];
  const spots = [];
  for (const r of REGIONS) {
    const c = regionCenter(r);
    spots.push({ x: c.x + (rng() - 0.5) * 10, z: c.z + (rng() - 0.5) * 10 });
  }
  spots.push({ x: 9, z: 5 }, { x: -8, z: -7 });

  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.07, 3, 6), bodyMat);
    body.rotation.z = Math.PI / 2;
    body.scale.y = 0.62;
    g.add(body);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.035, 6), bodyMat);
    head.rotation.z = -Math.PI / 2;
    head.position.set(0.062, 0.002, 0);
    g.add(head);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.1, 6), darkMat);
    tail.rotation.z = Math.PI / 2;
    tail.position.set(-0.085, 0, 0);
    g.add(tail);
    for (const [lx, lz] of [[0.028, 0.022], [0.028, -0.022], [-0.03, 0.022], [-0.03, -0.022]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.007, 0.026), darkMat);
      leg.position.set(lx, -0.011, lz);
      g.add(leg);
    }
    const spot = spots[i % spots.length];
    const L = {
      g, tail,
      x: spot.x + (rng() - 0.5) * 4,
      z: spot.z + (rng() - 0.5) * 4,
      yaw: rng() * TAU,
      state: 'idle',
      t: 2 + rng() * 5,
      tx: 0, tz: 0,
      bob: 0,
      seed: rng() * TAU,
    };
    g.position.set(L.x, terrainHeight(L.x, L.z) + 0.02, L.z);
    scene.add(g);
    lizards.push(L);
  }

  function startDart(L, dirX, dirZ, dist) {
    const len = Math.hypot(dirX, dirZ) || 1;
    L.tx = L.x + (dirX / len) * dist;
    L.tz = L.z + (dirZ / len) * dist;
    L.state = 'dart';
    L.t = dist / 3.4 + 0.2;
    L.yaw = Math.atan2(L.tz - L.z, L.tx - L.x);
  }

  function update(dt, time, playerPos) {
    for (const L of lizards) {
      L.t -= dt;
      const pdx = L.x - playerPos.x, pdz = L.z - playerPos.z;
      const pd = Math.hypot(pdx, pdz);
      if (pd > 60) continue;                       // asleep when nobody's near

      if (L.state !== 'dart' && pd < 2.4) {
        startDart(L, pdx + (rng() - 0.5), pdz + (rng() - 0.5), 2.5 + rng() * 2);
      } else if (L.state === 'idle' && L.t <= 0) {
        if (rng() < 0.45) { L.state = 'pushup'; L.t = 1.1 + rng() * 0.8; }
        else { const a = rng() * TAU; startDart(L, Math.cos(a), Math.sin(a), 1.2 + rng() * 2.4); }
      } else if (L.state === 'pushup') {
        L.bob = Math.max(0, Math.sin(time * 13 + L.seed)) * 0.012;
        if (L.t <= 0) { L.state = 'idle'; L.t = 2 + rng() * 6; L.bob = 0; }
      } else if (L.state === 'dart') {
        const dx = L.tx - L.x, dz = L.tz - L.z;
        const d = Math.hypot(dx, dz);
        const step = 3.4 * dt;
        if (d < step || L.t <= 0) {
          L.state = 'idle';
          L.t = 1.5 + rng() * 6;
          L.tail.rotation.y = 0;
        } else {
          L.x += (dx / d) * step;
          L.z += (dz / d) * step;
          L.tail.rotation.y = Math.sin(time * 26 + L.seed) * 0.5;
        }
      }

      L.g.position.set(L.x, terrainHeight(L.x, L.z) + 0.02 + L.bob, L.z);
      L.g.rotation.y = -L.yaw;
    }
  }

  return { update };
}
