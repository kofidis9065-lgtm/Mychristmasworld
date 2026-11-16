import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Shared materials cache for optimal mobile draw-state batching and zero per-call allocation
export const materials = {
  frozenIce: new THREE.MeshStandardMaterial({
    color: 0x8ad0ff,
    roughness: 0.12,
    metalness: 0.22,
    transparent: true,
    opacity: 0.85,
  }),
  iceCrystal: new THREE.MeshStandardMaterial({
    color: 0xb5e9ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.55,
    roughness: 0.12,
    metalness: 0.25,
    transparent: true,
    opacity: 0.88,
  }),
  glassClear: new THREE.MeshStandardMaterial({
    color: 0xe3f6ff,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  }),
  waterStream: new THREE.MeshStandardMaterial({
    color: 0x9ce3ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.35,
    roughness: 0.08,
    metalness: 0.18,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  }),
  auroraBeam: new THREE.MeshStandardMaterial({
    color: 0x5eead4,
    emissive: 0x2dd4bf,
    emissiveIntensity: 1.6,
    roughness: 0.2,
    metalness: 0.0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  spotBeam: new THREE.MeshStandardMaterial({
    color: 0xffef9e,
    emissive: 0xffd54f,
    emissiveIntensity: 1.4,
    roughness: 0.2,
    metalness: 0.0,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  steamWhite: new THREE.MeshStandardMaterial({
    color: 0xf8fbff,
    roughness: 0.95,
    metalness: 0.0,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  }),
  snow: new THREE.MeshStandardMaterial({
    color: 0xf2f7fc,
    roughness: 0.9,
    metalness: 0.04,
  }),
  polarFur: new THREE.MeshStandardMaterial({
    color: 0xf5f8fc,
    roughness: 0.88,
    metalness: 0.02,
  }),
  pineFoliage: new THREE.MeshStandardMaterial({
    color: 0x1a472a,
    roughness: 0.78,
    metalness: 0.06,
  }),
  woodTrunk: new THREE.MeshStandardMaterial({
    color: 0x4b2e19,
    roughness: 0.88,
    metalness: 0.04,
  }),
  timberWall: new THREE.MeshStandardMaterial({
    color: 0x7c4d2d,
    roughness: 0.82,
    metalness: 0.05,
  }),
  caramelWood: new THREE.MeshStandardMaterial({
    color: 0x9a6236,
    roughness: 0.65,
    metalness: 0.08,
  }),
  stoneBase: new THREE.MeshStandardMaterial({
    color: 0x434a52,
    roughness: 0.92,
    metalness: 0.08,
  }),
  brickWarm: new THREE.MeshStandardMaterial({
    color: 0x7f332c,
    roughness: 0.86,
    metalness: 0.05,
  }),
  roofTiles: new THREE.MeshStandardMaterial({
    color: 0x5c2828,
    roughness: 0.78,
    metalness: 0.1,
  }),
  emissiveWindow: new THREE.MeshStandardMaterial({
    color: 0xffe49e,
    emissive: 0xffb83d,
    emissiveIntensity: 1.8,
    roughness: 0.25,
    metalness: 0.1,
  }),
  starEmissive: new THREE.MeshStandardMaterial({
    color: 0xffeb7d,
    emissive: 0xffe347,
    emissiveIntensity: 2.2,
    roughness: 0.18,
    metalness: 0.35,
  }),
  flameCore: new THREE.MeshStandardMaterial({
    color: 0xffb74d,
    emissive: 0xff6f00,
    emissiveIntensity: 2.4,
    roughness: 0.3,
    metalness: 0.0,
  }),
  bulbRuby: new THREE.MeshStandardMaterial({
    color: 0xff4444,
    emissive: 0xff1f1f,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.15,
  }),
  bulbCyan: new THREE.MeshStandardMaterial({
    color: 0x5ce1ff,
    emissive: 0x00c8ff,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.15,
  }),
  bulbEmerald: new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 1.8,
    roughness: 0.2,
    metalness: 0.15,
  }),
  bulbAmber: new THREE.MeshStandardMaterial({
    color: 0xffdf6b,
    emissive: 0xffb703,
    emissiveIntensity: 1.9,
    roughness: 0.2,
    metalness: 0.15,
  }),
  streetLampMetal: new THREE.MeshStandardMaterial({
    color: 0x20262e,
    roughness: 0.38,
    metalness: 0.85,
  }),
  chromeSteel: new THREE.MeshStandardMaterial({
    color: 0xd4dde8,
    roughness: 0.18,
    metalness: 0.92,
  }),
  goldAccent: new THREE.MeshStandardMaterial({
    color: 0xe6c87e,
    roughness: 0.22,
    metalness: 0.9,
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0xd4ad38,
    roughness: 0.26,
    metalness: 0.84,
  }),
  copperTrim: new THREE.MeshStandardMaterial({
    color: 0xc26e45,
    roughness: 0.28,
    metalness: 0.82,
  }),
  holidayRed: new THREE.MeshStandardMaterial({
    color: 0xc42528,
    roughness: 0.42,
    metalness: 0.18,
  }),
  crimsonVelvet: new THREE.MeshStandardMaterial({
    color: 0x981a24,
    roughness: 0.78,
    metalness: 0.04,
  }),
  holidayGreen: new THREE.MeshStandardMaterial({
    color: 0x1c5c34,
    roughness: 0.45,
    metalness: 0.16,
  }),
  emeraldVelvet: new THREE.MeshStandardMaterial({
    color: 0x164a2a,
    roughness: 0.75,
    metalness: 0.05,
  }),
  holidayBlue: new THREE.MeshStandardMaterial({
    color: 0x22578f,
    roughness: 0.36,
    metalness: 0.38,
  }),
  royalNavy: new THREE.MeshStandardMaterial({
    color: 0x1b345c,
    roughness: 0.42,
    metalness: 0.32,
  }),
  baubleRuby: new THREE.MeshStandardMaterial({
    color: 0xe02438,
    roughness: 0.14,
    metalness: 0.85,
  }),
  baubleGold: new THREE.MeshStandardMaterial({
    color: 0xf4ce6a,
    roughness: 0.14,
    metalness: 0.9,
  }),
  baubleCyan: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.14,
    metalness: 0.85,
  }),
  coal: new THREE.MeshStandardMaterial({
    color: 0x181a1f,
    roughness: 0.76,
    metalness: 0.12,
  }),
  rubberDark: new THREE.MeshStandardMaterial({
    color: 0x1e2126,
    roughness: 0.88,
    metalness: 0.05,
  }),
  carrot: new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.58,
    metalness: 0.04,
  }),
  gingerbread: new THREE.MeshStandardMaterial({
    color: 0x935629,
    roughness: 0.82,
    metalness: 0.04,
  }),
  waffleGolden: new THREE.MeshStandardMaterial({
    color: 0xd99943,
    roughness: 0.62,
    metalness: 0.05,
  }),
  whiteIcing: new THREE.MeshStandardMaterial({
    color: 0xfafcff,
    roughness: 0.38,
    metalness: 0.08,
  }),
  creamEnamel: new THREE.MeshStandardMaterial({
    color: 0xf8eed9,
    roughness: 0.35,
    metalness: 0.12,
  }),
  skinWarm: new THREE.MeshStandardMaterial({
    color: 0xffd5b8,
    roughness: 0.58,
    metalness: 0.02,
  }),
  horseIvory: new THREE.MeshStandardMaterial({
    color: 0xf6f0e6,
    roughness: 0.36,
    metalness: 0.1,
  }),
  horseChestnut: new THREE.MeshStandardMaterial({
    color: 0x8b4a2b,
    roughness: 0.4,
    metalness: 0.1,
  }),
  horseDapple: new THREE.MeshStandardMaterial({
    color: 0xc5cdd6,
    roughness: 0.38,
    metalness: 0.12,
  }),
  reindeerCoat: new THREE.MeshStandardMaterial({
    color: 0x8a5836,
    roughness: 0.72,
    metalness: 0.05,
  }),
  reindeerBelly: new THREE.MeshStandardMaterial({
    color: 0xd9c2a3,
    roughness: 0.78,
    metalness: 0.02,
  }),
  saddleLeather: new THREE.MeshStandardMaterial({
    color: 0x5c2b1b,
    roughness: 0.55,
    metalness: 0.15,
  }),
};

