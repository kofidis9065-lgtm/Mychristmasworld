import * as THREE from 'three';
import {
  materials,
  enableShadows,
  getRoundedBoxGeo,
  createSculptedCarouselHorse,
  createSculptedReindeerFigure,
  createCoasterCar,
  createBumperCar,
  createFerrisGondola,
} from './modelMaterials';
import {
  createChristmasTree,
  createMarketStall,
  createGingerbreadHouse,
  createNutcracker,
  createSnowglobe,
  createBellTower,
  createIlluminatedArch,
  createSnowman,
  createLogCampfire,
  createCandyCaneArch,
} from './standardModels';

// 1. Grand Illuminating Ferris Wheel
export function createProFerrisWheel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProFerrisWheel';

  // Boarding deck platform
  const deck = new THREE.Mesh(getRoundedBoxGeo(4.8, 0.25, 2.6, 0.14, 0.03), materials.stoneBase);
  deck.position.y = 0.125;
  group.add(deck);

  // Double-sided A-frame support legs (4 legs meeting front & rear hub axles)
  const legGeo = new THREE.CylinderGeometry(0.13, 0.22, 5.9, 8);
  [-0.95, 0.95].forEach((zOff) => {
    const legL = new THREE.Mesh(legGeo, materials.streetLampMetal);
    legL.position.set(-1.55, 2.95, zOff);
    legL.rotation.z = -0.28;
    const legR = new THREE.Mesh(legGeo, materials.streetLampMetal);
    legR.position.set(1.55, 2.95, zOff);
    legR.rotation.z = 0.28;
    group.add(legL, legR);
  });

  // Hub axle housing
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 2.2, 12), materials.brass);
  axle.rotation.x = Math.PI / 2;
  axle.position.set(0, 5.5, 0);
  group.add(axle);

  const hubCapGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.16, 12);
  hubCapGeo.rotateX(Math.PI / 2);
  const hubF = new THREE.Mesh(hubCapGeo, materials.holidayRed);
  hubF.position.set(0, 5.5, 0.96);
  const hubB = new THREE.Mesh(hubCapGeo, materials.holidayRed);
  hubB.position.set(0, 5.5, -0.96);
  group.add(hubF, hubB);

  // Rotating Wheel Assembly
  const wheelGroup = new THREE.Group();
  wheelGroup.position.set(0, 5.5, 0);

  const rimGeo = new THREE.TorusGeometry(4, 0.11, 10, 32);
  const innerRimGeo = new THREE.TorusGeometry(2.7, 0.07, 8, 24);
  [-0.52, 0.52].forEach((rz) => {
    const rim = new THREE.Mesh(rimGeo, materials.goldAccent);
    rim.position.z = rz;
    const innerRim = new THREE.Mesh(innerRimGeo, materials.brass);
    innerRim.position.z = rz;
    wheelGroup.add(rim, innerRim);
  });

  // 16 Glowing Rim Bulbs (shared geometries & materials)
  const bulbGeo = new THREE.SphereGeometry(0.09, 6, 6);
  const bulbMats = [materials.bulbAmber, materials.bulbRuby, materials.bulbCyan, materials.bulbEmerald];
  for (let b = 0; b < 16; b++) {
    const ang = (b / 16) * Math.PI * 2;
    const bulb = new THREE.Mesh(bulbGeo, bulbMats[b % 4]);
    bulb.position.set(Math.cos(ang) * 4.0, Math.sin(ang) * 4.0, 0.63);
    wheelGroup.add(bulb);
  }

  // Spokes, Crossbars & Sculpted Gondolas
  const gondolas: THREE.Group[] = [];
  const spokeGeo = new THREE.CylinderGeometry(0.035, 0.035, 8, 6);
  const crossGeo = new THREE.CylinderGeometry(0.035, 0.035, 1.04, 6);
  crossGeo.rotateX(Math.PI / 2);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    [-0.52, 0.52].forEach((sz) => {
      const spoke = new THREE.Mesh(spokeGeo, materials.goldAccent);
      spoke.rotation.z = angle;
      spoke.position.z = sz;
      wheelGroup.add(spoke);
    });

    const bar = new THREE.Mesh(crossGeo, materials.brass);
    bar.position.set(Math.cos(angle) * 4, Math.sin(angle) * 4, 0);
    wheelGroup.add(bar);

    const gondola = createFerrisGondola(i % 2 === 0 ? materials.holidayRed : materials.holidayGreen);
    gondola.position.set(Math.cos(angle) * 4, Math.sin(angle) * 4, 0);
    wheelGroup.add(gondola);
    gondolas.push(gondola);
  }

  group.add(wheelGroup);

  group.userData.onUpdate = (elapsed: number) => {
    const rot = elapsed * 0.4;
    wheelGroup.rotation.z = rot;
    gondolas.forEach((g) => {
      g.rotation.z = -rot;
    });
  };

  enableShadows(group);
  return group;
}

// 2. Wonderland Roller Coaster (Twin tubular rails + ties + 3-car streamlined coaster train)
export function createProRollerCoaster(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProRollerCoaster';

  // Twin parallel tubular steel rails
  const outerTrack = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.075, 8, 36), materials.holidayRed);
  outerTrack.position.y = 3.5;
  outerTrack.rotation.x = Math.PI / 2;

  const innerTrack = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.075, 8, 36), materials.holidayRed);
  innerTrack.position.y = 3.5;
  innerTrack.rotation.x = Math.PI / 2;

  const spine = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.11, 8, 36), materials.chromeSteel);
  spine.position.y = 3.36;
  spine.rotation.x = Math.PI / 2;
  group.add(outerTrack, innerTrack, spine);

  // Radial track crossties
  const tieGeo = new THREE.BoxGeometry(0.55, 0.06, 0.12);
  for (let t = 0; t < 24; t++) {
    const ang = (t / 24) * Math.PI * 2;
    const tie = new THREE.Mesh(tieGeo, materials.streetLampMetal);
    tie.position.set(Math.cos(ang) * 3.5, 3.44, Math.sin(ang) * 3.5);
    tie.rotation.y = -ang;
    group.add(tie);
  }

  // Steel A-frame support columns
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cx = Math.cos(a) * 3.5;
    const cz = Math.sin(a) * 3.5;
    const supp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 3.4, 8), materials.streetLampMetal);
    supp.position.set(cx, 1.7, cz);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.18, 8), materials.stoneBase);
    foot.position.set(cx, 0.09, cz);
    group.add(supp, foot);
  }

  // 3-Car Articulated Streamlined Coaster Train
  const cars = [
    createCoasterCar(materials.goldAccent, materials.holidayRed, true),
    createCoasterCar(materials.holidayRed, materials.goldAccent, false),
    createCoasterCar(materials.holidayGreen, materials.goldAccent, false),
  ];
  cars.forEach((c) => group.add(c));

  group.userData.onUpdate = (elapsed: number) => {
    const baseSpeed = elapsed * 1.5;
    cars.forEach((car, idx) => {
      const s = baseSpeed - idx * 0.33;
      car.position.x = Math.cos(s) * 3.5;
      car.position.z = Math.sin(s) * 3.5;
      car.position.y = 3.6 + Math.sin(s * 2) * 0.35;
      car.rotation.y = -s - Math.PI / 2;
      car.rotation.z = Math.cos(s * 2) * 0.14; // Nose pitches up on climbs, down on drops
    });
  };

  enableShadows(group);
  return group;
}

