import * as THREE from 'three';
import {
  materials,
  enableShadows,
  getRoundedBoxGeo,
  createSculptedCarouselHorse,
  createSculptedReindeerFigure,
  createCurvedSleighGroup,
} from './modelMaterials';

// 1. Christmas Tree
export function createChristmasTree(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ChristmasTree';

  // Root-flared Trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.85, 10), materials.woodTrunk);
  trunk.position.y = 0.42;
  group.add(trunk);

  // 3-tier sculpted pine boughs with snow rim & garlands
  const tiers = [
    { bottomR: 1.5, height: 1.4, y: 1.1 },
    { bottomR: 1.15, height: 1.2, y: 1.9 },
    { bottomR: 0.8, height: 1.0, y: 2.6 },
  ];

  tiers.forEach((t, idx) => {
    const bough = new THREE.Mesh(new THREE.ConeGeometry(t.bottomR, t.height, 12), materials.pineFoliage);
    bough.position.y = t.y;
    group.add(bough);

    const snowCap = new THREE.Mesh(new THREE.TorusGeometry(t.bottomR * 0.9, 0.065, 6, 14), materials.snow);
    snowCap.rotation.x = Math.PI / 2;
    snowCap.position.y = t.y - t.height * 0.44;
    group.add(snowCap);

    // Subtle golden garland ring mid-tier
    const garland = new THREE.Mesh(new THREE.TorusGeometry(t.bottomR * 0.62, 0.028, 5, 14), materials.goldAccent);
    garland.rotation.x = Math.PI / 2 + 0.08 * (idx % 2 === 0 ? 1 : -1);
    garland.position.y = t.y - 0.1;
    group.add(garland);
  });

  // 8-point double Star Topper
  const starGeo = new THREE.OctahedronGeometry(0.22, 0);
  const star1 = new THREE.Mesh(starGeo, materials.starEmissive);
  star1.position.y = 3.25;
  star1.rotation.y = Math.PI / 4;
  const star2 = new THREE.Mesh(starGeo, materials.starEmissive);
  star2.position.y = 3.25;
  star2.scale.setScalar(0.82);
  group.add(star1, star2);

  const starLight = new THREE.PointLight(0xffea78, 1.4, 7, 1.5);
  starLight.position.set(0, 3.25, 0);
  group.add(starLight);

  // Shiny baubles
  const baubleMats = [materials.baubleRuby, materials.baubleGold, materials.baubleCyan];
  const baubleGeo = new THREE.SphereGeometry(0.085, 8, 8);
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

  // Beveled stone plinth
  const base = new THREE.Mesh(getRoundedBoxGeo(2.65, 0.32, 2.65, 0.08, 0.03), materials.stoneBase);
  base.position.y = 0.16;
  group.add(base);

  // Timber main walls
  const walls = new THREE.Mesh(getRoundedBoxGeo(2.4, 1.82, 2.4, 0.08, 0.03), materials.timberWall);
  walls.position.y = 1.21;
  group.add(walls);

  // Corner timber log posts
  const postGeo = new THREE.CylinderGeometry(0.11, 0.11, 1.85, 7);
  [
    [-1.16, 1.16],
    [1.16, 1.16],
    [-1.16, -1.16],
    [1.16, -1.16],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, materials.woodTrunk);
    post.position.set(px, 1.22, pz);
    group.add(post);
  });

  // Roof gable + snow blanket
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.02, 1.32, 4), materials.roofTiles);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.75;
  roof.scale.set(1.3, 1, 1.3);
  group.add(roof);

  const snowCap = new THREE.Mesh(new THREE.ConeGeometry(2.07, 1.32, 4), materials.snow);
  snowCap.rotation.y = Math.PI / 4;
  snowCap.position.y = 2.83;
  snowCap.scale.set(1.32, 1, 1.32);
  group.add(snowCap);

  // Brick Chimney + crown pot + snow cap
  const chimney = new THREE.Mesh(getRoundedBoxGeo(0.38, 1.15, 0.38, 0.04, 0.02), materials.brickWarm);
  chimney.position.set(0.65, 2.8, -0.4);
  const chimneySnow = new THREE.Mesh(getRoundedBoxGeo(0.46, 0.14, 0.46, 0.06, 0.03), materials.snow);
  chimneySnow.position.set(0.65, 3.4, -0.4);
  group.add(chimney, chimneySnow);

  // Framed Front Door + Brass Handle + Wreath
  const doorFrame = new THREE.Mesh(getRoundedBoxGeo(0.6, 1.0, 0.1, 0.03, 0.015), materials.caramelWood);
  doorFrame.position.set(0, 0.78, 1.21);
  const door = new THREE.Mesh(getRoundedBoxGeo(0.48, 0.9, 0.08, 0.03, 0.015), materials.woodTrunk);
  door.position.set(0, 0.75, 1.24);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), materials.goldAccent);
  knob.position.set(0.16, 0.74, 1.29);
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 12), materials.pineFoliage);
  wreath.position.set(0, 0.94, 1.29);
  group.add(doorFrame, door, knob, wreath);

  // Framed Glowing Amber Windows (Front & Sides)
  const addWindow = (x: number, y: number, z: number, rotY = 0) => {
    const winGroup = new THREE.Group();
    winGroup.position.set(x, y, z);
    winGroup.rotation.y = rotY;
    const frame = new THREE.Mesh(getRoundedBoxGeo(0.5, 0.6, 0.06, 0.03, 0.015), materials.woodTrunk);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.48), materials.emissiveWindow);
    pane.position.z = 0.034;
    const sill = new THREE.Mesh(getRoundedBoxGeo(0.56, 0.08, 0.12, 0.03, 0.02), materials.snow);
    sill.position.set(0, -0.3, 0.04);
    winGroup.add(frame, pane, sill);
    group.add(winGroup);
  };

  addWindow(-0.65, 1.3, 1.21, 0);
  addWindow(0.65, 1.3, 1.21, 0);
  addWindow(-1.21, 1.3, 0, -Math.PI / 2);
  addWindow(1.21, 1.3, 0, Math.PI / 2);

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

  // Tiered octagonal pedestal
  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 0.28, 8), materials.streetLampMetal);
  base1.position.y = 0.14;
  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 8), materials.streetLampMetal);
  base2.position.y = 0.42;
  group.add(base1, base2);

  // Tapered cast-iron pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.115, 2.1, 8), materials.streetLampMetal);
  pole.position.y = 1.55;
  group.add(pole);

  // Brass collars
  const ringGeo = new THREE.TorusGeometry(0.11, 0.025, 6, 12);
  ringGeo.rotateX(Math.PI / 2);
  const ring1 = new THREE.Mesh(ringGeo, materials.brass);
  ring1.position.y = 0.72;
  const ring2 = new THREE.Mesh(ringGeo, materials.brass);
  ring2.position.y = 2.38;
  group.add(ring1, ring2);

  // Glowing 6-sided Glass Lantern + Brass Ribs + Snow Cap
  const globe = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.42, 6), materials.emissiveWindow);
  globe.position.y = 2.66;
  group.add(globe);

  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 6), materials.streetLampMetal);
  lanternCap.position.y = 2.98;
  const snowCap = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.15, 6), materials.snow);
  snowCap.position.y = 3.07;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), materials.brass);
  finial.position.y = 3.18;
  group.add(lanternCap, snowCap, finial);

  const lampLight = new THREE.PointLight(0xffb84d, 1.2, 6, 1.5);
  lampLight.position.set(0, 2.65, 0);
  lampLight.castShadow = false;
  group.add(lampLight);

  enableShadows(group);
  return group;
}