export function enableShadows(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = !child.userData?.noCastShadow;
      child.receiveShadow = !child.userData?.noReceiveShadow;
    }
  });
}

// Helper to merge meshes sharing the same material inside a temporary group -> slashes mobile draw calls by 70%+
function bakeMergedGroup(sourceGroup: THREE.Group): THREE.Group {
  sourceGroup.updateMatrixWorld(true);
  const buckets = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; noCast: boolean }>();

  sourceGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && !Array.isArray(child.material)) {
      const geo = child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone();
      geo.applyMatrix4(child.matrixWorld);
      if (!geo.attributes.uv) {
        const count = geo.attributes.position.count;
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      }
      const existing = buckets.get(child.material);
      if (existing) {
        existing.geos.push(geo);
      } else {
        buckets.set(child.material, { geos: [geo], noCast: !!child.userData?.noCastShadow });
      }
    }
  });

  const baked = new THREE.Group();
  buckets.forEach(({ geos, noCast }, mat) => {
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (geos.length > 1) {
      geos.forEach((g) => g.dispose());
    }
    if (merged) {
      const mesh = new THREE.Mesh(merged, mat);
      if (noCast) mesh.userData.noCastShadow = true;
      baked.add(mesh);
    }
  });
  return baked;
}

const sharedMaterialSet = new Set<THREE.Material>(Object.values(materials));