// 3. Victorian Grand Carousel (Sculpted Prancing Horses + Ornate Scalloped Canopy)
export function createProGrandCarousel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProGrandCarousel';

  // Stepped circular timber & gold deck
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.6, 0.2, 24), materials.stoneBase);
  plinth.position.y = 0.1;
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.32, 0.24, 24), materials.woodTrunk);
  deck.position.y = 0.32;
  const deckTrim = new THREE.Mesh(new THREE.TorusGeometry(3.25, 0.05, 6, 24), materials.goldAccent);
  deckTrim.rotation.x = Math.PI / 2;
  deckTrim.position.y = 0.44;
  group.add(plinth, deck, deckTrim);

  // Fluted Center Column with Gold Collar
  const centerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.62, 2.95, 16), materials.creamEnamel);
  centerCol.position.y = 1.85;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.3, 16), materials.goldAccent);
  collar.position.y = 1.0;
  group.add(centerCol, collar);

  // Rotating Canopy & Steed Assembly
  const canopyGroup = new THREE.Group();
  canopyGroup.position.y = 3.3;

  // Alternating Crimson & Cream faceted canopy wedges + gold valance ring + finial
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.55, 1.35, 16), materials.holidayRed);
  canopy.position.y = 0.65;
  const valance = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, 0.28, 16), materials.goldAccent);
  valance.position.y = -0.02;
  const snowRim = new THREE.Mesh(new THREE.ConeGeometry(3.58, 0.35, 16), materials.snow);
  snowRim.position.y = 1.25;
  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), materials.starEmissive);
  finial.position.y = 1.55;
  canopyGroup.add(canopy, valance, snowRim, finial);

  // Twinkling canopy rim lights
  const bulbGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const bulbMats = [materials.bulbAmber, materials.bulbRuby, materials.bulbCyan];
  for (let b = 0; b < 12; b++) {
    const ba = (b / 12) * Math.PI * 2;
    const bulb = new THREE.Mesh(bulbGeo, bulbMats[b % 3]);
    bulb.position.set(Math.cos(ba) * 3.58, 0.0, Math.sin(ba) * 3.58);
    canopyGroup.add(bulb);
  }

  // 4 Brass Poles with Sculpted Prancing Carousel Horses
  const horses: THREE.Group[] = [];
  const coats = [materials.horseIvory, materials.horseChestnut, materials.horseDapple, materials.horseIvory];
  const saddles = [materials.holidayRed, materials.holidayGreen, materials.holidayBlue, materials.crimsonVelvet];

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const hx = Math.cos(a) * 2.25;
    const hz = Math.sin(a) * 2.25;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.85, 8), materials.brass);
    pole.position.set(hx, -1.42, hz);
    canopyGroup.add(pole);

    const horse = createSculptedCarouselHorse(coats[i], saddles[i], materials.goldAccent, 1.3);
    horse.position.set(hx, -1.45, hz);
    horse.rotation.y = -a + Math.PI / 2; // Face forward along carousel rotation!
    canopyGroup.add(horse);
    horses.push(horse);
  }

  group.add(canopyGroup);

  group.userData.onUpdate = (elapsed: number) => {
    canopyGroup.rotation.y = elapsed * 0.8;
    horses.forEach((h, idx) => {
      h.position.y = -1.45 + Math.sin(elapsed * 3 + idx * Math.PI * 0.5) * 0.24;
    });
  };

  enableShadows(group);
  return group;
}

// 4. Amusement Park Express Train (Realistic Steam Locomotive + Coupled Tender Coach on Sleeper Track)
export function createProExpressTrain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProExpressTrain';

  // Dual steel rails + radial timber crossties
  const outerRail = new THREE.Mesh(new THREE.TorusGeometry(3.18, 0.045, 6, 36), materials.chromeSteel);
  outerRail.position.y = 0.08;
  outerRail.rotation.x = Math.PI / 2;
  const innerRail = new THREE.Mesh(new THREE.TorusGeometry(2.82, 0.045, 6, 36), materials.chromeSteel);
  innerRail.position.y = 0.08;
  innerRail.rotation.x = Math.PI / 2;
  group.add(outerRail, innerRail);

  const tieGeo = new THREE.BoxGeometry(0.55, 0.04, 0.1);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const tie = new THREE.Mesh(tieGeo, materials.woodTrunk);
    tie.position.set(Math.cos(a) * 3.0, 0.03, Math.sin(a) * 3.0);
    tie.rotation.y = -a;
    group.add(tie);
  }

  // Helper to build detailed miniature locomotive aligned along local +Z (since rotY = -angle + PI/2 aligns local +X? Wait: let's check!)
  // Wait: trainEngine.position = (cos(angle)*3, 0.05, sin(angle)*3).
  // Velocity vector d/d(angle) = (-sin(angle), cos(angle)).
  // In original code: body Box(0.8, 0.6, 1.2) had length 1.2 along Z, cabin at z = -0.3.
  // When rotY = -angle + Math.PI/2, local +Z = (sin(rotY), cos(rotY)) = (cos(angle), sin(angle))? Wait:
  // sin(-a + pi/2) = cos(a), cos(-a + pi/2) = sin(a). So local +Z points OUTWARD radially, and local +X = (cos(rotY), -sin(rotY)) = (sin(a), -cos(a)) points TANGENTIALLY!
  // Let's orient locomotive length along local +X? Wait: originally cabin was at z = -0.3, so it faced sideways or rotated; let's check what looks right!
  // Let's make sure the locomotive front points TANGENTIALLY along the track!
  // Tangent vector as angle increases: dx/da = -sin(a), dz/da = cos(a).
  // With rotY = -angle + Math.PI / 2:
  // Local +X in world = (cos(-a+pi/2), 0, -sin(-a+pi/2)) = (sin(a), 0, -cos(a)) -> exact negative tangent (or backward tangent).
  // Local -X in world = (-sin(a), 0, cos(a)) -> exact forward tangent!
  // So building the locomotive pointing along -X (cowcatcher at -X, cab at +X, coupled tender trailing at +X) makes it drive nose-first smoothly around the circle!
  const trainEngine = new THREE.Group();

  // Locomotive frame & 6 wheels
  const frame = new THREE.Mesh(getRoundedBoxGeo(1.45, 0.14, 0.68, 0.04, 0.015), materials.streetLampMetal);
  frame.position.y = 0.24;
  trainEngine.add(frame);

  const wGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.06, 10);
  wGeo.rotateX(Math.PI / 2);
  [-0.45, 0.0, 0.45].forEach((wx) => {
    [-0.36, 0.36].forEach((wz) => {
      const wheel = new THREE.Mesh(wGeo, materials.coal);
      wheel.position.set(wx, 0.18, wz);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), materials.brass);
      hub.position.set(wx, 0.18, wz + (wz > 0 ? 0.03 : -0.03));
      trainEngine.add(wheel, hub);
    });
  });

  // Cylindrical Crimson Boiler + Brass Bands + Dome + Smokestack + Cowcatcher + Headlamp
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.85, 12), materials.holidayRed);
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(-0.18, 0.56, 0);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.38, 10), materials.streetLampMetal);
  stack.position.set(-0.46, 0.92, 0);
  const stackLip = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 5, 10), materials.brass);
  stackLip.rotation.x = Math.PI / 2;
  stackLip.position.set(-0.46, 1.11, 0);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 7), materials.brass);
  dome.position.set(-0.12, 0.86, 0);
  const headlamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.12, 8), materials.emissiveWindow);
  headlamp.rotation.z = Math.PI / 2;
  headlamp.position.set(-0.66, 0.58, 0);
  const catcher = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 4), materials.brass);
  catcher.rotation.z = -Math.PI / 2;
  catcher.rotation.y = Math.PI / 4;
  catcher.position.set(-0.78, 0.24, 0);
  trainEngine.add(boiler, stack, stackLip, dome, headlamp, catcher);

  // Engineer Cab + Glowing Windows + Snowy Roof
  const cab = new THREE.Mesh(getRoundedBoxGeo(0.56, 0.68, 0.66, 0.05, 0.02), materials.holidayGreen);
  cab.position.set(0.45, 0.62, 0);
  const cabRoof = new THREE.Mesh(getRoundedBoxGeo(0.66, 0.09, 0.76, 0.04, 0.02), materials.snow);
  cabRoof.position.set(0.45, 0.98, 0);
  const winGeo = new THREE.PlaneGeometry(0.22, 0.22);
  const winL = new THREE.Mesh(winGeo, materials.emissiveWindow);
  winL.position.set(0.45, 0.72, 0.34);
  const winR = new THREE.Mesh(winGeo, materials.emissiveWindow);
  winR.position.set(0.45, 0.72, -0.34);
  winR.rotation.y = Math.PI;
  trainEngine.add(cab, cabRoof, winL, winR);

  // Trailing Festive Passenger Coach (independently positioned along the curve!)
  const coach = new THREE.Group();
  const cChassis = new THREE.Mesh(getRoundedBoxGeo(1.15, 0.14, 0.64, 0.04, 0.015), materials.streetLampMetal);
  cChassis.position.y = 0.24;
  const cBody = new THREE.Mesh(getRoundedBoxGeo(1.08, 0.58, 0.62, 0.05, 0.02), materials.holidayRed);
  cBody.position.y = 0.58;
  const cRoof = new THREE.Mesh(getRoundedBoxGeo(1.16, 0.1, 0.7, 0.05, 0.02), materials.snow);
  cRoof.position.y = 0.9;
  [-0.36, 0.36].forEach((wx) => {
    [-0.34, 0.34].forEach((wz) => {
      const cw = new THREE.Mesh(wGeo, materials.coal);
      cw.position.set(wx, 0.18, wz);
      coach.add(cw);
    });
  });
  [-0.25, 0.25].forEach((cx) => {
    const cWinL = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), materials.emissiveWindow);
    cWinL.position.set(cx, 0.62, 0.32);
    const cWinR = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), materials.emissiveWindow);
    cWinR.position.set(cx, 0.62, -0.32);
    cWinR.rotation.y = Math.PI;
    coach.add(cWinL, cWinR);
  });
  coach.add(cChassis, cBody, cRoof);

  group.add(trainEngine, coach);

  group.userData.onUpdate = (elapsed: number) => {
    const angle = elapsed * 1.2;
    trainEngine.position.set(Math.cos(angle) * 3.0, 0.05, Math.sin(angle) * 3.0);
    trainEngine.rotation.y = -angle + Math.PI / 2;

    const coachAngle = angle - 0.52;
    coach.position.set(Math.cos(coachAngle) * 3.0, 0.05, Math.sin(coachAngle) * 3.0);
    coach.rotation.y = -coachAngle + Math.PI / 2;
  };

  enableShadows(group);
  return group;
}

