import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Sparkles, Check, X, RotateCcw, PackageCheck, BookmarkCheck, ArrowRight, Play, Film } from 'lucide-react';
import { AssetDefinition, PlacedObject } from '../world/worldTypes';
import { getAvailableGiftPool, checkDailyGiftClaimed, claimDailyGift, recordAdRewardClaim, devResetDailyClaims } from './giftService';
import { soundEngine } from '../../lib/audioSynthesis';
import { User } from '@supabase/supabase-js';
import { GoogleUser } from '../auth/googleAuthService';
import { ASSET_CATALOG } from '../../game/assets/assetCatalog';
import { GoogleAdSenseRewardedModal } from '../../components/ads/GoogleAdSenseRewardedModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  googleUser?: GoogleUser | null;
  worldId: string;
  unlockedAssetIds?: string[];
  onGiftClaimed: (newObject: PlacedObject, assetId: string) => void;
  onPlaceNow?: (assetId: string) => void;
}

export const GiftModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  googleUser,
  worldId,
  unlockedAssetIds = [],
  onGiftClaimed,
  onPlaceNow,
}) => {
  const [alreadyClaimed, setAlreadyClaimed] = useState<boolean>(false);
  const [isAdRewardBonus, setIsAdRewardBonus] = useState<boolean>(false);
  const [isAdModalOpen, setIsAdModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpening, setIsOpening] = useState<boolean>(false);
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [claimedReward, setClaimedReward] = useState<AssetDefinition | null>(null);
  const [giftPool, setGiftPool] = useState<AssetDefinition[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalSecretGifts = ASSET_CATALOG.filter((a) => a.isSecretGift).length;
  const unlockedSecretCount = ASSET_CATALOG.filter(
    (a) => a.isSecretGift && unlockedAssetIds.includes(a.id)
  ).length;

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen, user, googleUser]);

  const checkStatus = async () => {
    setLoading(true);
    setErrorMessage(null);
    setClaimedReward(null);
    setSelectedBoxIndex(null);
    setIsOpening(false);

    const claimed = await checkDailyGiftClaimed(user, 0, googleUser?.id);
    setAlreadyClaimed(claimed);

    // Pick 3 random secret gifts from unrevealed pool (or full pool if all collected)
    const pool = getAvailableGiftPool(unlockedAssetIds);
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setGiftPool(shuffled.slice(0, 3));
    setLoading(false);
  };

  const handleAdCompleted = () => {
    setIsAdRewardBonus(true);
    setAlreadyClaimed(false);
    setClaimedReward(null);
    setSelectedBoxIndex(null);

    // Refresh mystery box pool with unrevealed secret gifts
    const pool = getAvailableGiftPool(unlockedAssetIds);
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setGiftPool(shuffled.slice(0, 3));
  };

  const handleOpenGift = async (reward: AssetDefinition, boxIdx: number) => {
    if ((alreadyClaimed && !isAdRewardBonus) || isOpening) return;
    setIsOpening(true);
    setSelectedBoxIndex(boxIdx);
    soundEngine.playClick();

    setTimeout(async () => {
      const res = isAdRewardBonus
        ? await recordAdRewardClaim(reward.id, worldId, user, googleUser?.id)
        : await claimDailyGift(reward.id, worldId, user, 0, googleUser?.id);

      if (!res.success) {
        setErrorMessage(res.error || 'Could not claim reward');
        setIsOpening(false);
        return;
      }

      setClaimedReward(reward);
      setIsOpening(false);
      setAlreadyClaimed(true);
      setIsAdRewardBonus(false);

      // Play fanfare sound & trigger confetti
      soundEngine.playGiftFanfare();
      try {
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#e5c783', '#ef4444', '#15803d', '#38bdf8', '#f8fafc'],
        });
      } catch {
        // confetti fallback
      }

      // Create new placed object for user's world
      const newObj: PlacedObject = {
        id: 'gift_reward_' + Math.random().toString(36).substring(2, 9),
        assetType: reward.id,
        name: reward.name,
        position: [0, 0, 3], // Front center for immediate visual enjoyment
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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs select-none">
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
                <span>Christmas Gifts</span>
                <Sparkles className="w-4 h-4 text-[#e5c783]" />
              </h2>
              <p className="text-xs text-[#91a1b1]">
                Unwrap secret holiday decorations or watch a short Google AdSense ad to claim unlimited bonus prizes!
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
              <p className="text-xs sm:text-sm text-[#cbd5e1] max-w-md mx-auto mb-5 leading-relaxed">
                {claimedReward.description}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 mb-4">
                <button
                  onClick={handlePlaceDirectly}
                  className="w-full py-3 px-4 rounded-xl festive-gradient font-extrabold text-xs sm:text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Place from Library Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Watch Ad for ANOTHER gift immediately! */}
                <button
                  onClick={() => setIsAdModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 border border-blue-400/40"
                >
                  <Film className="w-4 h-4 text-blue-300 animate-pulse" />
                  <span>Watch Google Ad for Another Gift 🎬🎁</span>
                </button>
              </div>
            </div>
          ) : alreadyClaimed && !isAdRewardBonus ? (
            /* ==================================================================== */
            /* SCREEN: CLAIMED TODAY -> WATCH AD FOR UNLIMITED REWARDS              */
            /* ==================================================================== */
            <div className="py-4 text-center">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-serif-display text-white mb-1">
                Today's Free Gift Collected!
              </h3>
              <p className="text-xs text-[#91a1b1] max-w-sm mx-auto mb-5 leading-relaxed">
                Want to unlock another secret decoration right now without waiting? Watch a quick sponsored Google AdSense video below!
              </p>

              {/* Google AdSense Rewarded Action Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/50 via-indigo-900/50 to-purple-900/50 border border-blue-400/40 mb-5 shadow-xl text-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-400 text-black uppercase">
                    AdSense
                  </span>
                  <span className="text-xs font-bold text-white flex items-center gap-1">
                    <Film className="w-3.5 h-3.5 text-blue-300" />
                    <span>Watch Short Ad for Bonus Reward</span>
                  </span>
                </div>
                <p className="text-[11px] text-gray-300 mb-3 leading-relaxed">
                  Watch a 5-second Google AdSense showcase to immediately reveal another secret mystery box from your 22-gift collection!
                </p>
                <button
                  onClick={() => setIsAdModalOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 hover:brightness-110 text-white font-extrabold text-xs sm:text-sm shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Watch Google Ad for Reward 🎬</span>
                </button>
              </div>

              {/* Secret Gift Collection Progress Bar */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 mb-4 text-left">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#91a1b1]">Collection Progress:</span>
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

              {/* Dev Reset Helper */}
              <div className="pt-2 border-t border-white/10 flex justify-center">
                <button
                  onClick={handleDevReset}
                  className="flex items-center gap-1.5 text-xs text-[#e5c783] hover:underline opacity-80 hover:opacity-100 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Dev Test: Reset Daily Claim</span>
                </button>
              </div>
            </div>
          ) : (
            /* ==================================================================== */
            /* SCREEN: PICK MYSTERY GIFT                                           */
            /* ==================================================================== */
            <div>
              {isAdRewardBonus && (
                <div className="mb-3 p-2.5 rounded-xl bg-blue-500/20 border border-blue-400/50 text-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 animate-pulse">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Ad Reward Unlocked! Pick a mystery box below:</span>
                </div>
              )}

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

              {/* Watch Ad Bonus Banner */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-400/30 flex items-center justify-between text-xs mb-3">
                <span className="text-blue-200 font-medium flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-blue-300" />
                  <span>Want extra gifts without limit?</span>
                </span>
                <button
                  onClick={() => setIsAdModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-500 hover:bg-blue-400 text-white font-bold text-[11px] cursor-pointer transition-all active:scale-95"
                >
                  Watch Ad 🎬
                </button>
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

      {/* Google AdSense Rewarded Modal */}
      <GoogleAdSenseRewardedModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        onAdCompleted={handleAdCompleted}
        rewardTitle="Secret Gift Mystery Box"
      />
    </>
  );
};