/**
 * Safely disposes uniquely allocated BufferGeometries and explicitly disposable
 * Materials within a Three.js subtree, while preserving module-level shared
 * cached geometries and shared material singletons.
 */
export function disposeObjectTree(root: THREE.Object3D): void {
  const disposedGeos = new Set<THREE.BufferGeometry>();
  const disposedMats = new Set<THREE.Material>();

  root.traverse((child) => {
    if (
      child instanceof THREE.Mesh ||
      child instanceof THREE.Line ||
      child instanceof THREE.Points
    ) {
      const geo = child.geometry;
      if (geo && !geo.userData?.isSharedCachedGeometry && !disposedGeos.has(geo)) {
        disposedGeos.add(geo);
        geo.dispose();
      }

      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (
          mat &&
          !sharedMaterialSet.has(mat) &&
          mat.userData?.isDisposableMaterial &&
          !disposedMats.has(mat)
        ) {
          disposedMats.add(mat);
          mat.dispose();
        }
      });
    }
  });
}

// Lightweight geometry cache for repeated rounded boxes
const roundedBoxCache = new Map<string, THREE.BufferGeometry>();

export function getRoundedBoxGeo(
  width: number,
  height: number,
  depth: number,
  radius = 0.06,
  bevel = 0.025
): THREE.BufferGeometry {
  const r = Math.min(radius, width * 0.42, depth * 0.42);
  const b = Math.min(bevel, height * 0.35, r * 0.8);
  const key = `${width.toFixed(3)}_${height.toFixed(3)}_${depth.toFixed(3)}_${r.toFixed(3)}_${b.toFixed(3)}`;
  const cached = roundedBoxCache.get(key);
  if (cached) return cached;

  const w = Math.max(0.02, width - b * 2);
  const d = Math.max(0.02, depth - b * 2);
  const h = Math.max(0.01, height - b * 2);
  const hw = w / 2;
  const hd = d / 2;
  const cr = Math.min(r, hw * 0.9, hd * 0.9);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + cr, -hd);
  shape.lineTo(hw - cr, -hd);
  shape.absarc(hw - cr, -hd + cr, cr, -Math.PI / 2, 0, false);
  shape.lineTo(hw, hd - cr);
  shape.absarc(hw - cr, hd - cr, cr, 0, Math.PI / 2, false);
  shape.lineTo(-hw + cr, hd);
  shape.absarc(-hw + cr, hd - cr, cr, Math.PI / 2, Math.PI, false);
  shape.lineTo(-hw, -hd + cr);
  shape.absarc(-hw + cr, -hd + cr, cr, Math.PI, Math.PI * 1.5, false);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h,
    bevelEnabled: b > 0.002,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 1,
    curveSegments: 2,
    steps: 1,
  });
  geo.rotateX(Math.PI / 2);
  geo.center();
  geo.userData.isSharedCachedGeometry = true;
  roundedBoxCache.set(key, geo);
  return geo;
}

