import * as THREE from 'three';
import { LandscapeType } from '../../features/world/worldTypes';
import { createChristmasTree, createChristmasHouse, createStreetLamp } from '../assets/proceduralModels';

const materials = {
  snowGround: new THREE.MeshStandardMaterial({
    color: 0xf5f9fd,
    roughness: 0.92,
    metalness: 0.02,
  }),
  snowBank: new THREE.MeshStandardMaterial({
    color: 0xebf3fa,
    roughness: 0.95,
    metalness: 0.02,
  }),
  mountainRock: new THREE.MeshStandardMaterial({
    color: 0x485263,
    roughness: 0.95,
    metalness: 0.1,
  }),
  mountainPeak: new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.93,
    metalness: 0.04,
  }),
  frozenIce: new THREE.MeshStandardMaterial({
    color: 0x78b8e0,
    roughness: 0.15,
    metalness: 0.6,
  }),
  woodBridge: new THREE.MeshStandardMaterial({
    color: 0x5a361c,
    roughness: 0.85,
    metalness: 0.05,
  }),
  cityFacade1: new THREE.MeshStandardMaterial({
    color: 0x222a36,
    roughness: 0.7,
    metalness: 0.3,
  }),
  cityFacade2: new THREE.MeshStandardMaterial({
    color: 0x2e3b4d,
    roughness: 0.6,
    metalness: 0.4,
  }),
  cityWindowsLit: new THREE.MeshStandardMaterial({
    color: 0xffdf80,
    emissive: 0xffb833,
    emissiveIntensity: 1.5,
    roughness: 0.3,
    metalness: 0.2,
  }),
  cobblestonePath: new THREE.MeshStandardMaterial({
    color: 0x6e7885,
    roughness: 0.9,
    metalness: 0.05,
  }),
  wonderworldRail: new THREE.MeshStandardMaterial({
    color: 0xe5c783,
    roughness: 0.2,
    metalness: 0.85,
  }),
  wonderworldTrack: new THREE.MeshStandardMaterial({
    color: 0xd93838,
    roughness: 0.4,
    metalness: 0.6,
  }),
};

