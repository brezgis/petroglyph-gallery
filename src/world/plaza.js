// The hearth plaza: fire pit, log benches, the pottery bar (five real,
// archaeologically attested drinks in replica vessels), the foods table with
// its little cards, and the title monolith by the south path.

import * as THREE from 'three';
import { mulberry, TAU, clamp, makeCanvas, lerp } from '../util.js';
import { makeCardTexture, makeSteleTexture } from '../art/labels.js';
import { makeRockTexture } from '../art/glyphs.js';
import { terrainHeight } from './terrain.js';

// ------------------------------------------------------------------ data
export const VESSELS = [
  {
    id: 'jiahu', shape: 'jar', name: 'Jiahu jar',
    drink: 'Rice–honey–hawthorn wine',
    kicker: 'FROM THE HEARTH — THE POTTERY BAR',
    otitle: 'The Oldest Drink in the World',
    meta: [['VESSEL', 'Globular jar — replica after Jiahu, Henan, China'],
           ['CONTENTS', 'Fermented rice, honey & hawthorn / wild grape'],
           ['VINTAGE', 'c. 7000–6600 BCE']],
    body: 'Residue inside pottery from the village of Jiahu is the earliest chemically attested alcoholic beverage anywhere on Earth: a mixed ferment of rice, honey and hawthorn fruit or wild grape. Nine thousand years later the recipe still works — modern brewers have recreated it. Sip and consider: someone raised a cup like this before writing existed.',
    source: 'McGovern et al., PNAS 101 (2004)',
    notes: ['Soft honey sweetness with a tart hawthorn edge.',
            'Nine thousand years of aftertaste.',
            'Somewhere, a Neolithic villager toasts you back.'],
  },
  {
    id: 'chaco', shape: 'cylinder', name: 'Chaco cylinder jar',
    drink: 'Frothed cacao',
    kicker: 'FROM THE HEARTH — THE POTTERY BAR',
    otitle: 'Chocolate, Two Thousand Kilometres from Home',
    meta: [['VESSEL', 'Cylinder jar, white slip & black hatching — after Pueblo Bonito'],
           ['CONTENTS', 'Frothed ceremonial cacao'],
           ['VINTAGE', 'c. 1000–1125 CE']],
    body: 'Traces of theobromine — the fingerprint molecule of cacao — line cylinder jars from Pueblo Bonito, Chaco Canyon. The nearest cacao tree grew two thousand kilometres south: proof of trade routes carrying chocolate from Mesoamerica into the Ancestral Puebloan world, and of a bitter, frothed drink poured in the great houses a thousand years ago.',
    source: 'Crown & Hurst, PNAS 106 (2009)',
    notes: ['Bitter, frothy, a ghost of chile.',
            'Worth walking two thousand kilometres for.',
            'The froth is the point — pour from a height.'],
  },
  {
    id: 'qero', shape: 'qero', name: 'Inca qero',
    drink: 'Chicha de jora (maize beer)',
    kicker: 'FROM THE HEARTH — THE POTTERY BAR',
    otitle: 'Drink With Both Hands',
    meta: [['VESSEL', 'Flared beaker (qero), banded geometry — Inca form'],
           ['CONTENTS', 'Chicha de jora — sprouted-maize beer'],
           ['VINTAGE', 'A living Andean tradition']],
    body: 'Chicha de jora is beer brewed from maize that has been sprouted, ground and fermented. Under the Inca, specialist brewers — among them the aqllakuna, the chosen women — made it in quantity, and qeros were kept in matched pairs: to toast is to drink together, never alone. Chicha is still brewed across the Andes; a red flag over a doorway means the batch is ready. Pour a splash for Pachamama first.',
    source: 'Colonial chronicles (Guaman Poma); living tradition',
    notes: ['Earthy, lightly sour, alive.',
            'Qeros come in pairs — never toast alone.',
            'A splash for Pachamama, always.'],
  },
  {
    id: 'pulque', shape: 'cup', name: 'Pulque cup',
    drink: 'Pulque (octli) — fermented agave sap',
    kicker: 'FROM THE HEARTH — THE POTTERY BAR',
    otitle: 'The Drink of Four Hundred Rabbits',
    meta: [['VESSEL', 'Footed cup, black-on-orange — after Aztec polychrome'],
           ['CONTENTS', 'Pulque — fermented aguamiel of the maguey'],
           ['VINTAGE', 'Mesoamerican tradition, millennia deep']],
    body: 'Tap the heart of a maguey and its sweet sap ferments, milky and quick, into pulque — sacred to Mayahuel, goddess of the plant, and to the Centzon Totochtin, her four hundred rabbit children of drunkenness: the count, it was said, of all the ways a drinker can be drunk. Under Aztec law everyday drinking was restricted to elders and ritual; pulquerías still pour it across central Mexico.',
    source: 'Aztec ethnohistory (Sahagún); living tradition',
    notes: ['Milky, tangy, gently fizzy.',
            'You are currently three rabbits deep.',
            'Mayahuel sends her regards.'],
  },
  {
    id: 'wari', shape: 'kero', name: 'Wari kero',
    drink: 'Chicha de molle (peppertree brew)',
    kicker: 'FROM THE HEARTH — THE POTTERY BAR',
    otitle: 'The Brewery on the Mesa',
    meta: [['VESSEL', 'Tall polychrome kero — after Cerro Baúl, Peru'],
           ['CONTENTS', 'Chicha de molle — pink-peppertree berry brew'],
           ['VINTAGE', 'c. 600–1000 CE']],
    body: 'On the mesa of Cerro Baúl the Wari empire ran a brewery whose brewers were high-status women — their fine shawl pins were found beside the vats. The house specialty: chicha brewed from the pink berries of the molle tree. When the outpost was abandoned around 1000 CE the brewery was ceremonially burned and the drinking vessels smashed into the embers. Last call, performed as ritual.',
    source: 'Moseley et al., PNAS 102 (2005)',
    notes: ['Pink-peppercorn bright, resinous, warm.',
            'Brewed by the finest brewers of an empire.',
            'Drink one for the brewery that burned.'],
  },
];