// 4. Holiday Gift Box
export function createGiftBox(colorVariant: 'red' | 'blue' | 'green' = 'red'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GiftBox';

  const boxMat =
    colorVariant === 'blue'
      ? materials.holidayBlue
      : colorVariant === 'green'
        ? materials.holidayGreen
        : materials.holidayRed;
  const ribbonMat = colorVariant === 'red' ? materials.goldAccent : materials.whiteIcing;

  // Beveled rounded box + overhanging lid
  const box = new THREE.Mesh(getRoundedBoxGeo(0.9, 0.78, 0.9, 0.08, 0.03), boxMat);
  box.position.y = 0.39;
  const lid = new THREE.Mesh(getRoundedBoxGeo(0.98, 0.2, 0.98, 0.08, 0.03), boxMat);
  lid.position.y = 0.85;
  group.add(box, lid);

  // Satin ribbon straps
  const ribX = new THREE.Mesh(getRoundedBoxGeo(0.18, 0.88, 1.0, 0.03, 0.015), ribbonMat);
  ribX.position.y = 0.52;
  const ribZ = new THREE.Mesh(getRoundedBoxGeo(1.0, 0.88, 0.18, 0.03, 0.015), ribbonMat);
  ribZ.position.y = 0.52;
  group.add(ribX, ribZ);

  // Sculpted 4-loop ribbon bow
  const bowLoopGeo = new THREE.TorusGeometry(0.14, 0.04, 6, 12);
  for (let i = 0; i < 4; i++) {
    const loop = new THREE.Mesh(bowLoopGeo, ribbonMat);
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    loop.position.set(Math.cos(ang) * 0.09, 1.05, Math.sin(ang) * 0.09);
    loop.rotation.y = -ang;
    loop.rotation.z = Math.PI / 3;
    group.add(loop);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), ribbonMat);
  knot.position.set(0, 0.99, 0);
  group.add(knot);

  enableShadows(group);
  return group;
}

// 5. Frosty Snowman
export function createSnowman(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Snowman';

  const base = new THREE.Mesh(new THREE.SphereGeometry(0.84, 14, 12), materials.snow);
  base.scale.set(1.04, 0.94, 1.04);
  base.position.y = 0.78;
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.58, 14, 12), materials.snow);
  torso.position.y = 1.92;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), materials.snow);
  head.position.y = 2.78;
  group.add(base, torso, head);

  // Coal buttons & expressive smile
  const coalGeo = new THREE.SphereGeometry(0.05, 6, 6);
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(coalGeo, materials.coal);
    btn.position.set(0, 1.75 + i * 0.22, 0.56 - i * 0.05);
    group.add(btn);
  }

  const eyeL = new THREE.Mesh(coalGeo, materials.coal);
  eyeL.position.set(-0.13, 2.89, 0.38);
  const eyeR = new THREE.Mesh(coalGeo, materials.coal);
  eyeR.position.set(0.13, 2.89, 0.38);
  group.add(eyeL, eyeR);

  const smileDot = new THREE.SphereGeometry(0.024, 5, 5);
  for (let s = -2; s <= 2; s++) {
    const dot = new THREE.Mesh(smileDot, materials.coal);
    dot.position.set(s * 0.055, 2.66 + Math.abs(s) * 0.02, 0.39 - Math.abs(s) * 0.015);
    group.add(dot);
  }

  // Carrot Nose
  const carrotGeo = new THREE.ConeGeometry(0.06, 0.32, 8);
  carrotGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(carrotGeo, materials.carrot);
  nose.position.set(0, 2.78, 0.52);
  group.add(nose);

  // Knitted Scarf + Knot + Draped Tail
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.095, 7, 14), materials.holidayRed);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 2.42;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), materials.holidayRed);
  knot.position.set(0.18, 2.38, 0.42);
  const tail = new THREE.Mesh(getRoundedBoxGeo(0.14, 0.48, 0.07, 0.03, 0.015), materials.holidayRed);
  tail.position.set(0.22, 2.16, 0.45);
  tail.rotation.z = -0.22;
  group.add(scarf, knot, tail);

  // Top Hat Brim, Band & Tapered Crown
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.06, 14), materials.coal);
  brim.position.y = 3.18;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.34, 0.52, 14), materials.coal);
  crown.position.y = 3.46;
  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.35, 0.1, 14), materials.holidayRed);
  hatBand.position.y = 3.26;
  group.add(brim, crown, hatBand);

  // Forked Twig Arms
  const armGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6);
  const twigGeo = new THREE.CylinderGeometry(0.016, 0.022, 0.24, 5);
  [-1, 1].forEach((side) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.5, 2.02, 0);
    armPivot.rotation.z = side * -Math.PI / 3;
    const arm = new THREE.Mesh(armGeo, materials.woodTrunk);
    arm.position.y = 0.38;
    const fork = new THREE.Mesh(twigGeo, materials.woodTrunk);
    fork.position.set(side * 0.07, 0.72, 0);
    fork.rotation.z = side * -0.5;
    armPivot.add(arm, fork);
    group.add(armPivot);
  });

  enableShadows(group);
  return group;
}

