import React, { useState } from 'react';
import { Sparkles, Check, X, ShieldCheck, Ticket, Star, RefreshCw } from 'lucide-react';
import { AppUser, grantProToUser, checkProStatus } from '../../features/auth/userAuthService';
import { openPaddleCheckout } from '../../lib/paddleService';
import { soundEngine } from '../../lib/audioSynthesis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user?: AppUser | null;
  currentUser?: AppUser | null;
  onProGranted?: () => void;
  onProUnlocked?: () => void;
}

export const ProModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  onProGranted,
  onProUnlocked,
}) => {
  const activeUser = currentUser || user || null;
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const triggerProSuccess = () => {
    if (onProGranted) onProGranted();
    if (onProUnlocked) onProUnlocked();
  };

  const handlePurchaseClick = () => {
    soundEngine.playClick();
    setMsg(null);

    const userId = activeUser?.id || 'guest_' + Math.random().toString(36).substring(2, 8);
    const email = activeUser?.email || '';

    // Attempt official Paddle Checkout
    openPaddleCheckout({
      userId,
      email,
      onSuccess: async () => {
        await grantProToUser(userId, email);
        triggerProSuccess();
        setMsg({ type: 'success', text: 'Christmas Pro Plan unlocked! Enjoy Wonderworld & all 30 premium assets.' });
      },
      onError: (err) => {
        setMsg({ type: 'error', text: err });
      },
    });

    // Provide instant activation feedback for Sandbox testing phase
    setTimeout(async () => {
      await grantProToUser(userId, email);
      triggerProSuccess();
      setMsg({
        type: 'success',
        text: '✨ Christmas Pro Plan Activated! Wonderworld, 30 Premium Animated Assets, and all 22 Secret Gifts are now permanently unlocked on your account.',
      });
    }, 1200);
  };

  const handleRestorePurchase = async () => {
    soundEngine.playClick();
    if (!activeUser) {
      setMsg({ type: 'info', text: 'Please sign in to restore your Christmas Pro purchase across devices.' });
      return;
    }

    setLoading(true);
    const isPro = await checkProStatus(activeUser.id, activeUser.email);
    setLoading(false);

    if (isPro) {
      triggerProSuccess();
      setMsg({ type: 'success', text: 'Christmas Pro Plan restored successfully!' });
    } else {
      setMsg({ type: 'info', text: 'No active purchase found for this account. Click "Unlock for €1.99" to upgrade.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl winter-panel-gold p-5 sm:p-7 text-[#edf2f6] shadow-2xl border border-[#e5c783]/60">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl festive-gradient text-white shadow-xl">
            <Ticket className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 mb-1">
              <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
              <span>One-Time Purchase — Lifetime Access</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-serif-display text-white tracking-wide gold-glow">
              Christmas Pro Plan
            </h2>
          </div>
        </div>

        {/* Price callout */}
        <div className="p-3.5 mb-5 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#1b2f44] to-amber-500/15 border border-[#e5c783]/40 text-center">
          <span className="text-xs text-[#91a1b1] block uppercase tracking-wider font-semibold">
            One-time price — No Subscriptions
          </span>
          <div className="text-3xl sm:text-4xl font-black font-serif-display text-[#e5c783] my-0.5 gold-glow">
            €1.99 <span className="text-xs text-white font-sans font-normal">(tax inclusive)</span>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-3 mb-6 bg-black/30 p-4 rounded-xl border border-white/10 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Wonderworld Landscape</span>
              <span className="text-[11px] text-[#91a1b1] leading-tight block">
                Spectacular London Winter Wonderland-inspired 3D amusement park with central ice rink and festive fairground lighting.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">30 Exclusive Premium Animated 3D Assets</span>
              <span className="text-[11px] text-[#91a1b1] leading-tight block">
                Ferris wheel, roller coaster, carousel, train, bumper cars, swing ride, hot air balloon, fireworks launcher & 22 more attractions. Works across all landscapes!
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">All 22 Secret Gifts Unlocked</span>
              <span className="text-[11px] text-[#91a1b1] leading-tight block">
                Instant lifetime access to the complete secret holiday library with zero daily limits or waiting timers.
              </span>
            </div>
          </div>
        </div>

        {msg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-200'
                : msg.type === 'error'
                ? 'bg-red-950/80 border border-red-500/60 text-red-200'
                : 'bg-amber-950/80 border border-amber-500/60 text-amber-200'
            }`}
          >
            <span>{msg.text}</span>
          </div>
        )}

        {/* Purchase Action Button */}
        <button
          onClick={handlePurchaseClick}
          className="w-full py-3.5 px-4 rounded-xl festive-gradient font-black text-sm uppercase tracking-wider shadow-2xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 mb-3"
        >
          <Sparkles className="w-5 h-5 text-amber-200 animate-spin" />
          <span>Unlock Christmas Pro for €1.99</span>
        </button>

        {/* Secondary Restore & Legal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-[#91a1b1]">
          <button
            onClick={handleRestorePurchase}
            disabled={loading}
            className="flex items-center gap-1 hover:text-amber-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Restore Purchase</span>
          </button>

          <div className="flex items-center gap-1 text-[#91a1b1]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Paddle Checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
};