export const FOODS = [
  {
    id: 'maize', title: 'Maize', sub: 'the grass that fed a hemisphere',
    body: "Domesticated from teosinte — a wiry grass with a dozen hard seeds — in Mexico's Balsas valley around 9,000 years ago. The great unlock was nixtamalization: simmering kernels with lime or ash frees their niacin and makes masa possible. Blue, red, white, gold: the ears on this table are one species' argument that agriculture is an art form.",
    source: 'Piperno et al., PNAS 106 (2009)',
  },
  {
    id: 'squash', title: 'Squash', sub: 'the eldest sister',
    body: 'Squash seeds from Guilá Naquitz cave in Oaxaca are about 10,000 years old — among the oldest domesticated plants anywhere in the Americas, older than maize itself. In the Three Sisters field its broad leaves shade the soil and hold the moisture; its flesh keeps through winter.',
    source: 'Smith, Science 276 (1997)',
  },
  {
    id: 'beans', title: 'Beans', sub: 'the generous sister',
    body: 'Common beans were domesticated at least twice, independently, in Mesoamerica and the Andes. Planted with maize and squash they climb the stalks and fix nitrogen into the soil — feeding the field that feeds you. Together, the Three Sisters make a complete protein.',
    source: 'Smithsonian National Museum of the American Indian',
  },
  {
    id: 'amaranth', title: 'Amaranth', sub: 'the grain that was nearly lost',
    body: 'Huauhtli fed the Aztec state — tribute lists demanded it by the granary. Mixed into tzoalli dough it was shaped into figures of the gods and eaten in ceremony, which is why its cultivation was restricted under colonial rule; the grain survived at the field margins. Popped, it still crackles like tiny fireworks.',
    source: 'Sauer, The Grain Amaranths (1967)',
  },
  {
    id: 'quinoa', title: 'Quinoa', sub: 'chisiya mama — the mother grain',
    body: 'Domesticated in the Titicaca basin, quinoa packs a complete protein into a seed the size of a pinhead and thrives at altitudes where maize gives up. The Quechua name says the rest: chisiya mama, the mother grain.',
    source: 'Pearsall (2008)',
  },
  {
    id: 'cacao', title: 'Cacao', sub: 'currency you can drink',
    body: 'The oldest traces of cacao come not from the Maya lowlands but from Mayo-Chinchipe sites in Amazonian Ecuador, 5,300 years ago. By Aztec times the beans were money — counterfeiters filled empty husks with clay. Ground, frothed and spiced, kakaw was a drink of rulers long before it was anyone\'s candy.',
    source: 'Zarrillo et al., Nature Ecology & Evolution 2 (2018)',
  },
  {
    id: 'manoomin', title: 'Manoomin — wild rice', sub: 'the food that grows on water',
    body: 'For the Anishinaabe, manoomin is at the heart of the migration story: travel until you find the food that grows on water. Harvested by canoe — one person poling, one knocking ripe grain into the hull — it is a living, protected tradition, tended today as it has been for centuries.',
    source: 'Anishinaabe tradition; Great Lakes Indian Fish & Wildlife Commission',
  },
  {
    id: 'chile', title: 'Chile', sub: 'the first spice of the Americas',
    body: 'Chile peppers were being gathered and grown in Mexico seven to nine thousand years ago; by 1492 dozens of cultivated forms ran from fruity to ferocious. They then conquered every cuisine on Earth within about a century — the fastest culinary conquest in history.',
    source: 'Perry et al., Science 315 (2007)',
  },
];

