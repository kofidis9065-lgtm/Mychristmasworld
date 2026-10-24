// Procedural Christmas Carols Synthesizer using Web Audio API
// High fidelity multi-instrument arrangements: Glockenspiel bells, warm holiday pad, and rhythmic sleigh bells

export interface CarolTrack {
  id: string;
  title: string;
  tempo: number; // BPM
  notes: { note: string; duration: number }[]; // duration in beats (1 = quarter note)
}

// Note frequencies map
const NOTE_FREQS: Record<string, number> = {
  'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23,
  'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'Bb4': 466.16,
  'B4': 493.88, 'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
  'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77, 'C6': 1046.50,
  'REST': 0
};

export const FAMOUS_CAROLS: CarolTrack[] = [
  {
    id: 'jingle_bells',
    title: 'Jingle Bells',
    tempo: 130,
    notes: [
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'E4', duration: 2 },
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'E4', duration: 2 },
      { note: 'E4', duration: 1 }, { note: 'G4', duration: 1 }, { note: 'C4', duration: 1.5 }, { note: 'D4', duration: 0.5 },
      { note: 'E4', duration: 4 },
      { note: 'F4', duration: 1 }, { note: 'F4', duration: 1 }, { note: 'F4', duration: 1.5 }, { note: 'F4', duration: 0.5 },
      { note: 'F4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'D4', duration: 1 }, { note: 'D4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'D4', duration: 2 }, { note: 'G4', duration: 2 },
      // Chorus repeat
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'E4', duration: 2 },
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'E4', duration: 2 },
      { note: 'E4', duration: 1 }, { note: 'G4', duration: 1 }, { note: 'C4', duration: 1.5 }, { note: 'D4', duration: 0.5 },
      { note: 'E4', duration: 4 },
      { note: 'F4', duration: 1 }, { note: 'F4', duration: 1 }, { note: 'F4', duration: 1.5 }, { note: 'F4', duration: 0.5 },
      { note: 'F4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'E4', duration: 0.5 }, { note: 'E4', duration: 0.5 },
      { note: 'G4', duration: 1 }, { note: 'G4', duration: 1 }, { note: 'F4', duration: 1 }, { note: 'D4', duration: 1 },
      { note: 'C4', duration: 4 }, { note: 'REST', duration: 1 }
    ]
  },
  {
    id: 'we_wish_you',
    title: 'We Wish You a Merry Christmas',
    tempo: 120,
    notes: [
      { note: 'D4', duration: 1 },
      { note: 'G4', duration: 1 }, { note: 'G4', duration: 0.5 }, { note: 'A4', duration: 0.5 }, { note: 'G4', duration: 0.5 }, { note: 'F#4', duration: 0.5 },
      { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'E4', duration: 1 },
      { note: 'A4', duration: 1 }, { note: 'A4', duration: 0.5 }, { note: 'B4', duration: 0.5 }, { note: 'A4', duration: 0.5 }, { note: 'G4', duration: 0.5 },
      { note: 'F#4', duration: 1 }, { note: 'D4', duration: 1 }, { note: 'D4', duration: 1 },
      { note: 'B4', duration: 1 }, { note: 'B4', duration: 0.5 }, { note: 'C5', duration: 0.5 }, { note: 'B4', duration: 0.5 }, { note: 'A4', duration: 0.5 },
      { note: 'G4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'D4', duration: 0.5 }, { note: 'D4', duration: 0.5 },
      { note: 'E4', duration: 1 }, { note: 'A4', duration: 1 }, { note: 'F#4', duration: 1 },
      { note: 'G4', duration: 2 }, { note: 'REST', duration: 1 }
    ]
  },
  {
    id: 'silent_night',
    title: 'Silent Night',
    tempo: 76,
    notes: [
      { note: 'G4', duration: 1.5 }, { note: 'A4', duration: 0.5 }, { note: 'G4', duration: 1 },
      { note: 'E4', duration: 3 },
      { note: 'G4', duration: 1.5 }, { note: 'A4', duration: 0.5 }, { note: 'G4', duration: 1 },
      { note: 'E4', duration: 3 },
      { note: 'D5', duration: 2 }, { note: 'D5', duration: 1 },
      { note: 'B4', duration: 3 },
      { note: 'C5', duration: 2 }, { note: 'C5', duration: 1 },
      { note: 'G4', duration: 3 },
      { note: 'A4', duration: 2 }, { note: 'A4', duration: 1 },
      { note: 'C5', duration: 1.5 }, { note: 'B4', duration: 0.5 }, { note: 'A4', duration: 1 },
      { note: 'G4', duration: 1.5 }, { note: 'A4', duration: 0.5 }, { note: 'G4', duration: 1 },
      { note: 'E4', duration: 3 },
      { note: 'D5', duration: 2 }, { note: 'D5', duration: 1 },
      { note: 'F5', duration: 1.5 }, { note: 'D5', duration: 0.5 }, { note: 'B4', duration: 1 },
      { note: 'C5', duration: 3 },
      { note: 'E5', duration: 3 },
      { note: 'C5', duration: 1.5 }, { note: 'G4', duration: 0.5 }, { note: 'E4', duration: 1 },
      { note: 'G4', duration: 1.5 }, { note: 'F4', duration: 0.5 }, { note: 'D4', duration: 1 },
      { note: 'C4', duration: 3 }, { note: 'REST', duration: 1 }
    ]
  },
  {
    id: 'deck_the_halls',
    title: 'Deck the Halls',
    tempo: 125,
    notes: [
      { note: 'G4', duration: 1.5 }, { note: 'F4', duration: 0.5 }, { note: 'E4', duration: 1 }, { note: 'D4', duration: 1 },
      { note: 'C4', duration: 1 }, { note: 'D4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'C4', duration: 1 },
      { note: 'D4', duration: 0.5 }, { note: 'E4', duration: 0.5 }, { note: 'F4', duration: 0.5 }, { note: 'D4', duration: 0.5 },
      { note: 'E4', duration: 1.5 }, { note: 'D4', duration: 0.5 },
      { note: 'C4', duration: 1 }, { note: 'B3', duration: 1 }, { note: 'C4', duration: 2 },
      { note: 'G4', duration: 1.5 }, { note: 'F4', duration: 0.5 }, { note: 'E4', duration: 1 }, { note: 'D4', duration: 1 },
      { note: 'C4', duration: 1 }, { note: 'D4', duration: 1 }, { note: 'E4', duration: 1 }, { note: 'C4', duration: 1 },
      { note: 'D4', duration: 0.5 }, { note: 'E4', duration: 0.5 }, { note: 'F4', duration: 0.5 }, { note: 'D4', duration: 0.5 },
      { note: 'E4', duration: 1.5 }, { note: 'D4', duration: 0.5 },
      { note: 'C4', duration: 1 }, { note: 'B3', duration: 1 }, { note: 'C4', duration: 2 }
    ]
  },
  {
    id: 'o_christmas_tree',
    title: 'O Christmas Tree',
    tempo: 90,
    notes: [
      { note: 'C4', duration: 1 },
      { note: 'F4', duration: 1 }, { note: 'F4', duration: 0.5 }, { note: 'F4', duration: 0.5 }, { note: 'G4', duration: 1 },
      { note: 'A4', duration: 1 }, { note: 'A4', duration: 1 }, { note: 'A4', duration: 1 },
      { note: 'A4', duration: 0.5 }, { note: 'G4', duration: 0.5 }, { note: 'A4', duration: 1 }, { note: 'Bb4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'G4', duration: 1 }, { note: 'F4', duration: 2 },
      { note: 'C5', duration: 1 },
      { note: 'C5', duration: 0.5 }, { note: 'A4', duration: 0.5 }, { note: 'D5', duration: 1 }, { note: 'C5', duration: 1 },
      { note: 'C5', duration: 0.5 }, { note: 'Bb4', duration: 0.5 }, { note: 'Bb4', duration: 2 },
      { note: 'Bb4', duration: 1 },
      { note: 'Bb4', duration: 0.5 }, { note: 'G4', duration: 0.5 }, { note: 'C5', duration: 1 }, { note: 'Bb4', duration: 1 },
      { note: 'Bb4', duration: 0.5 }, { note: 'A4', duration: 0.5 }, { note: 'A4', duration: 2 },
      { note: 'C4', duration: 1 },
      { note: 'F4', duration: 1 }, { note: 'F4', duration: 0.5 }, { note: 'F4', duration: 0.5 }, { note: 'G4', duration: 1 },
      { note: 'A4', duration: 1 }, { note: 'A4', duration: 1 }, { note: 'A4', duration: 1 },
      { note: 'A4', duration: 0.5 }, { note: 'G4', duration: 0.5 }, { note: 'A4', duration: 1 }, { note: 'Bb4', duration: 1 },
      { note: 'E4', duration: 1 }, { note: 'G4', duration: 1 }, { note: 'F4', duration: 2 }
    ]
  }
];

export class ChristmasMusicPlayer {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.45;
  private currentTrackIndex: number = 0;
  private nextNoteTimeout: number | null = null;
  private currentNoteIndex: number = 0;
  private listeners: (() => void)[] = [];
  private masterGain: GainNode | null = null;

  constructor() {
    // Initial track index 0: Jingle Bells
    this.currentTrackIndex = 0;
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public getState() {
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.volume,
      currentTrack: FAMOUS_CAROLS[this.currentTrackIndex],
      currentTrackIndex: this.currentTrackIndex,
      totalTracks: FAMOUS_CAROLS.length,
    };
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    // If unmuting while stopped, start playing
    if (!this.isMuted && !this.isPlaying) {
      this.play();
    }
    this.notify();
  }

  public play() {
    this.initCtx();
    if (!this.ctx) return;

    if (this.isPlaying) return;
    this.isPlaying = true;
    this.notify();
    this.scheduleNextNote();
  }

  public pause() {
    this.isPlaying = false;
    if (this.nextNoteTimeout) {
      clearTimeout(this.nextNoteTimeout);
      this.nextNoteTimeout = null;
    }
    this.notify();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public nextTrack() {
    this.stopCurrentSong();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % FAMOUS_CAROLS.length;
    this.currentNoteIndex = 0;
    this.notify();
    if (this.isPlaying) {
      this.scheduleNextNote();
    }
  }

  public prevTrack() {
    this.stopCurrentSong();
    this.currentTrackIndex = (this.currentTrackIndex - 1 + FAMOUS_CAROLS.length) % FAMOUS_CAROLS.length;
    this.currentNoteIndex = 0;
    this.notify();
    if (this.isPlaying) {
      this.scheduleNextNote();
    }
  }

  private stopCurrentSong() {
    if (this.nextNoteTimeout) {
      clearTimeout(this.nextNoteTimeout);
      this.nextNoteTimeout = null;
    }
  }

  private scheduleNextNote() {
    if (!this.isPlaying || !this.ctx || !this.masterGain) return;

    const track = FAMOUS_CAROLS[this.currentTrackIndex];
    if (this.currentNoteIndex >= track.notes.length) {
      // Loop or go to next track!
      this.currentNoteIndex = 0;
      this.currentTrackIndex = (this.currentTrackIndex + 1) % FAMOUS_CAROLS.length;
      this.notify();
    }

    const currentTrack = FAMOUS_CAROLS[this.currentTrackIndex];
    const item = currentTrack.notes[this.currentNoteIndex];
    const beatDurationMs = (60 / currentTrack.tempo) * 1000;
    const noteDurationMs = item.duration * beatDurationMs;

    if (item.note !== 'REST' && NOTE_FREQS[item.note]) {
      this.playChimeNote(NOTE_FREQS[item.note], noteDurationMs / 1000);
      // Play soft sleigh bell shake on downbeats
      if (this.currentNoteIndex % 2 === 0) {
        this.playSleighBell();
      }
    }

    this.currentNoteIndex++;

    this.nextNoteTimeout = window.setTimeout(() => {
      this.scheduleNextNote();
    }, noteDurationMs);
  }

  private playChimeNote(freq: number, durationSec: number) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    
    // Voice 1: Crisp Glockenspiel / Christmas Bell (Sine with rich sparkle)
    const osc1 = this.ctx.createOscillator();
    const oscGain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, t);

    // Overtone harmonic for metallic holiday bell chime
    const osc2 = this.ctx.createOscillator();
    const oscGain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2.756, t); // bell overtone

    // Envelope
    oscGain1.gain.setValueAtTime(0.2, t);
    oscGain1.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.4, durationSec * 1.2));

    oscGain2.gain.setValueAtTime(0.06, t);
    oscGain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

    // Voice 2: Warm Sub-Harmonic Pad
    const padOsc = this.ctx.createOscillator();
    const padGain = this.ctx.createGain();
    padOsc.type = 'sine';
    padOsc.frequency.setValueAtTime(freq * 0.5, t); // octave below for warmth
    padGain.gain.setValueAtTime(0.08, t);
    padGain.gain.linearRampToValueAtTime(0.08, t + durationSec * 0.7);
    padGain.gain.exponentialRampToValueAtTime(0.001, t + durationSec);

    osc1.connect(oscGain1);
    osc2.connect(oscGain2);
    padOsc.connect(padGain);

    oscGain1.connect(this.masterGain);
    oscGain2.connect(this.masterGain);
    padGain.connect(this.masterGain);

    osc1.start(t);
    osc1.stop(t + Math.max(0.4, durationSec * 1.2));
    osc2.start(t);
    osc2.stop(t + 0.35);
    padOsc.start(t);
    padOsc.stop(t + durationSec);
  }

  private playSleighBell() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;

    // High frequency metallic shaker for sleigh bells
    const bellFrequencies = [2400, 2900, 3400, 4200];
    bellFrequencies.forEach((f) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.015, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.12);
    });
  }
}

export const christmasMusicPlayer = new ChristmasMusicPlayer();