// 6. Christmas Train (Festive Locomotive)
export function createChristmasTrain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ChristmasTrain';

  // Beveled Chassis bed
  const chassis = new THREE.Mesh(getRoundedBoxGeo(2.45, 0.24, 1.12, 0.08, 0.025), materials.streetLampMetal);
  chassis.position.y = 0.46;
  group.add(chassis);

  // 6 Spoked Locomotive Wheels + Brass Hubs + Side Coupling Rods
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.11, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.TorusGeometry(0.28, 0.03, 5, 14);
  rimGeo.rotateY(Math.PI / 2);
  const hubGeo = new THREE.SphereGeometry(0.085, 7, 6);

  const wheelPositions = [
    [-0.7, 0.34, 0.58],
    [0.05, 0.34, 0.58],
    [0.78, 0.34, 0.58],
    [-0.7, 0.34, -0.58],
    [0.05, 0.34, -0.58],
    [0.78, 0.34, -0.58],
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, materials.coal);
    wheel.position.set(x, y, z);
    const rim = new THREE.Mesh(rimGeo, materials.holidayRed);
    rim.position.set(x, y, z + (z > 0 ? 0.04 : -0.04));
    const hub = new THREE.Mesh(hubGeo, materials.brass);
    hub.position.set(x, y, z + (z > 0 ? 0.06 : -0.06));
    group.add(wheel, rim, hub);
  });

  // Side coupling rods
  [-0.65, 0.65].forEach((z) => {
    const rod = new THREE.Mesh(getRoundedBoxGeo(1.56, 0.05, 0.04, 0.015, 0.01), materials.chromeSteel);
    rod.position.set(0.04, 0.26, z);
    group.add(rod);
  });

  // Rounded Boiler Cylinder + Brass Boiler Bands + Steam Dome + Smokebox Face
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.32, 14), materials.holidayRed);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(-0.26, 1.05, 0);
  group.add(boiler);

  const smokebox = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.26, 14), materials.streetLampMetal);
  smokebox.rotation.z = Math.PI / 2;
  smokebox.position.set(-0.84, 1.05, 0);
  group.add(smokebox);

  [-0.58, -0.18, 0.16].forEach((bx) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.025, 6, 14), materials.brass);
    band.rotation.y = Math.PI / 2;
    band.position.set(bx, 1.05, 0);
    group.add(band);
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), materials.brass);
  dome.position.set(-0.22, 1.54, 0);
  group.add(dome);

  // Beveled Cab Housing + Arched Snowy Roof + Glowing Windows
  const cab = new THREE.Mesh(getRoundedBoxGeo(0.92, 1.1, 1.06, 0.07, 0.025), materials.holidayGreen);
  cab.position.set(0.66, 1.12, 0);
  const cabRoof = new THREE.Mesh(getRoundedBoxGeo(1.06, 0.12, 1.18, 0.06, 0.03), materials.snow);
  cabRoof.position.set(0.66, 1.7, 0);
  group.add(cab, cabRoof);

  const cabWinGeo = new THREE.PlaneGeometry(0.32, 0.36);
  const winL = new THREE.Mesh(cabWinGeo, materials.emissiveWindow);
  winL.position.set(0.66, 1.28, 0.54);
  const winR = new THREE.Mesh(cabWinGeo, materials.emissiveWindow);
  winR.position.set(0.66, 1.28, -0.54);
  winR.rotation.y = Math.PI;
  group.add(winL, winR);

  // Flared Smokestack
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.62, 12), materials.streetLampMetal);
  stack.position.set(-0.78, 1.66, 0);
  const stackLip = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 12), materials.brass);
  stackLip.rotation.x = Math.PI / 2;
  stackLip.position.set(-0.78, 1.97, 0);
  group.add(stack, stackLip);

  // Cowcatcher & Brass Headlamp
  const grill = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.45, 4), materials.brass);
  grill.rotation.z = -Math.PI / 2;
  grill.rotation.y = Math.PI / 4;
  grill.position.set(-1.3, 0.48, 0);
  const headlampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.22, 10), materials.brass);
  headlampBody.rotation.z = Math.PI / 2;
  headlampBody.position.set(-1.02, 1.12, 0);
  const headlampLens = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 10), materials.emissiveWindow);
  headlampLens.rotation.z = Math.PI / 2;
  headlampLens.position.set(-1.13, 1.12, 0);
  group.add(grill, headlampBody, headlampLens);

  enableShadows(group);
  return group;
}

// 7. Golden Reindeer (Sculpted!)
export function createReindeer(): THREE.Group {
  const group = createSculptedReindeerFigure({
    coatMat: materials.reindeerCoat,
    antlerMat: materials.goldAccent,
    noseMat: materials.baubleRuby,
    collarMat: materials.holidayRed,
    grounded: true,
    scale: 1.0,
  });
  group.name = 'Reindeer';
  enableShadows(group);
  return group;
}

// 8. Festive Market Stall
export function createMarketStall(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'MarketStall';

  // Beveled Wooden Counter & Front Trim
  const counter = new THREE.Mesh(getRoundedBoxGeo(2.05, 0.82, 1.22, 0.06, 0.02), materials.timberWall);
  counter.position.y = 0.41;
  const counterTop = new THREE.Mesh(getRoundedBoxGeo(2.14, 0.1, 1.32, 0.05, 0.02), materials.caramelWood);
  counterTop.position.y = 0.84;
  group.add(counter, counterTop);

  // 4 Corner Posts
  const pillarGeo = new THREE.CylinderGeometry(0.06, 0.065, 1.65, 8);
  [
    [-0.92, 1.42, 0.52],
    [0.92, 1.42, 0.52],
    [-0.92, 1.42, -0.52],
    [0.92, 1.42, -0.52],
  ].forEach(([x, y, z]) => {
    const pillar = new THREE.Mesh(pillarGeo, materials.woodTrunk);
    pillar.position.set(x, y, z);
    group.add(pillar);
  });

  // Peaked Canopy Awning + Scalloped Valance + Snow Blanket
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.62, 0.72, 4), materials.holidayRed);
  canopy.rotation.y = Math.PI / 4;
  canopy.position.y = 2.42;
  canopy.scale.set(1.12, 1, 0.92);
  const snow = new THREE.Mesh(new THREE.ConeGeometry(1.65, 0.66, 4), materials.snow);
  snow.rotation.y = Math.PI / 4;
  snow.position.y = 2.48;
  snow.scale.set(1.14, 1, 0.94);
  const trim = new THREE.Mesh(getRoundedBoxGeo(2.36, 0.14, 1.9, 0.05, 0.02), materials.creamEnamel);
  trim.position.y = 2.08;
  group.add(canopy, snow, trim);

  // Hanging warm lantern & cocoa cups on counter
  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), materials.emissiveWindow);
  lantern.position.set(0, 1.92, 0);
  group.add(lantern);

  [-0.45, 0.45].forEach((mx) => {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.16, 8), materials.whiteIcing);
    mug.position.set(mx, 0.97, 0.25);
    group.add(mug);
  });

  enableShadows(group);
  return group;
}

