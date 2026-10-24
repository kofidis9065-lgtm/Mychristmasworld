import React, { useState, useEffect } from 'react';
import { Play, Volume2, VolumeX, CheckCircle2, Sparkles, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { soundEngine } from '../../lib/audioSynthesis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdCompleted: () => void;
  rewardTitle?: string;
}

export const GoogleAdSenseRewardedModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAdCompleted,
  rewardTitle = 'Secret Mystery Gift Box',
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [adStage, setAdStage] = useState<number>(0);

  const adPromos = [
    {
      title: 'Google Play Holiday Festival',
      sponsor: 'Google Ads Showcase',
      description: 'Discover thousands of festive apps, holiday games, and winter deals on Google Play.',
      icon: '🎁',
      bgGradient: 'from-blue-600 via-indigo-600 to-purple-700',
      actionText: 'Explore Holiday Deals',
    },
    {
      title: 'Google Shopping Christmas Bazaar',
      sponsor: 'AdSense Verified Partner',
      description: 'Find personalized holiday gifts with express seasonal shipping and top reviews.',
      icon: '🎄',
      bgGradient: 'from-emerald-600 via-teal-700 to-cyan-800',
      actionText: 'Browse Gift Catalog',
    },
  ];

  const currentAd = adPromos[adStage % adPromos.length];

  useEffect(() => {
    if (!isOpen) return;

    setSecondsRemaining(5);
    setIsCompleted(false);
    setAdStage((prev) => prev + 1);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsCompleted(true);
          soundEngine.playGiftFanfare();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const progressPercent = ((5 - secondsRemaining) / 5) * 100;

  const handleClaimReward = () => {
    soundEngine.playClick();
    onAdCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#111827] text-white shadow-2xl border border-blue-500/40 overflow-hidden">
        {/* AdSense Top Status Bar */}
        <div className="px-4 py-2.5 bg-[#1f2937] border-b border-gray-700 flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-400 text-black uppercase tracking-wider">
              Ad
            </span>
            <span className="font-semibold text-white flex items-center gap-1">
              <span className="text-blue-400">Google</span> AdSense Rewarded
            </span>
            <span className="text-[10px] text-gray-400 hidden xs:inline font-mono">
              ca-pub-3940256099942544
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {isCompleted ? (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="text-[11px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                Reward in {secondsRemaining}s
              </span>
            )}
          </div>
        </div>

        {/* Ad Content Video Stage */}
        <div className={`relative p-6 sm:p-8 bg-gradient-to-br ${currentAd.bgGradient} text-center flex flex-col items-center justify-center min-h-[220px]`}>
          {/* Animated Background Rays */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0,transparent_70%)] animate-pulse" />

          {/* Icon */}
          <div className="relative text-6xl mb-3 filter drop-shadow-lg transform hover:scale-110 transition-transform">
            {currentAd.icon}
          </div>

          {/* Advertiser Info */}
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/40 text-blue-200 text-[10px] font-medium mb-1.5 border border-white/20">
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            <span>{currentAd.sponsor}</span>
          </span>

          <h3 className="text-xl sm:text-2xl font-black text-white font-serif-display tracking-wide mb-1 drop-shadow">
            {currentAd.title}
          </h3>

          <p className="text-xs text-white/90 max-w-xs mx-auto leading-relaxed mb-4 drop-shadow-xs">
            {currentAd.description}
          </p>

          <a
            href="https://adsense.google.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              window.open('https://adsense.google.com', '_blank');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-semibold text-white border border-white/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <span>{currentAd.actionText}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Live Video Progress Bar */}
        <div className="w-full h-1.5 bg-gray-800 relative">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-teal-400 to-amber-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Reward Status & Claim Button */}
        <div className="p-4 bg-[#1f2937] text-center">
          {isCompleted ? (
            <div className="animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-sm mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Ad Complete! Reward Unlocked</span>
              </div>
              <p className="text-xs text-gray-300 mb-3">
                Thanks for watching! You can now unwrap another <strong>{rewardTitle}</strong> for your library.
              </p>
              <button
                onClick={handleClaimReward}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                <span>Claim Bonus Gift Now!</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span className="flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Watching Google Ad...</span>
              </span>
              <span className="font-mono text-amber-300">{secondsRemaining}s remaining</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
