// Static meshes that share a material are merged into one mesh per material:
// fewer draw calls for the same picture. Anything interactive, animated or
// flagged `userData.keep` stays a separate object.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const fixed = (root) => (o) => {
  for (let p = o; p && p !== root; p = p.parent) if (p.userData.keep || p.userData.interact) return false;
  return true;
};

export function mergeStatic(root, pick = fixed(root)) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !pick(o)) return;
    // merging needs matching layouts: same material, same attributes, same indexing
    const g = o.geometry;
    const key = `${o.material.uuid}|${g.index ? 'i' : 'n'}|${Object.keys(g.attributes).sort().join(',')}|${o.castShadow}|${o.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, recv: o.receiveShadow, list: [] });
    buckets.get(key).list.push(o);
  });
  for (const b of buckets.values()) {
    if (b.list.length < 2) continue;
    const geos = b.list.map((o) => o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
    const merged = mergeGeometries(geos);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    const m = new THREE.Mesh(merged, b.mat);
    m.castShadow = b.cast; m.receiveShadow = b.recv;
    root.add(m);
    victims.push(...b.list);
  }
  for (const o of victims) o.removeFromParent();
}
