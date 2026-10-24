import * as THREE from 'three';

// Shared materials cache for performance and memory reuse
const materials = {
  snow: new THREE.MeshStandardMaterial({
    color: 0xf2f7fc,
    roughness: 0.9,
    metalness: 0.05,
  }),
  pineFoliage: new THREE.MeshStandardMaterial({
    color: 0x1a4529,
    roughness: 0.75,
    metalness: 0.1,
  }),
  woodTrunk: new THREE.MeshStandardMaterial({
    color: 0x4a2e18,
    roughness: 0.9,
    metalness: 0.05,
  }),
  timberWall: new THREE.MeshStandardMaterial({
    color: 0x7a4b2c,
    roughness: 0.85,
    metalness: 0.05,
  }),
  stoneBase: new THREE.MeshStandardMaterial({
    color: 0x3d4349,
    roughness: 0.95,
    metalness: 0.1,
  }),
  roofTiles: new THREE.MeshStandardMaterial({
    color: 0x5a2929,
    roughness: 0.8,
    metalness: 0.1,
  }),
  emissiveWindow: new THREE.MeshStandardMaterial({
    color: 0xffe299,
    emissive: 0xffba42,
    emissiveIntensity: 1.8,
    roughness: 0.3,
    metalness: 0.1,
  }),
  starEmissive: new THREE.MeshStandardMaterial({
    color: 0xffea78,
    emissive: 0xffea42,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.4,
  }),
  streetLampMetal: new THREE.MeshStandardMaterial({
    color: 0x1f242b,
    roughness: 0.4,
    metalness: 0.85,
  }),
  goldAccent: new THREE.MeshStandardMaterial({
    color: 0xe5c783,
    roughness: 0.25,
    metalness: 0.9,
  }),
  holidayRed: new THREE.MeshStandardMaterial({
    color: 0xbf2626,
    roughness: 0.5,
    metalness: 0.2,
  }),
  holidayGreen: new THREE.MeshStandardMaterial({
    color: 0x1c5932,
    roughness: 0.5,
    metalness: 0.2,
  }),
  holidayBlue: new THREE.MeshStandardMaterial({
    color: 0x225588,
    roughness: 0.4,
    metalness: 0.4,
  }),
  baubleRuby: new THREE.MeshStandardMaterial({
    color: 0xdd2233,
    roughness: 0.15,
    metalness: 0.85,
  }),
  baubleGold: new THREE.MeshStandardMaterial({
    color: 0xf4ce6a,
    roughness: 0.15,
    metalness: 0.9,
  }),
  baubleCyan: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.85,
  }),
  coal: new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8,
    metalness: 0.1,
  }),
  carrot: new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.6,
    metalness: 0.05,
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.3,
    metalness: 0.8,
  }),
  gingerbread: new THREE.MeshStandardMaterial({
    color: 0x8b5328,
    roughness: 0.85,
    metalness: 0.05,
  }),
  whiteIcing: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.4,
    metalness: 0.1,
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

// 1. Christmas Tree
export function createChristmasTree(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ChristmasTree';

  // Trunk (bottom grounded at 0)
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.8, 10);
  const trunk = new THREE.Mesh(trunkGeo, materials.woodTrunk);
  trunk.position.y = 0.4;
  group.add(trunk);

  // 3-tier foliage
  const tiers = [
    { bottomR: 1.5, height: 1.4, y: 1.1 },
    { bottomR: 1.15, height: 1.2, y: 1.9 },
    { bottomR: 0.8, height: 1.0, y: 2.6 },
  ];

  tiers.forEach((t) => {
    const boughGeo = new THREE.ConeGeometry(t.bottomR, t.height, 10);
    const bough = new THREE.Mesh(boughGeo, materials.pineFoliage);
    bough.position.y = t.y;
    group.add(bough);

    // Snow fringe ring on bottom rim
    const snowCapGeo = new THREE.TorusGeometry(t.bottomR * 0.9, 0.06, 6, 12);
    snowCapGeo.rotateX(Math.PI / 2);
    const snowCap = new THREE.Mesh(snowCapGeo, materials.snow);
    snowCap.position.y = t.y - t.height * 0.45;
    group.add(snowCap);
  });

  // Star Topper
  const starGeo = new THREE.OctahedronGeometry(0.22, 0);
  const star = new THREE.Mesh(starGeo, materials.starEmissive);
  star.position.y = 3.25;
  star.rotation.y = Math.PI / 4;
  group.add(star);

  // Glowing Star Topper Point Light
  const starLight = new THREE.PointLight(0xffea78, 1.4, 7, 1.5);
  starLight.position.set(0, 3.25, 0);
  group.add(starLight);

  // Scattered shiny baubles
  const baubleMats = [materials.baubleRuby, materials.baubleGold, materials.baubleCyan];
  const baubleGeo = new THREE.SphereGeometry(0.09, 8, 8);
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + (i % 2) * 0.3;
    const tierIdx = i % 3;
    const radius = tiers[tierIdx].bottomR * 0.72;
    const yPos = tiers[tierIdx].y - 0.25 + (i % 2) * 0.15;

    const bauble = new THREE.Mesh(baubleGeo, baubleMats[i % 3]);
    bauble.position.set(Math.cos(angle) * radius, yPos, Math.sin(angle) * radius);
    group.add(bauble);
  }

  enableShadows(group);
  return group;
}