// 9. Park Bench
export function createParkBench(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ParkBench';

  // Cast-iron curved side frames & armrests
  [-0.78, 0.78].forEach((lx) => {
    const legF = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.46, 7), materials.streetLampMetal);
    legF.position.set(lx, 0.23, 0.22);
    const legB = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 7), materials.streetLampMetal);
    legB.position.set(lx, 0.45, -0.22);
    legB.rotation.x = -0.1;
    const arm = new THREE.Mesh(getRoundedBoxGeo(0.08, 0.06, 0.56, 0.03, 0.01), materials.streetLampMetal);
    arm.position.set(lx, 0.64, 0.02);
    const armPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), materials.streetLampMetal);
    armPost.position.set(lx, 0.54, 0.22);
    group.add(legF, legB, arm, armPost);
  });

  // Slatted Cedar Seat & Backrest
  [-0.14, 0.05, 0.23].forEach((sz) => {
    const slat = new THREE.Mesh(getRoundedBoxGeo(1.78, 0.055, 0.14, 0.02, 0.01), materials.caramelWood);
    slat.position.set(0, 0.46, sz);
    group.add(slat);
  });

  [0.68, 0.85].forEach((by, i) => {
    const bSlat = new THREE.Mesh(getRoundedBoxGeo(1.78, 0.13, 0.055, 0.02, 0.01), materials.caramelWood);
    bSlat.position.set(0, by, -0.22 - i * 0.02);
    bSlat.rotation.x = -0.12;
    group.add(bSlat);
  });

  // Soft snow dusting along top
  const snowSeat = new THREE.Mesh(getRoundedBoxGeo(1.8, 0.04, 0.5, 0.04, 0.015), materials.snow);
  snowSeat.position.set(0, 0.5, 0.05);
  const snowBack = new THREE.Mesh(getRoundedBoxGeo(1.8, 0.06, 0.1, 0.04, 0.015), materials.snow);
  snowBack.position.set(0, 0.96, -0.25);
  group.add(snowSeat, snowBack);

  enableShadows(group);
  return group;
}

// 10. Candy Cane Arch
export function createCandyCaneArch(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CandyCaneArch';

  // Striped vertical stems (alternating red & white rounded collars)
  [-1.0, 1.0].forEach((sx, sideIdx) => {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 2.2, 12), materials.whiteIcing);
    core.position.set(sx, 1.1, 0);
    group.add(core);
    for (let i = 0; i < 6; i++) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.128, 0.18, 12), materials.holidayRed);
      band.position.set(sx, 0.25 + i * 0.36 + (sideIdx * 0.12), 0);
      group.add(band);
    }
  });

  // Striped arched top (alternating red & white arc segments)
  const segCount = 10;
  for (let i = 0; i < segCount; i++) {
    const startA = (i / segCount) * Math.PI;
    const arcLen = Math.PI / segCount;
    const seg = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.125, 8, 6, arcLen + 0.02),
      i % 2 === 0 ? materials.holidayRed : materials.whiteIcing
    );
    seg.position.set(0, 2.2, 0);
    seg.rotation.z = startA;
    group.add(seg);
  }

  // Evergreen garland & hanging golden bell at center
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 10), materials.holidayGreen);
  bow.position.set(0, 3.16, 0.12);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 0.22, 10), materials.goldAccent);
  bell.position.set(0, 2.86, 0);
  const snow = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.055, 6, 16, Math.PI * 0.72), materials.snow);
  snow.position.set(0, 2.26, 0);
  snow.rotation.z = Math.PI * 0.14;
  group.add(bow, bell, snow);

  enableShadows(group);
  return group;
}

// 11. Gingerbread Cottage
export function createGingerbreadHouse(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GingerbreadHouse';

  // Beveled cookie walls + corner icing piping
  const walls = new THREE.Mesh(getRoundedBoxGeo(2.04, 1.42, 2.04, 0.08, 0.03), materials.gingerbread);
  walls.position.y = 0.71;
  group.add(walls);

  [
    [-1.0, 1.0],
    [1.0, 1.0],
    [-1.0, -1.0],
    [1.0, -1.0],
  ].forEach(([cx, cz]) => {
    const icingPost = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 7), materials.whiteIcing);
    icingPost.position.set(cx, 0.7, cz);
    group.add(icingPost);
  });

  // Roof & Royal Icing Roof Snow
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.72, 1.12, 4), materials.gingerbread);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 1.96;
  roof.scale.set(1.25, 1, 1.25);

  const icing = new THREE.Mesh(new THREE.ConeGeometry(1.77, 1.14, 4), materials.whiteIcing);
  icing.rotation.y = Math.PI / 4;
  icing.position.y = 2.02;
  icing.scale.set(1.27, 1, 1.27);
  group.add(roof, icing);

  // Candy gumdrop trims & glowing sugar windows
  const gumdropGeo = new THREE.SphereGeometry(0.09, 7, 6);
  const gumMats = [materials.baubleRuby, materials.baubleGold, materials.baubleCyan];
  for (let i = 0; i < 5; i++) {
    const gum = new THREE.Mesh(gumdropGeo, gumMats[i % 3]);
    gum.position.set(-0.8 + i * 0.4, 1.46, 1.05);
    group.add(gum);
  }

  [-0.55, 0.55].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.42), materials.emissiveWindow);
    win.position.set(wx, 0.82, 1.03);
    const frame = new THREE.Mesh(getRoundedBoxGeo(0.46, 0.5, 0.05, 0.03, 0.01), materials.whiteIcing);
    frame.position.set(wx, 0.82, 1.01);
    group.add(frame, win);
  });

  enableShadows(group);
  return group;
}

// 12. Santa's Sleigh (Curved Sculpted Sleigh!)
export function createSleigh(): THREE.Group {
  const group = createCurvedSleighGroup(materials.holidayRed, materials.goldAccent, materials.emeraldVelvet);
  group.name = 'Sleigh';
  enableShadows(group);
  return group;
}

