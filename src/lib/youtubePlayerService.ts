// YouTube Holiday Music Controller for:
// https://www.youtube.com/watch?v=dBHic2n7lD8&list=RDdBHic2n7lD8&start_radio=1
// "Greatest Vintage Christmas Classics Iconic 40s-60s Oldies | Legendary Holiday Music"

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
  private listeners: (() => void)[] = [];
  private fallbackAudio: HTMLAudioElement | null = null;
  private isUsingFallback: boolean = false;

  private readonly VIDEO_ID = 'dBHic2n7lD8';
  private readonly PLAYLIST_ID = 'RDdBHic2n7lD8';
  private readonly TITLE = 'Vintage Christmas Classics (40s-60s)';

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
      isReady: this.isReady,
      title: this.TITLE,
    };
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Listen for first interaction to satisfy autoplay policies
    const handleFirstGesture = () => {
      this.hasInteracted = true;
      if (!this.isMuted && !this.isPlaying) {
        this.play();
      }
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });

    // Load YouTube IFrame API script
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
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag?.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }

  private mountPlayer() {
    if (this.player || typeof document === 'undefined') return;

    let container = document.getElementById('youtube-bg-audio-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'youtube-bg-audio-container';
      container.style.position = 'fixed';
      container.style.bottom = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '200px';
      container.style.height = '120px';
      container.style.opacity = '0.001';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-9999';
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
          autoplay: 1,
          loop: 1,
          playlist: this.VIDEO_ID,
          list: this.PLAYLIST_ID,
          controls: 0,
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            this.isReady = true;
            try {
              event.target.setVolume(85);
              if (!this.isMuted) {
                event.target.playVideo();
                this.isPlaying = true;
              }
            } catch (err) {
              console.warn('YouTube onReady autoplay notice:', err);
            }
            this.notify();
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
            if (event.data === 1) {
              this.isPlaying = true;
              this.isUsingFallback = false;
            } else if (event.data === 2) {
              this.isPlaying = false;
            } else if (event.data === 0) {
              // Loop back to beginning of vintage holiday playlist
              this.player?.playVideo();
            }
            this.notify();
          },
          onError: (err: any) => {
            console.warn('YouTube Player notice, enabling audio fallback:', err);
            this.activateAudioFallback();
          },
        },
      });
    } catch (err) {
      console.warn('Could not instantiate YouTube player, using fallback:', err);
      this.activateAudioFallback();
    }
  }

  private activateAudioFallback() {
    this.isUsingFallback = true;
    if (!this.fallbackAudio) {
      this.fallbackAudio = new Audio(
        'https://ia801309.us.archive.org/34/items/JingleBells_659/JingleBells.mp3'
      );
      this.fallbackAudio.loop = true;
      this.fallbackAudio.volume = 0.5;
    }
    if (!this.isMuted) {
      this.fallbackAudio.play().then(() => {
        this.isPlaying = true;
        this.notify();
      }).catch(() => {});
    }
  }

  public play() {
    this.isMuted = false;
    if (this.isUsingFallback && this.fallbackAudio) {
      this.fallbackAudio.muted = false;
      this.fallbackAudio.play().then(() => {
        this.isPlaying = true;
        this.notify();
      }).catch(() => {});
      return;
    }

    if (this.player && typeof this.player.playVideo === 'function') {
      try {
        this.player.unMute();
        this.player.playVideo();
        this.isPlaying = true;
        this.notify();
      } catch (err) {
        console.warn('playVideo notice:', err);
      }
    } else {
      this.activateAudioFallback();
    }
  }

  public pause() {
    this.isPlaying = false;
    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
    }
    if (this.player && typeof this.player.pauseVideo === 'function') {
      try {
        this.player.pauseVideo();
      } catch {}
    }
    this.notify();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.fallbackAudio) {
        this.fallbackAudio.muted = true;
        this.fallbackAudio.pause();
      }
      if (this.player) {
        try {
          if (typeof this.player.mute === 'function') this.player.mute();
          if (typeof this.player.pauseVideo === 'function') this.player.pauseVideo();
        } catch {}
      }
      this.isPlaying = false;
    } else {
      if (this.isUsingFallback && this.fallbackAudio) {
        this.fallbackAudio.muted = false;
        this.fallbackAudio.play().then(() => {
          this.isPlaying = true;
          this.notify();
        }).catch(() => {});
      } else if (this.player) {
        try {
          if (typeof this.player.unMute === 'function') this.player.unMute();
          if (typeof this.player.playVideo === 'function') this.player.playVideo();
          this.isPlaying = true;
        } catch {
          this.activateAudioFallback();
        }
      } else {
        this.activateAudioFallback();
      }
    }
    this.notify();
  }
}

export const youtubeAudio = new YouTubeAudioService();