export const ABOUT = {
  kicker: 'FIRST MARKS',
  otitle: 'An Open-Air Gallery of the World\'s Petroglyphs',
  meta: [['EXHIBITS', '21 engraved stones · 6 regional groves · 1 field-notes grove'],
         ['THE HEARTH', '5 ancient drinks · 8 founding foods'],
         ['HOURS', 'Perpetual dusk. The sconces are always lit.']],
  body: 'Every engraving here is a respectful hand redrawing of a real petroglyph, at or near its published scale, with its site, culture and sources on the lectern beside it. (A petroglyph is pecked or carved into rock; a painted image is a pictograph.) These are not tracings, and the boulders are not the real stones — the originals belong to their landscapes and to the living peoples whose heritage they are.\n\nIf you ever stand before the real thing: never touch, chalk, or make rubbings — skin oils and abrasion destroy in seconds what deserts preserved for millennia. Walk gently, and support the custodians who keep these places.\n\nThe music is an original generative piece — wooden flute, wind, embers — an homage to no single tradition. Built with three.js; everything you see and hear is drawn and synthesized by hand.',
  source: 'Etiquette after U.S. National Park Service guidance',
};

// Source links for the hearth cards — fetch/CrossRef-verified 2026-07-20.
const HEARTH_LINKS = {
  jiahu: 'https://www.pnas.org/doi/10.1073/pnas.0407921102',
  chaco: 'https://www.pnas.org/doi/10.1073/pnas.0812817106',
  qero: 'https://poma.kb.dk/',
  pulque: 'https://florentinecodex.getty.edu/',
  wari: 'https://www.pnas.org/doi/10.1073/pnas.0508673102',
  maize: 'https://www.pnas.org/doi/10.1073/pnas.0812525106',
  beans: 'https://festival.si.edu/event/corn-beans-and-squash-what-the-three-sisters-tell-us',
  squash: 'https://www.science.org/doi/10.1126/science.276.5314.932',
  amaranth: 'https://wholegrainscouncil.org/whole-grains-101/grain-month-calendar/amaranth-may-grain-month',
  quinoa: 'https://www.fao.org/quinoa/',
  cacao: 'https://www.nature.com/articles/s41559-018-0697-x',
  manoomin: 'https://glifwc.org/stewardship/ganawenindiwag-manoomin-anishinaabeg',
  chile: 'https://www.science.org/doi/10.1126/science.1136914',
};
for (const v of VESSELS) v.link = HEARTH_LINKS[v.id];
for (const f of FOODS) f.link = HEARTH_LINKS[f.id];
ABOUT.link = 'https://www.nps.gov/petr/learn/historyculture/takecare.htm';