// 2. Christmas House
export function createChristmasHouse(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ChristmasHouse';

  // Stone base foundation
  const baseGeo = new THREE.BoxGeometry(2.6, 0.3, 2.6);
  const base = new THREE.Mesh(baseGeo, materials.stoneBase);
  base.position.y = 0.15;
  group.add(base);

  // Timber main walls
  const wallGeo = new THREE.BoxGeometry(2.4, 1.8, 2.4);
  const walls = new THREE.Mesh(wallGeo, materials.timberWall);
  walls.position.y = 1.2;
  group.add(walls);

  // Roof gable (prism)
  const roofGeo = new THREE.ConeGeometry(2.0, 1.3, 4);
  roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, materials.roofTiles);
  roof.position.y = 2.75;
  roof.scale.set(1.3, 1, 1.3);
  group.add(roof);

  // Snow cap on roof
  const snowCapGeo = new THREE.ConeGeometry(2.05, 1.3, 4);
  snowCapGeo.rotateY(Math.PI / 4);
  const snowCap = new THREE.Mesh(snowCapGeo, materials.snow);
  snowCap.position.y = 2.82;
  snowCap.scale.set(1.32, 1, 1.32);
  group.add(snowCap);

  // Brick Chimney
  const chimneyGeo = new THREE.BoxGeometry(0.35, 1.1, 0.35);
  const chimney = new THREE.Mesh(chimneyGeo, materials.roofTiles);
  chimney.position.set(0.65, 2.8, -0.4);
  group.add(chimney);

  const chimneySnowGeo = new THREE.BoxGeometry(0.42, 0.12, 0.42);
  const chimneySnow = new THREE.Mesh(chimneySnowGeo, materials.snow);
  chimneySnow.position.set(0.65, 3.4, -0.4);
  group.add(chimneySnow);

  // Front Wooden Door
  const doorGeo = new THREE.BoxGeometry(0.5, 0.9, 0.08);
  const door = new THREE.Mesh(doorGeo, materials.woodTrunk);
  door.position.set(0, 0.75, 1.24);
  group.add(door);

  // Door Wreath
  const wreathGeo = new THREE.TorusGeometry(0.12, 0.035, 6, 12);
  const wreath = new THREE.Mesh(wreathGeo, materials.pineFoliage);
  wreath.position.set(0, 0.9, 1.28);
  group.add(wreath);

  // Glowing Amber Windows (Front & Sides)
  const windowGeo = new THREE.PlaneGeometry(0.4, 0.5);
  // Front window left
  const winFL = new THREE.Mesh(windowGeo, materials.emissiveWindow);
  winFL.position.set(-0.65, 1.3, 1.22);
  group.add(winFL);

  // Front window right
  const winFR = new THREE.Mesh(windowGeo, materials.emissiveWindow);
  winFR.position.set(0.65, 1.3, 1.22);
  group.add(winFR);

  // Side window left
  const winSL = new THREE.Mesh(windowGeo, materials.emissiveWindow);
  winSL.position.set(-1.22, 1.3, 0);
  winSL.rotation.y = -Math.PI / 2;
  group.add(winSL);

  // Side window right
  const winSR = new THREE.Mesh(windowGeo, materials.emissiveWindow);
  winSR.position.set(1.22, 1.3, 0);
  winSR.rotation.y = Math.PI / 2;
  group.add(winSR);

  // Warm House Glow PointLight
  const houseLight = new THREE.PointLight(0xffb84d, 1.8, 8, 1.5);
  houseLight.position.set(0, 1.4, 1.4);
  group.add(houseLight);

  enableShadows(group);
  return group;
}

// 3. Victorian Street Lamp
export function createStreetLamp(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'StreetLamp';

  // Base
  const baseGeo = new THREE.CylinderGeometry(0.25, 0.35, 0.3, 8);
  const base = new THREE.Mesh(baseGeo, materials.streetLampMetal);
  base.position.y = 0.15;
  group.add(base);

  // Fluted pole
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.11, 2.4, 8);
  const pole = new THREE.Mesh(poleGeo, materials.streetLampMetal);
  pole.position.y = 1.5;
  group.add(pole);

  // Brass ring trims
  const ringGeo = new THREE.TorusGeometry(0.12, 0.025, 6, 12);
  ringGeo.rotateX(Math.PI / 2);
  const ring1 = new THREE.Mesh(ringGeo, materials.brass);
  ring1.position.y = 0.8;
  const ring2 = new THREE.Mesh(ringGeo, materials.brass);
  ring2.position.y = 2.3;
  group.add(ring1);
  group.add(ring2);

  // Lantern Housing
  const lanternCapGeo = new THREE.ConeGeometry(0.35, 0.3, 6);
  const lanternCap = new THREE.Mesh(lanternCapGeo, materials.streetLampMetal);
  lanternCap.position.y = 2.95;
  group.add(lanternCap);

  // Snow cap atop lantern
  const snowCapGeo = new THREE.ConeGeometry(0.36, 0.15, 6);
  const snowCap = new THREE.Mesh(snowCapGeo, materials.snow);
  snowCap.position.y = 3.05;
  group.add(snowCap);

  // Glass Glowing Bulb
  const globeGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.4, 6);
  const globe = new THREE.Mesh(globeGeo, materials.emissiveWindow);
  globe.position.y = 2.65;
  group.add(globe);

  // Warm Point Light (Subtle warm amber illumination)
  const lampLight = new THREE.PointLight(0xffb84d, 1.2, 6, 1.5);
  lampLight.position.set(0, 2.65, 0);
  lampLight.castShadow = false; // keep software webgl performant
  group.add(lampLight);

  enableShadows(group);
  return group;
}

// 4. Holiday Gift Box
export function createGiftBox(colorVariant: 'red' | 'blue' | 'green' = 'red'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GiftBox';

  const boxMat = colorVariant === 'blue' ? materials.holidayBlue : colorVariant === 'green' ? materials.holidayGreen : materials.holidayRed;
  const ribbonMat = colorVariant === 'red' ? materials.goldAccent : materials.whiteIcing;

  // Box
  const boxGeo = new THREE.BoxGeometry(0.9, 0.8, 0.9);
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.y = 0.4;
  group.add(box);

  // Lid
  const lidGeo = new THREE.BoxGeometry(0.96, 0.2, 0.96);
  const lid = new THREE.Mesh(lidGeo, boxMat);
  lid.position.y = 0.85;
  group.add(lid);

  // Ribbon straps (Vertical X and Z)
  const ribXGeo = new THREE.BoxGeometry(0.18, 0.85, 0.98);
  const ribX = new THREE.Mesh(ribXGeo, ribbonMat);
  ribX.position.y = 0.45;
  group.add(ribX);

  const ribZGeo = new THREE.BoxGeometry(0.98, 0.85, 0.18);
  const ribZ = new THREE.Mesh(ribZGeo, ribbonMat);
  ribZ.position.y = 0.45;
  group.add(ribZ);

  // Top Bow (Torus loops)
  const bowLoopGeo = new THREE.TorusGeometry(0.14, 0.04, 6, 12);
  const bow1 = new THREE.Mesh(bowLoopGeo, ribbonMat);
  bow1.position.set(0.08, 1.05, 0);
  bow1.rotation.set(0, Math.PI / 4, Math.PI / 3);

  const bow2 = new THREE.Mesh(bowLoopGeo, ribbonMat);
  bow2.position.set(-0.08, 1.05, 0);
  bow2.rotation.set(0, -Math.PI / 4, -Math.PI / 3);

  const bowKnotGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const knot = new THREE.Mesh(bowKnotGeo, ribbonMat);
  knot.position.set(0, 0.98, 0);

  group.add(bow1);
  group.add(bow2);
  group.add(knot);

  enableShadows(group);
  return group;
}

