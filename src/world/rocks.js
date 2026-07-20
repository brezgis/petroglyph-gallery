// The gallery itself: boulders shaped from displaced boxes, panel faces kept
// flat for the engravings, brass sconces with light cones and dust motes,
// lectern plaques, and one region stele per grove.

import * as THREE from 'three';
import { fbm3, smoothstep, mulberry, clamp, TAU, DEG } from '../util.js';
import { REGIONS, regionCenter } from '../layout.js';
import { PANELS } from '../art/panels.js';
import { renderPanelTexture, makeRockTexture } from '../art/glyphs.js';
import { makePlaqueTexture, makeSteleTexture } from '../art/labels.js';
import { terrainHeight } from './terrain.js';

let _softDot = null;
function softDot() {
  if (_softDot) return _softDot;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(16, 16, 1, 16, 16, 15);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 32, 32);
  _softDot = new THREE.CanvasTexture(c);
  return _softDot;
}

const ironMat = new THREE.MeshStandardMaterial({ color: 0x35302b, roughness: 0.6, metalness: 0.7 });
const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x6a4c28, roughness: 0.38, metalness: 0.85 });
const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe3b0 });
// invisible raycast proxies: drawn never, hit-tested instead of the 5k-tri boulders
const ghostMat = new THREE.MeshBasicMaterial({ visible: false });
// only the nearest few sconce spotlights are real lights at any moment; the
// count is constant so three.js never has to rebuild shaders
const ACTIVE_SPOTS = 6;

function displaceBox(geo, bw, bh, bd, seed, amp, flatFn) {
  const p = geo.attributes.position;
  const v = new THREE.Vector3(), q = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    q.set(v.x / (bw / 2), v.y / (bh / 2), v.z / (bd / 2));
    const r = Math.max(q.length(), 1e-4);
    const f = 0.62 + 0.38 / r;                       // round the corners
    n.copy(v).normalize();
    const flat = flatFn ? flatFn(v, q) : 0;
    const s = 2.2 / Math.max(bw, bh);
    const d = (fbm3(v.x * s * 1.1 + seed * 10, v.y * s * 1.1, v.z * s * 1.1, 3) +
               fbm3(v.x * s * 3 + seed, v.y * s * 3, v.z * s * 3, 2) * 0.32) * amp * (1 - 0.93 * flat);
    p.setXYZ(i, v.x * f + n.x * d, v.y * f + n.y * d, v.z * f + n.z * d);
  }
  geo.computeVertexNormals();
}