// ------------------------------------------------------------- pottery art
function potteryTexture(kind) {
  const { canvas, ctx } = makeCanvas(256, 256);
  const rng = mulberry(kind.length * 977 + 5);
  const speck = (n, a) => {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = rng() > 0.5 ? `rgba(40,25,12,${a})` : `rgba(255,240,220,${a * 0.7})`;
      ctx.fillRect(rng() * 256, rng() * 256, 1.5, 1.5);
    }
  };
  if (kind === 'jar') {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#8a4f30'); g.addColorStop(1, '#6e3a22');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = 'rgba(40,22,12,0.22)';
      ctx.beginPath();
      ctx.ellipse(rng() * 256, rng() * 256, 18 + rng() * 40, 12 + rng() * 26, rng() * 3, 0, TAU);
      ctx.fill();
    }
    speck(500, 0.08);
  } else if (kind === 'cylinder') {
    ctx.fillStyle = '#e8e0d0'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#241f1a'; ctx.lineWidth = 3;
    for (const [y0, y1] of [[26, 86], [126, 196]]) {
      ctx.strokeRect(2, y0, 252, y1 - y0);
      ctx.save();
      ctx.beginPath(); ctx.rect(2, y0, 252, y1 - y0); ctx.clip();
      ctx.lineWidth = 2.4;
      for (let x = -60; x < 300; x += 11) {
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x + (y1 - y0), y0); ctx.stroke();
      }
      ctx.restore();
    }
    // stepped triangles
    ctx.fillStyle = '#241f1a';
    for (let x = 8; x < 256; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, 122); ctx.lineTo(x + 15, 122); ctx.lineTo(x + 15, 114); ctx.lineTo(x + 30, 114);
      ctx.lineTo(x + 30, 104); ctx.lineTo(x, 104); ctx.closePath(); ctx.fill();
    }
    speck(260, 0.05);
  } else if (kind === 'qero') {
    ctx.fillStyle = '#a03226'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#d8c49a'; ctx.fillRect(0, 60, 256, 80);
    ctx.fillStyle = '#241f1a'; ctx.fillRect(0, 140, 256, 22);
    ctx.fillStyle = '#241f1a';
    for (let x = 6; x < 256; x += 34) {
      ctx.beginPath();
      ctx.moveTo(x + 12, 70); ctx.lineTo(x + 24, 100); ctx.lineTo(x + 12, 130); ctx.lineTo(x, 100);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#7a2a1e'; ctx.fillRect(0, 196, 256, 60);
    speck(300, 0.06);
  } else if (kind === 'cup') {
    ctx.fillStyle = '#c06a28'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#241f1a'; ctx.lineWidth = 3;
    for (let x = 10; x < 256; x += 52) {
      ctx.beginPath();
      for (let a = 0; a < TAU * 1.8; a += 0.2) {
        const r = 2 + a * 3.2;
        const px = x + 20 + Math.cos(a) * r, py = 96 + Math.sin(a) * r;
        a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.fillStyle = '#241f1a'; ctx.fillRect(0, 20, 256, 12);
    for (let x = 0; x < 256; x += 26) {
      ctx.fillRect(x, 160, 14, 8); ctx.fillRect(x + 7, 168, 14, 8); ctx.fillRect(x + 14, 176, 14, 8);
    }
    speck(300, 0.06);
  } else { // wari kero
    ctx.fillStyle = '#d5c4a0'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#241f1a'; ctx.fillRect(0, 14, 256, 16);
    ctx.fillStyle = '#7a3030'; ctx.fillRect(0, 74, 256, 96);
    for (let x = 0; x < 256; x += 32) {
      ctx.fillStyle = '#e8dcc0';
      ctx.beginPath(); ctx.moveTo(x, 170); ctx.lineTo(x + 16, 92); ctx.lineTo(x + 32, 170); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#241f1a';
      ctx.beginPath(); ctx.moveTo(x + 8, 170); ctx.lineTo(x + 16, 120); ctx.lineTo(x + 24, 170); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#241f1a'; ctx.fillRect(0, 196, 256, 10);
    speck(300, 0.06);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const PROFILES = {
  jar: [[0, 0], [0.05, 0.005], [0.08, 0.03], [0.093, 0.075], [0.085, 0.115], [0.055, 0.142], [0.05, 0.158], [0.06, 0.168]],
  cylinder: [[0, 0], [0.05, 0.004], [0.053, 0.02], [0.05, 0.19], [0.055, 0.225]],
  qero: [[0, 0], [0.042, 0.004], [0.046, 0.02], [0.05, 0.06], [0.062, 0.125], [0.077, 0.175]],
  cup: [[0, 0], [0.022, 0.002], [0.032, 0.014], [0.03, 0.032], [0.056, 0.052], [0.072, 0.082], [0.075, 0.1]],
  kero: [[0, 0], [0.047, 0.004], [0.051, 0.03], [0.053, 0.09], [0.06, 0.155], [0.064, 0.168]],
};

export function buildVesselMesh(v) {
  const pts = PROFILES[v.shape].map(([r, y]) => new THREE.Vector2(r, y));
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 26),
    new THREE.MeshStandardMaterial({ map: potteryTexture(v.shape), roughness: 0.6, metalness: 0, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  if (v.shape === 'jar') {
    const hMat = new THREE.MeshStandardMaterial({ color: 0x6e3a22, roughness: 0.65 });
    for (const s of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 10), hMat);
      h.position.set(s * 0.088, 0.1, 0);
      h.rotation.y = Math.PI / 2;
      mesh.add(h);
    }
  }
  return mesh;
}

// -------------------------------------------------------------- fire
function buildFire(scene, state) {
  const rng = mulberry(55);
  const fire = new THREE.Group();
  scene.add(fire);
  const stoneTex = makeRockTexture('paleGrey', 8);
  const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex.map, normalMap: stoneTex.normalMap, roughness: 0.95 });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 + rng() * 0.1, 0), stoneMat);
    s.position.set(Math.cos(a) * 0.95, 0.12, Math.sin(a) * 0.95);
    s.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    s.castShadow = true;
    fire.add(s);
  }
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3d2c1c, roughness: 0.9 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + 0.4;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 1.0, 8), logMat);
    log.position.set(Math.cos(a) * 0.22, 0.32, Math.sin(a) * 0.22);
    log.rotation.z = Math.PI / 3.1;
    log.rotation.y = -a;
    log.castShadow = true;
    fire.add(log);
  }

  const softTex = (() => {
    const { canvas, ctx } = makeCanvas(64, 64);
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(canvas);
    return t;
  })();

  const mkPoints = (n, mat) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('aFade', new THREE.BufferAttribute(new Float32Array(n), 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(n), 1));
    const p = new THREE.Points(geo, mat);
    p.frustumCulled = false;
    scene.add(p);
    return p;
  };
  const flameMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTex: { value: softTex } },
    vertexShader: `
      attribute float aFade; attribute float aSize;
      varying float vF;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * (660.0 / max(1.0, -mv.z));
        vF = aFade;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; varying float vF;
      void main(){
        vec4 t = texture2D(uTex, gl_PointCoord);
        vec3 col = mix(vec3(1.0,0.93,0.58), vec3(1.0,0.48,0.08), smoothstep(0.08, 0.55, vF));
        col = mix(col, vec3(0.55,0.09,0.02), smoothstep(0.55, 1.0, vF));
        gl_FragColor = vec4(col, t.a * pow(1.0 - vF, 1.35) * 0.95);
      }`,
  });
  const smokeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTex: { value: softTex } },
    vertexShader: flameMat.vertexShader,
    fragmentShader: `
      uniform sampler2D uTex; varying float vF;
      void main(){
        vec4 t = texture2D(uTex, gl_PointCoord);
        gl_FragColor = vec4(vec3(0.06,0.05,0.05), t.a * (1.0 - vF) * 0.16);
      }`,
  });
  const flames = mkPoints(60, flameMat);
  const smoke = mkPoints(10, smokeMat);
  const embers = mkPoints(16, flameMat);

  const fp = [];
  for (let i = 0; i < 60; i++) fp.push({ t: rng(), sp: 0.6 + rng() * 0.9, a: rng() * TAU, r: rng() * 0.20, sz: 0.12 + rng() * 0.16 });
  const sp = [];
  for (let i = 0; i < 10; i++) sp.push({ t: rng(), sp: 0.15 + rng() * 0.1, a: rng() * TAU, r: rng() * 0.3, sz: 0.45 + rng() * 0.5 });
  const ep = [];
  for (let i = 0; i < 16; i++) ep.push({ t: rng(), sp: 0.45 + rng() * 0.8, a: rng() * TAU, r: 0.08 + rng() * 0.26, sz: 0.018 + rng() * 0.028 });

  // warm core glow at the base of the flames
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softTex, color: 0xff8830, transparent: true, opacity: 0.18,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.position.set(0, 0.6, 0);
  glow.scale.set(2.5, 1.8, 1);
  scene.add(glow);

  const light = new THREE.PointLight(0xff9440, 26, 32, 1.9);
  light.position.set(0, 1.2, 0);
  scene.add(light);

  state.colliders.push({ x: 0, z: 0, r: 1.5 });

  return {
    update(dt, time) {
      const animate = (points, parts, riseH, wobble) => {
        const pos = points.geometry.attributes.position.array;
        const fade = points.geometry.attributes.aFade.array;
        const size = points.geometry.attributes.aSize.array;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          p.t += dt * p.sp;
          if (p.t > 1) { p.t = 0; p.a = rng() * TAU; }
          const rr = p.r * (1 - p.t * 0.6);
          pos[i * 3] = Math.cos(p.a + time * wobble) * rr + Math.sin(time * 3.1 + p.a * 9.0) * 0.05 * p.t;
          pos[i * 3 + 1] = 0.35 + p.t * riseH;
          pos[i * 3 + 2] = Math.sin(p.a + time * wobble) * rr;
          fade[i] = p.t;
          size[i] = p.sz * (1 - p.t * 0.5);
        }
        points.geometry.attributes.position.needsUpdate = true;
        points.geometry.attributes.aFade.needsUpdate = true;
        points.geometry.attributes.aSize.needsUpdate = true;
      };
      animate(flames, fp, 1.3, 0.7);
      animate(smoke, sp, 2.7, 0.3);
      animate(embers, ep, 2.1, 1.3);
      light.intensity = 24 + Math.sin(time * 9.3) * 3 + Math.sin(time * 23.7) * 2;
      glow.material.opacity = 0.16 + Math.sin(time * 9.3) * 0.035 + Math.sin(time * 21.1) * 0.02;
    },
  };
}

