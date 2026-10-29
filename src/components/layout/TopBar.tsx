import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Sunset,
  Volume2,
  VolumeX,
  Music,
  Save,
  Camera,
  Gift,
  User as UserIcon,
  RotateCcw,
  Snowflake,
  Sparkles,
  Menu,
  X,
  Trash2,
} from 'lucide-react';
import { TimeOfDay } from '../../features/world/worldTypes';
import { ChristmasCountdown } from '../../features/countdown/ChristmasCountdown';
import { soundEngine } from '../../lib/audioSynthesis';
import { User } from '@supabase/supabase-js';
import { AppUser } from '../../features/auth/userAuthService';
import { AnimatedSantaIcon } from '../ui/AnimatedSantaIcon';
import { youtubeAudio } from '../../lib/youtubePlayerService';
import { clearAllAppCache } from '../../lib/cacheManager';

interface Props {
  timeOfDay: TimeOfDay;
  onTimeOfDayChange: (time: TimeOfDay) => void;
  snowfallDensity: 'off' | 'light' | 'moderate' | 'heavy';
  onToggleSnowfall: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  saveStatus: 'saved' | 'saving' | 'error';
  saveMode: 'cloud' | 'local';
  onSaveWorld: () => void;
  onOpenExport: () => void;
  onOpenGifts: () => void;
  onOpenAuth: () => void;
  onResetCamera: () => void;
  user: User | null;
  currentUser?: AppUser | null;
  googleUser?: any;
  dailyGiftAvailable: boolean;
  onTriggerSanta?: () => void;
}