// 5. Frosty Snowman
export function createSnowman(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Snowman';

  // Base sphere
  const baseGeo = new THREE.SphereGeometry(0.85, 14, 12);
  const base = new THREE.Mesh(baseGeo, materials.snow);
  base.position.y = 0.8;
  group.add(base);

  // Torso sphere
  const torsoGeo = new THREE.SphereGeometry(0.6, 14, 12);
  const torso = new THREE.Mesh(torsoGeo, materials.snow);
  torso.position.y = 1.95;
  group.add(torso);

  // Head sphere
  const headGeo = new THREE.SphereGeometry(0.42, 14, 12);
  const head = new THREE.Mesh(headGeo, materials.snow);
  head.position.y = 2.8;
  group.add(head);

  // Coal buttons
  const coalGeo = new THREE.SphereGeometry(0.05, 6, 6);
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(coalGeo, materials.coal);
    btn.position.set(0, 1.8 + i * 0.22, 0.58 - i * 0.05);
    group.add(btn);
  }

  // Coal Eyes
  const eyeL = new THREE.Mesh(coalGeo, materials.coal);
  eyeL.position.set(-0.13, 2.9, 0.38);
  const eyeR = new THREE.Mesh(coalGeo, materials.coal);
  eyeR.position.set(0.13, 2.9, 0.38);
  group.add(eyeL);
  group.add(eyeR);

  // Carrot Nose
  const carrotGeo = new THREE.ConeGeometry(0.06, 0.3, 8);
  carrotGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(carrotGeo, materials.carrot);
  nose.position.set(0, 2.8, 0.52);
  group.add(nose);

  // Red Scarf
  const scarfGeo = new THREE.TorusGeometry(0.44, 0.09, 6, 14);
  scarfGeo.rotateX(Math.PI / 2);
  const scarf = new THREE.Mesh(scarfGeo, materials.holidayRed);
  scarf.position.y = 2.45;
  group.add(scarf);

  // Scarf hanging tail
  const tailGeo = new THREE.BoxGeometry(0.12, 0.45, 0.06);
  const tail = new THREE.Mesh(tailGeo, materials.holidayRed);
  tail.position.set(0.2, 2.2, 0.45);
  tail.rotation.z = -0.2;
  group.add(tail);

  // Top Hat Brim & Crown
  const brimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12);
  const brim = new THREE.Mesh(brimGeo, materials.coal);
  brim.position.y = 3.2;
  group.add(brim);

  const crownGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.5, 12);
  const crown = new THREE.Mesh(crownGeo, materials.coal);
  crown.position.y = 3.48;
  group.add(crown);

  const hatBandGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.1, 12);
  const hatBand = new THREE.Mesh(hatBandGeo, materials.holidayRed);
  hatBand.position.y = 3.28;
  group.add(hatBand);

  // Twig Stick Arms
  const armGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6);
  const armL = new THREE.Mesh(armGeo, materials.woodTrunk);
  armL.position.set(-0.75, 2.0, 0);
  armL.rotation.set(0, 0, Math.PI / 3);

  const armR = new THREE.Mesh(armGeo, materials.woodTrunk);
  armR.position.set(0.75, 2.0, 0);
  armR.rotation.set(0, 0, -Math.PI / 3);

  group.add(armL);
  group.add(armR);

  enableShadows(group);
  return group;
}

// 6. Christmas Train (Festive Locomotive)
export function createChristmasTrain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ChristmasTrain';

  // Chassis bed
  const chassisGeo = new THREE.BoxGeometry(2.4, 0.25, 1.1);
  const chassis = new THREE.Mesh(chassisGeo, materials.streetLampMetal);
  chassis.position.y = 0.45;
  group.add(chassis);

  // 6 Locomotive Wheels with brass hubs
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.SphereGeometry(0.08, 6, 6);

  const wheelPositions = [
    [-0.7, 0.35, 0.58], [0.1, 0.35, 0.58], [0.8, 0.35, 0.58],
    [-0.7, 0.35, -0.58], [0.1, 0.35, -0.58], [0.8, 0.35, -0.58],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, materials.coal);
    wheel.position.set(x, y, z);
    const hub = new THREE.Mesh(hubGeo, materials.brass);
    hub.position.set(x, y, z + (z > 0 ? 0.06 : -0.06));
    group.add(wheel);
    group.add(hub);
  });

  // Boiler Cylinder
  const boilerGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.3, 12);
  boilerGeo.rotateZ(Math.PI / 2);
  const boiler = new THREE.Mesh(boilerGeo, materials.holidayRed);
  boiler.position.set(-0.25, 1.05, 0);
  group.add(boiler);

  // Cab Housing
  const cabGeo = new THREE.BoxGeometry(0.9, 1.1, 1.05);
  const cab = new THREE.Mesh(cabGeo, materials.holidayGreen);
  cab.position.set(0.65, 1.1, 0);
  group.add(cab);

  // Cab Roof with snow
  const cabRoofGeo = new THREE.BoxGeometry(1.0, 0.1, 1.15);
  const cabRoof = new THREE.Mesh(cabRoofGeo, materials.snow);
  cabRoof.position.set(0.65, 1.7, 0);
  group.add(cabRoof);

  // Cab windows
  const cabWinGeo = new THREE.PlaneGeometry(0.3, 0.35);
  const winL = new THREE.Mesh(cabWinGeo, materials.emissiveWindow);
  winL.position.set(0.65, 1.25, 0.54);
  const winR = new THREE.Mesh(cabWinGeo, materials.emissiveWindow);
  winR.position.set(0.65, 1.25, -0.54);
  winR.rotation.y = Math.PI;
  group.add(winL);
  group.add(winR);

  // Smokestack chimney
  const stackGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.6, 10);
  const stack = new THREE.Mesh(stackGeo, materials.streetLampMetal);
  stack.position.set(-0.7, 1.6, 0);
  const stackLipGeo = new THREE.TorusGeometry(0.18, 0.04, 6, 12);
  stackLipGeo.rotateX(Math.PI / 2);
  const stackLip = new THREE.Mesh(stackLipGeo, materials.brass);
  stackLip.position.set(-0.7, 1.9, 0);
  group.add(stack);
  group.add(stackLip);

  // Front Cowcatcher Grill
  const grillGeo = new THREE.ConeGeometry(0.5, 0.4, 4);
  grillGeo.rotateZ(-Math.PI / 2);
  grillGeo.rotateY(Math.PI / 4);
  const grill = new THREE.Mesh(grillGeo, materials.brass);
  grill.position.set(-1.25, 0.5, 0);
  group.add(grill);

  // Front Headlamp
  const headlampGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.2, 8);
  headlampGeo.rotateZ(Math.PI / 2);
  const headlamp = new THREE.Mesh(headlampGeo, materials.emissiveWindow);
  headlamp.position.set(-1.0, 1.1, 0);
  group.add(headlamp);

  enableShadows(group);
  return group;
}