// -------------------------------------------------------------- tables
function buildTable(scene, state, angDeg, dist) {
  const ang = angDeg * Math.PI / 180;
  const x = Math.cos(ang) * dist, z = Math.sin(ang) * dist;
  const G = new THREE.Group();
  G.position.set(x, 0, z);
  G.rotation.y = Math.atan2(-x, -z);
  scene.add(G);
  const rockTex = makeRockTexture('paleGrey', 12);
  const legMat = new THREE.MeshStandardMaterial({ map: rockTex.map, normalMap: rockTex.normalMap, roughness: 0.95 });
  const slabMat = new THREE.MeshStandardMaterial({ map: makeRockTexture('sandstone', 4).map, roughness: 0.8 });
  for (const lx of [-0.85, 0.85]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.94, 0.6), legMat);
    leg.position.set(lx, 0.47, 0);
    leg.castShadow = true;
    G.add(leg);
  }
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.13, 1.0), slabMat);
  slab.position.y = 1.005;
  slab.castShadow = slab.receiveShadow = true;
  G.add(slab);
  // woven runner
  const rc = makeCanvas(256, 64);
  const rrng = mulberry(angDeg + 3);
  for (let i = 0; i < 64; i += 4) {
    rc.ctx.fillStyle = ['#7a4a2c', '#9a6238', '#5c3a22', '#a1471f'][Math.floor(rrng() * 4)];
    rc.ctx.fillRect(0, i, 256, 4);
  }
  for (let xx = 8; xx < 256; xx += 24) {
    rc.ctx.fillStyle = 'rgba(30,18,10,0.5)';
    rc.ctx.beginPath();
    rc.ctx.moveTo(xx, 32 - 9); rc.ctx.lineTo(xx + 9, 32); rc.ctx.lineTo(xx, 32 + 9); rc.ctx.lineTo(xx - 9, 32);
    rc.ctx.closePath(); rc.ctx.fill();
  }
  const runnerTex = new THREE.CanvasTexture(rc.canvas);
  runnerTex.colorSpace = THREE.SRGBColorSpace;
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.56),
    new THREE.MeshStandardMaterial({ map: runnerTex, roughness: 1 }));
  runner.rotation.x = -Math.PI / 2;
  runner.position.y = 1.075;
  G.add(runner);
  // small clay oil lamp
  const lampMesh = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.045, 0.004], [0.055, 0.02], [0.035, 0.035], [0.042, 0.042]].map(([r, y]) => new THREE.Vector2(r, y)), 14),
    new THREE.MeshStandardMaterial({ color: 0x8a5c34, roughness: 0.8, side: THREE.DoubleSide }));
  lampMesh.position.set(-1.15, 1.075, -0.3);
  G.add(lampMesh);
  const lampLight = new THREE.PointLight(0xffb060, 3.2, 6.5, 1.9);
  lampLight.position.set(-1.15, 1.55, -0.3);
  G.add(lampLight);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
  flame.position.set(-1.15, 1.13, -0.3);
  flame.scale.y = 1.9;
  G.add(flame);

  // two small colliders along the slab so visitors can step right up to it
  const yaw = G.rotation.y;
  for (const s of [-0.8, 0.8])
    state.colliders.push({ x: x + s * Math.cos(yaw), z: z - s * Math.sin(yaw), r: 0.82 });
  return { G, lampLight, x, z };
}