// 5. Bumper Car Arena (Illuminated Rink, Canopy Grid, & Contoured Bumper Cars)
export function createProBumperCars(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProBumperCars';

  // Beveled rink platform + striped safety border curb
  const base = new THREE.Mesh(getRoundedBoxGeo(4.8, 0.24, 4.8, 0.35, 0.04), materials.stoneBase);
  base.position.y = 0.12;
  const floor = new THREE.Mesh(getRoundedBoxGeo(4.4, 0.06, 4.4, 0.3, 0.02), materials.royalNavy);
  floor.position.y = 0.25;
  group.add(base, floor);

  // 4 Corner Steel Canopy Posts & Illuminated Overhead Spark Grid Canopy
  const postGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.05, 8);
  [
    [-2.05, 2.05],
    [2.05, 2.05],
    [-2.05, -2.05],
    [2.05, -2.05],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, materials.chromeSteel);
    post.position.set(px, 1.22, pz);
    group.add(post);
  });

  const canopyFrame = new THREE.Mesh(getRoundedBoxGeo(4.5, 0.18, 4.5, 0.32, 0.03), materials.holidayRed);
  canopyFrame.position.y = 2.26;
  const canopyGlow = new THREE.Mesh(getRoundedBoxGeo(4.0, 0.06, 4.0, 0.24, 0.015), materials.emissiveWindow);
  canopyGlow.position.y = 2.2;
  group.add(canopyFrame, canopyGlow);

  // 2 Contoured Bumper Cars
  const car1 = createBumperCar(materials.holidayRed, materials.bulbAmber);
  const car2 = createBumperCar(materials.baubleCyan, materials.bulbCyan);
  group.add(car1, car2);

  group.userData.onUpdate = (elapsed: number) => {
    car1.position.set(Math.sin(elapsed * 2) * 1.2, 0.28, Math.cos(elapsed * 1.5) * 1.2);
    car1.rotation.y = elapsed * 1.5;
    car2.position.set(Math.cos(elapsed * 1.8) * 1.2, 0.28, Math.sin(elapsed * 2.2) * 1.2);
    car2.rotation.y = -elapsed * 1.8;
  };

  enableShadows(group);
  return group;
}

// 6. Flying Chair Waveswinger (Anchored Suspension Chains & Contoured Swing Chairs!)
export function createProSwingRide(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProSwingRide';

  // Sculpted Lathe Pedestal Column
  const pedPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(1.1, 0.0),
    new THREE.Vector2(0.95, 0.35),
    new THREE.Vector2(0.55, 0.8),
    new THREE.Vector2(0.42, 2.5),
    new THREE.Vector2(0.36, 4.4),
    new THREE.Vector2(0.62, 4.75),
    new THREE.Vector2(0.0, 4.8),
  ];
  const tower = new THREE.Mesh(new THREE.LatheGeometry(pedPts, 16), materials.creamEnamel);
  group.add(tower);

  const trimRing = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.06, 6, 16), materials.goldAccent);
  trimRing.rotation.x = Math.PI / 2;
  trimRing.position.y = 0.36;
  group.add(trimRing);

  // Rotating Ornate Crown & Anchored Swing Chairs
  const topDisc = new THREE.Group();
  topDisc.position.y = 4.85;

  const crownSkirt = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.2, 0.36, 18), materials.goldAccent);
  const crownTop = new THREE.Mesh(new THREE.ConeGeometry(2.4, 0.85, 18), materials.holidayRed);
  crownTop.position.y = 0.58;
  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), materials.starEmissive);
  finial.position.y = 1.15;
  topDisc.add(crownSkirt, crownTop, finial);

  const chairPivots: THREE.Group[] = [];
  const chainGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.95, 5);
  const chairMats = [materials.holidayRed, materials.holidayGreen, materials.holidayBlue];

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(a) * 1.95, -0.1, Math.sin(a) * 1.95);
    pivot.rotation.y = -a; // Local +X points radially outward!

    // Dual V-chains connecting crown rim cleanly to swing seat
    [-0.14, 0.14].forEach((cz) => {
      const chain = new THREE.Mesh(chainGeo, materials.chromeSteel);
      chain.position.set(0, -0.97, cz);
      pivot.add(chain);
    });

    // Contoured Swing Seat (cushion + curved backrest + safety bar)
    const seat = new THREE.Mesh(getRoundedBoxGeo(0.42, 0.09, 0.44, 0.05, 0.015), chairMats[i % 3]);
    seat.position.set(0, -1.96, 0);
    const back = new THREE.Mesh(getRoundedBoxGeo(0.08, 0.38, 0.42, 0.04, 0.015), chairMats[i % 3]);
    back.position.set(-0.17, -1.78, 0);
    back.rotation.z = 0.15;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), materials.goldAccent);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0.14, -1.74, 0);
    pivot.add(seat, back, bar);

    topDisc.add(pivot);
    chairPivots.push(pivot);
  }

  group.add(topDisc);

  group.userData.onUpdate = (elapsed: number) => {
    topDisc.rotation.y = elapsed * 1.8;
    const swingAngle = 0.34 + Math.sin(elapsed * 2) * 0.14;
    chairPivots.forEach((p, idx) => {
      p.rotation.z = swingAngle + Math.sin(elapsed * 2.5 + idx) * 0.04;
    });
  };

  enableShadows(group);
  return group;
}