// Sculpted Prancing Carousel Horse (baked by material into 4 draw calls for mobile performance!)
export function createSculptedCarouselHorse(
  coatMat: THREE.Material,
  saddleMat: THREE.Material,
  trimMat: THREE.Material = materials.goldAccent,
  scale = 1
): THREE.Group {
  const horse = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.34, 3, 7), coatMat);
  torso.rotation.z = Math.PI / 2 + 0.08;
  torso.position.set(0, 0.02, 0);
  horse.add(torso);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.155, 7, 6), coatMat);
  chest.position.set(0.16, 0.04, 0);
  const rump = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), coatMat);
  rump.position.set(-0.18, 0.01, 0);
  horse.add(chest, rump);

  const saddle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.158, 0.162, 0.22, 8, 1, false, -Math.PI * 0.65, Math.PI * 1.3),
    saddleMat
  );
  saddle.rotation.z = Math.PI / 2;
  saddle.rotation.x = Math.PI / 2;
  saddle.position.set(-0.01, 0.04, 0);
  horse.add(saddle);

  const pommel = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 4, 7, Math.PI), trimMat);
  pommel.rotation.y = Math.PI / 2;
  pommel.position.set(0.08, 0.15, 0);
  horse.add(pommel);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.12, 0.32, 7), coatMat);
  neck.position.set(0.25, 0.21, 0);
  neck.rotation.z = -0.52;
  const mane = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.22, 2, 5), trimMat);
  mane.position.set(0.19, 0.24, 0);
  mane.rotation.z = -0.55;
  horse.add(neck, mane);

  const headGroup = new THREE.Group();
  headGroup.position.set(0.35, 0.34, 0);
  headGroup.rotation.z = -0.35;

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.082, 7, 6), coatMat);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.068, 0.18, 7), coatMat);
  muzzle.rotation.z = -Math.PI / 2 - 0.15;
  muzzle.position.set(0.1, -0.03, 0);
  headGroup.add(cranium, muzzle);

  const earGeo = new THREE.ConeGeometry(0.022, 0.07, 5);
  const earL = new THREE.Mesh(earGeo, coatMat);
  earL.position.set(-0.01, 0.09, 0.04);
  earL.rotation.z = -0.2;
  const earR = new THREE.Mesh(earGeo, coatMat);
  earR.position.set(-0.01, 0.09, -0.04);
  earR.rotation.z = -0.2;
  headGroup.add(earL, earR);

  const eyeGeo = new THREE.SphereGeometry(0.014, 5, 4);
  const eyeL = new THREE.Mesh(eyeGeo, materials.coal);
  eyeL.position.set(0.04, 0.02, 0.065);
  const eyeR = new THREE.Mesh(eyeGeo, materials.coal);
  eyeR.position.set(0.04, 0.02, -0.065);
  headGroup.add(eyeL, eyeR);

  const bridle = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.01, 4, 7), trimMat);
  bridle.rotation.y = Math.PI / 2;
  bridle.position.set(0.13, -0.04, 0);
  headGroup.add(bridle);
  horse.add(headGroup);

  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.24, 2, 5), trimMat);
  tail.position.set(-0.34, -0.02, 0);
  tail.rotation.z = -0.65;
  horse.add(tail);

  const legGeo = new THREE.CylinderGeometry(0.032, 0.024, 0.24, 5);
  const hoofGeo = new THREE.CylinderGeometry(0.026, 0.03, 0.045, 5);
  [
    [0.17, -0.06, 0.08, 0.65],
    [0.15, -0.07, -0.08, 0.32],
    [-0.18, -0.06, 0.08, -0.45],
    [-0.2, -0.07, -0.08, -0.25],
  ].forEach(([x, y, z, rotZ]) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(x, y, z);
    legPivot.rotation.z = rotZ;
    const leg = new THREE.Mesh(legGeo, coatMat);
    leg.position.y = -0.11;
    const hoof = new THREE.Mesh(hoofGeo, trimMat);
    hoof.position.y = -0.24;
    legPivot.add(leg, hoof);
    horse.add(legPivot);
  });

  const baked = bakeMergedGroup(horse);
  baked.scale.setScalar(scale);
  return baked;
}

