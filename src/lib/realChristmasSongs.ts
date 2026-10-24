// Real Famous Christmas Songs Background Audio Manager
// High quality real orchestral recordings of famous Christmas carols with seamless looping and mute toggle
import { soundEngine } from './audioSynthesis';

export interface SongTrack {
  id: string;
  title: string;
  url: string;
}

export const REAL_CHRISTMAS_SONGS: SongTrack[] = [
  {
    id: 'jingle_bells',
    title: 'Jingle Bells (Orchestral)',
    url: 'https://ia801309.us.archive.org/34/items/JingleBells_659/JingleBells.mp3',
  },
  {
    id: 'we_wish_you',
    title: 'We Wish You a Merry Christmas',
    url: 'https://ia801309.us.archive.org/24/items/WeWishYouAMerryChristmas_561/WeWishYouAMerryChristmas.mp3',
  },
  {
    id: 'silent_night',
    title: 'Silent Night',
    url: 'https://ia800301.us.archive.org/15/items/SilentNight_451/SilentNight.mp3',
  },
  {
    id: 'deck_the_halls',
    title: 'Deck the Halls',
    url: 'https://ia801309.us.archive.org/19/items/DeckTheHalls_302/DeckTheHalls.mp3',
  },
  {
    id: 'o_christmas_tree',
    title: 'O Christmas Tree',
    url: 'https://ia801309.us.archive.org/15/items/OChristmasTree_528/OChristmasTree.mp3',
  },
];

class RealMusicManager {
  private audio: HTMLAudioElement | null = null;
  private currentTrackIndex: number = 0;
  private isMuted: boolean = false;
  private isPlaying: boolean = false;
  private hasStarted: boolean = false;
  private listeners: (() => void)[] = [];

  constructor() {
    this.isMuted = false;
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getState() {
    return {
      isMuted: this.isMuted,
      isPlaying: this.isPlaying,
      currentTrack: REAL_CHRISTMAS_SONGS[this.currentTrackIndex],
    };
  }

  public startAutoplay() {
    if (this.hasStarted) return;
    this.hasStarted = true;
    this.playCurrentTrack();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.muted = this.isMuted;
    }
    if (!this.isMuted) {
      if (!this.isPlaying) {
        this.playCurrentTrack();
      }
    }
    this.notify();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audio) {
      this.audio.muted = this.isMuted;
    }
    this.notify();
  }

  private playCurrentTrack() {
    const track = REAL_CHRISTMAS_SONGS[this.currentTrackIndex];
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';

      this.audio.addEventListener('ended', () => {
        this.nextTrack();
      });

      this.audio.addEventListener('error', () => {
        console.warn('Real song stream error, advancing or playing chime...');
        // Gentle chime fallback
        soundEngine.playWinterBreeze();
        setTimeout(() => this.nextTrack(), 1500);
      });
    }

    this.audio.src = track.url;
    this.audio.muted = this.isMuted;
    this.audio.volume = 0.5;

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.notify();
        })
        .catch((err) => {
          // Autoplay blocked by browser policy until user gesture
          this.isPlaying = false;
          this.notify();

          const resumeOnGesture = () => {
            if (this.audio && !this.isMuted) {
              this.audio.play().then(() => {
                this.isPlaying = true;
                this.notify();
              }).catch(() => {});
            }
            window.removeEventListener('pointerdown', resumeOnGesture);
            window.removeEventListener('keydown', resumeOnGesture);
            window.removeEventListener('touchstart', resumeOnGesture);
          };
          window.addEventListener('pointerdown', resumeOnGesture, { once: true });
          window.addEventListener('keydown', resumeOnGesture, { once: true });
          window.addEventListener('touchstart', resumeOnGesture, { once: true });
        });
    }
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % REAL_CHRISTMAS_SONGS.length;
    this.playCurrentTrack();
  }

  public stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
      this.notify();
    }
  }
}

export const realMusicManager = new RealMusicManager();
