import { christmasMusicPlayer } from './christmasCarols';

// Background Holiday Music Controller
// Plays embedded Vintage Christmas Classics via YouTube IFrame API with automatic
// zero-dependency Web Audio Christmas Carols fallback when YouTube is blocked,
// unavailable, or rejected by browser/iOS autoplay policies.

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export interface YouTubePlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  isReady: boolean;
  title: string;
}

class YouTubeAudioService {
  private player: any = null;
  private isReady: boolean = false;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private hasInteracted: boolean = false;
  private wantsPlay: boolean = false;
  private listeners: (() => void)[] = [];
  private isUsingFallback: boolean = false;
  private apiLoadFailed: boolean = false;
  private playbackWatchdog: number | null = null;

  private readonly VIDEO_ID = '9Sf7hY7fWQI';
  private readonly YOUTUBE_TITLE = 'Christmas Music No Ads Playlist';
  private readonly FALLBACK_TITLE = 'Christmas Carols Radio';

  constructor() {
    this.init();
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

  public getState(): YouTubePlayerState {
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      isReady: this.isReady || this.isUsingFallback,
      title: this.isUsingFallback ? this.FALLBACK_TITLE : this.YOUTUBE_TITLE,
    };
  }

  private init() {
    if (typeof window === 'undefined') return;

    christmasMusicPlayer.subscribe(() => {
      if (!this.isUsingFallback) return;
      const carolState = christmasMusicPlayer.getState();
      const nextPlaying = carolState.isPlaying && !carolState.isMuted && !this.isMuted;
      if (this.isPlaying !== nextPlaying) {
        this.isPlaying = nextPlaying;
        this.notify();
      }
    });

    // Listen for first valid user activation to satisfy iOS Safari / Chromium autoplay policies
    const handleFirstGesture = () => {
      this.hasInteracted = true;
      christmasMusicPlayer.unlock();
      if (!this.isMuted && !this.isPlaying) {
        this.play();
      }
      window.removeEventListener('touchend', handleFirstGesture);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('touchend', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('click', handleFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true, passive: true });

    this.loadYouTubeApi();
  }

  private loadYouTubeApi() {
    if (window.YT && window.YT.Player) {
      this.mountPlayer();
      return;
    }

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevOnReady) prevOnReady();
      this.mountPlayer();
    };

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        this.apiLoadFailed = true;
        if (this.wantsPlay && !this.isMuted) {
          this.activateAudioFallback();
        }
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }

  private mountPlayer() {
    if (this.player || this.isUsingFallback || typeof document === 'undefined') return;

    let container = document.getElementById('youtube-bg-audio-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'youtube-bg-audio-container';
      container.setAttribute('aria-hidden', 'true');
      // YouTube IFrame API requires >= 200x113 in-viewport to permit playback reliably
      container.style.position = 'fixed';
      container.style.bottom = '0';
      container.style.right = '0';
      container.style.width = '200px';
      container.style.height = '120px';
      container.style.opacity = '0.01';
      container.style.pointerEvents = 'none';
      container.style.overflow = 'hidden';
      container.style.zIndex = '-1';
      document.body.appendChild(container);
    }

    const placeholder = document.createElement('div');
    placeholder.id = 'mcw-yt-player-target';
    container.appendChild(placeholder);

    try {
      this.player = new window.YT.Player('mcw-yt-player-target', {
        height: '120',
        width: '200',
        videoId: this.VIDEO_ID,
        playerVars: {
          autoplay: 0,
          loop: 1,
          playlist: this.VIDEO_ID,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            this.isReady = true;
            if (this.isUsingFallback || this.isMuted) {
              this.notify();
              return;
            }
            try {
              event.target.setVolume(85);
              if (this.wantsPlay && this.hasInteracted && !this.isMuted) {
                event.target.unMute?.();
                event.target.playVideo();
                this.armPlaybackWatchdog(3500);
              }
            } catch {
              if (this.wantsPlay && !this.isMuted) {
                this.activateAudioFallback();
              }
            }
            this.notify();
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
            if (event.data === 1) {
              if (this.isMuted || !this.wantsPlay || this.isUsingFallback) {
                try {
                  this.player?.pauseVideo?.();
                } catch {
                  // ignore
                }
                return;
              }
              this.clearPlaybackWatchdog();
              this.isPlaying = true;
              this.notify();
            } else if (event.data === 3) {
              if (!this.isUsingFallback && this.wantsPlay && !this.isMuted) {
                this.armPlaybackWatchdog(4500);
              }
            } else if (event.data === 2) {
              if (!this.isUsingFallback) {
                this.isPlaying = false;
                this.notify();
              }
            } else if (event.data === 0) {
              if (!this.isUsingFallback && !this.isMuted && this.wantsPlay) {
                try {
                  this.player?.playVideo?.();
                } catch {
                  this.activateAudioFallback();
                }
              }
            }
          },
          onError: () => {
            this.clearPlaybackWatchdog();
            if (!this.isMuted && this.wantsPlay) {
              this.activateAudioFallback();
            } else {
              this.isUsingFallback = true;
              this.notify();
            }
          },
        },
      });
    } catch {
      this.activateAudioFallback();
    }
  }

  private armPlaybackWatchdog(delayMs: number = 3500) {
    this.clearPlaybackWatchdog();
    if (typeof window === 'undefined') return;
    this.playbackWatchdog = window.setTimeout(() => {
      this.playbackWatchdog = null;
      if (this.wantsPlay && !this.isMuted && !this.isPlaying) {
        this.activateAudioFallback();
      }
    }, delayMs);
  }

  private clearPlaybackWatchdog() {
    if (this.playbackWatchdog !== null) {
      window.clearTimeout(this.playbackWatchdog);
      this.playbackWatchdog = null;
    }
  }

  private stopYouTubeSilently() {
    if (this.player) {
      try {
        if (typeof this.player.mute === 'function') this.player.mute();
        if (typeof this.player.pauseVideo === 'function') this.player.pauseVideo();
      } catch {
        // ignore
      }
    }
  }

  private activateAudioFallback() {
    this.clearPlaybackWatchdog();
    this.stopYouTubeSilently();
    this.isUsingFallback = true;

    if (!this.isMuted && this.wantsPlay) {
      christmasMusicPlayer.play();
      const carolState = christmasMusicPlayer.getState();
      this.isPlaying = carolState.isPlaying;
    } else {
      this.isPlaying = false;
    }
    this.notify();
  }

  public play() {
    this.hasInteracted = true;
    this.isMuted = false;
    this.wantsPlay = true;

    // Synchronously unlock Web Audio inside user gesture so fallback works reliably on iOS Safari
    christmasMusicPlayer.unlock();

    if (this.isUsingFallback || this.apiLoadFailed) {
      this.isUsingFallback = true;
      christmasMusicPlayer.play();
      this.isPlaying = christmasMusicPlayer.getState().isPlaying;
      this.notify();
      return;
    }

    if (this.isReady && this.player && typeof this.player.playVideo === 'function') {
      try {
        christmasMusicPlayer.pause();
        this.player.unMute?.();
        this.player.setVolume?.(85);
        this.player.playVideo();
        // Verify playback actually starts; otherwise fall back to built-in Christmas Carols
        this.armPlaybackWatchdog(3500);
        this.notify();
      } catch {
        this.activateAudioFallback();
      }
    } else {
      // YouTube player is still initializing; fall back if it fails to start
      this.armPlaybackWatchdog(4500);
      this.notify();
    }
  }

  public pause() {
    this.wantsPlay = false;
    this.clearPlaybackWatchdog();
    this.isPlaying = false;
    christmasMusicPlayer.pause();
    if (this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
      } catch {
        // ignore
      }
    }
    this.notify();
  }

  public toggleMute() {
    // If music hasn't started playing yet (UI displays "Muted"), clicking should start playback
    if (!this.isMuted && !this.isPlaying) {
      this.play();
      return;
    }

    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.wantsPlay = false;
      this.clearPlaybackWatchdog();
      christmasMusicPlayer.pause();
      if (this.player) {
        try {
          if (typeof this.player.mute === 'function') this.player.mute();
          if (typeof this.player.pauseVideo === 'function') this.player.pauseVideo();
        } catch {
          // ignore
        }
      }
      this.isPlaying = false;
      this.notify();
    } else {
      this.play();
    }
  }
}

export const youtubeAudio = new YouTubeAudioService();