// 7. Festive Hot Air Balloon (Teardrop Gore Envelope, Burner Flame, Ropes & Woven Basket)
export function createProHotAirBalloon(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProHotAirBalloon';

  const balloonGroup = new THREE.Group();

  // Lathe teardrop envelope profile
  const envPts = [
    new THREE.Vector2(0.0, 3.6),
    new THREE.Vector2(0.65, 3.65),
    new THREE.Vector2(1.25, 4.15),
    new THREE.Vector2(1.85, 4.85),
    new THREE.Vector2(2.15, 5.6),
    new THREE.Vector2(2.02, 6.4),
    new THREE.Vector2(1.48, 7.1),
    new THREE.Vector2(0.68, 7.52),
    new THREE.Vector2(0.0, 7.64),
  ];
  const envelope = new THREE.Mesh(new THREE.LatheGeometry(envPts, 16), materials.holidayRed);
  balloonGroup.add(envelope);

  // Contrasting Gold Gore Ribs & Crown Medallion
  for (let g = 0; g < 6; g++) {
    const gore = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.06, 6, 18, Math.PI * 0.78), materials.goldAccent);
    gore.position.y = 5.6;
    gore.rotation.y = (g / 6) * Math.PI * 2;
    gore.rotation.z = -Math.PI * 0.38;
    balloonGroup.add(gore);
  }

  // Glowing Burner Flame + Rim
  const burnerRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 12), materials.brass);
  burnerRing.rotation.x = Math.PI / 2;
  burnerRing.position.y = 3.55;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 8), materials.flameCore);
  flame.position.y = 3.55;
  balloonGroup.add(burnerRing, flame);

  // 4 Suspension Ropes & Rounded Woven Wicker Basket
  const ropeGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.32, 5);
  [
    [-0.4, 0.4],
    [0.4, 0.4],
    [-0.4, -0.4],
    [0.4, -0.4],
  ].forEach(([rx, rz]) => {
    const rope = new THREE.Mesh(ropeGeo, materials.creamEnamel);
    rope.position.set(rx, 2.95, rz);
    balloonGroup.add(rope);
  });

  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.46, 0.72, 12), materials.caramelWood);
  basket.position.y = 2.25;
  const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.055, 6, 14), materials.saddleLeather);
  basketRim.rotation.x = Math.PI / 2;
  basketRim.position.y = 2.61;
  balloonGroup.add(basket, basketRim);

  group.add(balloonGroup);

  group.userData.onUpdate = (elapsed: number) => {
    balloonGroup.position.y = Math.sin(elapsed * 1.2) * 0.65;
    balloonGroup.rotation.y = elapsed * 0.2;
  };

  enableShadows(group);
  return group;
}

// 8. Twirling Ice Skating Couple
export function createProSkatingCouple(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProSkatingCouple';

  // Frosted Ice Rink Pedestal + Snow Border
  const border = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.26, 0.24, 24), materials.snow);
  border.position.y = 0.12;
  const ice = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 1.92, 0.08, 24), materials.frozenIce);
  ice.position.y = 0.24;
  group.add(border, ice);

  const coupleGroup = new THREE.Group();
  coupleGroup.position.y = 0.28;

  // Helper for Stylized Figure Skater
  const buildSkater = (coatMat: THREE.Material, hasSkirt: boolean) => {
    const skater = new THREE.Group();

    // Skates (blades + boots)
    [-0.09, 0.09].forEach((sx) => {
      const blade = new THREE.Mesh(getRoundedBoxGeo(0.03, 0.04, 0.26, 0.01, 0.005), materials.chromeSteel);
      blade.position.set(sx, 0.02, 0.02);
      const boot = new THREE.Mesh(getRoundedBoxGeo(0.09, 0.14, 0.2, 0.03, 0.01), materials.coal);
      boot.position.set(sx, 0.1, 0.01);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.34, 7), hasSkirt ? materials.skinWarm : materials.royalNavy);
      leg.position.set(sx, 0.32, 0);
      skater.add(blade, boot, leg);
    });

    // Flared Dress/Coat + Torso
    const skirt = new THREE.Mesh(new THREE.ConeGeometry(hasSkirt ? 0.28 : 0.2, 0.45, 10), coatMat);
    skirt.position.y = 0.62;
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.13, 0.35, 9), coatMat);
    chest.position.y = 0.92;
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 6, 10), materials.whiteIcing);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 1.09;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 9, 8), materials.skinWarm);
    head.position.y = 1.24;
    const hat = new THREE.Mesh(
      hasSkirt ? new THREE.ConeGeometry(0.15, 0.24, 9) : new THREE.CylinderGeometry(0.13, 0.14, 0.22, 9),
      hasSkirt ? materials.holidayRed : materials.coal
    );
    hat.position.y = 1.41;
    skater.add(skirt, chest, scarf, head, hat);

    // Outstretched arms holding partner's hands
    [-1, 1].forEach((side) => {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.28, 3, 6), coatMat);
      arm.rotation.z = Math.PI / 2 - 0.2;
      arm.rotation.y = side * 0.4;
      arm.position.set(0.2, 0.95, side * 0.1);
      skater.add(arm);
    });

    return skater;
  };

  const skater1 = buildSkater(materials.holidayRed, false);
  skater1.position.x = -0.36;
  const skater2 = buildSkater(materials.baubleCyan, true);
  skater2.position.x = 0.36;
  skater2.rotation.y = Math.PI; // Facing each other holding hands!

  coupleGroup.add(skater1, skater2);
  group.add(coupleGroup);

  group.userData.onUpdate = (elapsed: number) => {
    coupleGroup.rotation.y = elapsed * 2.0;
    coupleGroup.position.x = Math.sin(elapsed * 1.5) * 0.6;
    coupleGroup.position.z = Math.cos(elapsed * 1.5) * 0.6;
  };

  enableShadows(group);
  return group;
}

// 9. Gingerbread Funhouse
export function createProGingerbreadFunhouse(): THREE.Group {
  const group = createGingerbreadHouse();
  group.name = 'ProGingerbreadFunhouse';

  // Candy Cane Doorway Arch + Hinged Peppermint Swinging Door
  const doorArch = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 6, 12, Math.PI), materials.holidayRed);
  doorArch.position.set(0, 1.08, 1.04);
  group.add(doorArch);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.28, 0.6, 1.04);
  const door = new THREE.Mesh(getRoundedBoxGeo(0.56, 1.06, 0.08, 0.04, 0.015), materials.baubleGold);
  door.position.x = 0.28;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), materials.holidayRed);
  knob.position.set(0.46, 0, 0.06);
  doorPivot.add(door, knob);
  group.add(doorPivot);

  group.userData.onUpdate = (elapsed: number) => {
    doorPivot.rotation.y = Math.sin(elapsed * 2.5) * 0.65;
  };

  enableShadows(group);
  return group;
}