function enableShadows(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

// 1. Village Landscape
export function generateVillageLandscape(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Landscape_Village';

  // Winding stone path through village center
  const pathGeo = new THREE.PlaneGeometry(3.5, 26);
  pathGeo.rotateX(-Math.PI / 2);
  const path = new THREE.Mesh(pathGeo, materials.cobblestonePath);
  path.position.set(0, 0.015, 0);
  path.receiveShadow = true;
  group.add(path);

  // Cross path
  const crossPathGeo = new THREE.PlaneGeometry(16, 3);
  crossPathGeo.rotateX(-Math.PI / 2);
  const crossPath = new THREE.Mesh(crossPathGeo, materials.cobblestonePath);
  crossPath.position.set(0, 0.016, 2);
  crossPath.receiveShadow = true;
  group.add(crossPath);

  // Perimeter cozy scenery houses (non-deletable landscape architecture)
  const houseConfigs = [
    { pos: [-11, 0, -8], rot: 0.3, scale: 1.1 },
    { pos: [11, 0, -7], rot: -0.4, scale: 1.0 },
    { pos: [-12, 0, 7], rot: 0.8, scale: 0.95 },
    { pos: [10, 0, 8], rot: -0.7, scale: 1.05 },
    { pos: [0, 0, -12], rot: 0, scale: 1.2 },
  ];

  houseConfigs.forEach((cfg) => {
    const house = createChristmasHouse();
    house.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    house.rotation.y = cfg.rot;
    house.scale.setScalar(cfg.scale);
    group.add(house);
  });

  // Perimeter ambient pine groves
  const treePositions = [
    [-15, 0, -12], [-13, 0, -14], [-7, 0, -14], [7, 0, -13], [14, 0, -12],
    [-14, 0, 12], [-8, 0, 13], [8, 0, 13], [13, 0, 12], [15, 0, 2],
    [-15, 0, -2], [-14, 0, 3], [14, 0, -3]
  ];

  treePositions.forEach(([x, y, z]) => {
    const tree = createChristmasTree();
    tree.position.set(x, y, z);
    const s = 0.85 + Math.random() * 0.4;
    tree.scale.set(s, s * (0.9 + Math.random() * 0.2), s);
    tree.rotation.y = Math.random() * Math.PI * 2;
    group.add(tree);
  });

  // Perimeter Village Street Lamps
  const lampPositions = [
    [-3, 0, -6], [3, 0, -6],
    [-3, 0, 5], [3, 0, 5],
  ];
  lampPositions.forEach(([x, y, z]) => {
    const lamp = createStreetLamp();
    lamp.position.set(x, y, z);
    group.add(lamp);
  });

  // Soft perimeter snowbanks
  createPerimeterSnowbanks(group);

  enableShadows(group);
  return group;
}

function createNaturalMountainGeometry(
  radius: number,
  height: number,
  seed: number,
  leanX: number,
  leanZ: number
): THREE.BufferGeometry {
  const geo = new THREE.ConeGeometry(radius, height, 16, 6, true);
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const count = posAttr.count;
  const colors = new Float32Array(count * 3);

  const rockDark = new THREE.Color(0x434d5e);
  const rockMid = new THREE.Color(0x5b687c);
  const snowCol = new THREE.Color(0xf0f6fc);
  const tmpColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);

    const t = THREE.MathUtils.clamp((vy + height / 2) / height, 0, 1);
    const origR = Math.hypot(vx, vz);
    const theta = Math.atan2(vz, vx);

    // Soften summit profile and embed base slightly into ground
    const softT = t > 0.82 ? t - (t - 0.82) * 0.32 : t;
    const leanFactor = Math.pow(t, 1.15);

    if (origR > 1e-4) {
      const shoulderProfile = 1 + 0.22 * Math.sin(t * Math.PI) * (1 - t * 0.35);
      const radialNoise =
        1 +
        0.2 * Math.sin(theta * 2 + seed) +
        0.13 * Math.cos(theta * 3 - seed * 1.4 + t * 2.0) +
        0.07 * Math.sin(theta * 5 + seed * 0.6);

      const newR = origR * shoulderProfile * radialNoise;
      const ridgeHeightOffset =
        height *
        0.08 *
        Math.sin(t * Math.PI) *
        (0.6 * Math.sin(theta * 2 + seed * 1.1) + 0.4 * Math.cos(theta * 3 - seed * 0.7));

      const newX = Math.cos(theta) * newR + leanX * leanFactor;
      const newZ = Math.sin(theta) * newR + leanZ * leanFactor;
      const newY = (softT - 0.5) * height + ridgeHeightOffset - (t < 0.02 ? 0.15 : 0);

      posAttr.setXYZ(i, newX, newY, newZ);
    } else {
      // Watertight apex vertex
      posAttr.setXYZ(i, leanX, (softT - 0.5) * height, leanZ);
    }

    // Natural undulating alpine snowline + snowy foothills
    const snowLine =
      0.53 +
      0.11 * Math.sin(theta * 3 + seed * 1.3) +
      0.07 * Math.cos(theta * 2 - seed * 0.9);
    const upperSnow = THREE.MathUtils.smoothstep(t, snowLine - 0.15, snowLine + 0.08);
    const baseSnow = 1 - THREE.MathUtils.smoothstep(t, 0.02, 0.22);
    const snowFactor = Math.max(upperSnow, baseSnow * 0.85);
    const rockMix = 0.5 + 0.5 * Math.sin(theta * 2 + seed + t * 2.0);

    tmpColor.copy(rockDark).lerp(rockMid, rockMix).lerp(snowCol, snowFactor);
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  posAttr.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// 2. Mountain Landscape
export function generateMountainLandscape(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Landscape_Mountain';

  // Scenic Alpine Peaks in background (softer irregular shapes, moderate height)
  const peakConfigs = [
    // Back ridge
    { pos: [-18, 0, -22], r: 10.5, h: 14.5, seed: 1.2, leanX: 1.4, leanZ: -0.8 },
    { pos: [-6, 0, -24], r: 12.5, h: 17.5, seed: 2.7, leanX: -1.6, leanZ: 0.9 },
    { pos: [8, 0, -23], r: 11.5, h: 16.0, seed: 4.1, leanX: 1.2, leanZ: 0.7 },
    { pos: [20, 0, -21], r: 9.8, h: 13.0, seed: 5.5, leanX: -1.1, leanZ: -0.6 },
    // Left ridge
    { pos: [-24, 0, -8], r: 10.5, h: 12.5, seed: 3.3, leanX: -0.9, leanZ: 1.3 },
    { pos: [-23, 0, 6], r: 11.2, h: 13.8, seed: 6.2, leanX: 0.8, leanZ: -1.2 },
    { pos: [-22, 0, 18], r: 9.5, h: 11.0, seed: 0.9, leanX: -0.7, leanZ: -1.0 },
    // Right ridge
    { pos: [23, 0, -6], r: 10.5, h: 13.0, seed: 4.8, leanX: 0.9, leanZ: 1.1 },
    { pos: [24, 0, 8], r: 11.2, h: 14.2, seed: 1.9, leanX: -1.0, leanZ: -1.3 },
    { pos: [21, 0, 18], r: 9.5, h: 11.5, seed: 7.1, leanX: 0.8, leanZ: -0.9 },
  ];

  peakConfigs.forEach((p) => {
    const mountainGeo = createNaturalMountainGeometry(p.r, p.h, p.seed, p.leanX, p.leanZ);
    const mountain = new THREE.Mesh(mountainGeo, materials.mountainPeak);
    mountain.position.set(p.pos[0], p.h / 2, p.pos[2]);
    group.add(mountain);
  });

  // Alpine Shelf Pine Clusters
  const alpineTrees = [
    [-12, 0, -10], [-10, 0, -12], [-14, 0, -6], [-9, 0, -8],
    [11, 0, -9], [13, 0, -11], [10, 0, -13], [14, 0, -5],
    [-11, 0, 11], [-13, 0, 9], [11, 0, 10], [13, 0, 8],
    [-6, 0, 13], [6, 0, 13], [0, 0, -14]
  ];

  alpineTrees.forEach(([x, y, z]) => {
    const tree = createChristmasTree();
    tree.position.set(x, y, z);
    const s = 0.9 + Math.random() * 0.5;
    tree.scale.set(s, s * 1.1, s);
    group.add(tree);
  });

  // Mountain Chalet at base of mountain
  const cabin = createChristmasHouse();
  cabin.position.set(-8, 0, -7);
  cabin.rotation.y = 0.4;
  group.add(cabin);

  createPerimeterSnowbanks(group);
  enableShadows(group);
  return group;
}

// 3. River Landscape
export function generateRiverLandscape(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Landscape_River';

  // Frozen crystal blue river channel cutting diagonally
  const riverGeo = new THREE.PlaneGeometry(7.5, 36);
  riverGeo.rotateX(-Math.PI / 2);
  riverGeo.rotateY(Math.PI / 6);
  const river = new THREE.Mesh(riverGeo, materials.frozenIce);
  river.position.set(0, 0.02, 0);
  river.receiveShadow = true;
  group.add(river);

  // Wooden Bridge crossing the frozen river
  const bridge = new THREE.Group();
  bridge.name = 'WoodenBridge';

  // Bridge deck
  const deckGeo = new THREE.BoxGeometry(3.6, 0.25, 9.5);
  const deck = new THREE.Mesh(deckGeo, materials.woodBridge);
  deck.position.y = 0.45;
  bridge.add(deck);

  // Deck snow cap
  const deckSnowGeo = new THREE.BoxGeometry(3.6, 0.08, 9.5);
  const deckSnow = new THREE.Mesh(deckSnowGeo, materials.snowGround);
  deckSnow.position.y = 0.6;
  bridge.add(deckSnow);

  // Bridge railings
  const railGeo = new THREE.BoxGeometry(0.12, 0.7, 9.5);
  const railL = new THREE.Mesh(railGeo, materials.woodBridge);
  railL.position.set(-1.7, 0.85, 0);
  const railR = new THREE.Mesh(railGeo, materials.woodBridge);
  railR.position.set(1.7, 0.85, 0);
  bridge.add(railL);
  bridge.add(railR);

  // Lanterns on bridge corners
  const lamp1 = createStreetLamp();
  lamp1.position.set(-1.7, 0.5, -4.2);
  lamp1.scale.setScalar(0.75);
  const lamp2 = createStreetLamp();
  lamp2.position.set(1.7, 0.5, 4.2);
  lamp2.scale.setScalar(0.75);
  bridge.add(lamp1);
  bridge.add(lamp2);

  bridge.position.set(0, 0, 0);
  bridge.rotation.y = -Math.PI / 3;
  group.add(bridge);

  // Riverside fisherman cottage
  const riversideCabin = createChristmasHouse();
  riversideCabin.position.set(8, 0, -6);
  riversideCabin.rotation.y = -0.5;
  group.add(riversideCabin);

  // Pine trees lining the river banks
  const bankTrees = [
    [-8, 0, -10], [-6, 0, -12], [-10, 0, -4],
    [-7, 0, 7], [-9, 0, 11], [-5, 0, 13],
    [9, 0, -11], [12, 0, -8], [7, 0, 4],
    [9, 0, 9], [6, 0, 12], [11, 0, 11]
  ];

  bankTrees.forEach(([x, y, z]) => {
    const tree = createChristmasTree();
    tree.position.set(x, y, z);
    const s = 0.85 + Math.random() * 0.4;
    tree.scale.set(s, s * 1.05, s);
    group.add(tree);
  });

  createPerimeterSnowbanks(group);
  enableShadows(group);
  return group;
}

// 4. City Landscape
export function generateCityLandscape(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Landscape_City';

  // Snowy Central Plaza / Grid Avenues
  const plazaGeo = new THREE.PlaneGeometry(14, 14);
  plazaGeo.rotateX(-Math.PI / 2);
  const plaza = new THREE.Mesh(plazaGeo, materials.cobblestonePath);
  plaza.position.set(0, 0.015, 0);
  plaza.receiveShadow = true;
  group.add(plaza);

  // Background Urban Skyline Buildings (varied heights and lit window matrices)
  const buildings = [
    // North row
    { pos: [-12, 0, -13], w: 5, h: 10, d: 5, mat: materials.cityFacade1 },
    { pos: [-6, 0, -14], w: 5, h: 14, d: 5, mat: materials.cityFacade2 },
    { pos: [0, 0, -15], w: 6, h: 18, d: 6, mat: materials.cityFacade1 }, // Skyscraper
    { pos: [7, 0, -14], w: 5, h: 12, d: 5, mat: materials.cityFacade2 },
    { pos: [13, 0, -13], w: 5, h: 8, d: 5, mat: materials.cityFacade1 },
    // West row
    { pos: [-14, 0, -5], w: 5, h: 11, d: 5, mat: materials.cityFacade2 },
    { pos: [-14, 0, 2], w: 5, h: 9, d: 5, mat: materials.cityFacade1 },
    { pos: [-13, 0, 9], w: 5, h: 7, d: 5, mat: materials.cityFacade2 },
    // East row
    { pos: [14, 0, -5], w: 5, h: 12, d: 5, mat: materials.cityFacade2 },
    { pos: [14, 0, 2], w: 5, h: 8, d: 5, mat: materials.cityFacade1 },
    { pos: [13, 0, 9], w: 5, h: 11, d: 5, mat: materials.cityFacade2 },
  ];

  buildings.forEach((b) => {
    const bGroup = new THREE.Group();

    // Main tower block
    const blockGeo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const block = new THREE.Mesh(blockGeo, b.mat);
    block.position.y = b.h / 2;
    bGroup.add(block);

    // Roof snow cap
    const roofSnowGeo = new THREE.BoxGeometry(b.w + 0.1, 0.4, b.d + 0.1);
    const roofSnow = new THREE.Mesh(roofSnowGeo, materials.snowGround);
    roofSnow.position.y = b.h + 0.2;
    bGroup.add(roofSnow);

    // Rooftop antenna for skyscraper
    if (b.h >= 14) {
      const antennaGeo = new THREE.CylinderGeometry(0.06, 0.1, 3.5, 6);
      const antenna = new THREE.Mesh(antennaGeo, materials.cobblestonePath);
      antenna.position.y = b.h + 2.0;
      bGroup.add(antenna);
    }

    // Grid of illuminated windows on visible front face
    const winGeo = new THREE.PlaneGeometry(0.5, 0.6);
    const floors = Math.floor(b.h / 1.5) - 1;
    const cols = Math.floor(b.w / 1.2);

    for (let f = 1; f <= floors; f++) {
      for (let c = 0; c < cols; c++) {
        // randomly light ~70% of windows for a bustling city look
        if (Math.random() > 0.3) {
          const win = new THREE.Mesh(winGeo, materials.cityWindowsLit);
          const xOffset = -((cols - 1) * 1.0) / 2 + c * 1.0;
          win.position.set(xOffset, f * 1.4, b.d / 2 + 0.02);
          bGroup.add(win);
        }
      }
    }

    bGroup.position.set(b.pos[0], 0, b.pos[2]);
    group.add(bGroup);
  });

  // Plaza perimeter street lights
  const plazaLamps = [
    [-6, 0, -6], [6, 0, -6],
    [-6, 0, 6], [6, 0, 6]
  ];
  plazaLamps.forEach(([x, y, z]) => {
    const lamp = createStreetLamp();
    lamp.position.set(x, y, z);
    group.add(lamp);
  });

  createPerimeterSnowbanks(group);
  enableShadows(group);
  return group;
}

// Perimeter Snowbanks helper to bound the snowy arena naturally
function createPerimeterSnowbanks(parentGroup: THREE.Group) {
  const bankCount = 18;
  const radius = 17;
  const bankGeo = new THREE.SphereGeometry(3.5, 8, 6);
  bankGeo.scale(1.8, 0.45, 1.2);

  for (let i = 0; i < bankCount; i++) {
    const angle = (i / bankCount) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const bank = new THREE.Mesh(bankGeo, materials.snowBank);
    bank.position.set(x, 0.3, z);
    bank.rotation.y = angle + Math.PI / 2;
    bank.receiveShadow = true;
    parentGroup.add(bank);
  }
}

// 5. Wonderworld Landscape (London Winter Wonderland Fairground)
export function generateWonderworldLandscape(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Landscape_Wonderworld';

  // Central Ice Rink Arena
  const rinkGeo = new THREE.CylinderGeometry(8.5, 8.5, 0.08, 32);
  const rink = new THREE.Mesh(rinkGeo, materials.frozenIce);
  rink.position.set(0, 0.04, 0);
  rink.receiveShadow = true;
  group.add(rink);

  // Gold Guard Railing around Ice Rink
  const railGeo = new THREE.TorusGeometry(8.6, 0.08, 8, 32);
  railGeo.rotateX(Math.PI / 2);
  const rail = new THREE.Mesh(railGeo, materials.wonderworldRail);
  rail.position.set(0, 0.35, 0);
  group.add(rail);

  // Fairground Cobblestone Pathways radiating out
  const pathGeo1 = new THREE.PlaneGeometry(5, 34);
  pathGeo1.rotateX(-Math.PI / 2);
  const path1 = new THREE.Mesh(pathGeo1, materials.cobblestonePath);
  path1.position.set(0, 0.015, 0);
  path1.receiveShadow = true;
  group.add(path1);

  const pathGeo2 = new THREE.PlaneGeometry(34, 5);
  pathGeo2.rotateX(-Math.PI / 2);
  const path2 = new THREE.Mesh(pathGeo2, materials.cobblestonePath);
  path2.position.set(0, 0.016, 0);
  path2.receiveShadow = true;
  group.add(path2);

  // Background Fairground Coaster Track Arches
  const archRadius = 16;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    if (angle > Math.PI * 0.3 && angle < Math.PI * 0.7) continue; // Leave south entrance open

    const x = Math.cos(angle) * archRadius;
    const z = Math.sin(angle) * archRadius;

    const pillarGeo = new THREE.CylinderGeometry(0.2, 0.25, 8, 8);
    const pillar = new THREE.Mesh(pillarGeo, materials.wonderworldTrack);
    pillar.position.set(x, 4, z);
    group.add(pillar);

    // Blinking fairground light on pillar top
    const bulbLight = new THREE.PointLight(
      i % 2 === 0 ? 0xffea42 : 0xff3838,
      1.2,
      8
    );
    bulbLight.position.set(x, 8.2, z);
    group.add(bulbLight);
  }

  // Perimeter Festive Pine Trees with Fairy Lights
  const treePositions = [
    [-14, 0, -12], [14, 0, -12], [-15, 0, 10], [15, 0, 10],
    [-11, 0, -15], [11, 0, -15], [-16, 0, -2], [16, 0, -2]
  ];
  treePositions.forEach(([x, y, z]) => {
    const tree = createChristmasTree();
    tree.position.set(x, y, z);
    tree.scale.set(1.1, 1.2, 1.1);
    group.add(tree);
  });

  createPerimeterSnowbanks(group);
  enableShadows(group);
  return group;
}

// Landscape generation dispatch
export function generateLandscape(type: LandscapeType): THREE.Group {
  switch (type) {
    case 'wonderworld':
      return generateWonderworldLandscape();
    case 'mountain':
      return generateMountainLandscape();
    case 'river':
      return generateRiverLandscape();
    case 'city':
      return generateCityLandscape();
    case 'village':
    default:
      return generateVillageLandscape();
  }
}
