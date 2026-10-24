import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TimeOfDay } from '../features/world/worldTypes';

export class SkyAndLighting {
  public scene: THREE.Scene;
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  private pmremGenerator: THREE.PMREMGenerator | null = null;
  private envMapTexture: THREE.Texture | null = null;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, isSoftwareGl: boolean) {
    this.scene = scene;

    // Studio Environment reflection using RoomEnvironment
    try {
      this.pmremGenerator = new THREE.PMREMGenerator(renderer);
      this.envMapTexture = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = this.envMapTexture;
      this.pmremGenerator.dispose();
    } catch {
      // Graceful fallback
    }

    // Directional Key Light (Winter Sun or Moon)
    this.dirLight = new THREE.DirectionalLight(0xfff1d6, 1.8);
    this.dirLight.position.set(22, 28, 18);
    this.dirLight.castShadow = !isSoftwareGl;
    this.dirLight.shadow.mapSize.width = isSoftwareGl ? 512 : 2048;
    this.dirLight.shadow.mapSize.height = isSoftwareGl ? 512 : 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 80;

    const d = 26;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;

    this.scene.add(this.dirLight);

    // Hemisphere Light (Sky vs Ground tint)
    this.hemiLight = new THREE.HemisphereLight(0x88b5e6, 0x1a2638, 0.7);
    this.scene.add(this.hemiLight);

    // Soft Ambient fill
    this.ambientLight = new THREE.AmbientLight(0x22354c, 0.5);
    this.scene.add(this.ambientLight);

    // Initial Night Atmosphere
    this.applyTimeOfDay('night');
  }

  public applyTimeOfDay(time: TimeOfDay) {
    if (time === 'day') {
      const bgColor = new THREE.Color(0x182c44);
      this.scene.background = bgColor;
      this.scene.fog = new THREE.FogExp2(0x182c44, 0.016);

      this.dirLight.color.setHex(0xfff7e8);
      this.dirLight.intensity = 2.0;
      this.dirLight.position.set(24, 30, 20);

      this.hemiLight.color.setHex(0x99ccff);
      this.hemiLight.groundColor.setHex(0x2b3d52);
      this.hemiLight.intensity = 0.85;

      this.ambientLight.color.setHex(0x354d69);
      this.ambientLight.intensity = 0.6;
    } else if (time === 'sunset') {
      const bgColor = new THREE.Color(0x28192f);
      this.scene.background = bgColor;
      this.scene.fog = new THREE.FogExp2(0x28192f, 0.018);

      this.dirLight.color.setHex(0xffa153);
      this.dirLight.intensity = 2.2;
      this.dirLight.position.set(30, 14, -18);

      this.hemiLight.color.setHex(0xdf84a5);
      this.hemiLight.groundColor.setHex(0x22132b);
      this.hemiLight.intensity = 0.75;

      this.ambientLight.color.setHex(0x3d2238);
      this.ambientLight.intensity = 0.55;
    } else {
      // Night (Default)
      const bgColor = new THREE.Color(0x0d1723);
      this.scene.background = bgColor;
      this.scene.fog = new THREE.FogExp2(0x0d1723, 0.019);

      this.dirLight.color.setHex(0xb5d4ff); // Moonlight
      this.dirLight.intensity = 1.2;
      this.dirLight.position.set(-20, 26, 18);

      this.hemiLight.color.setHex(0x567da6);
      this.hemiLight.groundColor.setHex(0x0a111a);
      this.hemiLight.intensity = 0.5;

      this.ambientLight.color.setHex(0x132233);
      this.ambientLight.intensity = 0.45;
    }

    // Toggle and adjust all light bulbs, house windows, street lamps, and lantern point lights
    this.updateSceneLightEmitters(time);
  }

  public updateSceneLightEmitters(time: TimeOfDay) {
    const isNight = time === 'night';
    const isSunset = time === 'sunset';

    // Traverse all lights and emissive meshes in the scene
    this.scene.traverse((child) => {
      // 1. Point lights (street lamps, house windows, lanterns, fire pits, trees)
      if (child instanceof THREE.PointLight) {
        if (isNight) {
          child.intensity = 2.8;
          child.distance = 12;
          child.visible = true;
        } else if (isSunset) {
          child.intensity = 1.5;
          child.distance = 7;
          child.visible = true;
        } else {
          // Daylight: lights are turned off
          child.intensity = 0;
          child.distance = 0;
          child.visible = false;
        }
      }

      // 2. Emissive materials (window glow, light bulbs, candle flame, tree stars)
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial && mat.emissive && mat.emissive.getHex() > 0) {
            if (isNight) {
              mat.emissiveIntensity = 3.8; // Radiant Christmas glow
            } else if (isSunset) {
              mat.emissiveIntensity = 1.8;
            } else {
              mat.emissiveIntensity = 0.2; // Dimmed in daylight
            }
            mat.needsUpdate = true;
          }
        });
      }
    });
  }

  public dispose() {
    if (this.envMapTexture) {
      this.envMapTexture.dispose();
      this.envMapTexture = null;
    }
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
      this.pmremGenerator = null;
    }
  }
}