// 10. Churros & Hot Cocoa Stand
export function createProChurrosCocoaStand(): THREE.Group {
  const group = createMarketStall();
  group.name = 'ProChurrosCocoaStand';

  // Giant Ceramic Cocoa Mug Sign atop Canopy
  const signMug = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.42, 12), materials.holidayRed);
  signMug.position.set(0, 2.95, 0.2);
  const cocoaTop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 10), materials.woodTrunk);
  cocoaTop.position.set(0, 3.15, 0.2);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.035, 6, 10), materials.holidayRed);
  handle.position.set(0.28, 2.95, 0.2);
  group.add(signMug, cocoaTop, handle);

  // Rising Multi-puff Soft Steam Cloud
  const steamGroup = new THREE.Group();
  steamGroup.position.set(0, 3.3, 0.2);
  const puffs: THREE.Mesh[] = [];
  for (let p = 0; p < 3; p++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16 - p * 0.025, 8, 7), materials.steamWhite);
    puff.userData.noCastShadow = true;
    puff.position.set((p - 1) * 0.12, p * 0.24, 0);
    steamGroup.add(puff);
    puffs.push(puff);
  }
  group.add(steamGroup);

  group.userData.onUpdate = (elapsed: number) => {
    puffs.forEach((puff, idx) => {
      const phase = (elapsed * 1.2 + idx * 0.35) % 1;
      puff.position.y = phase * 0.85;
      puff.position.x = Math.sin(elapsed * 2 + idx) * 0.12;
      puff.scale.setScalar(0.75 + Math.sin(phase * Math.PI) * 0.55);
    });
  };

  enableShadows(group);
  return group;
}

// 11. Ring Toss Carnival Game Booth
export function createProCarnivalGameBooth(): THREE.Group {
  const group = createMarketStall();
  group.name = 'ProCarnivalGameBooth';

  // Target Rail + Sculpted Moving Star/Duck Target
  const rail = new THREE.Mesh(getRoundedBoxGeo(1.75, 0.06, 0.08, 0.02, 0.01), materials.brass);
  rail.position.set(0, 0.92, 0.1);
  group.add(rail);

  const target = new THREE.Group();
  target.position.set(0, 1.22, 0.1);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12), materials.holidayRed);
  disc.rotation.x = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12), materials.whiteIcing);
  ring.rotation.x = Math.PI / 2;
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 7), materials.starEmissive);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 6), materials.brass);
  stem.position.y = -0.2;
  target.add(disc, ring, center, stem);
  group.add(target);

  group.userData.onUpdate = (elapsed: number) => {
    target.position.x = Math.sin(elapsed * 2.8) * 0.72;
  };

  enableShadows(group);
  return group;
}

// 12. Golden Christmas Clock Tower
export function createProClockTower(): THREE.Group {
  const group = createBellTower();
  group.name = 'ProClockTower';

  // Glowing Illuminated Clock Faces (Front & Back) with Hour/Minute Hands
  [0.92, -0.92].forEach((cz, side) => {
    const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 16), materials.goldAccent);
    bezel.rotation.x = Math.PI / 2;
    bezel.position.set(0, 2.15, cz);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.09, 16), materials.emissiveWindow);
    face.rotation.x = Math.PI / 2;
    face.position.set(0, 2.15, cz + (side === 0 ? 0.01 : -0.01));
    const handH = new THREE.Mesh(getRoundedBoxGeo(0.05, 0.22, 0.03, 0.01, 0.005), materials.coal);
    handH.position.set(0, 2.22, cz + (side === 0 ? 0.06 : -0.06));
    const handM = new THREE.Mesh(getRoundedBoxGeo(0.04, 0.32, 0.03, 0.01, 0.005), materials.coal);
    handM.position.set(0.11, 2.15, cz + (side === 0 ? 0.06 : -0.06));
    handM.rotation.z = -Math.PI / 2;
    group.add(bezel, face, handH, handM);
  });

  // Swinging Golden Disc Pendulum
  const pendulumPivot = new THREE.Group();
  pendulumPivot.position.set(0, 2.9, 0.95);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.45, 6), materials.goldAccent);
  rod.position.y = -0.72;
  const bob = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), materials.brass);
  bob.rotation.x = Math.PI / 2;
  bob.position.y = -1.45;
  pendulumPivot.add(rod, bob);
  group.add(pendulumPivot);

  group.userData.onUpdate = (elapsed: number) => {
    pendulumPivot.rotation.z = Math.sin(elapsed * 3.5) * 0.3;
  };

  enableShadows(group);
  return group;
}

// 13. Sparkling Fireworks Cannon
export function createProFireworksLauncher(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProFireworksLauncher';

  // Timber Pyrotechnic Crate + 3 Angled Brass Mortar Tubes
  const crate = new THREE.Mesh(getRoundedBoxGeo(1.1, 0.65, 1.1, 0.06, 0.02), materials.timberWall);
  crate.position.y = 0.325;
  group.add(crate);

  [-0.25, 0, 0.25].forEach((mx, i) => {
    const mortar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 1.05, 10), materials.brass);
    mortar.position.set(mx, 0.85, 0);
    mortar.rotation.z = (i - 1) * -0.18;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 5, 10), materials.goldAccent);
    lip.rotation.x = Math.PI / 2;
    lip.position.set(mx + (i - 1) * 0.09, 1.36, 0);
    group.add(mortar, lip);
  });

  // Multi-Star Bursting Cluster
  const burstGroup = new THREE.Group();
  burstGroup.position.y = 1.4;
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), materials.starEmissive);
  burstGroup.add(core);

  const sparkGeo = new THREE.SphereGeometry(0.11, 6, 5);
  const sparkMats = [materials.bulbRuby, materials.bulbCyan, materials.bulbAmber, materials.bulbEmerald];
  for (let s = 0; s < 8; s++) {
    const sa = (s / 8) * Math.PI * 2;
    const sp = new THREE.Mesh(sparkGeo, sparkMats[s % 4]);
    sp.position.set(Math.cos(sa) * 0.55, Math.sin(sa * 2) * 0.25, Math.sin(sa) * 0.55);
    burstGroup.add(sp);
  }
  group.add(burstGroup);

  group.userData.onUpdate = (elapsed: number) => {
    const cycle = (elapsed * 2) % 3;
    if (cycle < 1.8) {
      burstGroup.position.y = 1.4 + cycle * 3.8;
      burstGroup.scale.setScalar(0.45 + cycle * 0.85);
      burstGroup.rotation.y = elapsed * 2;
      burstGroup.visible = true;
    } else {
      burstGroup.visible = false;
    }
  };

  enableShadows(group);
  return group;
}

// 14. Northern Lights Laser Sweep
export function createProLaserProjector(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProLaserProjector';

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.25, 12), materials.streetLampMetal);
  base.position.y = 0.125;
  const yoke = new THREE.Mesh(getRoundedBoxGeo(0.95, 0.55, 0.28, 0.05, 0.02), materials.streetLampMetal);
  yoke.position.y = 0.5;
  group.add(base, yoke);

  // Gimbal Optical Projector Head + Dual Aurora Beams
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.72;

  const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.65, 12), materials.royalNavy);
  const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 6, 12), materials.chromeSteel);
  lensRing.rotation.x = Math.PI / 2;
  lensRing.position.y = 0.33;
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), materials.bulbCyan);
  lens.position.y = 0.28;
  headGroup.add(casing, lensRing, lens);

  const outerBeam = new THREE.Mesh(new THREE.ConeGeometry(1.15, 7.8, 14, 1, true), materials.auroraBeam);
  outerBeam.position.y = 4.2;
  outerBeam.rotation.x = Math.PI;
  outerBeam.userData.noCastShadow = true;

  const innerBeam = new THREE.Mesh(new THREE.ConeGeometry(0.45, 7.6, 10, 1, true), materials.spotBeam);
  innerBeam.position.y = 4.1;
  innerBeam.rotation.x = Math.PI;
  innerBeam.userData.noCastShadow = true;
  headGroup.add(outerBeam, innerBeam);

  group.add(headGroup);

  group.userData.onUpdate = (elapsed: number) => {
    headGroup.rotation.z = Math.sin(elapsed * 2) * 0.45;
    headGroup.rotation.x = Math.cos(elapsed * 1.8) * 0.28;
  };

  enableShadows(group);
  return group;
}