// info cards readable from BOTH sides of a table
function cardMesh(tex) {
  const flipped = tex.clone();
  flipped.wrapS = THREE.RepeatWrapping;
  flipped.repeat.x = -1;
  flipped.needsUpdate = true;
  const clay = new THREE.MeshStandardMaterial({ color: 0xc8b190 });
  return new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.012), [
    clay, clay, clay, clay,
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }),
    new THREE.MeshStandardMaterial({ map: flipped, roughness: 0.85 }),
  ]);
}

function speckleTex(bg, colors, n = 260) {
  const { canvas, ctx } = makeCanvas(128, 128);
  const rng = mulberry(bg.length + colors.join('').length);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.save();
    ctx.translate(rng() * 128, rng() * 128);
    ctx.rotate(rng() * TAU);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2 + rng() * 3, 1.2 + rng() * 1.6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function bowlWith(tex, r = 0.11) {
  const G = new THREE.Group();
  const prof = [[0, 0.004], [0.05, 0.006], [r * 0.82, 0.02], [r, 0.055], [r * 1.04, 0.075]];
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(prof.map(([rr, y]) => new THREE.Vector2(rr, y)), 20),
    new THREE.MeshStandardMaterial({ color: 0x9a6c42, roughness: 0.75, side: THREE.DoubleSide }));
  bowl.castShadow = true;
  G.add(bowl);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.86, 20),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.055;
  G.add(disc);
  return G;
}

