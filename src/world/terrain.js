// The valley: analytic height field (fbm + rim bowl, flattened at plaza,
// courts and paths), painted ground canvas, instanced grass/bushes/stones,
// and dark pines on the rim to close the horizon.

import * as THREE from 'three';
import { fbm2, smoothstep, clamp, lerp, mulberry, TAU, makeCanvas } from '../util.js';
import { REGIONS, regionCenter, PLAZA_R } from '../layout.js';

const SIZE = 240, HALF = SIZE / 2;

function baseHeight(x, z) {
  let h = fbm2(x * 0.014, z * 0.014, 4) * 2.6 + fbm2(x * 0.06 + 7, z * 0.06 + 7, 3) * 0.45;
  const r = Math.hypot(x, z);
  h += smoothstep(78, 112, r) * (6 + fbm2(x * 0.03, z * 0.03, 3) * 2.5);
  return h;
}

// Courts: one per region. The FIELD NOTES region sits at (0,-46) on the south
// path, which also keeps the spawn approach walkable.
const courts = REGIONS.map((r) => {
  const c = regionCenter(r);
  return { x: c.x, z: c.z, h: baseHeight(c.x, c.z) * 0.3, court: true };
});

export function pathInfo(x, z) {
  // Distance to the nearest radial path centreline and nearest court centre.
  let pathD = 1e9, courtD = 1e9;
  for (const c of courts) {
    const len = Math.hypot(c.x, c.z);
    const ux = c.x / len, uz = c.z / len;
    const t = clamp(x * ux + z * uz, 0, len);
    const wob = Math.sin(t * 0.13 + c.x * 0.05) * 1.3;
    const px = ux * t - uz * wob, pz = uz * t + ux * wob;
    pathD = Math.min(pathD, Math.hypot(x - px, z - pz));
    if (c.court) courtD = Math.min(courtD, Math.hypot(x - c.x, z - c.z));
  }
  return { pathD, courtD };
}

export function terrainHeight(x, z) {
  let h = baseHeight(x, z);
  for (const c of courts) {
    const len = Math.hypot(c.x, c.z);
    const ux = c.x / len, uz = c.z / len;
    const t = clamp(x * ux + z * uz, 0, len);
    const wob = Math.sin(t * 0.13 + c.x * 0.05) * 1.3;
    const px = ux * t - uz * wob, pz = uz * t + ux * wob;
    const d = Math.hypot(x - px, z - pz);
    const w = 1 - smoothstep(1.8, 3.8, d);
    if (w > 0) h = lerp(h, c.h * smoothstep(len * 0.12, len * 0.85, t), w * 0.92);
  }
  for (const c of courts) {
    if (!c.court) continue;
    const dc = Math.hypot(x - c.x, z - c.z);
    const w = 1 - smoothstep(9.5, 17, dc);
    if (w > 0) h = lerp(h, c.h, w);
  }
  h = lerp(h, 0, 1 - smoothstep(PLAZA_R, PLAZA_R + 8, Math.hypot(x, z)));
  return h;
}

