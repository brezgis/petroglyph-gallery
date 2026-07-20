// World layout — the gallery is a shallow valley. A hearth plaza sits at the
// center; six regional groves ring it, each holding 3-4 engraved boulders.

import { DEG } from './util.js';

export const WORLD_R = 118;      // soft boundary for the player
export const PLAZA_R = 11;       // flattened hearth plaza radius
export const FIRE_POS = { x: 0, z: 0 };

// Player spawns on the south path, looking north at the fire.
export const SPAWN = { x: 0, z: -27, yaw: Math.PI };

export const REGIONS = [
  { key: 'na', name: 'NORTH AMERICA', sub: 'canyon rivers of the dry Southwest',
    angle: 300, dist: 60, panels: ['great-hunt', 'fajada', 'three-rivers', 'sand-island'] },
  { key: 'sa', name: 'SOUTH AMERICA', sub: 'high deserts & the great river',
    angle: 240, dist: 60, panels: ['toro-muerto', 'atacama-llamas', 'cerro-pintado'] },
  { key: 'oc', name: 'OCEANIA', sub: 'saltwater country & the far islands',
    angle: 180, dist: 62, panels: ['murujuga', 'sydney-emu', 'orongo'] },
  { key: 'as', name: 'ASIA', sub: 'steppe, gorge & whale shore',
    angle: 120, dist: 62, panels: ['tamgaly', 'gobustan', 'bangudae'] },
  { key: 'eu', name: 'EUROPE', sub: 'bronze ships & alpine valleys',
    angle: 60, dist: 60, panels: ['tanum', 'valcamonica', 'alta'] },
  { key: 'af', name: 'AFRICA', sub: 'the green Sahara & the etched south',
    angle: 0, dist: 64, panels: ['dabous', 'twyfelfontein', 'qurta'] },
  // The curator's own finds — directly behind the spawn point, on the south path.
  { key: 'fn', name: 'FIELD NOTES', sub: 'two stones from the Vermilion Cliffs — as encountered',
    angle: 270, dist: 46, panels: ['wp-maze', 'wp-herd'] },
];

export const regionCenter = (r) => ({
  x: Math.cos(r.angle * DEG) * r.dist,
  z: Math.sin(r.angle * DEG) * r.dist,
});
