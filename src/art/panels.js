// The collection. Each entry is one exhibit: label data (fact-checked against
// the sources cited) plus a draw() routine that redraws the engraving by hand
// in metres on the panel face. These are respectful redrawings after the
// originals, at (or near) published scale — not tracings.

import { DEG, TAU } from '../util.js';
import { PHOTOS } from './photos.js';

export const PANELS = {
  // ---------------------------------------------------- NORTH AMERICA
  'great-hunt': {
    title: 'The Great Hunt',
    site: 'Great Hunt Panel, Cottonwood Canyon (Nine Mile Canyon area)',
    location: 'Utah, United States',
    culture: 'Fremont culture',
    date: 'c. 950–1250 CE',
    medium: 'Pecked through desert varnish on sandstone',
    scale: 'Composition at approximately original panel scale (~3 m across).',
    desc: 'A crowd of bighorn sheep — rams, ewes, lambs — funnels between hunters poised with drawn bows. At least thirty sheep and eight human figures crowd the original; the horned, trapezoidal-bodied figure presiding at top is a Fremont signature. Many researchers read the scene as an autumn hunt, when bighorn gather to rut: a story, a prayer, or the record of one very good day.',
    source: 'U.S. National Park Service, Great Hunt Panel site listing',
    pw: 3.4, ph: 1.5, bw: 4.6, bh: 2.9, bd: 2.4, style: 'varnish', seed: 11,
    draw(g) {
      const sheep = (at, L, dir = -1) =>
        g.quad({ at, L, dir, fill: true, horn: 'curl', hornSize: L * 0.42, neckAng: 40, w: 0.024, ears: 0 });
      sheep([0.18, 0.02], 0.58);
      sheep([-0.62, 0.42], 0.32); sheep([-1.12, 0.18], 0.30); sheep([-0.22, -0.38], 0.36);
      sheep([0.74, 0.42], 0.30, 1); sheep([1.16, 0.06], 0.40); sheep([0.92, -0.40], 0.28);
      sheep([-0.76, -0.40], 0.26); sheep([1.44, 0.40], 0.24); sheep([-1.36, 0.48], 0.22, 1);
      g.human({ at: [-1.48, -0.32], h: 0.44, pose: 'archer', dir: 1 });
      g.human({ at: [-1.0, -0.62], h: 0.38, pose: 'archer', dir: 1 });
      g.human({ at: [1.5, -0.5], h: 0.4, pose: 'archer', dir: -1 });
      // Fremont trapezoidal anthropomorph, horned
      g.poly([[0.06, 0.68], [0.3, 0.68], [0.36, 0.36], [0.0, 0.36]], { w: 0.026, fill: true });
      g.disc([0.18, 0.74], 0.045, 0.022);
      g.line([[0.15, 0.77], [0.10, 0.84]], 0.02);
      g.line([[0.21, 0.77], [0.26, 0.84]], 0.02);
      g.dots([0.5, -0.6], 7, 0.12, 0.014);
    },
  },

  'fajada': {
    title: 'The Sun Dagger Spiral',
    site: 'Fajada Butte, Chaco Culture National Historical Park',
    location: 'New Mexico, United States',
    culture: 'Ancestral Puebloan',
    date: 'c. 1000–1300 CE',
    medium: 'Pecked spiral behind three sandstone slabs',
    scale: 'True size — the spiral measures only 34 × 41 cm.',
    desc: 'Behind three leaning slabs high on Fajada Butte, a 9½-turn spiral hides from the sun — except near midday on the summer solstice, when a single dagger of light slides down and cleanly bisects it. A smaller companion spiral to the left marks the equinoxes. Documented by artist Anna Sofaer in 1977, it is among the clearest ancient astronomical instruments in stone; the butte has been closed since 1989, after foot traffic shifted the slabs.\n\nStay a moment — here, the dagger returns every few minutes.',
    source: 'Sofaer, Zinser & Sinclair, Science 206 (1979)',
    pw: 0.95, ph: 0.95, bw: 2.0, bh: 2.0, bd: 1.6, style: 'varnish2', seed: 12, dagger: true,
    draw(g) {
      g.spiral([0.06, 0.02], { turns: 9.5, r0: 0.006, r1: 0.195, w: 0.0135 });
      g.spiral([-0.3, -0.12], { turns: 2.6, r0: 0.004, r1: 0.055, w: 0.012, ccw: true });
      g.dots([-0.28, 0.3], 4, 0.05, 0.011);
    },
  },

  'three-rivers': {
    title: 'The Goggle-Eyed Mask & the Pierced Bighorn',
    site: 'Three Rivers Petroglyph Site',
    location: 'New Mexico, United States',
    culture: 'Jornada Mogollon',
    date: 'c. 200–1450 CE',
    medium: 'Pecked into basalt boulders',
    scale: 'Figures approximately 1:1.',
    desc: 'More than 21,000 glyphs crowd this basalt ridge above the Tularosa Basin. Two of its most arresting motifs meet here: a rectangular goggle-eyed mask — its wide-ringed eyes sometimes compared to Mesoamerican rain-deity imagery — and a bighorn sheep run through by arrows, observed so precisely that the fletching still reads after many centuries.',
    source: 'U.S. Bureau of Land Management, Three Rivers Petroglyph Site',
    pw: 1.6, ph: 1.9, bw: 2.5, bh: 3.1, bd: 2.0, style: 'darkBasalt', seed: 13,
    draw(g) {
      // mask
      g.poly([[-0.26, 0.78], [0.26, 0.78], [0.30, 0.32], [-0.30, 0.32]], { w: 0.026 });
      for (const ex of [-0.13, 0.13]) {
        g.circle([ex, 0.62], 0.085, { w: 0.022 });
        g.circle([ex, 0.62], 0.042, { w: 0.02 });
      }
      g.zig([-0.2, 0.78], [0.2, 0.78], 6, 0.03, 0.02);
      g.dots([0, 0.4], 3, 0.05, 0.014);
      for (const rx of [-0.12, 0, 0.12]) g.line([[rx, 0.32], [rx, 0.24]], 0.018);
      // bighorn with arrows
      g.quad({ at: [-0.05, -0.35], L: 0.8, dir: 1, fill: true, horn: 'curl', hornSize: 0.36, w: 0.028 });
      for (const [ax, ay, bx, by] of [[0.42, 0.15, 0.05, -0.22], [0.6, 0.0, 0.25, -0.3]]) {
        g.line([[ax, ay], [bx, by]], 0.016);
        g.line([[ax, ay], [ax + 0.05, ay + 0.015]], 0.013);
        g.line([[ax, ay], [ax + 0.045, ay - 0.03]], 0.013);
      }
      // blanket motif
      for (let i = 0; i < 4; i++) g.line([[0.42 + i * 0.07, -0.62], [0.42 + i * 0.07, -0.86]], 0.016);
      g.line([[0.42, -0.62], [0.63, -0.62]], 0.016);
      g.line([[0.42, -0.86], [0.63, -0.86]], 0.016);
    },
  },

  'sand-island': {
    title: 'The Flute Players',
    site: 'Sand Island petroglyph panel, San Juan River',
    location: 'Bears Ears region, Utah, United States',
    culture: 'Basketmaker–Pueblo III, with later Ute and Navajo additions',
    date: 'c. 800 BCE – historic period',
    medium: 'Pecked through desert varnish on sandstone',
    scale: 'Figures approximately 1:1.',
    desc: "Reclining, hump-backed figures raise flutes above a river that has carried people for three thousand years. Figures like these are often called 'Kokopelli' after the Hopi katsina Kookopölö — a modern conflation the Hopi Cultural Preservation Office discourages; the flute player is older, and belongs to many stories. Around the players drift spirals, sheep, and the layered signatures of thirty centuries.",
    source: 'Bears Ears Partnership site guide; Hopi Cultural Preservation Office',
    pw: 2.6, ph: 1.6, bw: 3.6, bh: 2.8, bd: 2.2, style: 'varnish', seed: 14,
    draw(g) {
      g.human({ at: [-0.8, -0.15], h: 0.52, pose: 'flute' });
      g.human({ at: [0.0, 0.1], h: 0.58, pose: 'flute' });
      g.human({ at: [0.72, -0.3], h: 0.46, pose: 'flute' });
      g.spiral([1.0, 0.38], { turns: 3.4, r0: 0.01, r1: 0.2, w: 0.022 });
      g.quad({ at: [-1.12, 0.42], L: 0.3, dir: -1, fill: true, horn: 'curl', hornSize: 0.13, w: 0.02 });
      g.quad({ at: [-0.5, 0.5], L: 0.26, dir: 1, fill: true, horn: 'curl', hornSize: 0.11, w: 0.02 });
      g.dots([0.4, -0.55], 6, 0.1, 0.013);
    },
  },

  // ---------------------------------------------------- SOUTH AMERICA
  'toro-muerto': {
    title: 'The Dancers',
    site: 'Toro Muerto',
    location: 'Arequipa, Peru',
    culture: 'Associated with the Wari era',
    date: 'c. 500–1000 CE',
    medium: 'Pecked into volcanic boulders',
    scale: 'Figures approximately 1:1.',
    desc: 'Across a desert gorge, some 2,600 carved boulders make Toro Muerto one of the largest rock-art complexes on Earth. Its signature figure is the danzante — a dancer with one arm raised, one lowered, head crowned with zigzag rays. A 2024 study argues that the zigzags and dotted lines swirling around the dancers may notate songs and the geometric visions of ritual: music, drawn.',
    source: 'Rozwadowski & Wołoszyn, Cambridge Archaeological Journal 34 (2024)',
    pw: 2.1, ph: 1.7, bw: 3.1, bh: 2.9, bd: 2.3, style: 'varnish2', seed: 15,
    draw(g) {
      const danzante = (at, h) => {
        const [x, y] = at;
        g.disc([x, y + h * 0.86], h * 0.1, 0.022);
        g.line([[x, y + h * 0.42], [x, y + h * 0.74]], 0.028);
        g.zig([x, y + h * 0.68], [x + h * 0.42, y + h * 0.9], 3, h * 0.05, 0.02);   // arm up
        g.zig([x, y + h * 0.62], [x - h * 0.4, y + h * 0.38], 3, h * 0.05, 0.02);   // arm down
        g.line([[x, y + h * 0.42], [x + h * 0.2, y + h * 0.18], [x + h * 0.26, y]], 0.024);
        g.line([[x, y + h * 0.42], [x - h * 0.2, y + h * 0.18], [x - h * 0.26, y]], 0.024);
        for (const hx of [-0.09, 0, 0.09])
          g.zig([x + hx * h, y + h * 0.96], [x + hx * h * 1.8, y + h * 1.22], 3, h * 0.028, 0.016);
      };
      danzante([-0.28, -0.55], 0.92);
      danzante([-0.88, -0.5], 0.58);
      g.zig([0.55, 0.75], [0.55, -0.62], 9, 0.085, 0.022);
      g.zig([0.78, 0.75], [0.78, -0.62], 9, 0.085, 0.022);
      for (let i = 0; i < 8; i++) g.disc([-0.6 + i * 0.16, 0.62 + Math.sin(i * 0.9) * 0.05], 0.02, 0.016);
    },
  },

  'atacama-llamas': {
    title: 'The Llama Caravan',
    site: 'Taira, Alto Loa (with sister sites such as Yerbas Buenas)',
    location: 'Atacama Desert, Chile',
    culture: 'Formative-period pastoralists (Taira-Tulán style)',
    date: 'c. 1500 BCE – 1 CE',
    medium: 'Pecked and incised on canyon walls',
    scale: 'Animals approximately 1:1 with the finest Taira figures.',
    desc: 'A line of llamas — pregnant females among them, drawn with doubled outlines and full bellies — walks the wall of the Loa canyon behind a small human figure holding a lead rope. For caravan herders crossing the driest desert on Earth, the fertility of the herd was life itself; at Taira the animals are drawn with a tenderness that still reads at fifty paces.',
    source: 'Berenguer (2004); Museo Chileno de Arte Precolombino',
    pw: 2.8, ph: 1.4, bw: 3.8, bh: 2.5, bd: 2.2, style: 'varnish', seed: 16,
    draw(g) {
      const llama = (at, L, extra) => {
        g.quad({ at, L, dir: -1, B: L * 0.36, leg: L * 0.52, neck: L * 0.55, neckAng: 78, head: L * 0.2, headAng: -10, ears: L * 0.13, w: 0.024 });
        if (extra) g.quad({ at: [at[0], at[1] + 0.01], L: L * 0.86, dir: -1, B: L * 0.30, leg: L * 0.5, neck: L * 0.5, neckAng: 78, head: L * 0.17, headAng: -10, w: 0.018 });
      };
      llama([-0.45, -0.05], 0.56, true);
      llama([0.14, -0.02], 0.5);
      llama([0.7, -0.06], 0.48);
      llama([1.2, -0.02], 0.4);
      g.human({ at: [-1.1, -0.38], h: 0.5, pose: 'stand', dir: -1 });
      g.line([[-1.02, -0.05], [-0.83, 0.12]], 0.014); // lead rope
      g.quad({ at: [1.0, -0.5], L: 0.28, dir: -1, B: 0.1, leg: 0.14, neck: 0.15, neckAng: 80, head: 0.06, ears: 0.04, w: 0.018 });
      g.dots([-1.15, 0.4], 5, 0.08, 0.012);
    },
  },

  'cerro-pintado': {
    title: 'The Great Snake of the Orinoco',
    site: 'Cerro Pintado, Atures Rapids',
    location: 'Middle Orinoco, Venezuela',
    culture: 'Indigenous peoples of the Orinoco',
    date: 'c. 1,000–2,000 years BP',
    medium: 'Engraved on a granite inselberg face',
    scale: 'Reduced — the original snake is 42 m long: the one exhibit no boulder could hold at 1:1.',
    desc: 'On a granite hill above the Atures Rapids stretches a horned serpent forty-two metres long — among the largest single rock engravings known anywhere on Earth. Sightlines matter: the monumental snakes of the Orinoco were carved to be seen from the river, and researchers read them as territorial markers on an ancient trade artery — embodiments of the anaconda ancestors of local tradition.\n\nOurs is one-sixth scale. Even gods must fit the gallery.',
    source: 'Riris et al., Antiquity 98 (2024)',
    pw: 7.0, ph: 2.3, bw: 8.3, bh: 3.5, bd: 2.6, style: 'basalt', seed: 17,
    draw(g) {
      const body = [], body2 = [];
      for (let x = -3.1; x <= 2.45; x += 0.1) {
        const t = (x + 3.1) / 5.55;
        const amp = 0.46 * (0.35 + 0.65 * Math.min(1, t * 2.6));
        const y = 0.1 + Math.sin(x * 1.45 + 0.4) * amp;
        body.push([x, y]); body2.push([x, y + 0.055]);
      }
      g.line(body, 0.034); g.line(body2, 0.03);
      const hy = 0.1 + Math.sin(2.45 * 1.45 + 0.4) * 0.46;
      g.poly([[2.45, hy - 0.02], [2.75, hy + 0.03], [2.85, hy + 0.1], [2.72, hy + 0.16], [2.45, hy + 0.09]], { w: 0.028 });
      g.line(g.arc([2.68, hy + 0.2], 0.14, 40, 110).map((p) => p), 0.02);
      g.line(g.arc([2.82, hy + 0.2], 0.13, 60, 120), 0.02);
      g.disc([2.68, hy + 0.08], 0.022, 0.016);
      // companions: rayed sun & ladder motif
      g.circle([-2.85, -0.68], 0.12, { w: 0.022 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        g.line([[-2.85 + Math.cos(a) * 0.15, -0.68 + Math.sin(a) * 0.15], [-2.85 + Math.cos(a) * 0.24, -0.68 + Math.sin(a) * 0.24]], 0.018);
      }
      g.line([[-2.2, -0.5], [-2.2, -0.95]], 0.02);
      g.line([[-2.05, -0.5], [-2.05, -0.95]], 0.02);
      for (let i = 0; i < 4; i++) g.line([[-2.2, -0.55 - i * 0.11], [-2.05, -0.55 - i * 0.11]], 0.016);
    },
  },

  // ---------------------------------------------------- EUROPE
  'tanum': {
    title: 'Ships of the Bronze Sea',
    site: 'Tanum World Heritage Area (Vitlycke–Fossum tradition)',
    location: 'Bohuslän, Sweden',
    culture: 'Nordic Bronze Age',
    date: 'c. 1700–500 BCE',
    medium: 'Ground and pecked into glacier-smoothed granite',
    scale: 'Approximately 1:1.',
    desc: 'Crews of stroke-figures man long ships with animal-head prows, beneath sun-wheels and axe-raising warriors. Thousands of such ships cover the smoothed granite of Bohuslän — when they were carved the sea lay just below; the land has since risen and left them stranded inland. The red on many Tanum panels today is modern, reversible in-fill applied for visibility — a curatorial practice still debated.',
    source: 'UNESCO World Heritage List no. 557 (1994)',
    pw: 2.8, ph: 2.0, bw: 3.9, bh: 3.3, bd: 2.4, style: 'granite', seed: 18,
    draw(g) {
      g.boat({ at: [0, -0.5], len: 2.2, curl: 0.15, crew: 13, animalHead: true });
      g.boat({ at: [-0.68, 0.42], len: 1.15, curl: 0.15, crew: 7, animalHead: true });
      g.circle([0.72, 0.6], 0.12, { w: 0.024 });
      g.line([[0.6, 0.6], [0.84, 0.6]], 0.02);
      g.line([[0.72, 0.48], [0.72, 0.72]], 0.02);
      const axeman = (at, h, dir) => {
        g.human({ at, h, pose: 'spear', dir });
        g.poly([[at[0] + dir * h * 0.62, at[1] + h * 1.02], [at[0] + dir * h * 0.78, at[1] + h * 1.06], [at[0] + dir * h * 0.76, at[1] + h * 0.94]], { w: 0.02, fill: true });
      };
      axeman([1.05, -0.02], 0.5, -1);
      axeman([0.42, 0.68], 0.4, 1);
      for (let i = 0; i < 5; i++) g.disc([-1.1 + i * 0.09, -0.82], 0.022, 0.018);
    },
  },

  'valcamonica': {
    title: 'The Camunian Rose',
    site: 'Valcamonica (Naquane–Foppe di Nadro tradition)',
    location: 'Lombardy, Italy',
    culture: 'Camunni',
    date: 'c. 6000 BCE – Iron Age',
    medium: 'Pecked into glacier-polished sandstone',
    scale: 'Approximately 1:1.',
    desc: "Italy's first World Heritage site is a whole valley of pictures — at least 140,000 recognized figures, likely far more. Among praying figures and duelling warriors blooms the 'Camunian rose': a looping line swirling through nine cup-marks, meaning lost, silhouette so loved it became the official symbol of Lombardy. The square-shielded warriors date the panel's last hands to the Iron Age.",
    source: 'UNESCO World Heritage List no. 94 (1979)',
    pw: 2.0, ph: 1.7, bw: 3.0, bh: 2.9, bd: 2.2, style: 'paleGrey', seed: 19,
    draw(g) {
      // nine cups + swirling rose
      const c = [-0.38, 0.3];
      for (const dx of [-0.1, 0, 0.1]) for (const dy of [-0.1, 0, 0.1]) g.disc([c[0] + dx, c[1] + dy], 0.021, 0.016);
      const rose = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * TAU;
        const r = 0.165 + 0.062 * Math.sin(4 * a + Math.PI / 2);
        rose.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
      }
      g.line(rose, 0.024);
      for (const [ox, oy] of [[0.42, 0.52], [0.64, 0.52], [0.53, 0.24]])
        g.human({ at: [ox, oy - 0.34], h: 0.34, pose: 'armsup' });
      const duel = (at, dir) => {
        g.human({ at, h: 0.46, pose: 'spear', dir });
        g.poly([[at[0] + dir * 0.16, at[1] + 0.18], [at[0] + dir * 0.28, at[1] + 0.18], [at[0] + dir * 0.28, at[1] + 0.3], [at[0] + dir * 0.16, at[1] + 0.3]], { w: 0.018 });
      };
      duel([-0.62, -0.72], 1); duel([-0.02, -0.72], -1);
      g.quad({ at: [-0.68, 0.56], L: 0.3, dir: 1, horn: 'antler', hornSize: 0.16, w: 0.018 });
    },
  },

  'alta': {
    title: 'The Reindeer Corral',
    site: 'Alta rock art area (Hjemmeluft / Jiepmaluokta)',
    location: 'Finnmark, Norway',
    culture: 'Hunter-fisher societies of the far north',
    date: 'c. 5200–200 BCE',
    medium: 'Pecked into glacier-smoothed slate',
    scale: 'Approximately 1:1.',
    desc: "Inside a looping fence line reindeer mill while others graze free — among the earliest depictions of people managing the herds that still define life at this latitude, near the bay the Sámi call Jiepmaluokta, 'bay of seals'. A bear hunt and an elk-prowed boat share the shore. For decades the carvings were painted red for visitors; the paint is now left to fade so the stone can speak in its own grey.",
    source: 'UNESCO World Heritage List no. 352 (1985)',
    pw: 2.6, ph: 1.7, bw: 3.6, bh: 3.0, bd: 2.3, style: 'slate', seed: 20,
    draw(g) {
      const fence = [];
      for (let i = 0; i <= 40; i++) {
        const a = (i / 40) * TAU * 0.92 + 0.5;
        const r = 1 + 0.13 * Math.sin(i * 1.7);
        fence.push([-0.35 + Math.cos(a) * 0.72 * r, 0.05 + Math.sin(a) * 0.46 * r]);
      }
      g.line(fence, 0.022);
      g.line([[-0.35, -0.4], [-0.3, 0.1], [-0.55, 0.45]], 0.018);
      const deer = (at, L, dir = 1) =>
        g.quad({ at, L, dir, horn: 'antler', hornSize: L * 0.55, neckAng: 48, w: 0.018 });
      deer([-0.6, 0.12], 0.3); deer([-0.18, 0.2], 0.28, -1); deer([-0.38, -0.16], 0.3);
      deer([0.62, 0.42], 0.4, -1); deer([0.98, 0.05], 0.48); deer([0.42, -0.52], 0.36);
      g.quad({ at: [0.95, 0.62], L: 0.36, dir: -1, B: 0.2, neckAng: 20, head: 0.1, w: 0.02 });  // bear
      g.human({ at: [0.62, 0.55], h: 0.3, pose: 'spear', dir: 1 });
      g.boat({ at: [0.72, -0.68], len: 0.72, curl: 0.13, crew: 4, animalHead: true });
    },
  },

  // ---------------------------------------------------- AFRICA
  'dabous': {
    title: 'The Giraffes of Dabous',
    site: 'Dabous, Aïr Mountains',
    location: 'Agadez region, Niger',
    culture: 'Early Holocene herder-hunters of the green Sahara',
    date: 'c. 8,000–6,000 years BP',
    medium: 'Deeply incised and polished into sandstone',
    scale: 'True 1:1 — the bull stands 5.4 m. The tallest stone in the gallery was raised for them.',
    desc: "When these two giraffes were cut, the Sahara was a savanna of lakes. The larger — measured at 5.4 metres — is among the largest animal engravings on Earth, its hide patterned, its outline polished smooth. From each muzzle a thin line runs down to a tiny human figure: a leash, a rope, a claim, a prayer — no one knows. In 2000 the site joined the World Monuments Watch and a mold was taken; the originals still lie under open Sahara sky.\n\nThe original panel lies on a low outcrop, facing upward; here they stand, so you can meet them eye to eye.",
    source: 'British Museum African Rock Art Image Project; Bradshaw Foundation',
    pw: 4.4, ph: 6.0, bw: 5.6, bh: 7.4, bd: 3.0, style: 'sandstone', seed: 21,
    draw(g) {
      const giraffe = (at, k, dir) => {
        const r = g.quad({
          at, L: 1.7 * k, dir, B: 0.8 * k, leg: 1.35 * k, neck: 2.0 * k, neckAng: 64,
          head: 0.42 * k, headAng: -8, horn: 'ossicone', tail: { len: 0.5 * k, ang: -55 }, w: 0.075,
        });
        // hide patches
        g.dots([at[0], at[1]], 34, 0.72 * k, 0.045 * k);
        g.dots([at[0] + dir * 0.75 * k * 0.6, at[1] + 1.1 * k], 10, 0.2 * k, 0.04 * k);
        g.dots([at[0] + dir * 0.75 * k * 0.75, at[1] + 1.75 * k], 8, 0.16 * k, 0.035 * k);
        return r;
      };
      const big = giraffe([0.8, -0.35], 1.0, -1);
      const small = giraffe([-1.3, -0.85], 0.66, -1);
      g.line([big.muzzle, [big.muzzle[0] - 0.22, -2.05]], 0.025);
      g.human({ at: [big.muzzle[0] - 0.28, -2.5], h: 0.42, pose: 'stand' });
      g.line([small.muzzle, [small.muzzle[0] - 0.18, -2.15]], 0.022);
      g.human({ at: [small.muzzle[0] - 0.22, -2.55], h: 0.36, pose: 'armsup' });
    },
  },

  'twyfelfontein': {
    title: 'The Lion Man',
    site: 'Twyfelfontein / ǀUi-ǁaes',
    location: 'Kunene region, Namibia',
    culture: 'San (ancestral) engraving tradition',
    date: 'c. 2,000–6,000 years BP',
    medium: 'Pecked into red sandstone',
    scale: 'Approximately 1:1.',
    desc: "The lion of Twyfelfontein is no ordinary lion: each paw bears too many toes, and the long tail kinks up at a right angle to end in a pugmark — the print of a lion where no tail should carry one. Most readings see a shaman transformed, animal and animal-track made one. A giraffe and a kudu keep it company among more than two thousand engravings at the place San peoples called ǀUi-ǁaes — 'place among packed stones'.",
    source: 'UNESCO World Heritage List no. 1255 (2007)',
    pw: 2.3, ph: 1.6, bw: 3.3, bh: 2.8, bd: 2.2, style: 'redpatina', seed: 22,
    draw(g) {
      g.quad({
        at: [-0.15, 0.05], L: 1.05, dir: 1, B: 0.4, leg: 0.42, neck: 0.24, neckAng: 30,
        head: 0.28, headAng: -12, ears: 0.07, tail: { len: 0.62, kink: true, pug: true }, w: 0.03,
      });
      for (const fx of [0.23, 0.32, -0.53, -0.44])
        for (let t = 0; t < 3; t++)
          g.line([[fx - 0.02 + t * 0.02, -0.57], [fx - 0.025 + t * 0.025, -0.64]], 0.013);
      g.quad({ at: [0.82, 0.1], L: 0.5, dir: -1, B: 0.24, leg: 0.4, neck: 0.6, neckAng: 68, head: 0.14, horn: 'ossicone', w: 0.022 });
      g.quad({ at: [-0.85, -0.38], L: 0.45, dir: 1, horn: 'ibex', hornSize: 0.34, w: 0.022 });
      g.circle([0.55, -0.55], 0.09, { w: 0.02 });
      g.circle([0.82, -0.47], 0.055, { w: 0.018 });
    },
  },

  'qurta': {
    title: 'The Aurochs of the Ice Age Nile',
    site: 'Qurta, near Kom Ombo',
    location: 'Upper Egypt',
    culture: 'Late Palaeolithic hunter-gatherers',
    date: '≥ 15,000 years BP (OSL minimum)',
    medium: 'Hammered and ground into Nubian sandstone',
    scale: 'True 1:1 — the wild cattle at Qurta are drawn 50–80 cm long.',
    desc: "Millennia before farming reached the Nile, someone drew wild aurochs on this sandstone with an accuracy Europe's cave painters would recognize. Wind-blown sediment that had buried the panels gave a minimum age of 15,000 years — the oldest securely dated rock art in North Africa; its discoverers called it 'Lascaux along the Nile'. The bulls float legless and unfinished, heads lowered: naturalism from the Ice Age.",
    source: 'Huyge et al., Antiquity 85 (2011)',
    pw: 2.3, ph: 1.4, bw: 3.3, bh: 2.6, bd: 2.1, style: 'paleSand', seed: 23,
    draw(g) {
      const bull = (at, k, dir) => {
        const T = (p) => [at[0] + p[0] * k * dir, at[1] + p[1] * k];
        g.line([
          T([-0.85, -0.1]), T([-0.86, 0.02]), T([-0.62, 0.24]), T([-0.2, 0.33]), T([0.22, 0.28]),
          T([0.46, 0.14]), T([0.6, -0.02]), T([0.7, -0.2]),
        ], 0.032);
        g.line([T([0.7, -0.2]), T([0.58, -0.24]), T([0.47, -0.16])], 0.026); // muzzle/jaw
        g.line([T([0.47, -0.16]), T([0.4, -0.3]), T([0.05, -0.4]), T([-0.35, -0.38]), T([-0.62, -0.28])], 0.03);
        g.line(g.arc([at[0] + dir * 0.52 * k, at[1] + 0.2 * k], 0.19 * k, -60, 110), 0.026);
        g.line(g.arc([at[0] + dir * 0.44 * k, at[1] + 0.22 * k], 0.15 * k, -50, 115), 0.022);
        g.disc([at[0] + dir * 0.55 * k, at[1] + 0.02 * k], 0.018 * k, 0.014);
        g.line([T([0.3, -0.32]), T([0.28, -0.44])], 0.024);   // leg stubs
        g.line([T([-0.4, -0.4]), T([-0.42, -0.5])], 0.024);
      };
      bull([-0.35, -0.15], 1.0, 1);
      g.line([[0.35, 0.5], [0.6, 0.58], [0.92, 0.55], [1.05, 0.45]], 0.028); // partial second bull
      g.line(g.arc([1.02, 0.38], 0.13, -40, 120), 0.022);
      g.line([[1.05, 0.45], [1.1, 0.3]], 0.024);
    },
  },

  // ---------------------------------------------------- ASIA
  'tamgaly': {
    title: 'The Sun-Headed Ones',
    site: 'Tanbaly (Tamgaly) gorge',
    location: 'Zhetysu, Kazakhstan',
    culture: 'Bronze Age steppe communities',
    date: 'c. 14th–13th century BCE onward',
    medium: 'Pecked into weathered gorge faces',
    scale: 'Approximately 1:1.',
    desc: "In a dry gorge amid the steppe, some 5,000 petroglyphs surround what was plainly a sanctuary: altars, cult areas, and about thirty 'sun-head' beings — human bodies crowned with vast rayed discs, each ray tipped with a bead of light. Worshippers dance in rows beneath them. Gods, shamans in regalia, or something stranger: whatever they were, they kept this gorge holy for three thousand years.",
    source: 'UNESCO World Heritage List no. 1145 (2004)',
    pw: 2.0, ph: 1.9, bw: 3.0, bh: 3.2, bd: 2.2, style: 'varnish', seed: 24,
    draw(g) {
      const hx = -0.3, hy = 0.15, h = 0.78;
      g.human({ at: [hx, hy - h * 0.55], h, pose: 'stand', solidHead: false });
      const hc = [hx, hy - h * 0.55 + h * 0.85];
      g.circle(hc, 0.17, { w: 0.022 });
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        const p0 = [hc[0] + Math.cos(a) * 0.19, hc[1] + Math.sin(a) * 0.19];
        const p1 = [hc[0] + Math.cos(a) * 0.3, hc[1] + Math.sin(a) * 0.3];
        g.line([p0, p1], 0.016);
        g.disc([hc[0] + Math.cos(a) * 0.34, hc[1] + Math.sin(a) * 0.34], 0.02, 0.014);
      }
      for (let i = 0; i < 4; i++) g.human({ at: [-0.62 + i * 0.24, -0.78], h: 0.26, pose: 'dance' });
      g.quad({ at: [0.55, -0.3], L: 0.42, dir: -1, horn: 'ibex', hornSize: 0.36, w: 0.022, fill: true });
      g.human({ at: [0.52, 0.28], h: 0.3, pose: 'armsup' });
    },
  },

  'gobustan': {
    title: 'The Reed Boats & the Line Dance',
    site: 'Gobustan Rock Art Cultural Landscape',
    location: 'Absheron, Azerbaijan',
    culture: 'Upper Palaeolithic – medieval',
    date: 'Engravings spanning at least 20,000 years',
    medium: 'Incised and pecked into limestone',
    scale: 'Approximately 1:1.',
    desc: "Long reed boats crowded with rower-strokes, a rayed sun riding the prow, glide across Gobustan's stones above the Caspian — images that fascinated Thor Heyerdahl. Beside them, figures dance shoulder to shoulder in lines, ancestors of the yalli still danced in Azerbaijan today. The site even has its own instrument: the Gaval Dash, a natural 'tambourine stone' that rings like a drum when struck.",
    source: 'UNESCO World Heritage List no. 1076 (2007)',
    pw: 2.5, ph: 1.9, bw: 3.5, bh: 3.2, bd: 2.4, style: 'darkBasalt', seed: 25,
    draw(g) {
      g.boat({ at: [-0.05, -0.55], len: 1.95, curl: 0.18, crew: 16 });
      const sc = [0.98, -0.22];
      g.circle(sc, 0.1, { w: 0.02 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        g.line([[sc[0] + Math.cos(a) * 0.12, sc[1] + Math.sin(a) * 0.12], [sc[0] + Math.cos(a) * 0.19, sc[1] + Math.sin(a) * 0.19]], 0.014);
      }
      for (let i = 0; i < 5; i++) g.human({ at: [-0.82 + i * 0.34, 0.28], h: 0.36, pose: 'link' });
      g.quad({ at: [0.85, 0.42], L: 0.55, dir: -1, horn: 'lyre', hornSize: 0.3, w: 0.024 });
      g.dots([-1.0, 0.72], 5, 0.09, 0.013);
    },
  },

  'bangudae': {
    title: 'The Whale Hunters',
    site: 'Bangudae, Daegok-ri, Ulsan',
    location: 'South Korea',
    culture: 'Neolithic–Bronze Age coastal communities',
    date: 'c. 5000 BCE – 9th century CE',
    medium: 'Pecked and ground into a shale cliff',
    scale: 'Selection at 1:1 from a panel of 312 figures.',
    desc: 'The earliest known depiction of whaling anywhere on Earth: boats trail harpoon lines to diving whales, floats bobbing on the line, and a mother whale swims with her calf on her back. Forty-six large whales — humpback, right, sperm, told apart by silhouette — crowd Korean National Treasure no. 285, inscribed by UNESCO in July 2025. The cliff still spends eight to nine months a year underwater behind the Sayeon Dam; the whales surface each dry season.',
    source: 'UNESCO World Heritage List (2025); Ulsan Petroglyph Museum',
    pw: 4.2, ph: 2.4, bw: 5.4, bh: 3.7, bd: 2.6, style: 'slate', seed: 26,
    draw(g) {
      g.whale({ at: [-1.25, 0.05], len: 1.15, ang: 95, calf: true });
      g.whale({ at: [-0.55, -0.42], len: 0.85, ang: 80 });
      g.whale({ at: [0.35, -0.12], len: 1.0, ang: 100, harpoon: true });
      g.whale({ at: [-0.02, 0.78], len: 0.5, ang: 72 });
      g.whale({ at: [-1.95, -0.55], len: 0.55, ang: 102 });
      g.boat({ at: [1.18, 0.78], len: 0.6, curl: 0.2, crew: 5 });
      const tc = [0.92, -0.68];
      g.circle(tc, 0.13, { w: 0.022 });
      for (const a of [40, 140, 220, 320])
        g.line([[tc[0] + Math.cos(a * DEG) * 0.13, tc[1] + Math.sin(a * DEG) * 0.13], [tc[0] + Math.cos(a * DEG) * 0.22, tc[1] + Math.sin(a * DEG) * 0.22]], 0.018);
      g.line([[tc[0], tc[1] + 0.13], [tc[0], tc[1] + 0.2]], 0.018);
      for (let i = 0; i < 5; i++) g.line([[1.55 + i * 0.11, 0.0], [1.55 + i * 0.11, -0.6]], 0.016);
      for (let i = 0; i < 4; i++) g.line([[1.55, 0.0 - i * 0.19], [1.99, 0.0 - i * 0.19]], 0.016);
    },
  },

  // ---------------------------------------------------- OCEANIA
  'murujuga': {
    title: 'The Thylacine',
    site: 'Murujuga (Burrup Peninsula)',
    location: 'Pilbara, Western Australia',
    culture: 'Ngarda-Ngarli — Ngarluma, Yindjibarndi, Yaburara, Mardudhunera and Wong-Goo-Tt-Oo peoples',
    date: 'Tradition reaching back ~47,000 years; thylacine motifs ≥ 3,000 years',
    medium: 'Pecked through iron-dark patina on gabbro',
    scale: 'Approximately 1:1.',
    desc: "A striped, stiff-tailed hunter no living person has seen walks Murujuga's dark stones: the thylacine vanished from mainland Australia some 3,000 years ago, yet here it is mid-stride, jaw open. Among an estimated one to two million engravings — the densest rock-art province on Earth, inscribed by UNESCO in July 2025 — the extinct keep company with the fish and turtles of the living sea. Ngarda-Ngarli custodians continue to press for protection of the patina from nearby industrial emissions.",
    source: 'UNESCO World Heritage List no. 1709 (2025); Murujuga Aboriginal Corporation',
    pw: 2.0, ph: 1.6, bw: 3.0, bh: 2.8, bd: 2.2, style: 'redpatina', seed: 27,
    draw(g) {
      const r = g.quad({
        at: [-0.05, 0.18], L: 0.95, dir: 1, B: 0.32, leg: 0.34, neck: 0.2, neckAng: 22,
        head: 0.26, headAng: -6, ears: 0.06, stripes: 8, tail: { len: 0.5, ang: -10 }, w: 0.026,
      });
      g.line([r.headBase, [r.muzzle[0] - 0.02, r.muzzle[1] - 0.1]], 0.02); // open jaw
      const fish = [0.0 - 0.6, -0.5];
      g.poly([[fish[0] - 0.24, fish[1]], [fish[0], fish[1] + 0.1], [fish[0] + 0.2, fish[1] + 0.02], [fish[0], fish[1] - 0.1]], { w: 0.022 });
      g.line([[fish[0] + 0.2, fish[1] + 0.02], [fish[0] + 0.3, fish[1] + 0.1]], 0.018);
      g.line([[fish[0] + 0.2, fish[1] + 0.02], [fish[0] + 0.3, fish[1] - 0.07]], 0.018);
      for (let i = 0; i < 3; i++) g.line([[fish[0] - 0.12 + i * 0.09, fish[1] + 0.07], [fish[0] - 0.12 + i * 0.09, fish[1] - 0.07]], 0.014);
      const t = [0.62, -0.42];
      g.circle(t, 0.14, { w: 0.022 });
      for (const a of [45, 135, 225, 315])
        g.line([[t[0] + Math.cos(a * DEG) * 0.13, t[1] + Math.sin(a * DEG) * 0.13], [t[0] + Math.cos(a * DEG) * 0.23, t[1] + Math.sin(a * DEG) * 0.23]], 0.018);
      g.line([[t[0], t[1] + 0.14], [t[0], t[1] + 0.22]], 0.018);
    },
  },

  'sydney-emu': {
    title: 'The Emu in the Sky',
    site: 'Elvina Track engraving site, Ku-ring-gai Chase National Park',
    location: 'Garigal Country, Sydney, Australia',
    culture: 'Garigal clan — Sydney rock engraving tradition',
    date: 'Likely within the last ~4,000 years',
    medium: 'Grooved outline in Hawkesbury sandstone (horizontal platform)',
    scale: 'True 1:1 — a life-size emu, displayed as in the field: underfoot.',
    desc: "This emu lies flat on a sandstone platform, legs trailing, neck outstretched — the pose not of a walking bird but of the Emu in the Sky, the dark shape in the dust lanes of the Milky Way. On autumn evenings, when real emus lay their eggs, the celestial emu stands over this engraving in matching orientation: astronomy, calendar and Country in one grooved line. Read it as its makers did — at a low light, from its feet.",
    source: 'Norris & Norris, Emu Dreaming (2009); Aboriginal Heritage Office, Sydney',
    pw: 3.5, ph: 2.5, bw: 4.3, bh: 0.62, bd: 3.3, style: 'sandstone', seed: 28, kind: 'dais',
    draw(g) {
      const body = [];
      for (let i = 0; i <= 30; i++) {
        const a = (i / 30) * TAU;
        body.push([0.1 + Math.cos(a) * 0.6 - Math.sin(a) * 0.06, 0.12 + Math.sin(a) * 0.34]);
      }
      g.line(body, 0.05);
      g.line([[0.58, 0.34], [0.9, 0.55], [1.16, 0.62], [1.3, 0.6]], 0.05);   // neck
      g.circle([1.38, 0.58], 0.07, { w: 0.04 });
      g.line([[1.44, 0.55], [1.58, 0.48]], 0.035);                            // beak
      g.line([[-0.3, -0.16], [-0.85, -0.5], [-1.05, -0.52]], 0.05);           // trailing legs
      g.line([[-0.15, -0.22], [-0.6, -0.62], [-0.8, -0.66]], 0.05);
      g.footprint3([-1.1, -0.52], 0.12, -1);
      g.footprint3([-0.85, -0.66], 0.12, -1);
      for (let i = 0; i < 5; i++)
        g.footprint3([-1.25 + i * 0.5, -0.95 + Math.sin(i * 0.8) * 0.08], 0.1, 1);
      g.line(g.arc([1.05, -0.68], 0.3, 25, 155), 0.045);
      g.line(g.arc([1.05, -0.74], 0.24, 30, 150), 0.045);
    },
  },

  'orongo': {
    title: 'Tangata Manu — the Birdmen',
    site: 'Orongo ceremonial village, Rapa Nui (Easter Island)',
    location: 'Chile (Polynesia)',
    culture: 'Rapa Nui',
    date: 'c. 16th century – 1867 CE',
    medium: 'Bas-relief and pecked basalt',
    scale: 'Approximately 1:1.',
    desc: 'Crouched figures with frigatebird heads clutch the egg of the sooty tern: tangata manu, the birdmen. Each spring champions swam shark waters to the islet of Motu Nui; the first egg won its patron a year of sacred authority. Hundreds of birdmen — up to ~480 among more than 1,700 petroglyphs at Orongo — watch the sea from the crater rim beside the great-eyed face of the creator, Makemake. The ceremony ended in 1867. The birdmen still wait for spring.',
    source: 'Lee, The Rock Art of Easter Island (1992)',
    pw: 1.8, ph: 1.5, bw: 2.8, bh: 2.7, bd: 2.1, style: 'darkBasalt', seed: 29,
    draw(g) {
      const birdman = (at, k, dir) => {
        const T = (p) => [at[0] + p[0] * k * dir, at[1] + p[1] * k];
        g.line(g.arc([at[0], at[1] - 0.05 * k], 0.42 * k, 25, 200).map((p) => [at[0] + (p[0] - at[0]) * dir, p[1]]), 0.03);
        g.line([T([-0.38, -0.22]), T([-0.1, -0.42]), T([0.22, -0.38])], 0.028);   // tucked leg
        g.line([T([0.24, -0.38]), T([0.33, -0.3])], 0.022);                        // foot
        g.line([T([0.05, 0.18]), T([0.3, -0.05])], 0.026);                         // arm
        g.circle(T([0.38, -0.1]), 0.07 * k, { w: 0.022 });                         // the egg
        g.line([T([-0.05, 0.36]), T([0.14, 0.42])], 0.026);                        // bird neck
        g.circle(T([0.22, 0.44]), 0.085 * k, { w: 0.024 });
        g.line(g.arc([at[0] + dir * 0.33 * k, at[1] + 0.4 * k], 0.16 * k, 10, -75).map((p) => [at[0] + (p[0] - at[0]) * 1, p[1]]), 0.024); // hooked beak
        g.disc(T([0.22, 0.45]), 0.018 * k, 0.014);
      };
      birdman([-0.3, -0.15], 1.0, 1);
      birdman([0.52, -0.42], 0.66, 1);
      // Makemake
      g.circle([0.42, 0.5], 0.1, { w: 0.02 });
      g.circle([0.42, 0.5], 0.045, { w: 0.018 });
      g.circle([0.69, 0.5], 0.1, { w: 0.02 });
      g.circle([0.69, 0.5], 0.045, { w: 0.018 });
      g.line(g.arc([0.42, 0.47], 0.14, 40, 140), 0.018);
      g.line(g.arc([0.69, 0.47], 0.14, 40, 140), 0.018);
      g.line([[0.53, 0.52], [0.53, 0.34], [0.58, 0.3]], 0.018);
      g.line(g.arc([0.555, 0.24], 0.09, 200, 340), 0.018);
    },
  },

  // ---------------------------------------------------- FIELD NOTES
  'wp-maze': {
    title: 'The Maze & the Spiral-Headed One',
    site: 'Maze Rock Art Site, House Rock Valley Road',
    location: 'Vermilion Cliffs National Monument, Arizona',
    culture: 'Ancestral Puebloan — Kayenta–Virgin transition',
    date: 'c. 850–1300 CE',
    medium: 'Pecked through desert varnish on Navajo sandstone',
    scale: 'Approximately 1:1, traced from the curator\'s photographs.',
    desc: 'An interlocking maze of pecked frets, tilted like a blanket hung to dry — and standing on its top edge, a small figure whose head spirals away into itself. To their left, a broad-shouldered one balances on a dotted line; around them drift grids, snakes, sheep with spiral horns. The Maze Rock Art Site sits where two Ancestral Puebloan worlds — Kayenta and Virgin — met and traded on the Paria Plateau. The curator walked its marked trail one May afternoon, admired it from behind the wooden rail, and did not cross.\n\nRedrawn here from those photographs, at the same scale it keeps in the desert.',
    source: 'Field record, A. Brezgis, 11 May 2026',
    pw: 2.4, ph: 2.0, bw: 3.4, bh: 3.3, bd: 2.3, style: 'vermilion', seed: 31,
    photo: PHOTOS['wp-maze'],
    photoCaption: 'The curator at the maze panel — 11 May 2026.',
    draw(g) {
      // the maze: 3×3 interlocked rectilinear frets, tilted ~10°
      const rot = 10 * DEG;
      const fret = (cx, cy, s, flip) => {
        const P = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0.3], [0.68, 0.3], [0.68, 0.68], [0.3, 0.68], [0.3, 0.48], [0.52, 0.48]];
        g.line(P.map(([x, y]) => {
          const px = ((flip ? 1 - x : x) - 0.5) * s, py = (y - 0.5) * s;
          return [cx + px * Math.cos(rot) - py * Math.sin(rot), cy + px * Math.sin(rot) + py * Math.cos(rot)];
        }), 0.022);
      };
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          fret(-0.42 + c * 0.27, -0.28 + r * 0.27, 0.25, (r + c) % 2 === 1);
      // ragged step-border fragments around the block
      g.line([[-0.62, 0.12], [-0.62, 0.24], [-0.5, 0.24], [-0.5, 0.34]], 0.02);
      g.line([[0.02, -0.5], [0.12, -0.5], [0.12, -0.42]], 0.02);
      // spiral-headed figure standing on the maze
      g.line([[-0.13, 0.42], [-0.11, 0.62]], 0.024);                       // body
      g.line([[-0.13, 0.44], [-0.22, 0.36]], 0.02);                        // legs astride the maze
      g.line([[-0.13, 0.44], [-0.03, 0.37]], 0.02);
      g.line([[-0.11, 0.55], [-0.2, 0.5]], 0.018);                         // arms
      g.line([[-0.11, 0.55], [-0.02, 0.51]], 0.018);
      g.spiral([-0.09, 0.72], { turns: 2.8, r0: 0.006, r1: 0.085, w: 0.018 });
      // broad-shouldered anthropomorph on a dotted line (upper left)
      g.poly([[-0.98, 0.62], [-0.82, 0.62], [-0.82, 0.42], [-0.98, 0.42]], { w: 0.02, fill: true });
      g.line([[-1.03, 0.63], [-0.77, 0.63]], 0.024);                       // shoulder bar
      g.line([[-1.03, 0.63], [-1.09, 0.52]], 0.018);                       // arms
      g.line([[-0.77, 0.63], [-0.71, 0.52]], 0.018);
      g.disc([-0.9, 0.7], 0.032, 0.016);
      g.line([[-0.94, 0.73], [-0.97, 0.78]], 0.014);
      g.line([[-0.86, 0.73], [-0.83, 0.78]], 0.014);
      g.line([[-0.96, 0.42], [-0.98, 0.32]], 0.018);                       // legs
      g.line([[-0.84, 0.42], [-0.82, 0.32]], 0.018);
      for (let i = 0; i < 11; i++) g.disc([-1.12 + i * 0.05, 0.28], 0.011, 0.012);
      // 2×2 grid (right)
      g.poly([[0.5, 0.42], [0.78, 0.42], [0.78, 0.2], [0.5, 0.2]], { w: 0.02 });
      g.line([[0.64, 0.42], [0.64, 0.2]], 0.018);
      g.line([[0.5, 0.31], [0.78, 0.31]], 0.018);
      // quadruped, snake, double-spiral ram, big spiral
      g.quad({ at: [-0.9, 0.02], L: 0.28, dir: 1, horn: 'antler', hornSize: 0.13, w: 0.018 });
      g.zig([0.92, 0.05], [0.86, -0.42], 6, 0.045, 0.018);
      g.disc([0.925, 0.09], 0.02, 0.014);
      g.spiral([-0.82, -0.52], { turns: 2.2, r0: 0.005, r1: 0.055, w: 0.015 });
      g.spiral([-0.68, -0.52], { turns: 2.2, r0: 0.005, r1: 0.055, w: 0.015, ccw: true });
      g.line([[-0.79, -0.58], [-0.71, -0.58]], 0.016);
      for (const lx of [-0.78, -0.72]) g.line([[lx, -0.58], [lx, -0.66]], 0.014);
      g.spiral([0.55, -0.62], { turns: 3.2, r0: 0.008, r1: 0.12, w: 0.02 });
      // small figures & marks along the base
      g.human({ at: [-0.25, -0.85], h: 0.2, pose: 'armsup', w: 0.016 });
      g.human({ at: [0.02, -0.87], h: 0.18, pose: 'stand', w: 0.016 });
      g.dots([0.25, -0.8], 6, 0.07, 0.011);
    },
  },

  'wp-herd': {
    title: 'The Herd Above White Pocket',
    site: 'Unrecorded panel, Paria Plateau (near White Pocket)',
    location: 'Vermilion Cliffs National Monument, Arizona',
    culture: 'Ancestral Puebloan tradition (undetermined)',
    date: 'undetermined',
    medium: 'Pecked through desert varnish beneath a sandstone alcove',
    scale: 'Approximately 1:1, traced from the curator\'s photographs.',
    desc: 'On a shaded patch of varnish beneath an overhang, a herd files quietly in rows — a dozen and more slender animals, antlers ticked back, walking the same direction they have walked for centuries. The curator encountered them unplanned, a few steps off the swirled rock of White Pocket: unadvertised, guarded only by an archaeological-site marker, and — as far as the curator could learn — absent from published archaeology. Marked, visited, appreciated, formally unrecorded. Its exact location is left out here, as rock-art ethics ask.\n\nIf you know this herd — who drew them, what they are called — the curator would genuinely love to hear.',
    source: 'Field record, A. Brezgis, 11 May 2026',
    pw: 2.2, ph: 1.5, bw: 3.2, bh: 2.8, bd: 2.2, style: 'vermilion', seed: 32,
    photo: PHOTOS['wp-herd'],
    photoCaption: 'The curator beneath the herd — 11 May 2026.',
    draw(g) {
      const deer = (at, L, dir = 1, fill = true) =>
        g.quad({ at, L, dir, B: L * 0.32, leg: L * 0.6, neck: L * 0.26, neckAng: 60,
                 head: L * 0.16, horn: 'antler', hornSize: L * 0.42, w: 0.016, fill });
      // top row
      deer([-0.62, 0.32], 0.26); deer([-0.24, 0.35], 0.24); deer([0.38, 0.3], 0.28);
      deer([0.74, 0.34], 0.22);
      // the big buck, center
      deer([0.05, 0.02], 0.4);
      // middle row
      deer([-0.72, -0.02], 0.24); deer([-0.38, -0.05], 0.26); deer([0.45, -0.05], 0.25);
      deer([0.78, -0.02], 0.2, -1);
      // bottom row (older, fainter — thinner strokes, outline only)
      deer([-0.55, -0.4], 0.24, 1, false); deer([-0.15, -0.42], 0.26, 1, false);
      deer([0.25, -0.4], 0.22, 1, false); deer([0.6, -0.44], 0.2, 1, false);
      // a bighorn watching from the top corner
      g.quad({ at: [-0.85, 0.52], L: 0.2, dir: -1, fill: true, horn: 'curl', hornSize: 0.09, w: 0.015 });
      g.dots([0.15, -0.62], 5, 0.08, 0.01);
    },
  },
};

