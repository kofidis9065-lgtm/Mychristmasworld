import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppUser, logoutUser, loginWithGoogleCredential } from './userAuthService';
import { X, User as UserIcon, Check, ShieldCheck, RefreshCw, LogOut, Crown, Compass } from 'lucide-react';
import { soundEngine } from '../../lib/audioSynthesis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  isProUser?: boolean;
  onUserChanged: (user: AppUser | null) => void;
  onManualSync: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  isProUser = false,
  onUserChanged,
  onManualSync,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showFallbackButton, setShowFallbackButton] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const isAuthenticated = Boolean(currentUser && currentUser.provider === 'google');

  const handleGoogleCallback = useCallback(
    async (response: any) => {
      if (!response?.credential) return;
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await loginWithGoogleCredential(response.credential);
      setLoading(false);
      if (res.success && res.user) {
        onUserChanged(res.user);
        setSuccessMsg(`Welcome, ${res.user.nickname}! Connected with Google.`);
        setTimeout(() => onClose(), 1100);
      } else {
        setErrorMsg(res.error || 'Google Sign-In failed.');
      }
    },
    [onUserChanged, onClose]
  );

  // Initialize Google Identity Services when signed out
  useEffect(() => {
    if (!isOpen || isAuthenticated || !googleClientId) return;
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          locale: 'en',
          callback: handleGoogleCallback,
        });
      } catch (err) {
        console.warn('Google Identity GIS error:', err);
      }
    }
  }, [isOpen, isAuthenticated, googleClientId, handleGoogleCallback]);

  // Reset transient feedback whenever modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowFallbackButton(false);
    }
  }, [isOpen]);

  // Render Google's official button fallback when One Tap is blocked (e.g., iOS Safari ITP / standalone PWA)
  useEffect(() => {
    if (!isOpen || isAuthenticated || !googleClientId || !showFallbackButton) return;
    const gsi = typeof window !== 'undefined' ? (window as any).google?.accounts?.id : null;
    if (!gsi || !googleButtonRef.current) return;

    try {
      googleButtonRef.current.innerHTML = '';
      gsi.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: Math.min(360, googleButtonRef.current.offsetWidth || 320),
      });
    } catch (err) {
      console.warn('Google renderButton fallback error:', err);
    }
  }, [isOpen, isAuthenticated, googleClientId, showFallbackButton]);

  const handleContinueWithGoogle = () => {
    soundEngine.playClick();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!googleClientId) {
      setErrorMsg('Google Sign-In is currently unavailable. You can continue playing as a Guest.');
      return;
    }

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        const gsi = (window as any).google.accounts.id;
        gsi.initialize({
          client_id: googleClientId,
          locale: 'en',
          callback: handleGoogleCallback,
        });
        gsi.prompt((notification: any) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            setShowFallbackButton(true);
            const isStandaloneIOS =
              (window.navigator as any).standalone === true &&
              /iPad|iPhone|iPod/.test(navigator.userAgent);
            if (isStandaloneIOS) {
              setErrorMsg(
                'Use the Google Sign-In button below, or open myxmas.top in Safari if the Home Screen app blocks sign-in popups.'
              );
            } else {
              setErrorMsg(
                'Quick prompt was dismissed by your browser. Tap the official Google Sign-In button below.'
              );
            }
          }
        });
      } catch (err: any) {
        console.error('Google Sign-In error:', err);
        setShowFallbackButton(true);
        setErrorMsg(err?.message || 'Error starting Google Sign-In. Please try again.');
      }
    } else {
      setErrorMsg('Google Sign-In is still loading. Please try again in a moment.');
    }
  };

  const handleContinueAsGuest = () => {
    soundEngine.playClick();
    onClose();
  };

  const handleLogout = async () => {
    soundEngine.playClick();
    await logoutUser();
    onUserChanged(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl winter-panel-gold p-6 text-[#edf2f6] shadow-2xl border border-[#e5c783]/40">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close account modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 pr-7">
          <div className="p-3 rounded-xl bg-[#e5c783]/20 text-[#e5c783] border border-[#e5c783]/30 shrink-0">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif-display text-white">
              {isAuthenticated ? 'Your Christmas Profile' : 'Christmas World Account'}
            </h2>
            <p className="text-xs text-[#91a1b1]">
              {isAuthenticated
                ? 'Signed in with your verified Google account.'
                : 'Play as a Guest or sign in with Google.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {isAuthenticated && currentUser ? (
          /* Signed In View (No second Google Sign-In button, no Clear Cache button) */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0d1723]/90 border border-[#e5c783]/30 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-amber-500/20 border border-[#e5c783]/40 flex items-center justify-center text-xl shadow-md shrink-0">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.nickname} className="w-full h-full object-cover" />
                ) : (
                  <span>🎅</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-white text-sm block truncate">
                  {currentUser.nickname}
                </span>
                <span className="text-xs text-[#91a1b1] block truncate">{currentUser.email}</span>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {isProUser ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-200 text-[10px] font-bold">
                      <Crown className="w-3 h-3 text-amber-300 fill-amber-300" />
                      <span>Christmas Pro Active</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#cbd5e1] text-[10px] font-medium">
                      <span>Free Plan</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Cloud Synced</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPlacement();
                  onManualSync();
                  setSuccessMsg('World synchronized with your account!');
                  setTimeout(() => setSuccessMsg(null), 2500);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#e5c783]" />
                <span>Save World Now</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl border border-red-500/35 text-red-200 bg-red-950/35 hover:bg-red-950/65 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* Signed Out View (Google Sign-In + Guest Mode only) */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-black/35 border border-white/10 text-xs leading-relaxed text-[#cbd5e1] space-y-2">
              <p>
                Sign in with Google to save your 3D world progress across devices and to purchase or automatically restore <strong>Christmas Pro</strong>.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#91a1b1] pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Guest mode lets you build freely with progress saved on this device.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleContinueWithGoogle}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg hover:shadow-xl active:scale-95 border border-slate-200 disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
            </button>

            {showFallbackButton && (
              <div className="w-full flex justify-center pt-1">
                <div ref={googleButtonRef} className="w-full flex justify-center min-h-[44px]" />
              </div>
            )}

            <button
              type="button"
              onClick={handleContinueAsGuest}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#edf2f6] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <Compass className="w-4 h-4 text-[#e5c783]" />
              <span>Continue as Guest</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