function maizeCob(color) {
  const G = new THREE.Group();
  const { canvas, ctx } = makeCanvas(64, 64);
  ctx.fillStyle = color; ctx.fillRect(0, 0, 64, 64);
  const rng = mulberry(color.length * 31);
  for (let yy = 0; yy < 64; yy += 8)
    for (let xx = 0; xx < 64; xx += 6) {
      ctx.fillStyle = `rgba(0,0,0,${0.12 + rng() * 0.22})`;
      ctx.beginPath();
      ctx.arc(xx + 3 + (yy % 16 === 0 ? 1.5 : 0), yy + 4, 2.6, 0, TAU);
      ctx.fill();
    }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  const cob = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 4, 10),
    new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }));
  cob.castShadow = true;
  G.add(cob);
  const huskMat = new THREE.MeshStandardMaterial({ color: 0xb8a86a, roughness: 0.9, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const husk = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.13, 6, 1, true), huskMat);
    husk.position.set(s * 0.02, -0.11, 0);
    husk.rotation.z = s * 0.5 + Math.PI;
    husk.scale.z = 0.35;
    G.add(husk);
  }
  G.rotation.z = Math.PI / 2;
  return G;
}

// -------------------------------------------------------------- build
export function buildPlaza(world) {
  const { scene, state } = world;
  const fire = buildFire(scene, state);
  const rng = mulberry(808);

  // benches
  const benchMat = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.9 });
  const footMat = new THREE.MeshStandardMaterial({ color: 0x6a655e, roughness: 0.95 });
  for (const a of [100, 215, 335]) {
    const r = a * Math.PI / 180;
    const bx = Math.cos(r) * 3.6, bz = Math.sin(r) * 3.6;
    const B = new THREE.Group();
    B.position.set(bx, 0, bz);
    B.rotation.y = Math.atan2(-bx, -bz) + Math.PI / 2;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.7, 10), benchMat);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.42;
    log.castShadow = true;
    B.add(log);
    for (const s of [-0.6, 0.6]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), footMat);
      f.position.set(s, 0.15, 0);
      B.add(f);
    }
    scene.add(B);
    state.colliders.push({ x: bx, z: bz, r: 0.68 });
    log.userData.interact = { type: 'bench', spot: { x: bx, z: bz, yaw: Math.atan2(-bx, -bz) } };
    state.interactables.push(log);
  }

  // --- the pottery bar ---
  const bar = buildTable(scene, state, 152, 7.2);
  const vesselMeshes = [];
  VESSELS.forEach((v, i) => {
    const m = buildVesselMesh(v);
    const lx = -1.0 + i * 0.5;
    m.position.set(lx, 1.07, -0.12);
    m.rotation.y = Math.PI / 2 + (rng() - 0.5) * 0.4;   // texture seam to the back
    bar.G.add(m);
    m.userData.interact = { type: 'vessel', v };
    m.userData.home = { parent: bar.G, pos: m.position.clone(), rot: m.rotation.y };
    state.interactables.push(m);
    vesselMeshes.push(m);
    const card = cardMesh(makeCardTexture(v.name, v.drink.split('(')[0].trim()));
    card.position.set(lx, 1.13, 0.3);
    card.rotation.x = -0.3;
    bar.G.add(card);
    card.userData.interact = { type: 'overlay', data: { kicker: v.kicker, title: v.otitle, titlesub: v.name + ' · ' + v.drink, meta: v.meta, body: v.body, source: v.source, link: v.link } };
    state.interactables.push(card);
  });

  // --- the foods table ---
  const food = buildTable(scene, state, 28, 7.2);
  const foodPlacers = {
    maize: (G) => {
      ['#d8a832', '#4a4f66', '#8a3a28', '#d8cbb0'].forEach((c, k) => {
        const cob = maizeCob(c);
        cob.position.set(-0.1 + (k % 2) * 0.2, 1.10, -0.14 + Math.floor(k / 2) * 0.12);
        cob.rotation.y = rng() * 0.8;
        G.add(cob);
      });
    },
    squash: (G) => {
      const { canvas, ctx } = makeCanvas(64, 64);
      for (let xx = 0; xx < 64; xx += 8) {
        ctx.fillStyle = xx % 16 ? '#c87c28' : '#a1601e';
        ctx.fillRect(xx, 0, 8, 64);
      }
      const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace;
      for (const [sx, sz, sc] of [[0, -0.1, 1], [0.16, 0.02, 0.7]]) {
        const q = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 12),
          new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }));
        q.scale.set(sc, sc * 0.62, sc);
        q.position.set(sx, 1.07 + 0.05 * sc, sz);
        q.castShadow = true;
        G.add(q);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.04, 6),
          new THREE.MeshStandardMaterial({ color: 0x5a5a30, roughness: 1 }));
        stem.position.set(sx, 1.07 + 0.115 * sc, sz);
        stem.rotation.z = 0.3;
        G.add(stem);
      }
    },
    beans: (G) => { const b = bowlWith(speckleTex('#6e5638', ['#7a2a1e', '#3a2c20', '#c8b190', '#8a5c34'])); b.position.set(0, 1.065, -0.05); G.add(b); },
    amaranth: (G) => {
      const b = bowlWith(speckleTex('#b89f72', ['#d8c49a', '#c4a870'], 400), 0.09);
      b.position.set(0, 1.065, -0.05); G.add(b);
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 8),
        new THREE.MeshStandardMaterial({ color: 0x8a2a4a, roughness: 1 }));
      plume.position.set(0.14, 1.14, 0.02);
      plume.rotation.z = -0.5;
      G.add(plume);
    },
    quinoa: (G) => { const b = bowlWith(speckleTex('#c9b490', ['#e8dcc0', '#d5c4a0'], 420), 0.09); b.position.set(0, 1.065, -0.05); G.add(b); },
    cacao: (G) => {
      const pod = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 12),
        new THREE.MeshStandardMaterial({ color: 0xb06a28, roughness: 0.55 }));
      pod.scale.set(1, 1.85, 1);
      pod.position.set(0.12, 1.095, -0.08);
      pod.rotation.z = 1.35;
      pod.castShadow = true;
      G.add(pod);
      const b = bowlWith(speckleTex('#4a3020', ['#3a2416', '#5c3a22'], 300), 0.085);
      b.position.set(-0.08, 1.065, 0.0); G.add(b);
    },
    manoomin: (G) => { const b = bowlWith(speckleTex('#3a3226', ['#241f16', '#4a4030', '#5c5240'], 500), 0.1); b.position.set(0, 1.065, -0.05); G.add(b); },
    chile: (G) => {
      const b = bowlWith(speckleTex('#8a2418', ['#a02818', '#c04020', '#701c10'], 200), 0.095);
      b.position.set(0, 1.065, -0.05); G.add(b);
      const cMat = new THREE.MeshStandardMaterial({ color: 0xa82818, roughness: 0.5 });
      for (const [cx, cz, ry] of [[0.13, 0.04, 0.5], [0.16, -0.04, 2.2]]) {
        const ch = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.085, 8), cMat);
        ch.position.set(cx, 1.078, cz);
        ch.rotation.set(Math.PI / 2.2, ry, 0);
        G.add(ch);
      }
    },
  };
  FOODS.forEach((f, i) => {
    const slot = new THREE.Group();
    const lx = -1.12 + i * 0.32;
    slot.position.set(lx, 0, 0);
    food.G.add(slot);
    (foodPlacers[f.id] || (() => {}))(slot);
    const card = cardMesh(makeCardTexture(f.title, f.sub));
    card.position.set(lx, 1.125, 0.33);
    card.rotation.x = -0.3;
    food.G.add(card);
    card.userData.interact = {
      type: 'overlay',
      data: { kicker: 'FROM THE HEARTH — FOODS THAT FED WORLDS', title: f.title, titlesub: f.sub, meta: [], body: f.body, source: f.source, link: f.link },
    };
    state.interactables.push(card);
  });

  // --- title monolith at the spawn path ---
  const mx = 3.1, mz = -19.5;
  const mTex = makeSteleTexture('FIRST MARKS', 'an open-air gallery of the world\'s petroglyphs');
  const mSide = makeRockTexture('varnish', 9);
  const mGeo = new THREE.BoxGeometry(1.5, 2.7, 0.6, 8, 12, 4);
  const mSideMat = new THREE.MeshStandardMaterial({ map: mSide.map, normalMap: mSide.normalMap, roughness: 0.95 });
  const mono = new THREE.Mesh(mGeo, [mSideMat, mSideMat, mSideMat, mSideMat,
    new THREE.MeshStandardMaterial({ map: mTex, roughness: 0.9 }), mSideMat]);
  mono.position.set(mx, terrainHeight(mx, mz) + 1.2, mz);
  mono.rotation.y = Math.atan2(0 - mx, -27 - mz);       // face the spawn point
  mono.castShadow = mono.receiveShadow = true;
  scene.add(mono);
  mono.userData.interact = { type: 'overlay', data: ABOUT };
  state.interactables.push(mono);
  state.colliders.push({ x: mx, z: mz, r: 1.1 });
  // a little lamp for the title stone
  const monoLight = new THREE.PointLight(0xffc07a, 9, 9, 1.8);
  monoLight.position.set(mx - 1.2, terrainHeight(mx, mz) + 0.5, mz - 1.2);
  scene.add(monoLight);

  function update(dt, time) {
    fire.update(dt, time);
    bar.lampLight.intensity = 2.9 + Math.sin(time * 11.7) * 0.55;
    food.lampLight.intensity = 2.9 + Math.sin(time * 13.1 + 2) * 0.55;
  }

  return { update };
}