// Sculpted Reindeer Figure (baked by material into 5 draw calls for mobile performance!)
export function createSculptedReindeerFigure(options?: {
  coatMat?: THREE.Material;
  antlerMat?: THREE.Material;
  noseMat?: THREE.Material;
  collarMat?: THREE.Material;
  grounded?: boolean;
  scale?: number;
}): THREE.Group {
  const coatMat = options?.coatMat ?? materials.reindeerCoat;
  const antlerMat = options?.antlerMat ?? materials.goldAccent;
  const noseMat = options?.noseMat ?? materials.baubleRuby;
  const collarMat = options?.collarMat ?? materials.holidayRed;
  const grounded = options?.grounded ?? true;
  const scale = options?.scale ?? 1;

  const deer = new THREE.Group();
  const yOffset = grounded ? 0 : -1.05;

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.62, 4, 8), coatMat);
  torso.rotation.z = Math.PI / 2;
  torso.position.set(0, 1.05 + yOffset, 0);
  deer.add(torso);

  const chestRuff = new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 6), materials.reindeerBelly);
  chestRuff.scale.set(0.95, 1.05, 0.92);
  chestRuff.position.set(0.32, 1.06 + yOffset, 0);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), materials.reindeerBelly);
  tail.rotation.z = 0.8;
  tail.position.set(-0.46, 1.2 + yOffset, 0);
  deer.add(chestRuff, tail);

  const upperLegGeo = new THREE.CylinderGeometry(0.065, 0.048, 0.5, 6);
  const lowerLegGeo = new THREE.CylinderGeometry(0.045, 0.036, 0.45, 6);
  const hoofGeo = new THREE.CylinderGeometry(0.04, 0.048, 0.09, 6);
  [
    { x: 0.3, z: 0.14, tilt: grounded ? 0.05 : 0.45 },
    { x: 0.3, z: -0.14, tilt: grounded ? -0.04 : 0.25 },
    { x: -0.32, z: 0.14, tilt: grounded ? -0.05 : -0.4 },
    { x: -0.32, z: -0.14, tilt: grounded ? 0.04 : -0.2 },
  ].forEach(({ x, z, tilt }) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(x, 0.95 + yOffset, z);
    legGroup.rotation.z = tilt;

    const up = new THREE.Mesh(upperLegGeo, coatMat);
    up.position.y = -0.25;
    const low = new THREE.Mesh(lowerLegGeo, coatMat);
    low.position.y = -0.68;
    const hoof = new THREE.Mesh(hoofGeo, materials.coal);
    hoof.position.y = -0.905;
    legGroup.add(up, low, hoof);
    deer.add(legGroup);
  });

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.19, 0.62, 7), coatMat);
  neck.rotation.z = -0.45;
  neck.position.set(0.46, 1.42 + yOffset, 0);
  deer.add(neck);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 5, 10), collarMat);
  collar.rotation.y = Math.PI / 2;
  collar.rotation.x = -0.35;
  collar.position.set(0.41, 1.32 + yOffset, 0);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), materials.goldAccent);
  bell.position.set(0.55, 1.18 + yOffset, 0);
  deer.add(collar, bell);

  const headGroup = new THREE.Group();
  headGroup.position.set(0.65, 1.72 + yOffset, 0);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.155, 8, 7), coatMat);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.125, 0.3, 7), coatMat);
  snout.rotation.z = -Math.PI / 2 - 0.15;
  snout.position.set(0.19, -0.04, 0);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), noseMat);
  nose.position.set(0.35, -0.06, 0);
  headGroup.add(cranium, snout, nose);

  const eyeGeo = new THREE.SphereGeometry(0.024, 5, 4);
  const eyeL = new THREE.Mesh(eyeGeo, materials.coal);
  eyeL.position.set(0.09, 0.04, 0.125);
  const eyeR = new THREE.Mesh(eyeGeo, materials.coal);
  eyeR.position.set(0.09, 0.04, -0.125);
  headGroup.add(eyeL, eyeR);

  const earGeo = new THREE.ConeGeometry(0.045, 0.16, 5);
  const earL = new THREE.Mesh(earGeo, coatMat);
  earL.position.set(-0.04, 0.1, 0.15);
  earL.rotation.set(0.9, 0, 0.3);
  const earR = new THREE.Mesh(earGeo, coatMat);
  earR.position.set(-0.04, 0.1, -0.15);
  earR.rotation.set(-0.9, 0, 0.3);
  headGroup.add(earL, earR);

  [-1, 1].forEach((side) => {
    const antlerSide = new THREE.Group();
    antlerSide.position.set(-0.02, 0.12, side * 0.07);
    antlerSide.rotation.set(side * -0.32, 0, 0.2);

    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.56, 5), antlerMat);
    beam.position.y = 0.26;
    const tine1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.22, 5), antlerMat);
    tine1.position.set(0.07, 0.22, 0);
    tine1.rotation.z = -0.75;
    const tine2 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.018, 0.2, 5), antlerMat);
    tine2.position.set(0.06, 0.4, 0);
    tine2.rotation.z = -0.6;
    antlerSide.add(beam, tine1, tine2);
    headGroup.add(antlerSide);
  });

  deer.add(headGroup);
  const baked = bakeMergedGroup(deer);
  baked.scale.setScalar(scale);
  return baked;
}

