import React, { useState } from 'react';
import { Sparkles, Mountain, Home, Waves, Building2, Play, ArrowRight, ShieldCheck } from 'lucide-react';
import { LandscapeType } from '../../features/world/worldTypes';
import { soundEngine } from '../../lib/audioSynthesis';
import { ChristmasCountdown } from '../../features/countdown/ChristmasCountdown';
import { AnimatedSantaIcon } from '../ui/AnimatedSantaIcon';
import { youtubeAudio } from '../../lib/youtubePlayerService';

interface Props {
  hasExistingWorld: boolean;
  onContinueExisting: () => void;
  onCreateNewWorld: (landscape: LandscapeType) => void;
}

export const WelcomeScreen: React.FC<Props> = ({
  hasExistingWorld,
  onContinueExisting,
  onCreateNewWorld,
}) => {
  const [step, setStep] = useState<'welcome' | 'chooseLandscape'>('welcome');
  const [selectedLandscape, setSelectedLandscape] = useState<LandscapeType>('village');

  const landscapes: {
    id: LandscapeType;
    name: string;
    icon: React.ReactNode;
    tagline: string;
    description: string;
    highlights: string[];
  }[] = [
    {
      id: 'village',
      name: 'Classic Village',
      icon: <Home className="w-6 h-6 text-amber-300" />,
      tagline: 'Cozy Timber Cottages & Paths',
      description: 'A welcoming Christmas village clearing surrounded by glowing log cabins, warm lamps, and festive pine groves.',
      highlights: ['Default cozy atmosphere', 'Snowy stone paths', 'Chalet perimeter'],
    },
    {
      id: 'mountain',
      name: 'Alpine Mountain',
      icon: <Mountain className="w-6 h-6 text-cyan-300" />,
      tagline: 'Secluded Mountain Haven',
      description: 'Towering snow-dusted alpine peaks and rugged cliff ridges sheltering a peaceful high-altitude winter valley.',
      highlights: ['Majestic mountain peaks', 'Pine shelf clusters', 'Deep winter atmosphere'],
    },
    {
      id: 'river',
      name: 'Frozen River',
      icon: <Waves className="w-6 h-6 text-sky-300" />,
      tagline: 'Icy Waters & Wooden Bridge',
      description: 'A winding crystal-blue frozen river cutting through deep snowbanks with a rustic timber walking bridge.',
      highlights: ['Glistening icy surface', 'Timber footbridge', 'Riverside fisherman cabin'],
    },
    {
      id: 'city',
      name: 'Christmas City',
      icon: <Building2 className="w-6 h-6 text-yellow-300" />,
      tagline: 'Miniature Winter Metropolis',
      description: 'A bustling urban Christmas square flanked by lighted skyscrapers, avenues, street lights, and snow plazas.',
      highlights: ['Illuminated skyscraper windows', 'Plaza grid', 'Metropolitan skyline'],
    },
  ];

  const handleStartCreation = () => {
    soundEngine.playClick();
    youtubeAudio.play();
    setStep('chooseLandscape');
  };

  const handleConfirmLandscape = (id: LandscapeType) => {
    soundEngine.playPlacement();
    youtubeAudio.play();
    onCreateNewWorld(id);
  };

  const handleContinue = () => {
    soundEngine.playClick();
    youtubeAudio.play();
    onContinueExisting();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d1723] overflow-y-auto">
      {/* Ambient Winter Background Gradient & Star Dust */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1c324b] via-[#0f1b29] to-[#070d14] pointer-events-none opacity-90" />

      {/* Decorative snowfall & glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#e5c783]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl text-center py-8">
        {step === 'welcome' ? (
          <div className="flex flex-col items-center">
            {/* Countdown Badge */}
            <div className="mb-6">
              <ChristmasCountdown />
            </div>

            {/* Emblem: Animated 3D Santa Face Icon */}
            <div className="relative mb-6">
              <div className="p-3 rounded-3xl bg-gradient-to-br from-[#1b2b3d] to-[#0d1723] border-2 border-[#e5c783]/50 flex items-center justify-center shadow-2xl shadow-black/80">
                <AnimatedSantaIcon size="lg" showGreeting={false} />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-[#e5c783] animate-pulse" />
            </div>

            {/* Title & Tagline */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-wider text-white font-serif-display uppercase mb-3 gold-glow">
              My Christmas World
            </h1>

            <p className="text-base sm:text-lg text-[#91a1b1] max-w-xl mx-auto mb-8 font-light leading-relaxed">
              Step into your personal digital winter universe. Create, decorate, collect daily gifts, and build a lasting 3D Christmas diorama.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center">
              {hasExistingWorld && (
                <button
                  onClick={handleContinue}
                  className="w-full sm:w-auto flex-1 py-3.5 px-6 rounded-xl winter-panel border-[#e5c783]/40 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:border-[#e5c783] hover:bg-[#1a2c40] transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  <Play className="w-4 h-4 text-[#e5c783]" />
                  <span>Continue My World</span>
                </button>
              )}

              <button
                onClick={handleStartCreation}
                className="w-full sm:w-auto flex-1 py-3.5 px-7 rounded-xl festive-gradient font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-xl hover:brightness-105 transition-all cursor-pointer active:scale-95 font-serif-display"
              >
                <span>Let the Christmas Begin</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-12 flex items-center gap-6 text-xs text-[#91a1b1]/70">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#e5c783]" />
                Auto-saves persistently
              </span>
              <span>•</span>
              <span>Daily gift rewards</span>
              <span>•</span>
              <span>360° 3D Real-time orbit</span>
            </div>
          </div>
        ) : (
          <div className="text-left max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#e5c783] font-serif-display">
                Chapter 1: The Foundation
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif-display text-white mt-1">
                Choose Your Winter Landscape
              </h2>
              <p className="text-xs sm:text-sm text-[#91a1b1] mt-1">
                Select the terrain where your Christmas world will flourish. You can also switch landscapes later while keeping your placed objects.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {landscapes.map((land) => {
                const isSelected = selectedLandscape === land.id;
                return (
                  <div
                    key={land.id}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedLandscape(land.id);
                    }}
                    className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'winter-panel-gold bg-[#16273b]'
                        : 'winter-panel hover:border-white/30 bg-[#0f1b29]/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                        {land.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base font-serif-display">
                          {land.name}
                        </h3>
                        <span className="text-[11px] text-[#e5c783] font-medium">
                          {land.tagline}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#91a1b1] leading-relaxed mb-3">
                      {land.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {land.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-[#edf2f6]/80 border border-white/5"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setStep('welcome');
                }}
                className="py-2.5 px-5 rounded-xl border border-white/20 text-[#edf2f6] text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                onClick={() => handleConfirmLandscape(selectedLandscape)}
                className="py-3 px-8 rounded-xl festive-gradient font-bold text-xs uppercase tracking-wider shadow-xl hover:brightness-105 transition-all cursor-pointer font-serif-display flex items-center gap-2"
              >
                <span>Enter & Build World</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