// 7. Golden Reindeer
export function createReindeer(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Reindeer';

  // Torso
  const bodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.1, 8);
  bodyGeo.rotateZ(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, materials.timberWall);
  body.position.set(0, 1.1, 0);
  group.add(body);

  // 4 Legs
  const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 1.0, 6);
  const legPositions = [
    [-0.38, 0.5, 0.2], [0.38, 0.5, 0.2],
    [-0.38, 0.5, -0.2], [0.38, 0.5, -0.2],
  ];
  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, materials.timberWall);
    leg.position.set(x, y, z);
    group.add(leg);
  });

  // Neck & Head
  const neckGeo = new THREE.CylinderGeometry(0.14, 0.2, 0.7, 6);
  neckGeo.rotateZ(Math.PI / 5);
  const neck = new THREE.Mesh(neckGeo, materials.timberWall);
  neck.position.set(0.55, 1.5, 0);
  group.add(neck);

  const headGeo = new THREE.BoxGeometry(0.45, 0.25, 0.25);
  const head = new THREE.Mesh(headGeo, materials.timberWall);
  head.position.set(0.85, 1.8, 0);
  group.add(head);

  // Golden Antlers
  const antlerGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5);
  const antL = new THREE.Mesh(antlerGeo, materials.goldAccent);
  antL.position.set(0.8, 2.15, 0.12);
  antL.rotation.set(-0.3, 0, 0.2);

  const antR = new THREE.Mesh(antlerGeo, materials.goldAccent);
  antR.position.set(0.8, 2.15, -0.12);
  antR.rotation.set(0.3, 0, 0.2);

  group.add(antL);
  group.add(antR);

  // Red Collar with Bell
  const collarGeo = new THREE.TorusGeometry(0.2, 0.04, 6, 12);
  collarGeo.rotateY(Math.PI / 2);
  const collar = new THREE.Mesh(collarGeo, materials.holidayRed);
  collar.position.set(0.4, 1.35, 0);

  const bellGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const bell = new THREE.Mesh(bellGeo, materials.goldAccent);
  bell.position.set(0.4, 1.22, 0);

  group.add(collar);
  group.add(bell);

  enableShadows(group);
  return group;
}

// 8. Festive Market Stall
export function createMarketStall(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'MarketStall';

  // Wooden counter deck
  const counterGeo = new THREE.BoxGeometry(2.0, 0.8, 1.2);
  const counter = new THREE.Mesh(counterGeo, materials.timberWall);
  counter.position.y = 0.4;
  group.add(counter);

  // 4 Corner Wooden Pillars
  const pillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6);
  const pillarPositions = [
    [-0.9, 1.4, 0.5], [0.9, 1.4, 0.5],
    [-0.9, 1.4, -0.5], [0.9, 1.4, -0.5],
  ];
  pillarPositions.forEach(([x, y, z]) => {
    const pillar = new THREE.Mesh(pillarGeo, materials.woodTrunk);
    pillar.position.set(x, y, z);
    group.add(pillar);
  });

  // Striped Canopy Awning
  const canopyGeo = new THREE.ConeGeometry(1.6, 0.7, 4);
  canopyGeo.rotateY(Math.PI / 4);
  const canopy = new THREE.Mesh(canopyGeo, materials.holidayRed);
  canopy.position.y = 2.4;
  canopy.scale.set(1.1, 1, 0.9);
  group.add(canopy);

  // Snow on canopy
  const snowGeo = new THREE.ConeGeometry(1.62, 0.65, 4);
  snowGeo.rotateY(Math.PI / 4);
  const snow = new THREE.Mesh(snowGeo, materials.snow);
  snow.position.y = 2.45;
  snow.scale.set(1.12, 1, 0.92);
  group.add(snow);

  // Hanging warm lantern inside
  const lanternGeo = new THREE.OctahedronGeometry(0.12, 0);
  const lantern = new THREE.Mesh(lanternGeo, materials.emissiveWindow);
  lantern.position.set(0, 1.9, 0);
  group.add(lantern);

  enableShadows(group);
  return group;
}