// Streamlined Roller Coaster Car (baked by material for lean draw calls)
export function createCoasterCar(
  bodyMat: THREE.Material,
  trimMat: THREE.Material = materials.goldAccent,
  hasHeadlight = true
): THREE.Group {
  const car = new THREE.Group();

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.12, 0.5), materials.streetLampMetal);
  chassis.position.y = -0.06;
  car.add(chassis);

  const hull = new THREE.Mesh(getRoundedBoxGeo(0.92, 0.32, 0.6, 0.16, 0.03), bodyMat);
  hull.position.y = 0.12;
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.27, 9, 7), bodyMat);
  nose.scale.set(1.25, 0.62, 0.98);
  nose.position.set(0.45, 0.12, 0);
  car.add(hull, nose);

  const stripe = new THREE.Mesh(getRoundedBoxGeo(0.96, 0.06, 0.64, 0.15, 0.012), trimMat);
  stripe.position.y = 0.14;
  car.add(stripe);

  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.42), materials.rubberDark);
  cockpit.position.set(-0.04, 0.24, 0);
  car.add(cockpit);

  const seatL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), materials.crimsonVelvet);
  seatL.position.set(-0.22, 0.34, 0.12);
  const seatR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), materials.crimsonVelvet);
  seatR.position.set(-0.22, 0.34, -0.12);
  car.add(seatL, seatR);

  const safetyBar = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 5, 8, Math.PI), materials.chromeSteel);
  safetyBar.rotation.y = Math.PI / 2;
  safetyBar.position.set(0.05, 0.31, 0);
  car.add(safetyBar);

  if (hasHeadlight) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), materials.starEmissive);
    lamp.position.set(0.75, 0.14, 0);
    car.add(lamp);
  }

  return bakeMergedGroup(car);
}

// Contoured Fairground Bumper Car
export function createBumperCar(shellMat: THREE.Material, accentMat: THREE.Material = materials.goldAccent): THREE.Group {
  const car = new THREE.Group();

  const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 7, 14), materials.rubberDark);
  bumper.rotation.x = Math.PI / 2;
  bumper.scale.set(1.22, 0.92, 1.0);
  bumper.position.y = 0.11;
  car.add(bumper);

  const hull = new THREE.Mesh(getRoundedBoxGeo(0.86, 0.26, 0.62, 0.26, 0.04), shellMat);
  hull.position.y = 0.22;
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.26, 9, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), shellMat);
  hood.scale.set(1.1, 0.65, 1.0);
  hood.position.set(0.2, 0.26, 0);
  car.add(hull, hood);

  const seat = new THREE.Mesh(getRoundedBoxGeo(0.32, 0.22, 0.4, 0.07, 0.02), materials.creamEnamel);
  seat.position.set(-0.18, 0.35, 0);
  car.add(seat);

  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.22, 5), materials.chromeSteel);
  col.position.set(0.12, 0.36, 0);
  col.rotation.z = 0.45;
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.015, 5, 8), materials.coal);
  wheel.position.set(0.06, 0.45, 0);
  wheel.rotation.y = Math.PI / 2;
  wheel.rotation.x = 0.45;
  car.add(col, wheel);

  const lampL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), materials.emissiveWindow);
  lampL.position.set(0.45, 0.24, 0.15);
  const lampR = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), materials.emissiveWindow);
  lampR.position.set(0.45, 0.24, -0.15);
  car.add(lampL, lampR);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 1.45, 5), materials.chromeSteel);
  pole.position.set(-0.36, 0.96, 0);
  pole.rotation.z = 0.1;
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), accentMat === materials.goldAccent ? materials.starEmissive : accentMat);
  spark.position.set(-0.43, 1.68, 0);
  car.add(pole, spark);

  return bakeMergedGroup(car);
}

