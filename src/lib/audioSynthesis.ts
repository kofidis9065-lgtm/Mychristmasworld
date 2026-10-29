// Procedural Web Audio API sound synthesizer - zero external audio files needed!

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private ambientGain: GainNode | null = null;
  private ambientNoiseSource: AudioBufferSourceNode | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled && this.ambientGain) {
      this.ambientGain.gain.setValueAtTime(0, this.ctx ? this.ctx.currentTime : 0);
    } else if (enabled && this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
    }
  }

  public playClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  public playPlacement() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Low wooden thump + crisp bell chime
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(220, t);
    osc1.frequency.exponentialRampToValueAtTime(110, t + 0.12);
    gain1.gain.setValueAtTime(0.15, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, t); // C6
    osc2.frequency.setValueAtTime(1318.5, t + 0.04); // E6
    gain2.gain.setValueAtTime(0.08, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc1.start(t);
    osc1.stop(t + 0.12);
    osc2.start(t);
    osc2.stop(t + 0.25);
  }

  public playDelete() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(160, t + 0.15);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playGiftFanfare() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Joyful Christmas chime arpeggio: C5 -> E5 -> G5 -> C6 -> E6
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const noteTime = t + i * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.12, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.4);
    });
  }

  public playWinterBreeze() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || this.ambientNoiseSource) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.05;
        b2 = 0.85 * b2 + white * 0.05;
        data[i] = (b0 + b1 + b2) * 0.3;
      }

      this.ambientNoiseSource = this.ctx.createBufferSource();
      this.ambientNoiseSource.buffer = buffer;
      this.ambientNoiseSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.015, this.ctx.currentTime);

      this.ambientNoiseSource.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      this.ambientNoiseSource.start();
    } catch {
      // AudioContext might be blocked until user gesture
    }
  }

  public playSantaSkyFlight() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 1. Sleigh bells jingle sequence
    const bellFrequencies = [2093, 2637, 3135, 4186];
    for (let j = 0; j < 8; j++) {
      const bellTime = t + j * 0.16;
      bellFrequencies.forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, bellTime);
        gain.gain.setValueAtTime(0.04, bellTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, bellTime + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(bellTime);
        osc.stop(bellTime + 0.12);
      });
    }

    // 2. Synthesized Jolly "Ho! Ho! Ho!" low resonant vocal bells
    const hoTimes = [t + 0.3, t + 0.9, t + 1.5];
    const hoFreqs = [150, 135, 120];
    hoTimes.forEach((hoTime, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(hoFreqs[idx], hoTime);
      osc.frequency.exponentialRampToValueAtTime(hoFreqs[idx] * 0.85, hoTime + 0.28);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, hoTime);
      filter.Q.setValueAtTime(3.0, hoTime);

      gain.gain.setValueAtTime(0.12, hoTime);
      gain.gain.exponentialRampToValueAtTime(0.001, hoTime + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(hoTime);
      osc.stop(hoTime + 0.3);
    });

    // 3. Golden Magic Chime Ascent
    const magicNotes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    magicNotes.forEach((freq, i) => {
      if (!this.ctx) return;
      const mTime = t + 0.4 + i * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, mTime);
      gain.gain.setValueAtTime(0.08, mTime);
      gain.gain.exponentialRampToValueAtTime(0.001, mTime + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(mTime);
      osc.stop(mTime + 0.5);
    });
  }

  public playSantaSecretSneak() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Quiet gentle sleigh bell steps
    const sneakNotes = [1046.5, 1318.5, 1174.6, 1396.9, 1567.9];
    sneakNotes.forEach((freq, i) => {
      if (!this.ctx) return;
      const sTime = t + i * 0.28;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, sTime);
      gain.gain.setValueAtTime(0.05, sTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, sTime + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(sTime);
      osc.stop(sTime + 0.35);
    });
  }
}

export const soundEngine = new SoundEngine();