// 9. Park Bench
export function createParkBench(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ParkBench';

  // Iron legs
  const legGeo = new THREE.BoxGeometry(0.08, 0.45, 0.6);
  const legL = new THREE.Mesh(legGeo, materials.streetLampMetal);
  legL.position.set(-0.75, 0.22, 0);
  const legR = new THREE.Mesh(legGeo, materials.streetLampMetal);
  legR.position.set(0.75, 0.22, 0);
  group.add(legL);
  group.add(legR);

  // Wood slats seat
  const seatGeo = new THREE.BoxGeometry(1.8, 0.08, 0.55);
  const seat = new THREE.Mesh(seatGeo, materials.timberWall);
  seat.position.set(0, 0.46, 0.05);
  group.add(seat);

  // Wood slats backrest
  const backGeo = new THREE.BoxGeometry(1.8, 0.45, 0.08);
  const back = new THREE.Mesh(backGeo, materials.timberWall);
  back.position.set(0, 0.75, -0.22);
  group.add(back);

  // Snow dusting layer on seat and back
  const snowSeat = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.04, 0.56), materials.snow);
  snowSeat.position.set(0, 0.51, 0.05);
  const snowBack = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.06, 0.1), materials.snow);
  snowBack.position.set(0, 0.98, -0.22);
  group.add(snowSeat);
  group.add(snowBack);

  enableShadows(group);
  return group;
}

// 10. Candy Cane Arch
export function createCandyCaneArch(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CandyCaneArch';

  // Arch curve using a half torus + 2 vertical stems
  const stemL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 10), materials.holidayRed);
  stemL.position.set(-1.0, 1.1, 0);
  const stemR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 10), materials.whiteIcing);
  stemR.position.set(1.0, 1.1, 0);

  // Curved top arch
  const archGeo = new THREE.TorusGeometry(1.0, 0.12, 8, 16, Math.PI);
  const arch = new THREE.Mesh(archGeo, materials.holidayRed);
  arch.position.set(0, 2.2, 0);

  // Golden Bell in center
  const bellGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const bell = new THREE.Mesh(bellGeo, materials.goldAccent);
  bell.position.set(0, 2.05, 0);

  // Snow cap atop arch
  const snowGeo = new THREE.TorusGeometry(1.02, 0.06, 6, 16, Math.PI);
  const snow = new THREE.Mesh(snowGeo, materials.snow);
  snow.position.set(0, 2.26, 0);

  group.add(stemL);
  group.add(stemR);
  group.add(arch);
  group.add(bell);
  group.add(snow);

  enableShadows(group);
  return group;
}

// 11. Gingerbread Cottage
export function createGingerbreadHouse(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GingerbreadHouse';

  const walls = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 2.0), materials.gingerbread);
  walls.position.y = 0.7;
  group.add(walls);

  // Roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.1, 4), materials.gingerbread);
  roof.rotateY(Math.PI / 4);
  roof.position.y = 1.95;
  roof.scale.set(1.25, 1, 1.25);
  group.add(roof);

  // Sugar Icing on Roof
  const icing = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.15, 4), materials.whiteIcing);
  icing.rotateY(Math.PI / 4);
  icing.position.y = 2.0;
  icing.scale.set(1.27, 1, 1.27);
  group.add(icing);

  // Glowing Candy Windows
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), materials.emissiveWindow);
  win.position.set(0.5, 0.8, 1.02);
  group.add(win);

  enableShadows(group);
  return group;
}

// 12. Santa's Sleigh
export function createSleigh(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Sleigh';

  // Runners
  const runnerGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6);
  runnerGeo.rotateZ(Math.PI / 2);
  const runL = new THREE.Mesh(runnerGeo, materials.goldAccent);
  runL.position.set(0, 0.1, 0.45);
  const runR = new THREE.Mesh(runnerGeo, materials.goldAccent);
  runR.position.set(0, 0.1, -0.45);
  group.add(runL);
  group.add(runR);

  // Body
  const bodyGeo = new THREE.BoxGeometry(1.6, 0.6, 0.8);
  const body = new THREE.Mesh(bodyGeo, materials.holidayRed);
  body.position.set(0, 0.5, 0);
  group.add(body);

  // Velvet seat
  const seatGeo = new THREE.BoxGeometry(0.6, 0.4, 0.7);
  const seat = new THREE.Mesh(seatGeo, materials.holidayGreen);
  seat.position.set(-0.2, 0.6, 0);
  group.add(seat);

  enableShadows(group);
  return group;
}

// 13. Holiday Nutcracker Guard
export function createNutcracker(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Nutcracker';

  // Pedestal stand
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.2, 12), materials.streetLampMetal);
  base.position.y = 0.1;
  group.add(base);

  // Boots
  const bootGeo = new THREE.BoxGeometry(0.18, 0.4, 0.28);
  const bootL = new THREE.Mesh(bootGeo, materials.coal);
  bootL.position.set(-0.16, 0.4, 0.05);
  const bootR = new THREE.Mesh(bootGeo, materials.coal);
  bootR.position.set(0.16, 0.4, 0.05);
  group.add(bootL);
  group.add(bootR);

  // White Trousers
  const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
  const legL = new THREE.Mesh(legGeo, materials.whiteIcing);
  legL.position.set(-0.16, 0.8, 0);
  const legR = new THREE.Mesh(legGeo, materials.whiteIcing);
  legR.position.set(0.16, 0.8, 0);
  group.add(legL);
  group.add(legR);

  // Red Tunic Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.35), materials.holidayRed);
  torso.position.set(0, 1.45, 0);
  group.add(torso);

  // Gold Epaulets & Crossbelts
  const epL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), materials.goldAccent);
  epL.position.set(-0.32, 1.8, 0);
  const epR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), materials.goldAccent);
  epR.position.set(0.32, 1.8, 0);
  group.add(epL);
  group.add(epR);

  // Head with pink face
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffd1b3, roughness: 0.6 });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.45, 10), headMat);
  head.position.set(0, 2.05, 0);
  group.add(head);

  // White Beard and Mustache
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 6), materials.whiteIcing);
  beard.position.set(0, 1.8, 0.18);
  group.add(beard);

  // Tall Black Soldier Hat with Gold Feather
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.7, 10), materials.coal);
  hat.position.set(0, 2.55, 0);
  const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), materials.goldAccent);
  badge.position.set(0, 2.6, 0.23);
  group.add(hat);
  group.add(badge);

  enableShadows(group);
  return group;
}