// 13. Holiday Nutcracker Guard
export function createNutcracker(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Nutcracker';

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.2, 14), materials.streetLampMetal);
  base.position.y = 0.1;
  const baseTrim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 14), materials.goldAccent);
  baseTrim.rotation.x = Math.PI / 2;
  baseTrim.position.y = 0.2;
  group.add(base, baseTrim);

  // Rounded Boots
  const bootGeo = getRoundedBoxGeo(0.2, 0.4, 0.3, 0.06, 0.02);
  const bootL = new THREE.Mesh(bootGeo, materials.coal);
  bootL.position.set(-0.16, 0.4, 0.04);
  const bootR = new THREE.Mesh(bootGeo, materials.coal);
  bootR.position.set(0.16, 0.4, 0.04);
  group.add(bootL, bootR);

  // Trousers
  const legGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.58, 8);
  const legL = new THREE.Mesh(legGeo, materials.whiteIcing);
  legL.position.set(-0.16, 0.82, 0);
  const legR = new THREE.Mesh(legGeo, materials.whiteIcing);
  legR.position.set(0.16, 0.82, 0);
  group.add(legL, legR);

  // Contoured Tunic & Gold Belt/Buttons
  const tunic = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.78, 10), materials.holidayRed);
  tunic.scale.set(1.12, 1, 0.76);
  tunic.position.set(0, 1.44, 0);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.09, 10), materials.coal);
  belt.scale.set(1.12, 1, 0.78);
  belt.position.set(0, 1.18, 0);
  const buckle = new THREE.Mesh(getRoundedBoxGeo(0.14, 0.12, 0.05, 0.02, 0.01), materials.goldAccent);
  buckle.position.set(0, 1.18, 0.21);
  group.add(tunic, belt, buckle);

  // Arms & Gold Epaulets
  [-1, 1].forEach((side) => {
    const ep = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), materials.goldAccent);
    ep.position.set(side * 0.33, 1.78, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.42, 4, 7), materials.holidayRed);
    arm.position.set(side * 0.35, 1.46, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 6, 6), materials.whiteIcing);
    hand.position.set(side * 0.35, 1.18, 0);
    group.add(ep, arm, hand);
  });

  // Sculpted Head, Nose, Eyes, Beard & Mustache
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.19, 0.44, 12), materials.skinWarm);
  head.position.set(0, 2.06, 0);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), materials.skinWarm);
  nose.position.set(0, 2.08, 0.21);
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 8), materials.whiteIcing);
  beard.rotation.x = Math.PI;
  beard.position.set(0, 1.84, 0.18);
  const stache = new THREE.Mesh(getRoundedBoxGeo(0.26, 0.05, 0.06, 0.02, 0.01), materials.whiteIcing);
  stache.position.set(0, 2.0, 0.2);
  group.add(head, nose, beard, stache);

  // Tall Shako Hat with Gold Trim & Plume
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.68, 12), materials.coal);
  hat.position.set(0, 2.55, 0);
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 10, 1, false, -Math.PI * 0.4, Math.PI * 0.8), materials.coal);
  visor.position.set(0, 2.24, 0.05);
  const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), materials.goldAccent);
  badge.position.set(0, 2.58, 0.23);
  group.add(hat, visor, badge);

  enableShadows(group);
  return group;
}

// 14. Glowing Crystal Pine Tree
export function createCrystalTree(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'CrystalTree';

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.25, 6), materials.iceCrystal);
  ped.position.y = 0.12;
  group.add(ped);

  const tiers = [
    { r: 1.4, h: 1.3, y: 0.9 },
    { r: 1.1, h: 1.1, y: 1.7 },
    { r: 0.75, h: 0.9, y: 2.4 },
  ];

  tiers.forEach((t, idx) => {
    const bough = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 6), materials.iceCrystal);
    bough.position.y = t.y;
    bough.rotation.y = idx * (Math.PI / 6);
    group.add(bough);
  });

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.25, 0), materials.starEmissive);
  star.position.y = 3.12;
  group.add(star);

  const light = new THREE.PointLight(0x7dd3fc, 1.5, 8);
  light.position.set(0, 2.2, 0);
  group.add(light);

  enableShadows(group);
  return group;
}

// 15. Holiday Music Carousel (Sculpted Mini Carousel Horses!)
export function createCarousel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Carousel';

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.32, 0.35, 20), materials.goldAccent);
  base.position.y = 0.18;
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.08, 20), materials.creamEnamel);
  deck.position.y = 0.36;
  group.add(base, deck);

  const centerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 2.2, 12), materials.creamEnamel);
  centerCol.position.y = 1.4;
  group.add(centerCol);

  const horseCoats = [materials.horseIvory, materials.horseChestnut, materials.horseDapple, materials.horseIvory];
  const horseSaddles = [materials.holidayRed, materials.holidayGreen, materials.holidayBlue, materials.holidayRed];

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const px = Math.cos(angle) * 1.4;
    const pz = Math.sin(angle) * 1.4;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.25, 6), materials.brass);
    pole.position.set(px, 1.4, pz);
    group.add(pole);

    const horse = createSculptedCarouselHorse(horseCoats[i], horseSaddles[i], materials.goldAccent, 0.9);
    horse.position.set(px, 0.92 + (i % 2) * 0.25, pz);
    horse.rotation.y = -angle + Math.PI / 2;
    group.add(horse);
  }

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.1, 16), materials.holidayRed);
  canopy.position.y = 2.88;
  const canopyTrim = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.18, 16), materials.goldAccent);
  canopyTrim.position.y = 2.34;
  const snowCap = new THREE.Mesh(new THREE.ConeGeometry(2.45, 0.3, 16), materials.snow);
  snowCap.position.y = 3.28;
  const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), materials.goldAccent);
  spire.position.y = 3.62;
  group.add(canopy, canopyTrim, snowCap, spire);

  enableShadows(group);
  return group;
}

// 16. Magical Christmas Snowglobe
export function createSnowglobe(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Snowglobe';

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.24, 0.45, 18), materials.woodTrunk);
  base.position.y = 0.22;
  const goldRim = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.04, 6, 18), materials.goldAccent);
  goldRim.rotation.x = Math.PI / 2;
  goldRim.position.y = 0.45;
  const plate = new THREE.Mesh(getRoundedBoxGeo(0.75, 0.16, 0.06, 0.03, 0.015), materials.goldAccent);
  plate.position.set(0, 0.22, 1.15);
  group.add(base, goldRim, plate);

  const snowFloor = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.12, 18), materials.snow);
  snowFloor.position.y = 0.48;
  group.add(snowFloor);

  // Mini Christmas Tree + Tiny Gift + Tiny Snowman inside
  const miniTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 6), materials.woodTrunk);
  miniTrunk.position.set(-0.22, 0.6, -0.12);
  const miniPine = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.82, 8), materials.pineFoliage);
  miniPine.position.set(-0.22, 1.0, -0.12);
  const miniStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), materials.starEmissive);
  miniStar.position.set(-0.22, 1.46, -0.12);
  const miniGift = new THREE.Mesh(getRoundedBoxGeo(0.2, 0.18, 0.2, 0.02, 0.01), materials.holidayRed);
  miniGift.position.set(0.32, 0.62, 0.18);
  const miniSnowman = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), materials.snow);
  miniSnowman.position.set(0.28, 0.66, -0.22);
  group.add(miniTrunk, miniPine, miniStar, miniGift, miniSnowman);

  const glassSphere = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 16), materials.glassClear);
  glassSphere.position.y = 1.35;
  glassSphere.userData.noCastShadow = true;
  group.add(glassSphere);

  enableShadows(group);
  return group;
}

