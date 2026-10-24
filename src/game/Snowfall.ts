import * as THREE from 'three';

export class SnowfallSystem {
  public points: THREE.Points | null = null;
  private particleCount: number = 800;
  private positions: Float32Array;
  private velocities: Float32Array;
  private bounds = { x: 32, y: 22, z: 32 };

  constructor(count: number = 800) {
    this.particleCount = count;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      this.positions[i * 3 + 0] = (Math.random() - 0.5) * this.bounds.x;
      this.positions[i * 3 + 1] = Math.random() * this.bounds.y;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * this.bounds.z;

      // Downward velocity + slight horizontal drift
      this.velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
      this.velocities[i * 3 + 1] = -(1.2 + Math.random() * 1.5);
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    // Snowflake texture generated procedurally on HTML5 canvas (no external 404!)
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.5, 'rgba(235, 245, 255, 0.8)');
      grad.addColorStop(1, 'rgba(220, 240, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      map: texture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.name = 'Snowfall';
  }

  public update(delta: number) {
    if (!this.points) return;
    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const posArr = posAttr.array as Float32Array;

    const dt = Math.min(delta, 0.1);
    const count = this.particleCount;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Gentle wind sway
      posArr[idx + 0] += (this.velocities[idx + 0] + Math.sin(posArr[idx + 1] * 0.5) * 0.2) * dt;
      posArr[idx + 1] += this.velocities[idx + 1] * dt;
      posArr[idx + 2] += (this.velocities[idx + 2] + Math.cos(posArr[idx + 1] * 0.5) * 0.2) * dt;

      // Wrap around when falling below ground level
      if (posArr[idx + 1] < 0) {
        posArr[idx + 1] = this.bounds.y;
        posArr[idx + 0] = (Math.random() - 0.5) * this.bounds.x;
        posArr[idx + 2] = (Math.random() - 0.5) * this.bounds.z;
      }
    }

    posAttr.needsUpdate = true;
  }

  public setVisible(visible: boolean) {
    if (this.points) {
      this.points.visible = visible;
    }
  }

  public dispose() {
    if (this.points) {
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
      this.points = null;
    }
  }
}
