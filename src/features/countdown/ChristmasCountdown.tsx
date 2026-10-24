import React, { useState, useEffect } from 'react';
import { calculateChristmasCountdown, CountdownResult } from './countdownUtils';
import { Sparkles } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const ChristmasCountdown: React.FC<Props> = ({ compact = false }) => {
  const [countdown, setCountdown] = useState<CountdownResult>(calculateChristmasCountdown());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(calculateChristmasCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (countdown.isChristmasDay) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200">
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span className="font-semibold text-xs tracking-wider uppercase font-serif-display">
          Merry Christmas! 🎄
        </span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#132131]/90 border border-[#e5c783]/30 text-[#edf2f6] text-xs">
        <span className="text-[#e5c783] font-serif-display font-bold">Christmas:</span>
        <span className="font-mono font-medium text-amber-200">
          {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#132131]/90 border border-[#e5c783]/30 text-[#edf2f6] shadow-lg shadow-black/40">
      <div className="flex items-center gap-1 text-xs text-[#e5c783] font-serif-display font-semibold tracking-wider uppercase mr-1">
        <Sparkles className="w-3.5 h-3.5 text-[#e5c783]" />
        <span>Christmas</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-mono">
        <div className="flex flex-col items-center min-w-[20px]">
          <span className="font-bold text-amber-200 leading-tight">{countdown.days}</span>
          <span className="text-[9px] text-[#91a1b1] uppercase font-sans">d</span>
        </div>
        <span className="text-[#e5c783]/40">:</span>
        <div className="flex flex-col items-center min-w-[18px]">
          <span className="font-bold text-amber-200 leading-tight">
            {String(countdown.hours).padStart(2, '0')}
          </span>
          <span className="text-[9px] text-[#91a1b1] uppercase font-sans">h</span>
        </div>
        <span className="text-[#e5c783]/40">:</span>
        <div className="flex flex-col items-center min-w-[18px]">
          <span className="font-bold text-amber-200 leading-tight">
            {String(countdown.minutes).padStart(2, '0')}
          </span>
          <span className="text-[9px] text-[#91a1b1] uppercase font-sans">m</span>
        </div>
        <span className="text-[#e5c783]/40">:</span>
        <div className="flex flex-col items-center min-w-[18px]">
          <span className="font-bold text-amber-200 leading-tight">
            {String(countdown.seconds).padStart(2, '0')}
          </span>
          <span className="text-[9px] text-[#91a1b1] uppercase font-sans">s</span>
        </div>
      </div>
    </div>
  );
};
