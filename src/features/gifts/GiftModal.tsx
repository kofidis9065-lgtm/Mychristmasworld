import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, Check, X, RotateCcw, BookmarkCheck, ArrowRight, Clock } from 'lucide-react';
import { AssetDefinition, PlacedObject } from '../world/worldTypes';
import { getAvailableGiftPool, checkDailyGiftClaimed, claimDailyGift, devResetDailyClaims } from './giftService';
import { soundEngine } from '../../lib/audioSynthesis';
import { User } from '@supabase/supabase-js';
import { AppUser } from '../auth/userAuthService';
import { ASSET_CATALOG } from '../../game/assets/assetCatalog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  currentUser?: AppUser | null;
  worldId: string;
  unlockedAssetIds?: string[];
  onGiftClaimed: (newObject: PlacedObject, assetId: string) => void;
  onPlaceNow?: (assetId: string) => void;
}

function getTimeUntilMidnight(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  return { hours, minutes, seconds };
}

export const GiftModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  worldId,
  unlockedAssetIds = [],
  onGiftClaimed,
  onPlaceNow,
}) => {
  const [alreadyClaimed, setAlreadyClaimed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpening, setIsOpening] = useState<boolean>(false);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [claimedReward, setClaimedReward] = useState<AssetDefinition | null>(null);
  const [giftPool, setGiftPool] = useState<AssetDefinition[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilMidnight());

  // Only the developer (kofidis9065@gmail.com) or explicit admin param can see the reset button
  const isDevAdmin =
    currentUser?.email?.toLowerCase() === 'kofidis9065@gmail.com' ||
    user?.email?.toLowerCase() === 'kofidis9065@gmail.com' ||
    (typeof window !== 'undefined' && window.location.search.includes('admin=true'));

  const totalSecretGifts = ASSET_CATALOG.filter((a) => a.isSecretGift).length;
  const unlockedSecretCount = ASSET_CATALOG.filter(
    (a) => a.isSecretGift && unlockedAssetIds.includes(a.id)
  ).length;

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      const interval = setInterval(() => {
        setCountdown(getTimeUntilMidnight());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen, user, currentUser]);

  const checkStatus = async () => {
    setLoading(true);
    setErrorMessage(null);
    setClaimedReward(null);
    setSelectedBoxIndex(null);
    setIsOpening(false);

    const claimed = await checkDailyGiftClaimed(user, 0, currentUser?.id);
    setAlreadyClaimed(claimed);

    // Pick 3 random secret gifts from unrevealed pool (or full pool if all collected)
    const pool = getAvailableGiftPool(unlockedAssetIds);
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setGiftPool(shuffled.slice(0, 3));
    setLoading(false);
  };

  const handleOpenGift = async (reward: AssetDefinition, boxIdx: number) => {
    if (alreadyClaimed || isOpening) return;
    setIsOpening(true);
    setSelectedBoxIndex(boxIdx);
    soundEngine.playClick();

    setTimeout(async () => {
      const res = await claimDailyGift(reward.id, worldId, user, 0, currentUser?.id);

      if (!res.success) {
        setErrorMessage(res.error || 'Could not claim reward');
        setIsOpening(false);
        return;
      }

      setClaimedReward(reward);
      setIsOpening(false);
      setAlreadyClaimed(true);

      // Fanfare sound & confetti
      soundEngine.playGiftFanfare();
      try {
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#e5c783', '#ef4444', '#15803d', '#38bdf8', '#f8fafc'],
        });
      } catch {
        // fallback
      }

      // Add to world
      const newObj: PlacedObject = {
        id: 'gift_reward_' + Math.random().toString(36).substring(2, 9),
        assetType: reward.id,
        name: reward.name,
        position: [0, 0, 3],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        createdAt: new Date().toISOString(),
      };
      onGiftClaimed(newObj, reward.id);
    }, 900);
  };

  const handleDevReset = async () => {
    devResetDailyClaims();
    await checkStatus();
  };

  const handlePlaceDirectly = () => {
    if (!claimedReward) return;
    onClose();
    if (onPlaceNow) {
      onPlaceNow(claimedReward.id);
    }
  };

  if (!isOpen) return null;

  const padZero = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg rounded-2xl winter-panel-gold p-5 sm:p-7 text-[#edf2f6] shadow-2xl border border-[#e5c783]/40">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-[#e5c783] border border-[#e5c783]/40 shadow-inner">
            <Gift className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif-display text-white tracking-wide flex items-center gap-2">
              <span>Daily Christmas Gift</span>
              <Sparkles className="w-4 h-4 text-[#e5c783]" />
            </h2>
            <p className="text-xs text-[#91a1b1]">
              Unwrap your free mystery holiday surprise every day!
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-[#91a1b1] text-sm animate-pulse">
            Checking today's holiday delivery from the North Pole...
          </div>
        ) : claimedReward ? (
          /* ==================================================================== */
          /* SCREEN: NEW ITEM UNLOCKED IN LIBRARY                                 */
          /* ==================================================================== */
          <div className="py-2 text-center animate-in fade-in zoom-in duration-300">
            {/* Glowing Icon Stage */}
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="absolute w-24 h-24 bg-amber-400/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-[#1b2f44] to-[#0d1723] border-2 border-[#e5c783] flex items-center justify-center text-5xl shadow-2xl">
                {claimedReward.previewIcon}
              </div>
              <span className="absolute -top-2 -right-2 p-1 rounded-full bg-amber-400 text-black text-xs font-bold shadow">
                ✨
              </span>
            </div>

            {/* Badges */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#e5c783]/20 text-[#e5c783] border border-[#e5c783]/40">
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>Added to Library!</span>
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                Secret Gift #{unlockedSecretCount}
              </span>
            </div>

            {/* Name & Rich Description */}
            <h3 className="text-2xl font-bold font-serif-display text-white mb-2 gold-glow">
              {claimedReward.name}
            </h3>
            <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-md mx-auto mb-4 leading-relaxed">
              {claimedReward.description}
            </p>

            {/* Place Directly Action */}
            <button
              onClick={handlePlaceDirectly}
              className="w-full py-3 px-4 rounded-xl festive-gradient font-extrabold text-xs sm:text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 mb-4"
            >
              <span>Place in World Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Countdown timer to tomorrow */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#91a1b1] mb-1">
                <Clock className="w-3.5 h-3.5 text-[#e5c783]" />
                <span>Next daily gift unlocks in:</span>
              </div>
              <div className="font-mono text-sm font-bold text-[#e5c783]">
                {padZero(countdown.hours)}h : {padZero(countdown.minutes)}m : {padZero(countdown.seconds)}s
              </div>
            </div>
          </div>
        ) : alreadyClaimed ? (
          /* ==================================================================== */
          /* SCREEN: CLAIMED TODAY -> TIMER UNTIL NEXT DAY                        */
          /* ==================================================================== */
          <div className="py-4 text-center">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mb-3">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold font-serif-display text-white mb-1">
              Today's Free Gift Claimed!
            </h3>
            <p className="text-xs text-[#91a1b1] max-w-sm mx-auto mb-5 leading-relaxed">
              You have already collected today's holiday mystery gift. Come back tomorrow for your next secret decoration!
            </p>

            {/* Live Ticking Countdown Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-[#16273b] to-[#0c1825] border border-[#e5c783]/40 mb-5 shadow-xl text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#e5c783] mb-3">
                <Clock className="w-4 h-4 animate-spin" />
                <span>NEXT DAILY GIFT UNLOCKS IN</span>
              </div>

              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-14 py-2.5 rounded-xl bg-black/60 border border-white/15 text-2xl font-bold font-mono text-white shadow-inner">
                    {padZero(countdown.hours)}
                  </div>
                  <span className="text-[10px] text-[#91a1b1] mt-1 uppercase font-semibold">Hours</span>
                </div>
                <span className="text-xl font-bold text-[#e5c783] -mt-4">:</span>
                <div className="flex flex-col items-center">
                  <div className="w-14 py-2.5 rounded-xl bg-black/60 border border-white/15 text-2xl font-bold font-mono text-white shadow-inner">
                    {padZero(countdown.minutes)}
                  </div>
                  <span className="text-[10px] text-[#91a1b1] mt-1 uppercase font-semibold">Mins</span>
                </div>
                <span className="text-xl font-bold text-[#e5c783] -mt-4">:</span>
                <div className="flex flex-col items-center">
                  <div className="w-14 py-2.5 rounded-xl bg-black/60 border border-white/15 text-2xl font-bold font-mono text-white shadow-inner">
                    {padZero(countdown.seconds)}
                  </div>
                  <span className="text-[10px] text-[#91a1b1] mt-1 uppercase font-semibold">Secs</span>
                </div>
              </div>
            </div>

            {/* Secret Gift Collection Progress Bar */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4 text-left">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#91a1b1]">Total Collection Progress:</span>
                <span className="font-bold text-[#e5c783] font-mono">
                  {unlockedSecretCount} / {totalSecretGifts} Unlocked
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-[#e5c783] rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(5, (unlockedSecretCount / (totalSecretGifts || 1)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Dev Reset Helper: STRICTLY HIDDEN UNLESS USER IS kofidis9065@gmail.com */}
            {isDevAdmin && (
              <div className="pt-2 border-t border-white/10 flex justify-center">
                <button
                  onClick={handleDevReset}
                  className="flex items-center gap-1.5 text-xs text-amber-300 hover:underline cursor-pointer bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-500/40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Dev Test: Reset Daily Claim</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ==================================================================== */
          /* SCREEN: PICK MYSTERY GIFT                                           */
          /* ==================================================================== */
          <div>
            <p className="text-xs text-amber-200/90 mb-4 text-center font-medium">
              Pick one secret mystery box to unwrap and add to your library:
            </p>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {giftPool.map((gift, idx) => {
                const boxStyles = [
                  { icon: '🎁', color: 'border-red-500/40 hover:border-red-400 bg-red-950/30', ribbon: 'Ruby Bow' },
                  { icon: '🎀', color: 'border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/30', ribbon: 'Emerald Ribbon' },
                  { icon: '📦', color: 'border-amber-500/40 hover:border-amber-400 bg-amber-950/30', ribbon: 'Golden Package' },
                ][idx % 3];

                const isThisOpening = isOpening && selectedBoxIndex === idx;

                return (
                  <button
                    key={gift.id}
                    onClick={() => handleOpenGift(gift, idx)}
                    disabled={isOpening}
                    className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer active:scale-95 ${
                      boxStyles.color
                    } ${
                      isThisOpening
                        ? 'scale-105 ring-2 ring-[#e5c783] animate-pulse'
                        : 'hover:scale-102 hover:bg-white/10'
                    }`}
                  >
                    <div className="text-4xl sm:text-5xl mb-2 group-hover:scale-110 transition-transform filter drop-shadow">
                      {isThisOpening ? '✨' : boxStyles.icon}
                    </div>
                    <span className="text-xs font-bold text-center text-white line-clamp-1 font-serif-display">
                      Mystery Box #{idx + 1}
                    </span>
                    <span className="text-[10px] text-[#e5c783] mt-0.5">
                      {isThisOpening ? 'Unwrapping...' : boxStyles.ribbon}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Secret Gift Progress Footnote */}
            <div className="flex items-center justify-between text-[11px] text-[#91a1b1] px-1">
              <span>⭐ 22 Secret Gifts Available</span>
              <span className="font-mono text-amber-200">{unlockedSecretCount} Unlocked so far</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