// 15. Giant Snow Dome Ride
export function createProSnowGlobeDome(): THREE.Group {
  const group = createSnowglobe();
  group.name = 'ProSnowGlobeDome';
  group.scale.set(1.5, 1.5, 1.5);
  return group;
}

// 16. Marching Brass Quintet (3 Sculpted Carol Musicians with Shako Hats & Brass Instruments!)
export function createProBrassBand(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProBrassBand';

  // Festive Raised Bandstand Stage
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.9, 0.28, 18), materials.woodTrunk);
  stage.position.y = 0.14;
  const stageTrim = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.05, 6, 18), materials.goldAccent);
  stageTrim.rotation.x = Math.PI / 2;
  stageTrim.position.y = 0.28;
  group.add(stage, stageTrim);

  const musicians: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const mus = new THREE.Group();
    mus.position.set((i - 1) * 0.92, 0.28, i === 1 ? -0.15 : 0.1);

    // Legs & Boots
    [-0.09, 0.09].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.45, 7), materials.coal);
      leg.position.set(lx, 0.22, 0);
      mus.add(leg);
    });

    // Tailored Crimson Band Tunic + Gold Sash + Epaulets
    const coat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.62, 10), materials.holidayRed);
    coat.position.y = 0.72;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 8), materials.skinWarm);
    head.position.y = 1.18;
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.34, 10), materials.coal);
    hat.position.y = 1.42;
    const plume = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), materials.goldAccent);
    plume.position.set(0, 1.62, 0.1);
    mus.add(coat, head, hat, plume);

    // Instruments: Trumpet (left), Tuba (center), Snare Drum (right)
    if (i === 0) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 8), materials.brass);
      horn.rotation.x = -Math.PI / 2;
      horn.position.set(0, 1.12, 0.34);
      mus.add(horn);
    } else if (i === 1) {
      const tuba = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 6, 12), materials.brass);
      tuba.position.set(0.1, 0.85, 0.18);
      const bell = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.24, 10), materials.brass);
      bell.position.set(0.22, 1.24, 0.18);
      mus.add(tuba, bell);
    } else {
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 10), materials.goldAccent);
      drum.position.set(0, 0.68, 0.28);
      mus.add(drum);
    }

    group.add(mus);
    musicians.push(mus);
  }

  group.userData.onUpdate = (elapsed: number) => {
    musicians.forEach((m, idx) => {
      m.rotation.z = Math.sin(elapsed * 4 + idx) * 0.14;
    });
  };

  enableShadows(group);
  return group;
}

// 17. Flying Reindeer Ride (Distinct Blue & Gold Canopy + Sculpted Prancing Reindeer!)
export function createProReindeerCarousel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProReindeerCarousel';

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.6, 0.2, 24), materials.snow);
  plinth.position.y = 0.1;
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.32, 0.24, 24), materials.royalNavy);
  deck.position.y = 0.32;
  group.add(plinth, deck);

  const centerCol = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.6, 2.95, 16), materials.goldAccent);
  centerCol.position.y = 1.85;
  group.add(centerCol);

  const canopyGroup = new THREE.Group();
  canopyGroup.position.y = 3.3;

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.55, 1.35, 16), materials.holidayBlue);
  canopy.position.y = 0.65;
  const valance = new THREE.Mesh(new THREE.CylinderGeometry(3.55, 3.55, 0.26, 16), materials.goldAccent);
  valance.position.y = -0.02;
  const snowRim = new THREE.Mesh(new THREE.ConeGeometry(3.58, 0.38, 16), materials.snow);
  snowRim.position.y = 1.24;
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), materials.starEmissive);
  star.position.y = 1.56;
  canopyGroup.add(canopy, valance, snowRim, star);

  const reindeerSteeds: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const rx = Math.cos(a) * 2.25;
    const rz = Math.sin(a) * 2.25;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.85, 8), materials.brass);
    pole.position.set(rx, -1.42, rz);
    canopyGroup.add(pole);

    const deer = createSculptedReindeerFigure({
      coatMat: i % 2 === 0 ? materials.reindeerCoat : materials.caramelWood,
      antlerMat: materials.goldAccent,
      noseMat: i === 0 ? materials.bulbRuby : materials.baubleRuby,
      collarMat: materials.holidayRed,
      grounded: false,
      scale: 0.92,
    });
    deer.position.set(rx, -1.45, rz);
    deer.rotation.y = -a + Math.PI / 2;
    canopyGroup.add(deer);
    reindeerSteeds.push(deer);
  }

  group.add(canopyGroup);

  group.userData.onUpdate = (elapsed: number) => {
    canopyGroup.rotation.y = elapsed * 0.85;
    reindeerSteeds.forEach((d, idx) => {
      d.position.y = -1.45 + Math.sin(elapsed * 3.2 + idx * Math.PI * 0.5) * 0.28;
    });
  };

  enableShadows(group);
  return group;
}

// 18. Glacier Ice Toboggan Slide
export function createProIceSlideSled(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProIceSlideSled';

  // Timber starting tower & support struts
  const tower = new THREE.Mesh(getRoundedBoxGeo(1.4, 2.35, 1.2, 0.06, 0.02), materials.timberWall);
  tower.position.set(0, 1.175, -2.2);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.07, 6, 12, Math.PI), materials.holidayRed);
  arch.position.set(0, 2.35, -1.65);
  group.add(tower, arch);

  // Sloped frozen ice chute + raised safety side rails
  const rampGroup = new THREE.Group();
  rampGroup.position.set(0, 1.38, 0.15);
  rampGroup.rotation.x = 0.34; // Slopes downward toward +Z!
  const iceBed = new THREE.Mesh(getRoundedBoxGeo(1.22, 0.16, 4.9, 0.05, 0.02), materials.frozenIce);
  const railL = new THREE.Mesh(getRoundedBoxGeo(0.1, 0.28, 4.9, 0.03, 0.015), materials.snow);
  railL.position.set(-0.62, 0.14, 0);
  const railR = new THREE.Mesh(getRoundedBoxGeo(0.1, 0.28, 4.9, 0.03, 0.015), materials.snow);
  railR.position.set(0.62, 0.14, 0);
  rampGroup.add(iceBed, railL, railR);
  group.add(rampGroup);

  // Sculpted Wooden Toboggan Sled with Curled Runners
  const sled = new THREE.Group();
  const deck = new THREE.Mesh(getRoundedBoxGeo(0.68, 0.1, 1.05, 0.06, 0.02), materials.holidayRed);
  deck.position.y = 0.14;
  const cushion = new THREE.Mesh(getRoundedBoxGeo(0.56, 0.12, 0.72, 0.05, 0.02), materials.emeraldVelvet);
  cushion.position.set(0, 0.24, -0.05);
  [-0.26, 0.26].forEach((rx) => {
    const runner = new THREE.Mesh(getRoundedBoxGeo(0.05, 0.06, 1.12, 0.02, 0.01), materials.goldAccent);
    runner.position.set(rx, 0.04, 0);
    sled.add(runner);
  });
  sled.add(deck, cushion);
  sled.rotation.x = 0.34;
  group.add(sled);

  group.userData.onUpdate = (elapsed: number) => {
    const t = (elapsed * 1.4) % 2;
    const progress = t / 2;
    sled.position.set(0, 2.28 - progress * 1.55, -1.8 + progress * 4.0);
  };

  enableShadows(group);
  return group;
}

