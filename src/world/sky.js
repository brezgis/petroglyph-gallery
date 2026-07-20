// Dusk-to-night sky: gradient dome, stars, moon, the single shadow-casting
// key light (a dusk sun that hands over to the moon), fog, shooting stars.

import * as THREE from 'three';
import { lerp, mulberry, TAU } from '../util.js';

const DUSK_SUN = new THREE.Vector3(Math.cos(110 * Math.PI / 180), 0.10, Math.sin(110 * Math.PI / 180)).normalize();
const MOON_DIR = new THREE.Vector3(0.45, 0.58, -0.55).normalize();

export function buildSky(world) {
  const { scene, renderer } = world;
  const rng = mulberry(777);

  // --- gradient dome ---
  const domeUniforms = {
    uNight: { value: 0 },
    uSunDir: { value: DUSK_SUN.clone() },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(430, 32, 18),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: domeUniforms,
      vertexShader: `
        varying vec3 vW;
        void main(){ vW = (modelMatrix * vec4(position,1.)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `
        uniform float uNight; uniform vec3 uSunDir; varying vec3 vW;
        void main(){
          vec3 dir = normalize(vW);
          float h = dir.y;
          vec3 zen = mix(vec3(0.115,0.13,0.27), vec3(0.035,0.045,0.10), uNight);
          vec3 mid = mix(vec3(0.30,0.235,0.385), vec3(0.075,0.085,0.16), uNight);
          vec3 hor = mix(vec3(0.83,0.47,0.255), vec3(0.13,0.135,0.22), uNight);
          vec3 col = mix(hor, mid, smoothstep(-0.02, 0.20, h));
          col = mix(col, zen, smoothstep(0.16, 0.62, h));
          float g = pow(max(dot(dir, uSunDir), 0.0), 9.0);
          col += vec3(1.0,0.52,0.22) * g * 0.60 * (1.0 - uNight);
          float g2 = pow(max(dot(dir, uSunDir), 0.0), 2.5);
          col += vec3(0.85,0.38,0.18) * g2 * 0.16 * (1.0 - uNight);
          col = mix(col, vec3(0.05,0.05,0.09) * (1.0 - uNight * 0.5), 1.0 - smoothstep(-0.25, -0.02, h));
          float n = fract(sin(dot(dir.xy, vec2(12.9898,78.233))) * 43758.5453);
          col += (n - 0.5) * 0.012;
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  dome.frustumCulled = false;
  scene.add(dome);

  // --- stars ---
  const N = 1500;
  const pos = new Float32Array(N * 3), phase = new Float32Array(N), size = new Float32Array(N), tint = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let x, y, z, l;
    do { x = rng() * 2 - 1; y = rng(); z = rng() * 2 - 1; l = Math.hypot(x, y, z); } while (l > 1 || l < 0.1 || y / l < 0.02);
    pos[i * 3] = (x / l) * 408; pos[i * 3 + 1] = (y / l) * 408; pos[i * 3 + 2] = (z / l) * 408;
    phase[i] = rng() * TAU; size[i] = 0.9 + rng() * rng() * 1.7; tint[i] = rng();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  starGeo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
  const starUniforms = { uTime: { value: 0 }, uNight: { value: 0 }, uPR: { value: Math.min(renderer.getPixelRatio(), 2) } };
  const stars = new THREE.Points(starGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: starUniforms,
    vertexShader: `
      attribute float aPhase, aSize, aTint;
      uniform float uTime, uNight, uPR;
      varying float vA; varying float vTint;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (1.1 + uNight * 0.9);
        float tw = 0.55 + 0.45 * sin(uTime * (0.3 + aPhase * 0.5) + aPhase * 41.0);
        vA = (0.20 + 0.80 * uNight) * tw * smoothstep(0.02, 0.14, position.y / 408.0);
        vTint = aTint;
      }`,
    fragmentShader: `
      varying float vA; varying float vTint;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = (1.0 - smoothstep(0.12, 0.5, d)) * vA;
        vec3 col = mix(vec3(0.72,0.80,1.0), vec3(1.0,0.90,0.74), vTint);
        gl_FragColor = vec4(col, a);
      }`,
  }));
  stars.frustumCulled = false;
  scene.add(stars);

  // --- moon ---
  const mc = document.createElement('canvas'); mc.width = mc.height = 128;
  {
    const c = mc.getContext('2d');
    c.clearRect(0, 0, 128, 128);
    c.fillStyle = '#e6ebf3'; c.beginPath(); c.arc(64, 64, 60, 0, TAU); c.fill();
    c.fillStyle = 'rgba(180,190,205,0.55)';
    const mrng = mulberry(31);
    for (let i = 0; i < 14; i++) {
      const a = mrng() * TAU, r = mrng() * 42;
      c.beginPath(); c.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 3 + mrng() * 9, 0, TAU); c.fill();
    }
    c.fillStyle = 'rgba(215,222,232,0.5)'; c.beginPath(); c.arc(48, 50, 26, 0, TAU); c.fill();
  }
  const moonTex = new THREE.CanvasTexture(mc); moonTex.colorSpace = THREE.SRGBColorSpace;
  const moon = new THREE.Mesh(new THREE.CircleGeometry(11, 40),
    new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, fog: false, depthWrite: false }));
  moon.position.copy(MOON_DIR).multiplyScalar(402);
  moon.lookAt(0, 0, 0);
  scene.add(moon);

  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  {
    const c = gc.getContext('2d');
    const g = c.createRadialGradient(64, 64, 6, 64, 64, 64);
    g.addColorStop(0, 'rgba(190,205,235,0.9)'); g.addColorStop(0.35, 'rgba(150,168,215,0.28)'); g.addColorStop(1, 'rgba(140,160,210,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  }
  const glowTex = new THREE.CanvasTexture(gc); glowTex.colorSpace = THREE.SRGBColorSpace;
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.25,
  }));
  moonGlow.position.copy(MOON_DIR).multiplyScalar(396);
  moonGlow.scale.setScalar(95);
  scene.add(moonGlow);

  // --- key light (dusk sun -> moon) ---
  const key = new THREE.DirectionalLight(0xff9a55, 2.0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -85, right: 85, top: 85, bottom: -85, near: 10, far: 420 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.5;
  scene.add(key, key.target);

  const hemi = new THREE.HemisphereLight(0x4b4a75, 0x3d3226, 0.55);
  scene.add(hemi);

  scene.fog = new THREE.FogExp2(0x554a68, 0.0062);
  const fogDusk = new THREE.Color(0x554a68), fogNight = new THREE.Color(0x121520);
  const keyDusk = new THREE.Color(0xff9a55), keyNight = new THREE.Color(0xa9c1ff);
  const duskPos = DUSK_SUN.clone().setY(0.18).normalize().multiplyScalar(170);
  const moonPos = MOON_DIR.clone().multiplyScalar(170);

  // --- shooting star ---
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(17, 0.15),
    new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  streak.visible = false;
  scene.add(streak);
  let sT = -1, sNext = 24;

  function update(dt, time, night) {
    domeUniforms.uNight.value = night;
    starUniforms.uTime.value = time;
    starUniforms.uNight.value = night;
    moonGlow.material.opacity = 0.20 + 0.32 * night;
    moon.material.opacity = 0.75 + 0.25 * night;

    key.color.lerpColors(keyDusk, keyNight, night);
    key.intensity = lerp(2.0, 0.55, night);
    key.position.lerpVectors(duskPos, moonPos, night);

    hemi.intensity = lerp(0.55, 0.30, night);
    scene.fog.color.lerpColors(fogDusk, fogNight, night);
    scene.fog.density = lerp(0.0060, 0.0078, night);

    if (night > 0.45) {
      if (sT < 0) {
        sNext -= dt;
        if (sNext <= 0) {
          sT = 0;
          const az = rng() * TAU, el = (0.35 + rng() * 0.4);
          const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
          streak.position.copy(dir).multiplyScalar(380);
          streak.lookAt(0, 0, 0);
          streak.rotateZ(rng() * TAU);
          streak.visible = true;
        }
      } else {
        sT += dt / 0.85;
        streak.material.opacity = Math.sin(Math.min(sT, 1) * Math.PI) * 0.8 * night;
        streak.translateX(dt * 55);
        if (sT >= 1) { sT = -1; sNext = 18 + rng() * 40; streak.visible = false; }
      }
    }
  }

  return { update };
}