// Victorian Rounded Gondola Cabin for Ferris Wheel (baked by material for lean draw calls)
export function createFerrisGondola(cabinMat: THREE.Material): THREE.Group {
  const gondola = new THREE.Group();

  const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 5), materials.goldAccent);
  hanger.position.y = -0.19;
  const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.028, 5, 10, Math.PI), materials.goldAccent);
  yoke.position.y = -0.58;
  gondola.add(hanger, yoke);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.34, 9), cabinMat);
  roof.position.y = -0.44;
  const roofSnow = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.16, 9), materials.snow);
  roofSnow.position.y = -0.34;
  gondola.add(roof, roofSnow);

  const strutGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.42, 5);
  for (let s = 0; s < 4; s++) {
    const ang = (s / 4) * Math.PI * 2 + Math.PI / 4;
    const strut = new THREE.Mesh(strutGeo, materials.brass);
    strut.position.set(Math.cos(ang) * 0.36, -0.78, Math.sin(ang) * 0.36);
    gondola.add(strut);
  }

  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.32, 8), materials.emissiveWindow);
  glow.position.y = -0.76;
  const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.34, 0.4, 9), cabinMat);
  tub.position.y = -1.04;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.03, 5, 10), materials.goldAccent);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.84;
  gondola.add(glow, tub, rim);

  return bakeMergedGroup(gondola);
}

// Sculpted Curved Sleigh Body + Curled Runners
export function createCurvedSleighGroup(
  bodyMat: THREE.Material = materials.holidayRed,
  runnerMat: THREE.Material = materials.goldAccent,
  cushionMat: THREE.Material = materials.emeraldVelvet
): THREE.Group {
  const sleigh = new THREE.Group();

  const runnerCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.88, 0.18, 0),
    new THREE.Vector3(-0.75, 0.06, 0),
    new THREE.Vector3(0.55, 0.06, 0),
    new THREE.Vector3(0.95, 0.24, 0),
    new THREE.Vector3(1.02, 0.46, 0),
    new THREE.Vector3(0.84, 0.52, 0),
  ]);
  const runnerGeo = new THREE.TubeGeometry(runnerCurve, 14, 0.036, 5, false);

  [-0.42, 0.42].forEach((zPos) => {
    const runner = new THREE.Mesh(runnerGeo, runnerMat);
    runner.position.z = zPos;
    sleigh.add(runner);

    [-0.45, 0.45].forEach((xPos) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.28, 5), runnerMat);
      strut.position.set(xPos, 0.2, zPos);
      sleigh.add(strut);
    });
  });

  const sideShape = new THREE.Shape();
  sideShape.moveTo(-0.78, 0.3);
  sideShape.lineTo(0.7, 0.3);
  sideShape.quadraticCurveTo(0.92, 0.58, 0.72, 0.85);
  sideShape.quadraticCurveTo(0.45, 0.72, 0.2, 0.65);
  sideShape.quadraticCurveTo(-0.25, 0.68, -0.58, 1.05);
  sideShape.quadraticCurveTo(-0.85, 0.95, -0.78, 0.3);

  const sideGeo = new THREE.ExtrudeGeometry(sideShape, {
    depth: 0.78,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 1,
    curveSegments: 5,
  });
  sideGeo.translate(0, 0, -0.39);
  const hull = new THREE.Mesh(sideGeo, bodyMat);
  sleigh.add(hull);

  const trimBar = new THREE.Mesh(getRoundedBoxGeo(1.5, 0.06, 0.88, 0.08, 0.015), runnerMat);
  trimBar.position.set(0, 0.64, 0);
  sleigh.add(trimBar);

  const seat = new THREE.Mesh(getRoundedBoxGeo(0.55, 0.22, 0.72, 0.08, 0.02), cushionMat);
  seat.position.set(-0.18, 0.56, 0);
  const back = new THREE.Mesh(getRoundedBoxGeo(0.2, 0.48, 0.72, 0.08, 0.02), cushionMat);
  back.position.set(-0.5, 0.82, 0);
  back.rotation.z = 0.16;
  sleigh.add(seat, back);

  const sack = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 7), materials.baubleGold);
  sack.scale.set(0.9, 1.15, 1.1);
  sack.position.set(-0.42, 0.88, 0.15);
  sleigh.add(sack);

  return bakeMergedGroup(sleigh);
}