export const TopBar: React.FC<Props> = ({
  timeOfDay,
  onTimeOfDayChange,
  snowfallDensity,
  onToggleSnowfall,
  soundEnabled,
  onToggleSound,
  saveStatus,
  saveMode,
  onSaveWorld,
  onOpenExport,
  onOpenGifts,
  onOpenAuth,
  onResetCamera,
  user,
  currentUser,
  googleUser,
  dailyGiftAvailable,
  onTriggerSanta,
}) => {
  const activeUser = currentUser || googleUser || (user ? { nickname: user.email?.split('@')[0], email: user.email, avatar: '' } : null);
  const [musicState, setMusicState] = useState(youtubeAudio.getState());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsub = youtubeAudio.subscribe(() => {
      setMusicState(youtubeAudio.getState());
    });
    return unsub;
  }, []);

  const handleToggleMusic = () => {
    soundEngine.playClick();
    youtubeAudio.toggleMute();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 pointer-events-none p-2 sm:p-3">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Main Bar */}
        <div className="flex items-center justify-between gap-2">
          {/* 1. Left: ONLY 3D Animated Santa Face Icon (Click for Santa 3D Magic Animation!) */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              className="p-1 rounded-2xl winter-panel shadow-xl border-[#e5c783]/40 hover:scale-110 active:scale-95 transition-all cursor-pointer relative group focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              title="Click Santa for Holiday Magic! ✨ (Sky Sleigh Flight & Secret Village Pass)"
              onClick={() => {
                if (onTriggerSanta) {
                  onTriggerSanta();
                } else {
                  soundEngine.playClick();
                }
              }}
            >
              <AnimatedSantaIcon size="md" showGreeting={false} />
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-300"></span>
              </span>
            </button>

            {/* Countdown on Desktop */}
            <div className="hidden lg:block">
              <ChristmasCountdown />
            </div>
          </div>

          {/* 2. Right: Action Buttons */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            {/* Real Vintage Christmas Audio Player */}
            <button
              onClick={handleToggleMusic}
              title={
                musicState.isMuted
                  ? 'Unmute Christmas Music (40s-60s Classics)'
                  : `Playing: Vintage Christmas Classics (Click to Mute)`
              }
              className={`flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-lg active:scale-95 ${
                !musicState.isMuted && musicState.isPlaying
                  ? 'festive-gradient'
                  : 'winter-panel text-[#91a1b1] hover:text-white border-white/10'
              }`}
            >
              {!musicState.isMuted && musicState.isPlaying ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span className="hidden sm:inline">Music: On</span>
                  <span className="sm:hidden text-[11px]">Music</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-red-300" />
                  <span className="hidden sm:inline text-red-200">Muted</span>
                  <span className="sm:hidden text-[11px] text-red-200">Muted</span>
                </>
              )}
            </button>

            {/* Daily Gift Button with User Signature Red-Orange Gradient */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenGifts();
              }}
              className="relative festive-gradient flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl font-bold text-xs uppercase tracking-wider font-serif-display cursor-pointer"
            >
              <Gift className={`w-3.5 h-3.5 ${dailyGiftAvailable ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">
                {dailyGiftAvailable ? 'Daily Gift Ready!' : 'Daily Gift'}
              </span>
              <span className="sm:hidden">Gift</span>

              {dailyGiftAvailable && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300"></span>
                </span>
              )}
            </button>

            {/* Photo Snapshot Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onOpenExport();
              }}
              title="Capture Photo"
              className="p-2 rounded-xl winter-panel text-[#edf2f6] hover:text-[#e5c783] hover:border-[#e5c783]/40 transition-all cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            {/* Desktop & Tablet Direct Buttons */}
            <div className="desktop-only-control items-center gap-1.5">
              {/* Cloud/Local Save */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onSaveWorld();
                }}
                title={saveMode === 'cloud' ? 'Cloud Synced' : 'Saved Locally'}
                className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl winter-panel text-xs font-medium text-[#edf2f6] hover:border-[#e5c783]/40 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-[#e5c783]" />
                <span className="hidden md:inline">
                  {saveStatus === 'saving'
                    ? 'Saving...'
                    : saveMode === 'cloud'
                    ? 'Cloud Saved'
                    : 'Saved'}
                </span>
              </button>

              {/* User Account / Profile */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onOpenAuth();
                }}
                className={`p-1.5 rounded-xl winter-panel transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeUser
                    ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30'
                    : 'text-[#91a1b1] hover:text-white'
                }`}
                title={
                  activeUser
                    ? `Account: ${activeUser.nickname || activeUser.email}`
                    : 'Sign In / Create Account'
                }
              >
                {activeUser?.avatar ? (
                  <img
                    src={activeUser.avatar}
                    alt="Avatar"
                    className="w-5 h-5 rounded-full object-cover border border-emerald-400/50"
                  />
                ) : (
                  <UserIcon className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px] font-medium hidden lg:inline max-w-[85px] truncate">
                  {activeUser ? activeUser.nickname || 'Account' : 'Sign In'}
                </span>
              </button>
            </div>

            {/* Mobile Menu Toggle (hamburger button active on mobile portrait & landscape) */}
            <button
              onClick={() => {
                soundEngine.playClick();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="mobile-only-control p-2 rounded-xl winter-panel text-white hover:text-[#e5c783] cursor-pointer"
              title="Menu Options"
            >
              {mobileMenuOpen ? <X className="w-4 h-4 text-amber-300" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Desktop & Tablet Secondary Bar */}
        <div className="desktop-only-control pointer-events-auto items-center justify-between gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl winter-panel p-1 backdrop-blur-md">
            {/* Atmosphere Choices: Night, Sunset, Day */}
            <span className="text-[10px] text-[#91a1b1] px-1 font-medium">Sky:</span>
            <button
              onClick={() => onTimeOfDayChange('night')}
              title="Night Atmosphere (Turns lights on!)"
              className={`p-1.5 rounded-lg transition-all cursor-pointer text-xs flex items-center gap-1 ${
                timeOfDay === 'night'
                  ? 'festive-gradient'
                  : 'text-[#91a1b1] hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden md:inline">Night</span>
            </button>
            <button
              onClick={() => onTimeOfDayChange('sunset')}
              title="Golden Sunset"
              className={`p-1.5 rounded-lg transition-all cursor-pointer text-xs flex items-center gap-1 ${
                timeOfDay === 'sunset'
                  ? 'festive-gradient'
                  : 'text-[#91a1b1] hover:text-white'
              }`}
            >
              <Sunset className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden md:inline">Sunset</span>
            </button>
            <button
              onClick={() => onTimeOfDayChange('day')}
              title="Daylight (Lights off)"
              className={`p-1.5 rounded-lg transition-all cursor-pointer text-xs flex items-center gap-1 ${
                timeOfDay === 'day'
                  ? 'festive-gradient'
                  : 'text-[#91a1b1] hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden md:inline">Day</span>
            </button>

            <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

            {/* Snowfall Toggle */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onToggleSnowfall();
              }}
              title={snowfallDensity === 'off' ? 'Enable Snowfall' : 'Disable Snowfall'}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                snowfallDensity !== 'off'
                  ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-400/30'
                  : 'text-[#91a1b1] hover:text-white'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5" />
              <span className="text-[10px]">Snow</span>
            </button>

            {/* Sound Effects Toggle */}
            <button
              onClick={() => {
                onToggleSound();
                soundEngine.playClick();
              }}
              title={soundEnabled ? 'Mute Sound FX' : 'Unmute Sound FX'}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                soundEnabled
                  ? 'text-[#e5c783] bg-amber-950/30 border border-amber-400/30'
                  : 'text-[#91a1b1] hover:text-white'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="text-[10px]">FX</span>
            </button>

            {/* Reset Camera Button */}
            <button
              onClick={() => {
                soundEngine.playClick();
                onResetCamera();
              }}
              title="Reset 3D Camera View"
              className="p-1.5 rounded-lg text-[#91a1b1] hover:text-white transition-all cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px]">Reset View</span>
            </button>

            <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

            {/* Clear Cache & Reset Button */}
            <button
              onClick={() => {
                if (window.confirm('Clear all local cache & browser storage and reload?')) {
                  clearAllAppCache(true);
                }
              }}
              title="Clear Local Cache & Stored Data"
              className="p-1.5 rounded-lg text-red-300/70 hover:text-red-300 hover:bg-red-950/30 transition-all cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="text-[10px]">Clear Cache</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel (Active in both vertical portrait & horizontal landscape mobile modes) */}
        {mobileMenuOpen && (
          <div className="mobile-only-control flex-col max-h-[80vh] overflow-y-auto pointer-events-auto winter-panel-gold rounded-2xl p-3.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 border-[#e5c783]/50">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-white font-serif-display">
                World Controls
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-[#91a1b1] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Sky Atmosphere */}
              <div className="col-span-2 flex items-center justify-between p-2 rounded-xl bg-white/5">
                <span className="text-[#91a1b1] text-[11px]">Sky Mode:</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      onTimeOfDayChange('night');
                      soundEngine.playClick();
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      timeOfDay === 'night' ? 'festive-gradient' : 'bg-black/30 text-white'
                    }`}
                  >
                    🌙 Night (Lights On)
                  </button>
                  <button
                    onClick={() => {
                      onTimeOfDayChange('sunset');
                      soundEngine.playClick();
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      timeOfDay === 'sunset' ? 'festive-gradient' : 'bg-black/30 text-white'
                    }`}
                  >
                    🌅 Sunset
                  </button>
                  <button
                    onClick={() => {
                      onTimeOfDayChange('day');
                      soundEngine.playClick();
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      timeOfDay === 'day' ? 'festive-gradient' : 'bg-black/30 text-white'
                    }`}
                  >
                    ☀️ Day
                  </button>
                </div>
              </div>

              {/* Snowfall */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onToggleSnowfall();
                }}
                className={`p-2 rounded-xl flex items-center justify-center gap-1.5 font-medium ${
                  snowfallDensity !== 'off'
                    ? 'festive-gradient'
                    : 'bg-white/5 text-[#91a1b1]'
                }`}
              >
                <Snowflake className="w-3.5 h-3.5" />
                <span>Snow: {snowfallDensity !== 'off' ? 'On' : 'Off'}</span>
              </button>

              {/* Sound FX */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onToggleSound();
                }}
                className={`p-2 rounded-xl flex items-center justify-center gap-1.5 font-medium ${
                  soundEnabled ? 'festive-gradient' : 'bg-white/5 text-[#91a1b1]'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>Sound FX: {soundEnabled ? 'On' : 'Off'}</span>
              </button>

              {/* Santa Magic Flight Animation */}
              <button
                onClick={() => {
                  if (onTriggerSanta) onTriggerSanta();
                  setMobileMenuOpen(false);
                }}
                className="col-span-2 p-2.5 rounded-xl festive-gradient text-white flex items-center justify-center gap-2 font-bold shadow-lg"
              >
                <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
                <span>🎅 Summon Santa Magic (Sky & Village)</span>
              </button>

              {/* Reset Camera */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onResetCamera();
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center gap-1.5 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Camera</span>
              </button>

              {/* Cloud / Local Save */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onSaveWorld();
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-200 flex items-center justify-center gap-1.5 font-medium"
              >
                <Save className="w-3.5 h-3.5 text-[#e5c783]" />
                <span>{saveMode === 'cloud' ? 'Cloud Save' : 'Save Locally'}</span>
              </button>

              {/* Account Profile / Local User Login */}
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="col-span-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-300 flex items-center justify-center gap-2 font-medium"
              >
                <UserIcon className="w-4 h-4" />
                <span>
                  {activeUser
                    ? `Account: ${activeUser.nickname || activeUser.email}`
                    : 'Sign In / Create Account'}
                </span>
              </button>

              {/* Clear Cache & Reset App */}
              <button
                onClick={() => {
                  if (window.confirm('Clear all local cache & browser storage and reload?')) {
                    clearAllAppCache(true);
                  }
                }}
                className="col-span-2 p-2 rounded-xl bg-white/5 hover:bg-red-950/40 text-red-300 flex items-center justify-center gap-2 font-medium text-xs border border-white/5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cache & Reset Storage</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
