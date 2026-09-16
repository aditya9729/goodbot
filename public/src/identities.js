// Stable synthetic scene instance IDs. 0 is background / no hit.
export const INSTANCE_IDS = Object.freeze({architecture:1,bed:2,nightstand:3,desk:4,cupboard:5,shelf:6,cart:7,robot:8,'cup-a':9,'cup-b':10,'towel-0':11,'towel-1':12,chair:13,keepsake:14,suitcase:15});
export const INSTANCE_LABELS = Object.freeze(Object.fromEntries(Object.entries(INSTANCE_IDS).map(([k,v])=>[v,k])));
export const packedMaterial = (material, instance=0) => material + 64*instance;
export const materialIndex = code => code % 64;
export const instanceIndex = code => Math.floor(code/64);
