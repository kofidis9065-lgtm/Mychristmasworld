import * as THREE from 'three';
import { soundEngine } from '../../lib/audioSynthesis';

export type SantaAnimType = 'sky' | 'ground';

export class SantaAnimationSystem {
  public group: THREE.Group;
  private scene: THREE.Scene;
  private isAnimating: boolean = false;
  private currentMode: SantaAnimType = 'sky';
  private elapsed: number = 0;
  private duration: number = 8.5;
  private nextAnimationType: SantaAnimType = 'sky';

  // Sub-components
  private caravan: THREE.Group;
  private reindeerLeft: THREE.Group;
  private reindeerRight: THREE.Group;
  private rudolphNoseLight: THREE.PointLight;
  private lanternLight: THREE.PointLight;
  private stardustPoints: THREE.Points;
  private stardustGeo: THREE.BufferGeometry;
  private stardustPositions: Float32Array;
  private stardustAlphas: Float32Array;
  private onCompleteCallback?: () => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'SantaAnimationGroup';
    this.group.visible = false;

    // 1. Build Caravan Group (Sleigh + Santa + Reindeers)
    this.caravan = new THREE.Group();
    this.group.add(this.caravan);

    // Build Sleigh
    const sleigh = this.createSleighWithSanta();
    this.caravan.add(sleigh);

    // Build 2 Reindeers in front
    this.reindeerLeft = this.createReindeerMesh(false);
    this.reindeerLeft.position.set(2.8, 0, 0.45);
    this.caravan.add(this.reindeerLeft);

    this.reindeerRight = this.createReindeerMesh(true); // Rudolph with glowing red nose!
    this.reindeerRight.position.set(2.8, 0, -0.45);
    this.caravan.add(this.reindeerRight);

    // Rudolph Glowing Red Nose Light
    this.rudolphNoseLight = new THREE.PointLight(0xff1111, 2.8, 8);
    this.rudolphNoseLight.position.set(3.8, 1.8, -0.45);
    this.caravan.add(this.rudolphNoseLight);

    // Lantern hanging in front of sleigh
    this.lanternLight = new THREE.PointLight(0xffb03a, 2.5, 12);
    this.lanternLight.position.set(1.4, 0.9, 0);
    this.caravan.add(this.lanternLight);