// 19. Grand Holiday Circus Tent
export function createProCircusTent(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProCircusTent';

  // Striped lower tent walls + peaked big-top dome
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.45, 1.25, 16), materials.creamEnamel);
  lower.position.y = 0.625;
  const tent = new THREE.Mesh(new THREE.ConeGeometry(3.55, 2.65, 16), materials.holidayRed);
  tent.position.y = 2.55;
  const valance = new THREE.Mesh(new THREE.TorusGeometry(3.48, 0.1, 6, 16), materials.goldAccent);
  valance.rotation.x = Math.PI / 2;
  valance.position.y = 1.26;
  const pennant = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.65, 6), materials.goldAccent);
  pennant.position.y = 4.15;

  // Curtained entrance doorway
  const entry = new THREE.Mesh(getRoundedBoxGeo(1.15, 1.1, 0.4, 0.08, 0.02), materials.crimsonVelvet);
  entry.position.set(0, 0.55, 3.32);
  const entryGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.9), materials.emissiveWindow);
  entryGlow.position.set(0, 0.52, 3.53);
  group.add(lower, tent, valance, pennant, entry, entryGlow);

  // Rotating roof spotlight beam
  const spot = new THREE.Mesh(new THREE.ConeGeometry(0.75, 4.8, 10, 1, true), materials.spotBeam);
  spot.position.y = 4.2;
  spot.userData.noCastShadow = true;
  group.add(spot);

  group.userData.onUpdate = (elapsed: number) => {
    spot.rotation.y = elapsed * 1.2;
    spot.rotation.z = Math.sin(elapsed) * 0.3;
  };

  enableShadows(group);
  return group;
}

// 20. Steam Popcorn Wagon (Spoked Wheels, Glass Case, Awning & Popping Kernels!)
export function createProPopcornWagon(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProPopcornWagon';

  // Spoked Brass Carriage Wheels
  const wheelGeo = new THREE.TorusGeometry(0.32, 0.045, 6, 14);
  wheelGeo.rotateY(Math.PI / 2);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), materials.streetLampMetal);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, 0.34, 0);
  group.add(axle);

  [-0.68, 0.68].forEach((wx) => {
    const wheel = new THREE.Mesh(wheelGeo, materials.brass);
    wheel.position.set(wx, 0.34, 0);
    const hub = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), materials.goldAccent);
    hub.position.set(wx, 0.34, 0);
    group.add(wheel, hub);
  });

  // Crimson Cart Cabinet + Brass Trim + Push Handle
  const cart = new THREE.Mesh(getRoundedBoxGeo(1.18, 0.72, 1.48, 0.06, 0.02), materials.holidayRed);
  cart.position.y = 0.72;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 5, 10, Math.PI), materials.chromeSteel);
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0.96, -0.76);
  group.add(cart, handle);

  // Glass Warmer Showcase + Corner Brass Posts + Striped Roof Canopy
  const glass = new THREE.Mesh(getRoundedBoxGeo(1.06, 0.72, 1.24, 0.04, 0.01), materials.glassClear);
  glass.position.y = 1.44;
  glass.userData.noCastShadow = true;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.48, 4), materials.goldAccent);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 2.02;
  roof.scale.set(1.0, 1, 1.15);
  group.add(glass, roof);

  // Popping Buttery Popcorn Kernels inside Glass Case
  const kernels: THREE.Mesh[] = [];
  const kGeo = new THREE.SphereGeometry(0.11, 6, 5);
  for (let k = 0; k < 5; k++) {
    const kernel = new THREE.Mesh(kGeo, k % 2 === 0 ? materials.creamEnamel : materials.baubleGold);
    kernel.position.set((k - 2) * 0.16, 1.22, ((k % 3) - 1) * 0.22);
    group.add(kernel);
    kernels.push(kernel);
  }

  group.userData.onUpdate = (elapsed: number) => {
    kernels.forEach((k, idx) => {
      k.position.y = 1.22 + Math.abs(Math.sin(elapsed * 7 + idx * 1.3)) * 0.34;
    });
  };

  enableShadows(group);
  return group;
}

// 21. Giant Rainbow Star Portal
export function createProStarArch(): THREE.Group {
  const group = createIlluminatedArch();
  group.name = 'ProStarArch';

  // Crowning Golden Star Finial + Glowing Side Garland Nodes
  const topper = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), materials.starEmissive);
  topper.position.set(0, 4.65, 0);
  group.add(topper);

  enableShadows(group);
  return group;
}

// 22. Marching Toy Soldier Guard
export function createProToySoldierParade(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProToySoldierParade';

  const s1 = createNutcracker();
  s1.position.x = -0.95;
  const s2 = createNutcracker();
  s2.position.x = 0.95;
  group.add(s1, s2);

  group.userData.onUpdate = (elapsed: number) => {
    const z = Math.sin(elapsed * 2) * 1.15;
    s1.position.z = z;
    s2.position.z = -z;
  };

  enableShadows(group);
  return group;
}

// 23. Animated Snowman Juggler
export function createProSnowmanJuggler(): THREE.Group {
  const group = createSnowman();
  group.name = 'ProSnowmanJuggler';

  const ball1 = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), materials.starEmissive);
  const ball2 = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), materials.baubleCyan);
  const ball3 = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), materials.baubleRuby);
  group.add(ball1, ball2, ball3);

  group.userData.onUpdate = (elapsed: number) => {
    ball1.position.set(Math.sin(elapsed * 4) * 0.85, 2.55 + Math.cos(elapsed * 4) * 0.65, 0.35);
    ball2.position.set(Math.sin(elapsed * 4 + (Math.PI * 2) / 3) * 0.85, 2.55 + Math.cos(elapsed * 4 + (Math.PI * 2) / 3) * 0.65, 0.35);
    ball3.position.set(Math.sin(elapsed * 4 + (Math.PI * 4) / 3) * 0.85, 2.55 + Math.cos(elapsed * 4 + (Math.PI * 4) / 3) * 0.65, 0.35);
  };

  enableShadows(group);
  return group;
}

// 24. Chasing LED Infinity Tunnel
export function createProLightTunnel(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProLightTunnel';

  // Cozy snowy walkway floor + stone side curbs
  const walkway = new THREE.Mesh(getRoundedBoxGeo(3.2, 0.16, 4.6, 0.1, 0.02), materials.stoneBase);
  walkway.position.y = 0.08;
  group.add(walkway);

  const ringMats = [materials.bulbAmber, materials.bulbCyan, materials.bulbRuby, materials.bulbEmerald];
  for (let i = 0; i < 4; i++) {
    const zPos = (i - 1.5) * 1.15;
    const frame = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.09, 8, 22, Math.PI), materials.streetLampMetal);
    frame.position.set(0, 0.16, zPos);
    const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.065, 7, 22, Math.PI), ringMats[i % 4]);
    glowRing.position.set(0, 0.16, zPos);
    group.add(frame, glowRing);
  }

  enableShadows(group);
  return group;
}