// Source links for every lectern — each URL fetch-verified (or DOI-verified
// via CrossRef) on 2026-07-20.
const LINKS = {
  'great-hunt': 'https://www.nps.gov/places/great-hunt-panel-site.htm',
  'fajada': 'https://www.nps.gov/places/fajada-butte-overlook.htm',
  'three-rivers': 'https://www.blm.gov/visit/three-rivers-petroglyph-site',
  'sand-island': 'https://bearsearspartnership.org/visit/explore/sand-island-petroglyph-panel',
  'toro-muerto': 'https://www.cambridge.org/core/journals/cambridge-archaeological-journal/article/dances-with-zigzags-in-toro-muerto-peru-geometric-petroglyphs-as-possible-embodiments-of-songs/927CAB01B6EE403E46904A2B04F2A6AE',
  'atacama-llamas': 'https://chileprecolombino.cl/en/arte/arte-rupestre/los-pictograbados-de-taira/',
  'cerro-pintado': 'https://www.cambridge.org/core/journals/antiquity/article/monumental-snake-engravings-of-the-orinoco-river/147F83AA4381153C4D0F4EA4817B3766',
  'tanum': 'https://whc.unesco.org/en/list/557/',
  'valcamonica': 'https://whc.unesco.org/en/list/94/',
  'alta': 'https://whc.unesco.org/en/list/352/',
  'dabous': 'https://www.bradshawfoundation.com/giraffe/',
  'twyfelfontein': 'https://whc.unesco.org/en/list/1255/',
  'qurta': 'https://www.cambridge.org/core/journals/antiquity/article/abs/first-evidence-of-pleistocene-rock-art-in-north-africa-securing-the-age-of-the-qurta-petroglyphs-egypt-through-osl-dating/FBE838867A15C3CE76CAF883568AC251',
  'tamgaly': 'https://whc.unesco.org/en/list/1145/',
  'gobustan': 'https://whc.unesco.org/en/list/1076/',
  'bangudae': 'https://whc.unesco.org/en/list/1740/',
  'murujuga': 'https://whc.unesco.org/en/list/1709/',
  'sydney-emu': 'http://emudreaming.com/Examples/emu.htm',
  'orongo': 'https://whc.unesco.org/en/list/715/',
  'wp-maze': 'https://www.blm.gov/visit/vermilion-cliffs-national-monument',
  'wp-herd': 'https://www.blm.gov/visit/vermilion-cliffs-national-monument',
};
for (const [id, link] of Object.entries(LINKS)) if (PANELS[id]) PANELS[id].link = link;
