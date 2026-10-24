import React, { useState, useEffect } from 'react';
import { christmasMusicPlayer, FAMOUS_CAROLS } from '../../lib/christmasCarols';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, ListMusic, ChevronUp, ChevronDown } from 'lucide-react';

export const MusicPlayerWidget: React.FC = () => {
  const [playerState, setPlayerState] = useState(christmasMusicPlayer.getState());
  const [showPlaylist, setShowPlaylist] = useState(false);

  useEffect(() => {
    const unsubscribe = christmasMusicPlayer.subscribe(() => {
      setPlayerState(christmasMusicPlayer.getState());
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="relative pointer-events-auto">
      {/* Mini Player Bar */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl winter-panel text-xs text-[#edf2f6] shadow-xl">
        {/* Play/Pause Button */}
        <button
          onClick={() => christmasMusicPlayer.togglePlay()}
          className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            playerState.isPlaying
              ? 'bg-[#e5c783] text-[#0d1723] shadow-md shadow-amber-500/30'
              : 'bg-white/10 hover:bg-white/20 text-[#edf2f6]'
          }`}
          title={playerState.isPlaying ? 'Pause Music' : 'Play Famous Christmas Carols'}
        >
          {playerState.isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Previous Track */}
        <button
          onClick={() => christmasMusicPlayer.prevTrack()}
          className="p-1 rounded-md text-[#91a1b1] hover:text-white transition-colors cursor-pointer hidden sm:block"
          title="Previous Carol"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>

        {/* Current Song Display & Playlist Toggle */}
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/30 hover:bg-black/50 border border-white/5 transition-colors cursor-pointer max-w-[140px] sm:max-w-[200px]"
          title="Click to select a Christmas song"
        >
          <Music className={`w-3.5 h-3.5 text-[#e5c783] shrink-0 ${playerState.isPlaying && !playerState.isMuted ? 'animate-bounce' : ''}`} />
          <span className="font-serif-display font-semibold truncate text-[11px] text-amber-100">
            {playerState.currentTrack.title}
          </span>
          {showPlaylist ? (
            <ChevronUp className="w-3 h-3 text-[#91a1b1] shrink-0" />
          ) : (
            <ChevronDown className="w-3 h-3 text-[#91a1b1] shrink-0" />
          )}
        </button>

        {/* Next Track */}
        <button
          onClick={() => christmasMusicPlayer.nextTrack()}
          className="p-1 rounded-md text-[#91a1b1] hover:text-white transition-colors cursor-pointer"
          title="Next Carol"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>

        {/* Mute / Unmute Toggle */}
        <button
          onClick={() => christmasMusicPlayer.toggleMute()}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            playerState.isMuted
              ? 'text-red-400 bg-red-950/40 border border-red-500/30'
              : 'text-[#91a1b1] hover:text-white'
          }`}
          title={playerState.isMuted ? 'Unmute Carol Music' : 'Mute Music'}
        >
          {playerState.isMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Volume Slider (desktop) */}
        <div className="hidden md:flex items-center gap-1 pl-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={playerState.isMuted ? 0 : playerState.volume}
            onChange={(e) => {
              christmasMusicPlayer.setVolume(parseFloat(e.target.value));
              if (playerState.isMuted) christmasMusicPlayer.toggleMute();
            }}
            className="w-14 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#e5c783]"
            title="Music Volume"
          />
        </div>
      </div>

      {/* Playlist Popover Menu */}
      {showPlaylist && (
        <div className="absolute top-full mt-2 left-0 w-64 rounded-xl winter-panel-gold p-2 shadow-2xl z-50">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 px-2">
            <span className="text-[11px] font-bold text-[#e5c783] uppercase tracking-wider font-serif-display flex items-center gap-1.5">
              <ListMusic className="w-3.5 h-3.5" />
              Christmas Carols
            </span>
            <span className="text-[10px] text-[#91a1b1]">5 Famous Songs</span>
          </div>
          <div className="space-y-0.5">
            {FAMOUS_CAROLS.map((track, idx) => {
              const isSelected = playerState.currentTrackIndex === idx;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    if (playerState.currentTrackIndex !== idx) {
                      // Switch to track
                      while (christmasMusicPlayer.getState().currentTrackIndex !== idx) {
                        christmasMusicPlayer.nextTrack();
                      }
                      if (!playerState.isPlaying) {
                        christmasMusicPlayer.play();
                      }
                    }
                    setShowPlaylist(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#e5c783]/20 text-[#e5c783] font-bold'
                      : 'text-[#edf2f6] hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#91a1b1] font-mono">{idx + 1}</span>
                    <span>{track.title}</span>
                  </div>
                  {isSelected && playerState.isPlaying && (
                    <span className="text-xs text-[#e5c783]">▶</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