// 25. Illuminated Musical Water Fountain (Lathe Stone Basin + Multi-Stream Arching Plumes)
export function createProAnimatedFountain(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProAnimatedFountain';

  // Sculpted Lathe Stone Fountain Pool Rim
  const basinPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(2.4, 0.0),
    new THREE.Vector2(2.45, 0.55),
    new THREE.Vector2(2.2, 0.62),
    new THREE.Vector2(2.12, 0.25),
    new THREE.Vector2(0.0, 0.25),
  ];
  const basin = new THREE.Mesh(new THREE.LatheGeometry(basinPts, 20), materials.stoneBase);
  group.add(basin);

  const poolWater = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.12, 20), materials.frozenIce);
  poolWater.position.y = 0.36;
  group.add(poolWater);

  // Center Carved Pedestal Bowl
  const centerPts = [
    new THREE.Vector2(0.0, 0.25),
    new THREE.Vector2(0.42, 0.25),
    new THREE.Vector2(0.28, 1.1),
    new THREE.Vector2(0.85, 1.35),
    new THREE.Vector2(0.76, 1.44),
    new THREE.Vector2(0.0, 1.4),
  ];
  const pedestal = new THREE.Mesh(new THREE.LatheGeometry(centerPts, 16), materials.stoneBase);
  group.add(pedestal);

  // Animated Dancing Water Jet Plume
  const jetGroup = new THREE.Group();
  jetGroup.position.y = 1.38;
  const centerPlume = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, 1.6, 12), materials.waterStream);
  centerPlume.position.y = 0.8;
  centerPlume.userData.noCastShadow = true;
  const crownSpray = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), materials.waterStream);
  crownSpray.position.y = 1.6;
  crownSpray.userData.noCastShadow = true;
  jetGroup.add(centerPlume, crownSpray);
  group.add(jetGroup);

  group.userData.onUpdate = (elapsed: number) => {
    const sy = 1 + Math.cos(elapsed * 3) * 0.28;
    const sx = 1 + Math.sin(elapsed * 4) * 0.18;
    jetGroup.scale.set(sx, sy, sx);
  };

  enableShadows(group);
  return group;
}

// 26. Belgian Waffle Cabin
export function createProWaffleHut(): THREE.Group {
  const group = createMarketStall();
  group.name = 'ProWaffleHut';

  // Revolving Sculpted Golden Belgian Waffle Sign atop Canopy
  const signGroup = new THREE.Group();
  signGroup.position.set(0, 2.98, 0.15);
  const waffleDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 12), materials.waffleGolden);
  waffleDisc.rotation.x = Math.PI / 2;
  const grid1 = new THREE.Mesh(getRoundedBoxGeo(0.55, 0.06, 0.12, 0.01, 0.005), materials.goldAccent);
  const grid2 = new THREE.Mesh(getRoundedBoxGeo(0.06, 0.55, 0.12, 0.01, 0.005), materials.goldAccent);
  signGroup.add(waffleDisc, grid1, grid2);
  group.add(signGroup);

  group.userData.onUpdate = (elapsed: number) => {
    signGroup.rotation.y = elapsed * 1.5;
  };

  enableShadows(group);
  return group;
}

// 27. Spinning Christmas Tree Tower Ride (Giant Tree + Orbiting Bauble Passenger Gondolas)
export function createProTreeRide(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProTreeRide';

  const tree = createChristmasTree();
  tree.scale.setScalar(1.35);
  group.add(tree);

  // Orbiting festive bauble gondolas suspended on golden arms
  const orbitGroup = new THREE.Group();
  orbitGroup.position.y = 2.4;
  const gondolaMats = [materials.baubleRuby, materials.baubleGold, materials.baubleCyan, materials.holidayGreen];

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.25, 6), materials.goldAccent);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = -a;
    arm.position.set(Math.cos(a) * 1.12, 0.65, Math.sin(a) * 1.12);
    orbitGroup.add(arm);

    const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5), materials.goldAccent);
    drop.position.set(Math.cos(a) * 2.2, 0.15, Math.sin(a) * 2.2);
    const pod = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), gondolaMats[i]);
    pod.position.set(Math.cos(a) * 2.2, -0.45, Math.sin(a) * 2.2);
    orbitGroup.add(drop, pod);
  }
  group.add(orbitGroup);

  group.userData.onUpdate = (elapsed: number) => {
    orbitGroup.rotation.y = elapsed * 1.1;
  };

  enableShadows(group);
  return group;
}

// 28. Enchanted Swan Boat
export function createProSwanBoat(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ProSwanBoat';

  // Sculpted Swan Hull with Curved Wing Gunwales, Crowned Head & Velvet Boat Seat
  const hull = new THREE.Mesh(new THREE.SphereGeometry(0.78, 12, 10), materials.whiteIcing);
  hull.scale.set(0.85, 0.5, 1.45);
  hull.position.y = 0.4;

  const seat = new THREE.Mesh(getRoundedBoxGeo(0.75, 0.22, 0.85, 0.12, 0.025), materials.crimsonVelvet);
  seat.position.set(0, 0.54, -0.08);

  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), materials.iceCrystal);
    wing.scale.set(0.28, 0.6, 1.35);
    wing.position.set(side * 0.56, 0.72, -0.15);
    wing.rotation.set(0.2, side * 0.15, side * -0.2);
    group.add(wing);
  });

  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.55, 0.7),
    new THREE.Vector3(0, 0.98, 0.92),
    new THREE.Vector3(0, 1.42, 0.78),
    new THREE.Vector3(0, 1.62, 0.96),
  ]);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 14, 0.09, 8, false), materials.whiteIcing);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 9, 8), materials.whiteIcing);
  head.position.set(0, 1.62, 0.98);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.12, 6), materials.goldAccent);
  crown.position.set(0, 1.78, 0.96);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), materials.carrot);
  beak.rotation.x = Math.PI * 0.58;
  beak.position.set(0, 1.58, 1.16);
  group.add(hull, seat, neck, head, crown, beak);

  group.userData.onUpdate = (elapsed: number) => {
    group.position.x = Math.sin(elapsed * 1.0) * 2.2;
    group.position.z = Math.cos(elapsed * 1.0) * 2.2;
    group.rotation.y = elapsed * 1.0 + Math.PI / 2;
  };

  enableShadows(group);
  return group;
}

// 29. Roasting Marshmallow Fire Ring
export function createProMarshmallowFire(): THREE.Group {
  const group = createLogCampfire();
  group.name = 'ProMarshmallowFire';

  // 2 Rotating Wooden Roasting Sticks with Plump Golden-Toasted Marshmallows
  const skewers: THREE.Group[] = [];
  [-1, 1].forEach((side) => {
    const skewer = new THREE.Group();
    skewer.position.set(side * 1.0, 0.62, 0);
    skewer.rotation.z = side * 0.35;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 1.15, 6), materials.caramelWood);
    stick.rotation.z = Math.PI / 2;
    stick.position.x = -side * 0.42;
    const mallow = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8), materials.creamEnamel);
    mallow.rotation.z = Math.PI / 2;
    mallow.position.x = -side * 1.0;
    skewer.add(stick, mallow);
    group.add(skewer);
    skewers.push(skewer);
  });

  group.userData.onUpdate = (elapsed: number) => {
    skewers.forEach((s, idx) => {
      s.rotation.x = elapsed * 2.4 + idx;
    });
  };

  enableShadows(group);
  return group;
}

// 30. Wonderworld Grand Portal Gate
export function createProFerrisEntrance(): THREE.Group {
  const group = createCandyCaneArch();
  group.name = 'ProFerrisEntrance';

  // Flanking Stone Pillars & Illuminated Marquee Crest Header
  [-1.0, 1.0].forEach((px) => {
    const plinth = new THREE.Mesh(getRoundedBoxGeo(0.55, 0.5, 0.55, 0.06, 0.02), materials.stoneBase);
    plinth.position.set(px, 0.25, 0);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), materials.starEmissive);
    globe.position.set(px, 2.28, 0.22);
    group.add(plinth, globe);
  });

  const marquee = new THREE.Mesh(getRoundedBoxGeo(1.7, 0.44, 0.14, 0.06, 0.02), materials.holidayRed);
  marquee.position.set(0, 3.25, 0.12);
  const plaque = new THREE.Mesh(getRoundedBoxGeo(1.48, 0.28, 0.16, 0.04, 0.015), materials.emissiveWindow);
  plaque.position.set(0, 3.25, 0.13);
  group.add(marquee, plaque);

  group.scale.set(1.38, 1.38, 1.38);
  enableShadows(group);
  return group;
}