// 17. North Pole Directional Sign
export function createNorthPoleSign(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'NorthPoleSign';

  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.72, 0.26, 12), materials.snow);
  mount.position.y = 0.13;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 2.6, 10), materials.whiteIcing);
  pole.position.y = 1.4;
  group.add(mount, pole);

  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.025, 6, 10), materials.holidayRed);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5 + i * 0.35;
    group.add(ring);
  }

  // Arrow-pointed directional boards
  const makeSignBoard = (mat: THREE.Material, y: number, dir: 1 | -1, rotY: number) => {
    const board = new THREE.Group();
    board.position.set(dir * 0.42, y, 0);
    board.rotation.y = rotY;
    const plank = new THREE.Mesh(getRoundedBoxGeo(1.05, 0.25, 0.08, 0.03, 0.015), mat);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 4), mat);
    tip.rotation.z = dir * -Math.PI / 2;
    tip.rotation.x = Math.PI / 4;
    tip.position.x = dir * 0.58;
    board.add(plank, tip);
    group.add(board);
  };

  makeSignBoard(materials.timberWall, 2.2, 1, 0.2);
  makeSignBoard(materials.holidayRed, 1.8, -1, -0.3);
  makeSignBoard(materials.holidayGreen, 1.4, 1, 0.4);

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), materials.starEmissive);
  star.position.y = 2.82;
  group.add(star);

  enableShadows(group);
  return group;
}

// 18. Cozy Brick Fireplace
export function createFireplace(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Fireplace';

  const hearth = new THREE.Mesh(getRoundedBoxGeo(2.45, 0.22, 1.45, 0.07, 0.025), materials.stoneBase);
  hearth.position.y = 0.11;
  group.add(hearth);

  const wallL = new THREE.Mesh(getRoundedBoxGeo(0.38, 1.6, 1.12, 0.05, 0.02), materials.brickWarm);
  wallL.position.set(-0.9, 0.92, 0);
  const wallR = new THREE.Mesh(getRoundedBoxGeo(0.38, 1.6, 1.12, 0.05, 0.02), materials.brickWarm);
  wallR.position.set(0.9, 0.92, 0);
  const wallBack = new THREE.Mesh(getRoundedBoxGeo(1.52, 1.6, 0.32, 0.05, 0.02), materials.brickWarm);
  wallBack.position.set(0, 0.92, -0.4);
  group.add(wallL, wallR, wallBack);

  const mantel = new THREE.Mesh(getRoundedBoxGeo(2.65, 0.2, 1.32, 0.06, 0.025), materials.woodTrunk);
  mantel.position.y = 1.76;
  const mantelSnow = new THREE.Mesh(getRoundedBoxGeo(2.7, 0.09, 1.36, 0.06, 0.025), materials.snow);
  mantelSnow.position.y = 1.89;
  group.add(mantel, mantelSnow);

  // Stockings hanging on mantel
  [-0.55, 0.55].forEach((sx, i) => {
    const sock = new THREE.Mesh(getRoundedBoxGeo(0.16, 0.32, 0.08, 0.04, 0.015), i === 0 ? materials.holidayRed : materials.holidayGreen);
    sock.position.set(sx, 1.48, 0.62);
    group.add(sock);
  });

  // Logs & layered flame
  const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.85, 7), materials.woodTrunk);
  log1.rotation.z = Math.PI / 3;
  log1.position.set(0, 0.32, -0.1);
  const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.85, 7), materials.woodTrunk);
  log2.rotation.z = -Math.PI / 3;
  log2.position.set(0, 0.32, -0.05);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 7), materials.flameCore);
  flame.position.set(0, 0.54, -0.08);
  group.add(log1, log2, flame);

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

  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.2, 10), materials.streetLampMetal);
  stand.position.y = 0.1;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 1.4, 8), materials.streetLampMetal);
  post.position.y = 0.8;
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.3, 10, 24), materials.pineFoliage);
  wreath.position.set(0, 2.2, 0);
  group.add(stand, post, wreath);

  // Double Ribbon Bow + Trailing Tails
  const bowL = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 12), materials.holidayRed);
  bowL.position.set(-0.22, 3.42, 0.15);
  bowL.rotation.z = 0.35;
  const bowR = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 6, 12), materials.holidayRed);
  bowR.position.set(0.22, 3.42, 0.15);
  bowR.rotation.z = -0.35;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), materials.holidayRed);
  knot.position.set(0, 3.4, 0.2);
  group.add(bowL, bowR, knot);

  // Shared cached glowing fairy light bulbs (zero inline Material creation!)
  const bulbMats = [materials.bulbAmber, materials.bulbRuby, materials.bulbCyan, materials.bulbEmerald];
  const bulbGeo = new THREE.SphereGeometry(0.08, 7, 6);
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const bulb = new THREE.Mesh(bulbGeo, bulbMats[i % 4]);
    bulb.position.set(Math.cos(angle) * 1.2, 2.2 + Math.sin(angle) * 1.2, 0.27);
    group.add(bulb);
  }

  enableShadows(group);
  return group;
}

// 20. Peppermint Candy Spire
export function createPeppermintTower(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'PeppermintTower';

  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.32, 0.26, 16), materials.snow);
  b1.position.y = 0.13;
  group.add(b1);

  const heights = [0.9, 0.8, 0.7, 0.6, 0.5];
  const radii = [0.9, 0.75, 0.6, 0.45, 0.3];
  let curY = 0.25;

  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(radii[i] * 0.85, radii[i], heights[i], 14),
      i % 2 === 0 ? materials.holidayRed : materials.whiteIcing
    );
    seg.position.y = curY + heights[i] / 2;
    const trim = new THREE.Mesh(new THREE.TorusGeometry(radii[i] * 0.87, 0.04, 6, 14), materials.whiteIcing);
    trim.rotation.x = Math.PI / 2;
    trim.position.y = curY + heights[i];
    group.add(seg, trim);
    curY += heights[i];
  }

  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), materials.starEmissive);
  star.position.y = curY + 0.3;
  group.add(star);

  enableShadows(group);
  return group;
}