function paintGround() {
  const px = 2048;
  const { canvas, ctx } = makeCanvas(px, px);
  const W = (wx) => ((wx + HALF) / SIZE) * px;   // world → canvas
  const S = px / SIZE;                            // metres → pixels
  const rng = mulberry(4021);

  ctx.fillStyle = '#5f5946';
  ctx.fillRect(0, 0, px, px);

  // large soil/sage blotches
  for (let i = 0; i < 9000; i++) {
    const x = rng() * SIZE - HALF, z = rng() * SIZE - HALF;
    const v = fbm2(x * 0.05, z * 0.05, 3);
    ctx.fillStyle = v > 0.10 ? 'rgba(84,92,64,0.22)' : v < -0.14 ? 'rgba(112,100,78,0.22)' : 'rgba(96,88,68,0.10)';
    ctx.beginPath();
    ctx.arc(W(x), W(z), (2 + rng() * 9) * S * 0.5, 0, TAU);
    ctx.fill();
  }

  // paths
  for (const c of courts) {
    const len = Math.hypot(c.x, c.z);
    const ux = c.x / len, uz = c.z / len;
    for (let t = 4; t < len + (c.court ? 4 : -6); t += 0.45) {
      const wob = Math.sin(t * 0.13 + c.x * 0.05) * 1.3;
      const x = ux * t - uz * wob, z = uz * t + ux * wob;
      ctx.fillStyle = 'rgba(139,124,95,0.34)';
      ctx.beginPath(); ctx.arc(W(x) + (rng() - 0.5) * 6, W(z) + (rng() - 0.5) * 6, (1.35 + rng() * 0.5) * S, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(154,138,106,0.30)';
      ctx.beginPath(); ctx.arc(W(x), W(z), (0.7 + rng() * 0.3) * S, 0, TAU); ctx.fill();
    }
  }

  // plaza + courts
  const disc = (cx, cz, r, fill, a) => {
    ctx.fillStyle = fill; ctx.globalAlpha = a;
    ctx.beginPath(); ctx.arc(W(cx), W(cz), r * S, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  };
  disc(0, 0, PLAZA_R + 0.5, '#8b7c5f', 0.9);
  ctx.strokeStyle = 'rgba(70,62,48,0.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(W(0), W(0), (PLAZA_R + 0.2) * S, 0, TAU); ctx.stroke();
  for (const c of courts) if (c.court) disc(c.x, c.z, 8.8, '#867760', 0.55);

  // pebbles + grain
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = rng() > 0.5 ? 'rgba(50,45,36,0.5)' : 'rgba(150,140,116,0.4)';
    ctx.fillRect(rng() * px, rng() * px, 1 + rng() * 2, 1 + rng() * 2);
  }
  for (let i = 0; i < 22000; i++) {
    ctx.fillStyle = rng() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.035)';
    ctx.fillRect(rng() * px, rng() * px, 1.5, 1.5);
  }

  // darken toward the rim
  const g = ctx.createRadialGradient(px / 2, px / 2, px * 0.36, px / 2, px / 2, px * 0.52);
  g.addColorStop(0, 'rgba(20,16,12,0)'); g.addColorStop(1, 'rgba(20,16,12,0.4)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, px, px);

  return canvas;
}

export function buildTerrain(world) {
  const { scene } = world;
  const rng = mulberry(99);

  const geo = new THREE.PlaneGeometry(SIZE, SIZE, 200, 200);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, terrainHeight(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();

  const tex = new THREE.CanvasTexture(paintGround());
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- bunchgrass tufts (7 drooping blades per instance, wind in shader) ----
  const blade = new THREE.BufferGeometry();
  {
    const verts = [], uvs = [], idx = [];
    const trng = mulberry(17);
    for (let b = 0; b < 7; b++) {
      const a = (b / 7) * TAU + trng() * 0.7;
      const lean = 0.3 + trng() * 0.5;
      const dx = Math.cos(a), dz = Math.sin(a);
      const px = -dz, pz = dx;
      const h = 0.7 + trng() * 0.5;
      const w0 = 0.05, w1 = 0.028;
      const midOut = lean * 0.35 * h, tipOut = lean * h;
      const midY = 0.55 * h, tipY = h * (1 - lean * 0.3);
      const base = verts.length / 3;
      verts.push(
        -px * w0, 0, -pz * w0, px * w0, 0, pz * w0,
        dx * midOut - px * w1, midY, dz * midOut - pz * w1,
        dx * midOut + px * w1, midY, dz * midOut + pz * w1,
        dx * tipOut, tipY, dz * tipOut);
      uvs.push(0, 0, 1, 0, 0, 0.55, 1, 0.55, 0.5, 1);
      idx.push(base, base + 1, base + 2, base + 2, base + 1, base + 3, base + 2, base + 3, base + 4);
    }
    blade.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    blade.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    blade.setIndex(idx);
  }
  const COUNT = 2600;
  const grassGeo = new THREE.InstancedBufferGeometry();
  grassGeo.index = blade.index;
  grassGeo.attributes.position = blade.attributes.position;
  grassGeo.attributes.uv = blade.attributes.uv;
  const off = new Float32Array(COUNT * 3), scl = new Float32Array(COUNT), yaw = new Float32Array(COUNT), ph = new Float32Array(COUNT), sh = new Float32Array(COUNT);
  let gi = 0, guard = 0;
  while (gi < COUNT && guard++ < COUNT * 60) {
    const x = (rng() * 2 - 1) * 100, z = (rng() * 2 - 1) * 100;
    const r = Math.hypot(x, z);
    if (r < 13 || r > 96) continue;
    const { pathD, courtD } = pathInfo(x, z);
    if (pathD < 2.7 || courtD < 9.2) continue;
    if (fbm2(x * 0.05, z * 0.05, 3) < -0.12) continue;
    off[gi * 3] = x; off[gi * 3 + 1] = terrainHeight(x, z) - 0.02; off[gi * 3 + 2] = z;
    scl[gi] = 0.3 + rng() * 0.24;
    yaw[gi] = rng() * TAU;
    ph[gi] = rng() * TAU;
    sh[gi] = 0.6 + rng() * 0.38;
    gi++;
  }
  grassGeo.instanceCount = gi;
  grassGeo.setAttribute('iOffset', new THREE.InstancedBufferAttribute(off, 3));
  grassGeo.setAttribute('iScale', new THREE.InstancedBufferAttribute(scl, 1));
  grassGeo.setAttribute('iYaw', new THREE.InstancedBufferAttribute(yaw, 1));
  grassGeo.setAttribute('iPhase', new THREE.InstancedBufferAttribute(ph, 1));
  grassGeo.setAttribute('iShade', new THREE.InstancedBufferAttribute(sh, 1));

  const grassUniforms = {
    uTime: { value: 0 }, uNight: { value: 0 },
    uFogColor: { value: new THREE.Color(0x554a68) }, uFogDensity: { value: 0.0062 },
  };
  const grassMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, uniforms: grassUniforms,
    vertexShader: `
      attribute vec3 iOffset;
      attribute float iScale;
      attribute float iYaw;
      attribute float iPhase;
      attribute float iShade;
      uniform float uTime;
      varying float vY; varying float vShade; varying float vDist;
      void main(){
        vec3 p = position;
        float c = cos(iYaw), s = sin(iYaw);
        p = vec3(p.x * c - p.z * s, p.y, p.x * s + p.z * c);
        p *= iScale;
        float bend = (sin(uTime * 1.5 + iPhase) * 0.05 + sin(uTime * 0.53 + iPhase * 1.7) * 0.035) * uv.y * uv.y;
        p.x += bend; p.z += bend * 0.6;
        vec4 mv = viewMatrix * vec4(p + iOffset, 1.0);
        vDist = length(mv.xyz);
        vY = uv.y; vShade = iShade;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uNight; uniform vec3 uFogColor; uniform float uFogDensity;
      varying float vY; varying float vShade; varying float vDist;
      void main(){
        vec3 col = mix(vec3(0.185,0.20,0.148), vec3(0.36,0.345,0.225), vY) * vShade;
        col = mix(col, col * vec3(0.42,0.50,0.78), uNight * 0.62);
        float f = 1.0 - exp(-vDist * vDist * uFogDensity * uFogDensity);
        col = mix(col, uFogColor, f);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const grass = new THREE.Mesh(grassGeo, grassMat);
  grass.frustumCulled = false;
  scene.add(grass);

  // ---- bushes / stones / rim pines ----
  const placeInstanced = (mesh, n, place) => {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    let i = 0, guard2 = 0;
    while (i < n && guard2++ < n * 80) {
      const x = (rng() * 2 - 1) * 108, z = (rng() * 2 - 1) * 108;
      if (!place(x, z, v, s, e)) continue;
      q.setFromEuler(e);
      m.compose(v, q, s);
      mesh.setMatrixAt(i++, m);
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  };

  const bush = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x46503c, roughness: 1, flatShading: true }), 130);
  placeInstanced(bush, 130, (x, z, v, s, e) => {
    const r = Math.hypot(x, z);
    if (r < 14 || r > 104) return false;
    const { pathD, courtD } = pathInfo(x, z);
    if (pathD < 3.2 || courtD < 10) return false;
    const w = 0.5 + rng() * 0.9;
    v.set(x, terrainHeight(x, z) + w * 0.28, z);
    s.set(w, w * (0.5 + rng() * 0.25), w * (0.8 + rng() * 0.4));
    e.set(0, rng() * TAU, 0);
    return true;
  });

  const dryBush = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0x6b5b41, roughness: 1, flatShading: true }), 60);
  placeInstanced(dryBush, 60, (x, z, v, s, e) => {
    const r = Math.hypot(x, z);
    if (r < 15 || r > 104) return false;
    const { pathD, courtD } = pathInfo(x, z);
    if (pathD < 3 || courtD < 10) return false;
    const w = 0.35 + rng() * 0.6;
    v.set(x, terrainHeight(x, z) + w * 0.22, z);
    s.set(w, w * 0.5, w);
    e.set(0, rng() * TAU, 0);
    return true;
  });

  const stone = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0x6a655e, roughness: 0.95, flatShading: true }), 240);
  placeInstanced(stone, 240, (x, z, v, s, e) => {
    const r = Math.hypot(x, z);
    if (r < 12.5 || r > 110) return false;
    const { courtD } = pathInfo(x, z);
    if (courtD < 9.5) return false;
    const w = 0.12 + rng() * rng() * 0.5;
    v.set(x, terrainHeight(x, z) + w * 0.35, z);
    s.set(w, w * (0.6 + rng() * 0.5), w);
    e.set(rng() * 0.6, rng() * TAU, rng() * 0.6);
    return true;
  });

  // ---- junipers & dead snags (replacing the old cone "pines") ----
  {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x453427, roughness: 1 });
    const blobMat = new THREE.MeshStandardMaterial({ color: 0x2e3b26, roughness: 1, flatShading: true });
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.16, 1, 6), trunkMat, 46);
    const blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), blobMat, 140);
    const snags = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.11, 1, 5), trunkMat, 34);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    let ti = 0, bi = 0, si = 0, guardJ = 0;
    const wantRim = 30, wantInner = 9;
    let rimN = 0, innerN = 0;
    while ((rimN < wantRim || innerN < wantInner) && guardJ++ < 4000) {
      const x = (rng() * 2 - 1) * 112, z = (rng() * 2 - 1) * 112;
      const r = Math.hypot(x, z);
      const isRim = r >= 92 && r <= 112;
      const isInner = r >= 34 && r < 92;
      if (isRim && rimN >= wantRim) continue;
      if (isInner && innerN >= wantInner) continue;
      if (!isRim && !isInner) continue;
      const { pathD, courtD } = pathInfo(x, z);
      if (pathD < 4.5 || courtD < 12) continue;
      const gy = terrainHeight(x, z);
      const ht = (isRim ? 2.2 + rng() * 1.6 : 1.5 + rng() * 1.1);
      if (rng() < 0.24 && si < 34) {
        // dead snag: tilted bare trunk + a couple of limbs
        e.set((rng() - 0.5) * 0.5, rng() * TAU, (rng() - 0.5) * 0.5);
        q.setFromEuler(e);
        v.set(x, gy + ht * 0.45, z); s.set(1, ht, 1);
        m.compose(v, q, s); snags.setMatrixAt(si++, m);
        for (let k = 0; k < 2 && si < 34; k++) {
          e.set((rng() - 0.5) * 2.2, rng() * TAU, 0.7 + rng() * 0.6);
          q.setFromEuler(e);
          v.set(x + (rng() - 0.5) * 0.4, gy + ht * (0.55 + rng() * 0.3), z + (rng() - 0.5) * 0.4);
          s.set(0.5, 0.7 + rng() * 0.5, 0.5);
          m.compose(v, q, s); snags.setMatrixAt(si++, m);
        }
      } else if (ti < 46) {
        e.set((rng() - 0.5) * 0.12, rng() * TAU, (rng() - 0.5) * 0.12);
        q.setFromEuler(e);
        v.set(x, gy + ht * 0.5, z); s.set(1, ht, 1);
        m.compose(v, q, s); trunks.setMatrixAt(ti++, m);
        const crownR = ht * 0.42;
        const nb = 3;
        for (let k = 0; k < nb && bi < 140; k++) {
          const a = rng() * TAU, rr = rng() * crownR * 0.7;
          e.set(rng() * 3, rng() * 3, rng() * 3);
          q.setFromEuler(e);
          v.set(x + Math.cos(a) * rr, gy + ht * (0.72 + rng() * 0.42), z + Math.sin(a) * rr);
          const bs = crownR * (0.75 + rng() * 0.55);
          s.set(bs, bs * (0.55 + rng() * 0.25), bs);
          m.compose(v, q, s); blobs.setMatrixAt(bi++, m);
        }
      } else continue;
      if (isRim) rimN++; else innerN++;
    }
    trunks.count = ti; blobs.count = bi; snags.count = si;
    trunks.instanceMatrix.needsUpdate = blobs.instanceMatrix.needsUpdate = snags.instanceMatrix.needsUpdate = true;
    scene.add(trunks, blobs, snags);
  }

  function update(dt, time, night, fog) {
    grassUniforms.uTime.value = time;
    grassUniforms.uNight.value = night;
    grassUniforms.uFogColor.value.copy(fog.color);
    grassUniforms.uFogDensity.value = fog.density;
  }

  const fullGrass = gi;
  function setGrassFraction(f) {
    grassGeo.instanceCount = Math.floor(fullGrass * clamp(f, 0, 1));
  }

  return { update, setGrassFraction };
}