// 14. Glowing Crystal Pine Tree
export function createCrystalTree(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CrystalTree';

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xa5e5ff,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.6,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.88,
  });

  const tiers = [
    { r: 1.4, h: 1.3, y: 0.9 },
    { r: 1.1, h: 1.1, y: 1.7 },
    { r: 0.75, h: 0.9, y: 2.4 },
  ];

  tiers.forEach((t) => {
    const geo = new THREE.ConeGeometry(t.r, t.h, 6);
    const bough = new THREE.Mesh(geo, crystalMat);
    bough.position.y = t.y;
    group.add(bough);
  });

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), materials.goldAccent);
  star.position.y = 3.1;
  group.add(star);

  // Ice glow light
  const light = new THREE.PointLight(0x7dd3fc, 1.5, 8);
  light.position.set(0, 2.2, 0);
  group.add(light);

  enableShadows(group);
  return group;
}

// 15. Holiday Music Carousel
export function createCarousel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Carousel';

  // Round ornate base platform
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.35, 16), materials.goldAccent);
  base.position.y = 0.18;
  group.add(base);

  // Center column
  const centerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.2, 10), materials.whiteIcing);
  centerCol.position.y = 1.3;
  group.add(centerCol);

  // 4 Brass poles with festive reindeer / horses
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const px = Math.cos(angle) * 1.4;
    const pz = Math.sin(angle) * 1.4;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), materials.brass);
    pole.position.set(px, 1.3, pz);
    group.add(pole);

    // Mini wooden carousel figure
    const horse = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.2), i % 2 === 0 ? materials.holidayRed : materials.holidayGreen);
    horse.position.set(px, 0.9 + (i % 2) * 0.3, pz);
    horse.rotation.y = angle + Math.PI / 2;
    group.add(horse);
  }

  // Peaked striped canopy roof with snow rim
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.1, 12), materials.holidayRed);
  canopy.position.y = 2.85;
  const snowCap = new THREE.Mesh(new THREE.ConeGeometry(2.45, 0.3, 12), materials.snow);
  snowCap.position.y = 3.25;
  group.add(canopy);
  group.add(snowCap);

  // Golden spire topper
  const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), materials.goldAccent);
  spire.position.y = 3.6;
  group.add(spire);

  enableShadows(group);
  return group;
}

// 16. Magical Christmas Snowglobe
export function createSnowglobe(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Snowglobe';

  // Carved wooden base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 0.45, 16), materials.woodTrunk);
  base.position.y = 0.22;
  group.add(base);

  // Brass nameplate
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.05), materials.goldAccent);
  plate.position.set(0, 0.22, 1.15);
  group.add(plate);

  // Snow interior base
  const snowFloor = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 16), materials.snow);
  snowFloor.position.y = 0.48;
  group.add(snowFloor);

  // Mini Christmas tree inside
  const miniTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 6), materials.woodTrunk);
  miniTrunk.position.y = 0.6;
  const miniPine = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 8), materials.pineFoliage);
  miniPine.position.y = 1.0;
  const miniStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), materials.goldAccent);
  miniStar.position.y = 1.45;
  group.add(miniTrunk);
  group.add(miniPine);
  group.add(miniStar);

  // Outer Glass Sphere
  const glassGeo = new THREE.SphereGeometry(1.15, 18, 14);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdff4ff,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const glassSphere = new THREE.Mesh(glassGeo, glassMat);
  glassSphere.position.y = 1.35;
  group.add(glassSphere);

  enableShadows(group);
  return group;
}

// 17. North Pole Directional Sign
export function createNorthPoleSign(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'NorthPoleSign';

  // Base snow mount
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.25, 10), materials.snow);
  mount.position.y = 0.12;
  group.add(mount);

  // Candy striped pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), materials.whiteIcing);
  pole.position.y = 1.4;
  group.add(pole);

  // Red spiral rings on pole
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 10), materials.holidayRed);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5 + i * 0.35;
    group.add(ring);
  }

  // Sign boards
  const sign1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.08), materials.timberWall);
  sign1.position.set(0.45, 2.2, 0);
  sign1.rotation.y = 0.2;
  group.add(sign1);

  const sign2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 0.08), materials.holidayRed);
  sign2.position.set(-0.45, 1.8, 0);
  sign2.rotation.y = -0.3;
  group.add(sign2);

  const sign3 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 0.08), materials.holidayGreen);
  sign3.position.set(0.4, 1.4, 0);
  sign3.rotation.y = 0.4;
  group.add(sign3);

  // Star finial atop pole
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), materials.goldAccent);
  star.position.y = 2.8;
  group.add(star);

  enableShadows(group);
  return group;
}

// 18. Cozy Brick Fireplace
export function createFireplace(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Fireplace';

  // Stone hearth floor
  const hearth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.4), materials.stoneBase);
  hearth.position.y = 0.1;
  group.add(hearth);

  // Firebox walls
  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 1.1), materials.roofTiles);
  wallL.position.set(-0.9, 0.9, 0);
  const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 1.1), materials.roofTiles);
  wallR.position.set(0.9, 0.9, 0);
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.6, 0.3), materials.roofTiles);
  wallBack.position.set(0, 0.9, -0.4);
  group.add(wallL);
  group.add(wallR);
  group.add(wallBack);

  // Wooden mantel shelf
  const mantel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 1.3), materials.woodTrunk);
  mantel.position.y = 1.75;
  group.add(mantel);

  // Snow on mantel
  const mantelSnow = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.08, 1.35), materials.snow);
  mantelSnow.position.y = 1.88;
  group.add(mantelSnow);

  // Burning logs & glowing flame
  const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), materials.woodTrunk);
  log1.rotation.z = Math.PI / 4;
  log1.position.set(0, 0.3, -0.1);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 6), materials.emissiveWindow);
  flame.position.set(0, 0.5, -0.1);
  group.add(log1);
  group.add(flame);

  // Firelight point light
  const fireLight = new THREE.PointLight(0xff7722, 1.5, 6);
  fireLight.position.set(0, 0.6, 0.2);
  group.add(fireLight);

  enableShadows(group);
  return group;
}