function buildSconce(parent, opts) {
  const { hood, target, span, big = false } = opts;
  const H = new THREE.Vector3(...hood), T = new THREE.Vector3(...target);
  const beam = T.clone().sub(H);
  const dist = beam.length();
  beam.normalize();

  // arm from the rock crown to the hood
  const anchor = new THREE.Vector3(H.x, H.y - 0.18, H.z - 0.78);
  const armVec = H.clone().sub(anchor);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, armVec.length() + 0.1, 8), bronzeMat);
  arm.position.copy(anchor).addScaledVector(armVec, 0.5);
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), armVec.clone().normalize());
  parent.add(arm);

  const hoodMesh = new THREE.Mesh(new THREE.CylinderGeometry(big ? 0.20 : 0.15, big ? 0.27 : 0.21, big ? 0.42 : 0.32, 14, 1, true), bronzeMat);
  hoodMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), beam);
  hoodMesh.position.copy(H);
  parent.add(hoodMesh);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(big ? 0.06 : 0.045, 10, 8), bulbMat);
  bulb.position.copy(H).addScaledVector(beam, 0.1);
  parent.add(bulb);

  const spot = new THREE.SpotLight(0xffc07a, 0, dist * 3.2, Math.atan((span * 0.62) / dist), 0.72, 1.9);
  spot.position.copy(H);
  spot.target.position.copy(T);
  parent.add(spot, spot.target);

  const coneGeo = new THREE.ConeGeometry(span * 0.5, dist, 20, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xffc07a, transparent: true, opacity: 0.02,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beam.clone().negate());
  cone.position.copy(H).addScaledVector(beam, dist / 2);
  parent.add(cone);

  // dust motes drifting in the beam
  const N = 24;
  const dustPos = new Float32Array(N * 3);
  const dustSeed = [];
  const rng = mulberry(Math.round(H.x * 91 + H.y * 53) + 7);
  for (let i = 0; i < N; i++) {
    const t = 0.12 + rng() * 0.85;
    const rad = span * 0.42 * t * rng();
    const a = rng() * TAU;
    dustSeed.push({ t, rad, a, ph: rng() * TAU, sp: 0.5 + rng() });
    dustPos[i * 3] = H.x; dustPos[i * 3 + 1] = H.y; dustPos[i * 3 + 2] = H.z;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xffd9a5, size: 0.045, transparent: true, opacity: 0.3, map: softDot(),
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  dust.frustumCulled = false;
  parent.add(dust);

  // distant stand-in: when this sconce's real light is pooled off, a soft warm
  // sprite keeps the panel glowing in far views
  const farGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDot(), color: 0xffc98a, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  farGlow.position.copy(T).addScaledVector(beam, -0.4);
  farGlow.scale.set(span * 1.15, span * 0.95, 1);
  parent.add(farGlow);

  const baseIntensity = clamp(26 + span * span * 4.5, 30, 120);
  return {
    spot, cone, dust,
    update(time, night, doDust = true, d2 = 0) {
      const d = Math.sqrt(d2);
      farGlow.material.opacity = clamp((d - 22) / 20, 0, 1) * (0.2 + 0.33 * night);
      const flick = 1 + Math.sin(time * 11 + H.x * 7) * 0.03 + Math.sin(time * 27 + H.z * 13) * 0.02;
      if (spot.visible) spot.intensity = baseIntensity * (0.8 + 0.55 * night) * flick;
      coneMat.opacity = 0.018 + 0.038 * night;
      if (dust.visible !== doDust) dust.visible = doDust;   // far dust: neither drawn nor updated
      if (!doDust) return;
      const arr = dustGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const s = dustSeed[i];
        const drift = ((time * 0.04 * s.sp + s.ph) % 1);
        const t = (s.t + drift) % 1;
        const px = H.x + beam.x * t * dist + Math.cos(s.a + time * 0.2) * s.rad;
        const py = H.y + beam.y * t * dist + Math.sin(time * 0.5 + s.ph) * 0.03;
        const pz = H.z + beam.z * t * dist + Math.sin(s.a + time * 0.2) * s.rad;
        arr[i * 3] = px; arr[i * 3 + 1] = py; arr[i * 3 + 2] = pz;
      }
      dustGeo.attributes.position.needsUpdate = true;
    },
  };
}

function buildLectern(def) {
  const group = new THREE.Group();
  for (const lx of [-0.22, 0.22]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.8, 0.045), ironMat);
    leg.position.set(lx, 0.4, 0);
    leg.castShadow = true;
    group.add(leg);
  }
  const top = new THREE.Group();
  top.position.set(0, 0.82, 0.02);
  top.rotation.x = 0.52;      // label face tips toward the approaching visitor
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.026, 0.5), bronzeMat);
  frame.castShadow = true;
  top.add(frame);
  const labelTex = makePlaqueTexture(def);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.42),
    new THREE.MeshStandardMaterial({
      map: labelTex, roughness: 0.85, metalness: 0,
      emissive: 0xffffff, emissiveMap: labelTex, emissiveIntensity: 0.22,
    }));
  label.rotation.x = -Math.PI / 2;
  label.position.y = 0.016;
  top.add(label);
  group.add(top);
  group.userData.hit = [frame, label];
  return group;
}