// 21. Festive Polar Bear
export function createPolarBear(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'PolarBear';

  // Torso
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.65, 0.55, 6, 12), materials.polarFur);
  body.rotation.x = Math.PI / 2;
  body.position.set(0, 0.78, 0);
  group.add(body);

  // 4 Chubby Rounded Paws/Legs
  const legGeo = new THREE.CapsuleGeometry(0.18, 0.24, 4, 8);
  [
    [-0.4, 0.28, 0.42],
    [0.4, 0.28, 0.42],
    [-0.4, 0.28, -0.42],
    [0.4, 0.28, -0.42],
  ].forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(legGeo, materials.polarFur);
    leg.position.set(lx, ly, lz);
    group.add(leg);
  });

  // Tail
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), materials.polarFur);
  tail.position.set(0, 0.78, -0.88);
  group.add(tail);

  // Head, Snout, Nose, Eyes & Ears
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), materials.polarFur);
  head.position.set(0, 1.24, 0.76);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.23, 9, 8), materials.polarFur);
  muzzle.scale.set(0.95, 0.85, 1.15);
  muzzle.position.set(0, 1.16, 1.12);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 6), materials.coal);
  nose.position.set(0, 1.23, 1.35);
  const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
  const eyeL = new THREE.Mesh(eyeGeo, materials.coal);
  eyeL.position.set(-0.17, 1.35, 1.14);
  const eyeR = new THREE.Mesh(eyeGeo, materials.coal);
  eyeR.position.set(0.17, 1.35, 1.14);
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), materials.polarFur);
  earL.position.set(-0.32, 1.58, 0.72);
  const earR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), materials.polarFur);
  earR.position.set(0.32, 1.58, 0.72);
  group.add(head, muzzle, nose, eyeL, eyeR, earL, earR);

  // Knitted Red Scarf + Tail
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.1, 7, 14), materials.holidayRed);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.set(0, 1.0, 0.62);
  const scarfTail = new THREE.Mesh(getRoundedBoxGeo(0.15, 0.42, 0.08, 0.03, 0.015), materials.holidayRed);
  scarfTail.position.set(0.24, 0.82, 0.96);
  scarfTail.rotation.z = -0.25;
  group.add(scarf, scarfTail);

  enableShadows(group);
  return group;
}

// 22. Alpine Bell Tower
export function createBellTower(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BellTower';

  // Stone tower shaft + plinth
  const plinth = new THREE.Mesh(getRoundedBoxGeo(2.0, 0.35, 2.0, 0.07, 0.025), materials.stoneBase);
  plinth.position.y = 0.175;
  const base = new THREE.Mesh(getRoundedBoxGeo(1.78, 2.45, 1.78, 0.06, 0.02), materials.stoneBase);
  base.position.y = 1.48;
  group.add(plinth, base);

  // Open timber belfry corner pillars + cornice
  const belfryBase = new THREE.Mesh(getRoundedBoxGeo(1.86, 0.16, 1.86, 0.05, 0.02), materials.timberWall);
  belfryBase.position.y = 2.7;
  group.add(belfryBase);

  const postGeo = new THREE.CylinderGeometry(0.1, 0.11, 1.25, 8);
  [
    [-0.68, 0.68],
    [0.68, 0.68],
    [-0.68, -0.68],
    [0.68, -0.68],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, materials.timberWall);
    post.position.set(px, 3.32, pz);
    group.add(post);
  });

  // Lathe-sculpted flared Bronze Bell inside open belfry
  const bellPts = [
    new THREE.Vector2(0.0, 0.62),
    new THREE.Vector2(0.16, 0.58),
    new THREE.Vector2(0.22, 0.36),
    new THREE.Vector2(0.28, 0.16),
    new THREE.Vector2(0.42, 0.0),
    new THREE.Vector2(0.36, 0.0),
  ];
  const bell = new THREE.Mesh(new THREE.LatheGeometry(bellPts, 14), materials.brass);
  bell.position.set(0, 3.05, 0);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 6), materials.goldAccent);
  clapper.position.set(0, 3.02, 0);
  group.add(bell, clapper);

  // Peaked snowy spire roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.44, 1.65, 4), materials.roofTiles);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 4.65;
  const snow = new THREE.Mesh(new THREE.ConeGeometry(1.46, 0.82, 4), materials.snow);
  snow.rotation.y = Math.PI / 4;
  snow.position.y = 5.05;
  group.add(roof, snow);

  enableShadows(group);
  return group;
}

// 23. Towering Gift Box Pyramid
export function createGiftPyramid(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GiftPyramid';

  const g1 = createGiftBox('red');
  g1.position.set(-0.55, 0, -0.55);
  const g2 = createGiftBox('blue');
  g2.position.set(0.55, 0, -0.55);
  const g3 = createGiftBox('green');
  g3.position.set(-0.55, 0, 0.55);
  const g4 = createGiftBox('red');
  g4.position.set(0.55, 0, 0.55);
  const gTop = createGiftBox('green');
  gTop.position.set(0, 0.94, 0);
  gTop.scale.setScalar(0.85);

  group.add(g1, g2, g3, g4, gTop);
  enableShadows(group);
  return group;
}

// 24. Crystal Ice Swan
export function createIceSwan(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'IceSwan';

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.92, 0.25, 14), materials.iceCrystal);
  ped.position.y = 0.125;
  group.add(ped);

  // Graceful teardrop body + swept feathered wing shells
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 10), materials.iceCrystal);
  body.scale.set(0.7, 0.58, 1.25);
  body.position.set(0, 0.58, 0);
  group.add(body);

  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), materials.iceCrystal);
    wing.scale.set(0.32, 0.65, 1.35);
    wing.position.set(side * 0.36, 0.8, -0.15);
    wing.rotation.set(0.28, side * 0.22, side * -0.25);
    group.add(wing);
  });

  // Tail plume
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 7), materials.iceCrystal);
  tail.rotation.x = -Math.PI * 0.35;
  tail.position.set(0, 0.78, -0.78);
  group.add(tail);

  // Graceful S-curved neck via TubeGeometry
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.72, 0.45),
    new THREE.Vector3(0, 1.08, 0.65),
    new THREE.Vector3(0, 1.46, 0.52),
    new THREE.Vector3(0, 1.66, 0.68),
  ]);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 14, 0.085, 8, false), materials.iceCrystal);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 7), materials.iceCrystal);
  head.position.set(0, 1.66, 0.7);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), materials.goldAccent);
  beak.rotation.x = Math.PI * 0.58;
  beak.position.set(0, 1.62, 0.88);
  group.add(neck, head, beak);

  enableShadows(group);
  return group;
}