// 19. Giant Illuminated Wreath
export function createGiantWreath(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GiantWreath';

  // Base stand
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.2, 8), materials.streetLampMetal);
  stand.position.y = 0.1;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), materials.streetLampMetal);
  post.position.y = 0.8;
  group.add(stand);
  group.add(post);

  // Pine wreath ring
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.3, 8, 20), materials.pineFoliage);
  wreath.position.set(0, 2.2, 0);
  group.add(wreath);

  // Giant red ribbon bow at top
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 6, 12), materials.holidayRed);
  bow.position.set(0, 3.4, 0.15);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), materials.holidayRed);
  knot.position.set(0, 3.4, 0.2);
  group.add(bow);
  group.add(knot);

  // Multi-color fairy lights on wreath
  const lightColors = [0xffd700, 0xff2222, 0x00e5ff, 0xff9900];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const bulbMat = new THREE.MeshStandardMaterial({
      color: lightColors[i % 4],
      emissive: lightColors[i % 4],
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), bulbMat);
    bulb.position.set(Math.cos(angle) * 1.2, 2.2 + Math.sin(angle) * 1.2, 0.25);
    group.add(bulb);
  }

  enableShadows(group);
  return group;
}

// 20. Peppermint Candy Spire
export function createPeppermintTower(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'PeppermintTower';

  // Stepped round base
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.25, 12), materials.snow);
  b1.position.y = 0.12;
  group.add(b1);

  // Alternating red and white candy tiers
  const heights = [0.9, 0.8, 0.7, 0.6, 0.5];
  const radii = [0.9, 0.75, 0.6, 0.45, 0.3];
  let curY = 0.25;

  for (let i = 0; i < 5; i++) {
    const geo = new THREE.CylinderGeometry(radii[i] * 0.85, radii[i], heights[i], 12);
    const mat = i % 2 === 0 ? materials.holidayRed : materials.whiteIcing;
    const seg = new THREE.Mesh(geo, mat);
    seg.position.y = curY + heights[i] / 2;
    group.add(seg);
    curY += heights[i];
  }

  // Glowing star atop spire
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), materials.goldAccent);
  star.position.y = curY + 0.3;
  group.add(star);

  enableShadows(group);
  return group;
}

// 21. Festive Polar Bear
export function createPolarBear(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'PolarBear';

  const furMat = new THREE.MeshStandardMaterial({ color: 0xf4f8fc, roughness: 0.9 });

  // Body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), furMat);
  body.scale.set(1, 0.85, 1.2);
  body.position.set(0, 0.75, 0);
  group.add(body);

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), furMat);
  head.position.set(0, 1.2, 0.8);
  group.add(head);

  // Muzzle & Black Nose
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), furMat);
  muzzle.position.set(0, 1.15, 1.18);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), materials.coal);
  nose.position.set(0, 1.25, 1.38);
  group.add(muzzle);
  group.add(nose);

  // Round Ears
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), furMat);
  earL.position.set(-0.35, 1.55, 0.75);
  const earR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), furMat);
  earR.position.set(0.35, 1.55, 0.75);
  group.add(earL);
  group.add(earR);

  // Festive Red Scarf
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.1, 6, 12), materials.holidayRed);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.set(0, 1.0, 0.65);
  group.add(scarf);

  enableShadows(group);
  return group;
}

// 22. Alpine Bell Tower
export function createBellTower(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BellTower';

  // Base stone foundation
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 1.8), materials.stoneBase);
  base.position.y = 1.3;
  group.add(base);

  // Belfry open arch
  const belfry = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), materials.timberWall);
  belfry.position.y = 3.2;
  group.add(belfry);

  // Bronze Bell inside
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.45, 0.6, 8), materials.brass);
  bell.position.set(0, 3.1, 0);
  group.add(bell);

  // Peaked snowy roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.4, 1.6, 4), materials.roofTiles);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 4.6;
  const snow = new THREE.Mesh(new THREE.ConeGeometry(1.42, 0.8, 4), materials.snow);
  snow.rotation.y = Math.PI / 4;
  snow.position.y = 5.0;
  group.add(roof);
  group.add(snow);

  enableShadows(group);
  return group;
}

// 23. Towering Gift Box Pyramid
export function createGiftPyramid(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GiftPyramid';

  // Bottom 4 gifts
  const g1 = createGiftBox('red');
  g1.position.set(-0.55, 0, -0.55);
  const g2 = createGiftBox('blue');
  g2.position.set(0.55, 0, -0.55);
  const g3 = createGiftBox('green');
  g3.position.set(-0.55, 0, 0.55);
  const g4 = createGiftBox('red');
  g4.position.set(0.55, 0, 0.55);

  // Top crowning gift
  const gTop = createGiftBox('green');
  gTop.position.set(0, 0.9, 0);
  gTop.scale.setScalar(0.85);

  group.add(g1);
  group.add(g2);
  group.add(g3);
  group.add(g4);
  group.add(gTop);

  enableShadows(group);
  return group;
}

// 24. Crystal Ice Swan
export function createIceSwan(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'IceSwan';

  const iceMat = new THREE.MeshStandardMaterial({
    color: 0xcdeeff,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
  });

  // Ice pedestal
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.25, 12), iceMat);
  ped.position.y = 0.12;
  group.add(ped);

  // Swan body
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8), iceMat);
  body.scale.set(0.7, 0.6, 1.2);
  body.position.set(0, 0.6, 0);
  group.add(body);

  // S-curved neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.1, 6), iceMat);
  neck.position.set(0, 1.2, 0.5);
  neck.rotation.x = -Math.PI / 6;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), iceMat);
  head.position.set(0, 1.6, 0.8);
  head.rotation.x = Math.PI / 3;
  group.add(head);

  enableShadows(group);
  return group;
}

// 25. Starry Festival Light Arch
export function createIlluminatedArch(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'IlluminatedArch';

  // Arch pillars
  const pL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.6, 8), materials.streetLampMetal);
  pL.position.set(-1.8, 1.3, 0);
  const pR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.6, 8), materials.streetLampMetal);
  pR.position.set(1.8, 1.3, 0);
  group.add(pL);
  group.add(pR);

  // Torus half arch
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 6, 16, Math.PI), materials.streetLampMetal);
  arch.position.set(0, 2.6, 0);
  group.add(arch);

  // Glowing hanging stars
  for (let i = 0; i < 7; i++) {
    const angle = ((i + 1) / 8) * Math.PI;
    const sx = Math.cos(angle) * 1.8;
    const sy = 2.6 + Math.sin(angle) * 1.8;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), materials.goldAccent);
    star.position.set(sx, sy, 0);
    group.add(star);
  }

  enableShadows(group);
  return group;
}