    // 2. Build Magic Golden Stardust Particle System
    const particleCount = 120;
    this.stardustGeo = new THREE.BufferGeometry();
    this.stardustPositions = new Float32Array(particleCount * 3);
    this.stardustAlphas = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      this.stardustPositions[i * 3] = 0;
      this.stardustPositions[i * 3 + 1] = -100; // initially hidden
      this.stardustPositions[i * 3 + 2] = 0;
      this.stardustAlphas[i] = 0;
    }

    this.stardustGeo.setAttribute('position', new THREE.BufferAttribute(this.stardustPositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xfef08a,
      size: 0.45,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.stardustPoints = new THREE.Points(this.stardustGeo, particleMat);
    this.group.add(this.stardustPoints);

    this.scene.add(this.group);
  }

  private createSleighWithSanta(): THREE.Group {
    const group = new THREE.Group();

    const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.35, metalness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.85 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });
    const whiteWoolMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfecaca, roughness: 0.8 });
    const brownMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

    // Sleigh Golden Runners
    const runnerGeo = new THREE.CylinderGeometry(0.045, 0.045, 2.2, 8);
    runnerGeo.rotateZ(Math.PI / 2);
    const runnerL = new THREE.Mesh(runnerGeo, goldMat);
    runnerL.position.set(0, 0.15, 0.5);
    const runnerR = new THREE.Mesh(runnerGeo, goldMat);
    runnerR.position.set(0, 0.15, -0.5);

    // Front runner curls
    const curlGeo = new THREE.TorusGeometry(0.25, 0.04, 6, 12, Math.PI);
    curlGeo.rotateZ(-Math.PI / 2);
    const curlL = new THREE.Mesh(curlGeo, goldMat);
    curlL.position.set(1.1, 0.38, 0.5);
    const curlR = new THREE.Mesh(curlGeo, goldMat);
    curlR.position.set(1.1, 0.38, -0.5);

    group.add(runnerL);
    group.add(runnerR);
    group.add(curlL);
    group.add(curlR);

    // Sleigh Scarlet Body
    const bodyGeo = new THREE.BoxGeometry(1.8, 0.65, 0.95);
    const body = new THREE.Mesh(bodyGeo, redMat);
    body.position.set(0, 0.6, 0);
    group.add(body);

    // Golden Rim Trim
    const trimGeo = new THREE.BoxGeometry(1.85, 0.08, 1.0);
    const trim = new THREE.Mesh(trimGeo, goldMat);
    trim.position.set(0, 0.95, 0);
    group.add(trim);

    // Velvet Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.85), greenMat);
    seat.position.set(-0.25, 0.7, 0);
    group.add(seat);

    // Toy Gift Sack behind Santa
    const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55), brownMat);
    sack.position.set(-0.7, 0.95, 0);
    group.add(sack);

    // Wrapped Gift Boxes inside Sack
    const gift1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), goldMat);
    gift1.position.set(-0.75, 1.3, 0.15);
    const gift2 = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), redMat);
    gift2.position.set(-0.6, 1.35, -0.12);
    group.add(gift1);
    group.add(gift2);

    // --- Santa Claus Figure ---
    const santaGroup = new THREE.Group();
    santaGroup.position.set(-0.2, 0.85, 0);

    // Santa Body (Torso in red coat with white trim)
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), redMat);
    torso.scale.set(0.9, 1.1, 0.9);
    santaGroup.add(torso);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.1, 12), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    belt.position.y = -0.05;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), goldMat);
    buckle.position.set(0.44, -0.05, 0);
    santaGroup.add(belt);
    santaGroup.add(buckle);

    // Santa Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), skinMat);
    head.position.set(0.05, 0.52, 0);
    santaGroup.add(head);

    // Santa Beard (Voluminous white boughs)
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 8), whiteWoolMat);
    beard.rotation.x = Math.PI;
    beard.rotation.z = -0.2;
    beard.position.set(0.22, 0.42, 0);
    santaGroup.add(beard);

    // Santa Hat
    const hatCuff = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.06, 6, 12), whiteWoolMat);
    hatCuff.rotation.x = Math.PI / 2;
    hatCuff.position.set(0.05, 0.68, 0);
    santaGroup.add(hatCuff);

    const hatCone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 8), redMat);
    hatCone.rotation.z = -0.5;
    hatCone.position.set(-0.06, 0.85, 0);
    santaGroup.add(hatCone);

    const pompom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), whiteWoolMat);
    pompom.position.set(-0.26, 0.95, 0);
    santaGroup.add(pompom);

    // Waving Hand
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), whiteWoolMat);
    handL.position.set(0.35, 0.4, 0.38);
    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), whiteWoolMat);
    handR.position.set(0.35, 0.4, -0.38);
    santaGroup.add(handL);
    santaGroup.add(handR);

    group.add(santaGroup);

    // Golden Reins lines from Santa to Reindeers
    const reinsMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 2 });
    const pointsL = [new THREE.Vector3(0.1, 1.25, 0.35), new THREE.Vector3(2.6, 1.4, 0.45)];
    const reinsL = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsL), reinsMat);
    const pointsR = [new THREE.Vector3(0.1, 1.25, -0.35), new THREE.Vector3(2.6, 1.4, -0.45)];
    const reinsR = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsR), reinsMat);
    group.add(reinsL);
    group.add(reinsR);

    return group;
  }

  private createReindeerMesh(isRudolph: boolean): THREE.Group {
    const group = new THREE.Group();
    const brownMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.8 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 });

    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.9, 8), brownMat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.95, 0);
    group.add(body);

    // 4 Animated Legs
    const legGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.75, 6);
    const legFL = new THREE.Mesh(legGeo, brownMat);
    legFL.name = 'legFL';
    legFL.position.set(0.3, 0.45, 0.18);
    const legFR = new THREE.Mesh(legGeo, brownMat);
    legFR.name = 'legFR';
    legFR.position.set(0.3, 0.45, -0.18);
    const legBL = new THREE.Mesh(legGeo, brownMat);
    legBL.name = 'legBL';
    legBL.position.set(-0.3, 0.45, 0.18);
    const legBR = new THREE.Mesh(legGeo, brownMat);
    legBR.name = 'legBR';
    legBR.position.set(-0.3, 0.45, -0.18);

    group.add(legFL);
    group.add(legFR);
    group.add(legBL);
    group.add(legBR);

    // Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.6, 6), brownMat);
    neck.rotation.z = Math.PI / 4;
    neck.position.set(0.45, 1.3, 0);
    group.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.22, 0.22), brownMat);
    head.position.set(0.72, 1.55, 0);
    group.add(head);

    // Golden Antlers
    const antlerGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.5, 4);
    const antL = new THREE.Mesh(antlerGeo, goldMat);
    antL.position.set(0.68, 1.85, 0.1);
    antL.rotation.set(-0.25, 0, 0.2);
    const antR = new THREE.Mesh(antlerGeo, goldMat);
    antR.position.set(0.68, 1.85, -0.1);
    antR.rotation.set(0.25, 0, 0.2);
    group.add(antL);
    group.add(antR);

    // Red Holiday Collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 6, 12), redMat);
    collar.rotation.y = Math.PI / 2;
    collar.position.set(0.35, 1.15, 0);
    group.add(collar);

    // Nose (Rudolph glows radiant red!)
    if (isRudolph) {
      const rudolphMat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 4.5,
      });
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), rudolphMat);
      nose.position.set(0.92, 1.53, 0);
      group.add(nose);
    } else {
      const darkMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), darkMat);
      nose.position.set(0.92, 1.53, 0);
      group.add(nose);
    }

    return group;
  }

  // Launch Animation 1 or 2
  public triggerNextAnimation(onComplete?: () => void): SantaAnimType {
    const chosenType = this.nextAnimationType;
    this.nextAnimationType = chosenType === 'sky' ? 'ground' : 'sky';

    if (chosenType === 'sky') {
      this.startSkyFlight(onComplete);
    } else {
      this.startSecretGroundPass(onComplete);
    }

    return chosenType;
  }

  // Animation 1: Magical Sky Flight across the starry winter sky
  public startSkyFlight(onComplete?: () => void) {
    this.isAnimating = true;
    this.currentMode = 'sky';
    this.elapsed = 0;
    this.duration = 8.5;
    this.onCompleteCallback = onComplete;
    this.group.visible = true;

    // Reset stardust particles
    for (let i = 0; i < this.stardustPositions.length / 3; i++) {
      this.stardustPositions[i * 3 + 1] = -100;
    }
    this.stardustGeo.attributes.position.needsUpdate = true;

    soundEngine.playSantaSkyFlight();
  }

  // Animation 2: Secret Ground Pass behind houses
  public startSecretGroundPass(onComplete?: () => void) {
    this.isAnimating = true;
    this.currentMode = 'ground';
    this.elapsed = 0;
    this.duration = 9.5;
    this.onCompleteCallback = onComplete;
    this.group.visible = true;

    soundEngine.playSantaSecretSneak();
  }

  // Frame update
  public update(delta: number) {
    if (!this.isAnimating) return;

    this.elapsed += delta;
    const progress = Math.min(1.0, this.elapsed / this.duration);

    // Gallop Reindeer Legs
    const gallop = Math.sin(this.elapsed * 16) * 0.45;
    this.reindeerLeft.traverse((child) => {
      if (child.name === 'legFL' || child.name === 'legBR') child.rotation.z = gallop;
      if (child.name === 'legFR' || child.name === 'legBL') child.rotation.z = -gallop;
    });
    this.reindeerRight.traverse((child) => {
      if (child.name === 'legFL' || child.name === 'legBR') child.rotation.z = gallop;
      if (child.name === 'legFR' || child.name === 'legBL') child.rotation.z = -gallop;
    });

    // Sway Lantern
    this.lanternLight.position.x = 1.4 + Math.sin(this.elapsed * 6) * 0.08;

    if (this.currentMode === 'sky') {
      // --- Animation 1: Sky Flight Curve ---
      // Path sweeping from top-left high sky [-38, 24, -26] through central diorama down to [0, 16, 2], and climbing away to [38, 26, 24]
      const t = progress;
      const x = -38 + t * 76;
      // Parabolic dip over center:
      const y = 24 - Math.sin(t * Math.PI) * 8 + Math.sin(t * Math.PI * 2) * 1.5;
      const z = -26 + t * 52 + Math.sin(t * Math.PI) * 8;

      this.caravan.position.set(x, y, z);

      // Facing orientation: banking into flight curve
      const dx = 76;
      const dy = -Math.cos(t * Math.PI) * 8 * Math.PI;
      const dz = 52 + Math.cos(t * Math.PI) * 8 * Math.PI;
      const yaw = Math.atan2(dx, dz);
      this.caravan.rotation.y = yaw - Math.PI / 2;
      this.caravan.rotation.z = Math.sin(t * Math.PI) * 0.22; // banked wings
      this.caravan.rotation.x = -dy * 0.02;

      // Emit Stardust Trail behind Sleigh
      const pIdx = Math.floor(Math.random() * (this.stardustPositions.length / 3));
      this.stardustPositions[pIdx * 3] = x - Math.cos(yaw) * 1.5 + (Math.random() - 0.5) * 0.6;
      this.stardustPositions[pIdx * 3 + 1] = y + (Math.random() - 0.5) * 0.6;
      this.stardustPositions[pIdx * 3 + 2] = z - Math.sin(yaw) * 1.5 + (Math.random() - 0.5) * 0.6;
      this.stardustGeo.attributes.position.needsUpdate = true;
    } else {
      // --- Animation 2: Secret Ground Pass behind houses ---
      // Moves slowly and stealthily along the back border behind chalets at Y = 0.15
      const t = progress;
      const x = -26 + t * 52;
      // Winding around trees and back of chalets
      const z = -17 + Math.sin(t * Math.PI * 3) * 2.2;
      const y = 0.15;

      this.caravan.position.set(x, y, z);

      const dx = 52;
      const dz = Math.cos(t * Math.PI * 3) * 2.2 * (Math.PI * 3);
      const yaw = Math.atan2(dx, dz);
      this.caravan.rotation.y = yaw - Math.PI / 2;
      this.caravan.rotation.z = 0;
      this.caravan.rotation.x = 0;

      // Soft snow puffs along ground
      const pIdx = Math.floor(Math.random() * (this.stardustPositions.length / 3));
      this.stardustPositions[pIdx * 3] = x - 1.2 + (Math.random() - 0.5) * 0.4;
      this.stardustPositions[pIdx * 3 + 1] = 0.1 + Math.random() * 0.3;
      this.stardustPositions[pIdx * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
      this.stardustGeo.attributes.position.needsUpdate = true;
    }

    // Animation Finished
    if (progress >= 1.0) {
      this.isAnimating = false;
      this.group.visible = false;
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
    }
  }

  public dispose() {
    this.stardustGeo.dispose();
    this.scene.remove(this.group);
  }
}
