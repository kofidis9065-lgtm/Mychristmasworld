import React, { useEffect, useState } from 'react';
import { Sparkles, Check, X, ShieldCheck, Ticket, Star, RefreshCw, LogIn } from 'lucide-react';
import {
  AppUser,
  checkProStatus,
  confirmPaddleTransaction,
  fetchServerAuthSession,
} from '../../features/auth/userAuthService';
import { ensurePaddleInitialized, openPaddleCheckout } from '../../lib/paddleService';
import { soundEngine } from '../../lib/audioSynthesis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user?: AppUser | null;
  currentUser?: AppUser | null;
  onProGranted?: () => void;
  onProUnlocked?: () => void;
  onProRevoked?: () => void;
  onRequireGoogleAuth?: () => void;
}

export const ProModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  currentUser,
  onProGranted,
  onProUnlocked,
  onProRevoked,
  onRequireGoogleAuth,
}) => {
  const activeUser = currentUser || user || null;
  const isGoogleSignedIn = Boolean(
    activeUser && activeUser.provider === 'google' && activeUser.id.startsWith('google_') && activeUser.email
  );
  const [loading, setLoading] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen && isGoogleSignedIn) {
      ensurePaddleInitialized().then((res) => {
        if (!res.ok && res.error) {
          console.warn('[ProModal] Paddle preload note:', res.error);
        }
      });
    }
  }, [isOpen, isGoogleSignedIn]);

  if (!isOpen) return null;

  const triggerProSuccess = () => {
    if (onProGranted) onProGranted();
    if (onProUnlocked) onProUnlocked();
  };

  const pollForServerConfirmation = async (transactionId?: string) => {
    setVerifyingPayment(true);
    setMsg({
      type: 'info',
      text: 'Payment received! Confirming your verified Christmas Pro purchase with the server...',
    });

    const firstAttempt = await confirmPaddleTransaction(transactionId);
    if (firstAttempt.isPro) {
      setVerifyingPayment(false);
      triggerProSuccess();
      setMsg({
        type: 'success',
        text: '✨ Christmas Pro Plan Activated! Wonderworld, 30 Premium Animated Assets, and all 22 Secret Gifts are now permanently linked to your Google account.',
      });
      return;
    }

    if (firstAttempt.error && !firstAttempt.pendingWebhook) {
      setVerifyingPayment(false);
      setMsg({ type: 'error', text: firstAttempt.error });
      return;
    }

    // Poll until Paddle webhook writes verified purchase to Supabase (up to ~18s)
    for (let attempt = 0; attempt < 9; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const confirmed = await checkProStatus();
      if (confirmed) {
        setVerifyingPayment(false);
        triggerProSuccess();
        setMsg({
          type: 'success',
          text: '✨ Christmas Pro Plan Activated! Wonderworld, 30 Premium Animated Assets, and all 22 Secret Gifts are now permanently linked to your Google account.',
        });
        return;
      }
    }

    setVerifyingPayment(false);
    setMsg({
      type: 'info',
      text: 'Your payment confirmation is still processing. Click "Restore Purchase" in a few seconds to sync your Pro access.',
    });
  };

  const handlePurchaseClick = async () => {
    soundEngine.playClick();
    setMsg(null);

    if (!isGoogleSignedIn || !activeUser) {
      setMsg({
        type: 'info',
        text: 'Please sign in with Google first so your €1.99 Christmas Pro purchase is permanently linked to your account across devices.',
      });
      if (onRequireGoogleAuth) {
        onRequireGoogleAuth();
      }
      return;
    }

    setLoading(true);
    const session = await fetchServerAuthSession();

    if (!session.authenticated || !session.user || session.user.provider !== 'google') {
      setLoading(false);
      setMsg({
        type: 'info',
        text: 'Please sign in with Google again to verify your session before checkout.',
      });
      if (onRequireGoogleAuth) {
        onRequireGoogleAuth();
      }
      return;
    }

    if (session.isPro) {
      setLoading(false);
      triggerProSuccess();
      setMsg({
        type: 'success',
        text: 'Your Google account already owns Christmas Pro! Access restored.',
      });
      return;
    }

    await openPaddleCheckout({
      userId: session.user.id,
      email: session.user.email,
      onSuccess: (transactionId) => {
        setLoading(false);
        pollForServerConfirmation(transactionId);
      },
      onClose: () => {
        setLoading(false);
      },
      onError: (err) => {
        setLoading(false);
        setMsg({ type: 'error', text: err });
      },
    });
    setLoading(false);
  };

  const handleRestorePurchase = async () => {
    soundEngine.playClick();
    if (!isGoogleSignedIn) {
      setMsg({
        type: 'info',
        text: 'Please sign in with Google to restore your Christmas Pro purchase across devices.',
      });
      if (onRequireGoogleAuth) {
        onRequireGoogleAuth();
      }
      return;
    }

    setLoading(true);
    const isPro = await checkProStatus();
    setLoading(false);

    if (isPro) {
      triggerProSuccess();
      setMsg({ type: 'success', text: 'Christmas Pro Plan restored successfully!' });
    } else {
      if (onProRevoked) onProRevoked();
      setMsg({
        type: 'info',
        text: 'No active purchase found for this Google account. Click "Unlock Christmas Pro for €1.99" to upgrade.',
      });
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
        <div className="space-y-3 mb-5 bg-black/30 p-4 rounded-xl border border-white/10 text-xs sm:text-sm">
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

        {!isGoogleSignedIn && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-400/40 text-amber-100 text-xs leading-relaxed">
            <strong>Google Sign-In required:</strong> Sign in with Google first so your Christmas Pro purchase is securely verified and permanently restored on all your devices.
          </div>
        )}

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

        {/* Purchase or Google Sign-In Action Button */}
        {isGoogleSignedIn ? (
          <button
            onClick={handlePurchaseClick}
            disabled={loading || verifyingPayment}
            className="w-full py-3.5 px-4 rounded-xl festive-gradient font-black text-sm uppercase tracking-wider shadow-2xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 mb-3 disabled:opacity-60"
          >
            <Sparkles className={`w-5 h-5 text-amber-200 ${verifyingPayment ? 'animate-spin' : ''}`} />
            <span>
              {verifyingPayment
                ? 'Confirming Payment...'
                : loading
                ? 'Checking Session...'
                : 'Unlock Christmas Pro for €1.99'}
            </span>
          </button>
        ) : (
          <button
            onClick={handlePurchaseClick}
            className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-black text-sm tracking-wide shadow-2xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 mb-3"
          >
            <LogIn className="w-5 h-5 text-amber-600" />
            <span>Sign in with Google to Unlock (€1.99)</span>
          </button>
        )}

        {/* Secondary Restore & Legal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-[#91a1b1]">
          <button
            onClick={handleRestorePurchase}
            disabled={loading || verifyingPayment}
            className="flex items-center gap-1 hover:text-amber-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || verifyingPayment ? 'animate-spin' : ''}`} />
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