// 25. Starry Festival Light Arch
export function createIlluminatedArch(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'IlluminatedArch';

  [-1.8, 1.8].forEach((px) => {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.35, 10), materials.stoneBase);
    plinth.position.set(px, 0.175, 0);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 2.45, 10), materials.streetLampMetal);
    pillar.position.set(px, 1.42, 0);
    group.add(plinth, pillar);
  });

  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 8, 20, Math.PI), materials.streetLampMetal);
  arch.position.set(0, 2.6, 0);
  group.add(arch);

  for (let i = 0; i < 7; i++) {
    const angle = ((i + 1) / 8) * Math.PI;
    const sx = Math.cos(angle) * 1.8;
    const sy = 2.6 + Math.sin(angle) * 1.8;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), materials.starEmissive);
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

  // Glowing ember bed
  const embers = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.1, 10), materials.flameCore);
  embers.position.y = 0.05;
  group.add(embers);

  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.21, 0), materials.stoneBase);
    rock.scale.set(1.1, 0.72, 0.9);
    rock.rotation.y = a;
    rock.position.set(Math.cos(a) * 0.88, 0.14, Math.sin(a) * 0.88);
    group.add(rock);
  }

  for (let l = 0; l < 4; l++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.25, 7), materials.woodTrunk);
    log.rotation.z = Math.PI / 4;
    log.rotation.y = (l * Math.PI) / 4;
    log.position.set(0, 0.44, 0);
    group.add(log);
  }

  const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.74, 8), materials.flameCore);
  outerFlame.position.set(0, 0.55, 0);
  const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 7), materials.starEmissive);
  innerFlame.position.set(0, 0.48, 0);
  group.add(outerFlame, innerFlame);

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

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.16, 12), materials.streetLampMetal);
  base.position.y = 0.08;
  group.add(base);

  // Boots & Trousers
  const legGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.45, 7);
  const bootGeo = getRoundedBoxGeo(0.16, 0.28, 0.24, 0.04, 0.015);
  [-0.12, 0.12].forEach((lx) => {
    const boot = new THREE.Mesh(bootGeo, materials.coal);
    boot.position.set(lx, 0.3, 0.03);
    const leg = new THREE.Mesh(legGeo, materials.whiteIcing);
    leg.position.set(lx, 0.65, 0);
    group.add(boot, leg);
  });

  // Sculpted Emerald Tunic + Gold Belt
  const tunic = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.68, 10), materials.holidayGreen);
  tunic.scale.set(1.1, 1, 0.78);
  tunic.position.y = 1.2;
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.08, 10), materials.goldAccent);
  belt.scale.set(1.1, 1, 0.8);
  belt.position.y = 0.98;
  group.add(tunic, belt);

  // Detailed Marching Snare Drum
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.34, 12), materials.goldAccent);
  drum.position.set(0, 0.98, 0.32);
  const drumHead = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 12), materials.creamEnamel);
  drumHead.position.set(0, 0.98, 0.32);
  group.add(drumHead, drum);

  // Arms holding drumsticks
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.35, 3, 6), materials.holidayGreen);
    arm.position.set(side * 0.28, 1.32, 0.14);
    arm.rotation.set(0.8, 0, side * -0.2);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 5), materials.caramelWood);
    stick.position.set(side * 0.14, 1.2, 0.32);
    stick.rotation.set(1.2, side * 0.4, 0);
    group.add(arm, stick);
  });

  // Head & Shako Hat with Gold Plume
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), materials.skinWarm);
  head.position.set(0, 1.74, 0);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.48, 10), materials.holidayRed);
  hat.position.set(0, 2.1, 0);
  const plume = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), materials.goldAccent);
  plume.position.set(0, 2.38, 0.14);
  group.add(head, hat, plume);

  enableShadows(group);
  return group;
}

// 28. North Pole Mailbox
export function createSantaMailbox(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SantaMailbox';

  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.52, 0.2, 10), materials.snow);
  mount.position.y = 0.1;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.4, 8), materials.woodTrunk);
  post.position.y = 0.8;
  const bracket = new THREE.Mesh(getRoundedBoxGeo(0.5, 0.1, 0.7, 0.03, 0.015), materials.woodTrunk);
  bracket.position.set(0, 1.38, 0.1);
  group.add(mount, post, bracket);

  // Rounded-top vintage postal box
  const box = new THREE.Mesh(getRoundedBoxGeo(0.6, 0.38, 0.9, 0.05, 0.02), materials.holidayRed);
  box.position.set(0, 1.6, 0.1);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12, 1, false, 0, Math.PI), materials.holidayRed);
  cap.rotation.z = Math.PI / 2;
  cap.rotation.y = Math.PI / 2;
  cap.position.set(0, 1.79, 0.1);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), materials.goldAccent);
  handle.position.set(0, 1.68, 0.57);
  const flag = new THREE.Mesh(getRoundedBoxGeo(0.04, 0.32, 0.16, 0.015, 0.008), materials.goldAccent);
  flag.position.set(0.33, 1.85, 0.2);
  const snow = new THREE.Mesh(getRoundedBoxGeo(0.62, 0.08, 0.94, 0.04, 0.02), materials.snow);
  snow.position.set(0, 2.08, 0.1);
  group.add(box, cap, handle, flag, snow);

  enableShadows(group);
  return group;
}

// 29. Golden Christmas Tree Angel
export function createGoldenAngel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GoldenAngel';

  // Sculpted Lathe Flowing Gown
  const gownPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.62, 0.0),
    new THREE.Vector2(0.45, 0.6),
    new THREE.Vector2(0.28, 1.25),
    new THREE.Vector2(0.2, 1.72),
    new THREE.Vector2(0.0, 1.75),
  ];
  const gown = new THREE.Mesh(new THREE.LatheGeometry(gownPts, 14), materials.goldAccent);
  group.add(gown);

  // Head, Hair & Glowing Halo
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 9), materials.skinWarm);
  head.position.set(0, 1.96, 0);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 9, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), materials.brass);
  hair.position.set(0, 1.98, -0.02);
  hair.rotation.x = -0.3;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 14), materials.starEmissive);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 2.24, 0);
  group.add(head, hair, halo);

  // Sculpted Swept Curved Feather Wings
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.45, 0.65, 0.85, 0.55);
  wingShape.quadraticCurveTo(0.68, 0.05, 0.52, -0.35);
  wingShape.quadraticCurveTo(0.22, -0.25, 0, 0);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 5,
  });

  const wingR = new THREE.Mesh(wingGeo, materials.goldAccent);
  wingR.position.set(0.14, 1.5, -0.18);
  wingR.rotation.y = -0.35;
  const wingL = new THREE.Mesh(wingGeo, materials.goldAccent);
  wingL.scale.x = -1;
  wingL.position.set(-0.14, 1.5, -0.18);
  wingL.rotation.y = 0.35;
  group.add(wingL, wingR);

  // Flared Herald Trumpet
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.55, 8), materials.brass);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0, 1.85, 0.35);
  const flare = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.2, 10), materials.brass);
  flare.rotation.x = -Math.PI / 2;
  flare.position.set(0, 1.85, 0.65);
  group.add(tube, flare);

  enableShadows(group);
  return group;
}