// 26. Cozy Log Campfire Pit
export function createLogCampfire(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'LogCampfire';

  // Ring of 8 river rocks
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), materials.stoneBase);
    rock.position.set(Math.cos(a) * 0.9, 0.15, Math.sin(a) * 0.9);
    group.add(rock);
  }

  // Crossed cedar logs
  for (let l = 0; l < 4; l++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), materials.woodTrunk);
    log.rotation.z = Math.PI / 4;
    log.rotation.y = (l * Math.PI) / 4;
    log.position.set(0, 0.3, 0);
    group.add(log);
  }

  // Flame cone
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.7, 6), materials.emissiveWindow);
  flame.position.set(0, 0.55, 0);
  group.add(flame);

  const light = new THREE.PointLight(0xff6600, 1.8, 7);
  light.position.set(0, 0.8, 0);
  group.add(light);

  enableShadows(group);
  return group;
}

// 27. Toy Soldier Drummer
export function createToySoldier(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ToySoldier';

  // Base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.15, 8), materials.streetLampMetal);
  base.position.y = 0.08;
  group.add(base);

  // Legs & Body
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.25), materials.whiteIcing);
  legs.position.y = 0.55;
  const tunic = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), materials.holidayGreen);
  tunic.position.y = 1.25;
  group.add(legs);
  group.add(tunic);

  // Golden marching snare drum
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.35, 10), materials.goldAccent);
  drum.position.set(0, 1.0, 0.3);
  group.add(drum);

  // Head and Shako Hat
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffd1b3, roughness: 0.6 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), headMat);
  head.position.set(0, 1.75, 0);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 8), materials.holidayRed);
  hat.position.set(0, 2.1, 0);
  group.add(head);
  group.add(hat);

  enableShadows(group);
  return group;
}

// 28. North Pole Mailbox
export function createSantaMailbox(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SantaMailbox';

  // Snow mount
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.2, 8), materials.snow);
  mount.position.y = 0.1;
  group.add(mount);

  // Wooden post
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.4, 6), materials.woodTrunk);
  post.position.y = 0.8;
  group.add(post);

  // Mailbox body (curved cylinder top)
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.9), materials.holidayRed);
  box.position.set(0, 1.6, 0.1);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 8, 1, false, 0, Math.PI), materials.holidayRed);
  cap.rotation.z = Math.PI / 2;
  cap.rotation.y = Math.PI / 2;
  cap.position.set(0, 1.82, 0.1);
  group.add(box);
  group.add(cap);

  // Yellow outgoing letter flag
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.15), materials.goldAccent);
  flag.position.set(0.33, 1.85, 0.2);
  group.add(flag);

  // Snow on mailbox roof
  const snow = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.94), materials.snow);
  snow.position.set(0, 1.98, 0.1);
  group.add(snow);

  enableShadows(group);
  return group;
}

// 29. Golden Christmas Tree Angel
export function createGoldenAngel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GoldenAngel';

  // Golden gown
  const gown = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 10), materials.goldAccent);
  gown.position.y = 0.9;
  group.add(gown);

  // Head and halo
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffe2cc, roughness: 0.5 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), headMat);
  head.position.set(0, 1.95, 0);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 6, 12), materials.goldAccent);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 2.2, 0);
  group.add(head);
  group.add(halo);

  // Feathered Golden Wings
  const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 4), materials.goldAccent);
  wingL.position.set(-0.45, 1.5, -0.2);
  wingL.rotation.z = Math.PI / 3;
  const wingR = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.1, 4), materials.goldAccent);
  wingR.position.set(0.45, 1.5, -0.2);
  wingR.rotation.z = -Math.PI / 3;
  group.add(wingL);
  group.add(wingR);

  // Golden trumpet
  const trumpet = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.7, 6), materials.brass);
  trumpet.rotation.x = Math.PI / 2;
  trumpet.position.set(0, 1.85, 0.45);
  group.add(trumpet);

  enableShadows(group);
  return group;
}

// Factory function to instantiate any asset by ID
export function createAssetObject(assetType: string, colorVariant?: string): THREE.Group {
  switch (assetType) {
    case 'christmas_tree':
      return createChristmasTree();
    case 'christmas_house':
      return createChristmasHouse();
    case 'street_lamp':
      return createStreetLamp();
    case 'gift_box':
      return createGiftBox(colorVariant as 'red' | 'blue' | 'green' || 'red');
    case 'snowman':
      return createSnowman();
    case 'christmas_train':
      return createChristmasTrain();
    case 'reindeer':
      return createReindeer();
    case 'market_stall':
      return createMarketStall();
    case 'park_bench':
      return createParkBench();
    case 'candy_cane_arch':
      return createCandyCaneArch();
    case 'gingerbread_house':
      return createGingerbreadHouse();
    case 'sleigh':
      return createSleigh();
    case 'nutcracker':
      return createNutcracker();
    case 'crystal_tree':
      return createCrystalTree();
    case 'carousel':
      return createCarousel();
    case 'snowglobe':
      return createSnowglobe();
    case 'north_pole_sign':
      return createNorthPoleSign();
    case 'fireplace':
      return createFireplace();
    case 'giant_wreath':
      return createGiantWreath();
    case 'peppermint_tower':
      return createPeppermintTower();
    case 'polar_bear':
      return createPolarBear();
    case 'bell_tower':
      return createBellTower();
    case 'gift_pyramid':
      return createGiftPyramid();
    case 'ice_swan':
      return createIceSwan();
    case 'illuminated_arch':
      return createIlluminatedArch();
    case 'log_campfire':
      return createLogCampfire();
    case 'toy_soldier':
      return createToySoldier();
    case 'santa_mailbox':
      return createSantaMailbox();
    case 'golden_angel':
      return createGoldenAngel();
    default:
      return createGiftBox('red');
  }
}