function buildPhotoLectern(def) {
  const group = new THREE.Group();
  for (const lx of [-0.13, 0.13]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.78, 0.04), ironMat);
    leg.position.set(lx, 0.39, 0);
    leg.castShadow = true;
    group.add(leg);
  }
  const top = new THREE.Group();
  top.position.set(0, 0.8, 0.02);
  top.rotation.x = 0.52;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.024, 0.43), bronzeMat);
  frame.castShadow = true;
  top.add(frame);
  const tex = new THREE.TextureLoader().load(def.photo);
  tex.colorSpace = THREE.SRGBColorSpace;
  const photo = new THREE.Mesh(
    new THREE.PlaneGeometry(0.25, 0.355),
    new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.7, metalness: 0,
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12,
    }));
  photo.rotation.x = -Math.PI / 2;
  photo.rotation.z = Math.PI / 2;
  photo.position.y = 0.015;
  top.add(photo);
  group.add(top);
  group.userData.hit = [frame, photo];
  return group;
}

export function buildGallery(world) {
  const { scene, state } = world;
  const group = new THREE.Group();
  scene.add(group);
  const sconces = [];
  let dagger = null;

  for (const region of REGIONS) {
    const C = regionCenter(region);
    const outAng = Math.atan2(C.z, C.x);
    const n = region.panels.length;
    const spreadHalf = (n > 3 ? 74 : 62) * DEG;

    region.panels.forEach((id, i) => {
      const def = PANELS[id];
      const t = n === 1 ? 0.5 : i / (n - 1);
      const ang = outAng - spreadHalf + t * 2 * spreadHalf;
      const R = def.kind === 'dais' ? 7.4 : 9.2 + (i % 2) * 1.6 + (def.bw > 5 ? 1.8 : 0);
      const bx = C.x + Math.cos(ang) * R;
      const bz = C.z + Math.sin(ang) * R;
      const gy = terrainHeight(bx, bz);
      const yaw = Math.atan2(C.x - bx, C.z - bz);

      const G = new THREE.Group();
      G.position.set(bx, gy, bz);
      G.rotation.y = yaw;
      group.add(G);

      const { bw, bh, bd, pw, ph } = def;
      const side = makeRockTexture(def.style, def.seed);
      const sideMat = new THREE.MeshStandardMaterial({
        map: side.map, normalMap: side.normalMap, roughness: 0.95, metalness: 0,
        normalScale: new THREE.Vector2(0.7, 0.7),
      });

      if (def.kind === 'dais') {
        // horizontal engraved platform (Sydney tradition)
        const tex = renderPanelTexture({ wM: bw, hM: bd, style: def.style, seed: def.seed, draw: def.draw, glow: false });
        const topMat = new THREE.MeshStandardMaterial({
          map: tex.map, normalMap: tex.normalMap, roughness: 0.9, metalness: 0,
          normalScale: new THREE.Vector2(0.9, 0.9),
        });
        const geo = new THREE.BoxGeometry(bw, bh, bd, 20, 4, 16);
        displaceBox(geo, bw, bh, bd, def.seed, Math.min(bw, bd) * 0.045,
          (v, q) => smoothstep(0.3, 0.8, q.y) * (1 - smoothstep(0.86, 1.15, Math.max(Math.abs(q.x), Math.abs(q.z)))));
        const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
        const mesh = new THREE.Mesh(geo, mats);
        mesh.position.y = bh / 2 - 0.24;
        mesh.rotation.x = -0.05;
        mesh.castShadow = mesh.receiveShadow = true;
        G.add(mesh);
        const proxy = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), ghostMat);
        proxy.position.copy(mesh.position);
        proxy.rotation.copy(mesh.rotation);
        G.add(proxy);
        proxy.userData.interact = { type: 'panel', def, id };

        // sconce on a standing post beside the platform
        const px = -(bw / 2 + 0.55);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.5, 10), ironMat);
        pole.position.set(px, 1.25, 0);
        pole.castShadow = true;
        G.add(pole);
        sconces.push(buildSconce(G, {
          hood: [px + 0.5, 2.55, 0], target: [0, bh * 0.6, 0], span: Math.max(bw, bd) * 0.95,
        }));

        const lect = buildLectern(def);
        lect.position.set(bw / 2 * 0.5 + 0.4, 0, bd / 2 + 1.35);
        lect.rotation.y = -0.1;
        G.add(lect);
        for (const h of lect.userData.hit) h.userData.interact = { type: 'panel', def, id };

        state.colliders.push({ x: bx, z: bz, r: Math.max(bw, bd) / 2 + 0.4 });
        const lw = new THREE.Vector3(bw / 2 * 0.5 + 0.4, 0, bd / 2 + 1.35).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        state.colliders.push({ x: bx + lw.x, z: bz + lw.z, r: 0.42 });
        state.interactables.push(proxy, ...lect.userData.hit);
        return;
      }

      const pcy = Math.min(0.9 + ph / 2 - bh / 2, bh / 2 - ph / 2 - 0.12);
      const tex = renderPanelTexture({ wM: bw, hM: bh, style: def.style, seed: def.seed, draw: def.draw, yOff: pcy });
      const frontMat = new THREE.MeshStandardMaterial({
        map: tex.map, normalMap: tex.normalMap, roughness: 0.92, metalness: 0,
        normalScale: new THREE.Vector2(0.9, 0.9),
      });
      const geo = new THREE.BoxGeometry(bw, bh, bd, 26, 26, 10);
      displaceBox(geo, bw, bh, bd, def.seed, Math.min(bw, bh) * 0.13, (v, q) => {
        const px2 = Math.abs(v.x) / (pw / 2 + 0.35);
        const py2 = Math.abs(v.y - pcy) / (ph / 2 + 0.35);
        return (1 - smoothstep(0.9, 1.28, Math.max(px2, py2))) * smoothstep(0.3, 0.85, q.z);
      });
      const mats = [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat];
      const mesh = new THREE.Mesh(geo, mats);
      mesh.position.y = bh / 2 - 0.35;
      mesh.rotation.x = -(2 + (def.seed % 4)) * DEG;
      mesh.castShadow = mesh.receiveShadow = true;
      G.add(mesh);
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), ghostMat);
      proxy.position.copy(mesh.position);
      proxy.rotation.copy(mesh.rotation);
      G.add(proxy);
      proxy.userData.interact = { type: 'panel', def, id };

      const topY = pcy + ph / 2;
      const sconce = buildSconce(mesh, {
        hood: [0, topY + 0.4, bd / 2 + 0.5],
        target: [0, pcy - ph * 0.24, bd / 2 + 0.05],
        span: Math.max(pw, ph) * 1.05,
        big: def.bw > 5,
      });
      sconces.push(sconce);

      const lect = buildLectern(def);
      const lxo = clamp(pw * 0.35 + 0.35, 0.9, 2.4);
      lect.position.set(lxo, 0, bd / 2 + 1.5);
      lect.rotation.y = -0.14;
      G.add(lect);
      for (const h of lect.userData.hit) h.userData.interact = { type: 'panel', def, id };

      state.colliders.push({ x: bx, z: bz, r: Math.max(bw, bd) / 2 + 0.55 });
      const lw = new THREE.Vector3(lxo, 0, bd / 2 + 1.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      state.colliders.push({ x: bx + lw.x, z: bz + lw.z, r: 0.42 });
      state.interactables.push(proxy, ...lect.userData.hit);

      // curator's framed field photo, on its own stand across from the plaque
      if (def.photo) {
        const pl = buildPhotoLectern(def);
        pl.position.set(-lxo, 0, bd / 2 + 1.45);
        pl.rotation.y = 0.14;
        G.add(pl);
        const pdata = {
          kicker: 'FIELD NOTES — FROM THE CURATOR’S CAMERA',
          title: def.photoCaption,
          img: def.photo,
          body: 'The real panel, and the visitor it briefly had.',
        };
        for (const h of pl.userData.hit) h.userData.interact = { type: 'overlay', data: pdata };
        state.interactables.push(...pl.userData.hit);
        const pw2 = new THREE.Vector3(-lxo, 0, bd / 2 + 1.45).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        state.colliders.push({ x: bx + pw2.x, z: bz + pw2.z, r: 0.4 });
      }

      // Fajada easter egg: the light dagger
      if (def.dagger) {
        const blade = new THREE.Mesh(
          new THREE.PlaneGeometry(0.045, 0.5),
          new THREE.MeshBasicMaterial({
            color: 0xffedc8, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
          }));
        blade.position.set(0.06, pcy + 0.02, bd / 2 + 0.12);
        blade.rotation.z = 0.06;
        mesh.add(blade);
        dagger = { blade, baseY: pcy + 0.02 };
      }
    });

    // region stele at the court entrance
    const sx = C.x - Math.cos(outAng) * 11.2 + Math.cos(outAng + Math.PI / 2) * 3.0;
    const sz = C.z - Math.sin(outAng) * 11.2 + Math.sin(outAng + Math.PI / 2) * 3.0;
    const sTex = makeSteleTexture(region.name, region.sub);
    const sSide = makeRockTexture('paleGrey', 3);
    const sFront = new THREE.MeshStandardMaterial({
      map: sTex, roughness: 0.9, metalness: 0,
      emissive: 0xffffff, emissiveMap: sTex, emissiveIntensity: 0.2,   // readable even in shadow
    });
    const sSideMat = new THREE.MeshStandardMaterial({ map: sSide.map, normalMap: sSide.normalMap, roughness: 0.95 });
    const sGeo = new THREE.BoxGeometry(1.1, 2.3, 0.45, 6, 10, 3);
    displaceBox(sGeo, 1.1, 2.3, 0.45, region.angle + 5, 0.05,
      (v, q) => smoothstep(0.3, 0.8, q.z));
    const stele = new THREE.Mesh(sGeo, [sSideMat, sSideMat, sSideMat, sSideMat, sFront, sSideMat]);
    stele.position.set(sx, terrainHeight(sx, sz) + 1.0, sz);
    stele.rotation.y = Math.atan2(-sx, -sz);
    stele.rotation.x = -0.03;
    stele.castShadow = stele.receiveShadow = true;
    group.add(stele);
    state.colliders.push({ x: sx, z: sz, r: 0.85 });
  }

  // world positions for distance-based light pooling
  group.updateMatrixWorld(true);
  for (const s of sconces) {
    s.worldPos = s.spot.getWorldPosition(new THREE.Vector3());
    s.spot.visible = false;
    s.d2 = 0;
  }
  let effectsOn = true;
  let poolTimer = 0;

  function update(dt, time, night, viewPos) {
    poolTimer -= dt;
    if (viewPos && poolTimer <= 0) {
      poolTimer = 0.35;
      for (const s of sconces)
        s.d2 = (s.worldPos.x - viewPos.x) ** 2 + (s.worldPos.z - viewPos.z) ** 2;
      const order = [...sconces].sort((a, b) => a.d2 - b.d2);
      order.forEach((s, i) => (s.spot.visible = i < ACTIVE_SPOTS));
    }
    for (const s of sconces) s.update(time, night, effectsOn && s.d2 < 2500, s.d2);
    if (dagger) {
      const T = 160, DUR = 14;
      const p = (time % T) / T;
      const win = p * T;
      if (win < DUR) {
        const t = win / DUR;
        dagger.blade.material.opacity = Math.sin(t * Math.PI) * 0.85;
        dagger.blade.position.y = dagger.baseY + 0.32 - 0.64 * t;
      } else {
        dagger.blade.material.opacity = 0;
      }
    }
  }

  function setEffects(on) {
    effectsOn = on;
    for (const s of sconces) {
      s.cone.visible = on;
      s.dust.visible = on;
    }
  }

  return { update, setEffects };
}
