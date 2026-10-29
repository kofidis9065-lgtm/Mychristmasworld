import React, { useState, useEffect } from 'react';
import { AppUser, registerUser, loginUser, logoutUser, loginWithGoogleCredential } from './userAuthService';
import { X, User as UserIcon, Check, ShieldCheck, RefreshCw, LogOut, KeyRound, Mail, Sparkles, Trash2 } from 'lucide-react';
import { soundEngine } from '../../lib/audioSynthesis';
import { clearAllAppCache } from '../../lib/cacheManager';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUserChanged: (user: AppUser | null) => void;
  onManualSync: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onManualSync,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const [customClientId, setCustomClientId] = useState<string>(() => {
    try {
      return localStorage.getItem('mcw_google_client_id_override') || googleClientId || '';
    } catch {
      return googleClientId || '';
    }
  });
  const [showClientIdInput, setShowClientIdInput] = useState<boolean>(false);

  // Initialize GIS if client ID is configured
  useEffect(() => {
    const activeClientId = customClientId.trim() || googleClientId.trim();
    if (isOpen && typeof window !== 'undefined' && (window as any).google?.accounts?.id && activeClientId) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: activeClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setLoading(true);
              setErrorMsg(null);
              const res = await loginWithGoogleCredential(response.credential);
              setLoading(false);
              if (res.success && res.user) {
                onUserChanged(res.user);
                setSuccessMsg(`Welcome, ${res.user.nickname}! Connected with Google.`);
                setTimeout(() => onClose(), 1200);
              } else {
                setErrorMsg(res.error || 'Google Sign-In failed.');
              }
            }
          },
        });

        const container = document.getElementById('googleSignInBtnContainer');
        if (container) {
          container.innerHTML = '';
          (window as any).google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: 300,
            text: 'signin_with',
            shape: 'pill',
          });
        }
      } catch (err) {
        console.warn('Google Identity GIS error:', err);
      }
    }
  }, [isOpen, customClientId, googleClientId]);

  const handleTriggerGoogleSignIn = () => {
    soundEngine.playClick();
    setErrorMsg(null);

    const activeClientId = customClientId.trim() || googleClientId.trim();

    if (!activeClientId) {
      setShowClientIdInput(true);
      setErrorMsg('Google Sign-In ready! Please enter your Google OAuth Client ID or set VITE_GOOGLE_CLIENT_ID in secrets.');
      return;
    }

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: activeClientId,
          callback: async (response: any) => {
            if (response.credential) {
              setLoading(true);
              setErrorMsg(null);
              const res = await loginWithGoogleCredential(response.credential);
              setLoading(false);
              if (res.success && res.user) {
                onUserChanged(res.user);
                setSuccessMsg(`Welcome, ${res.user.nickname}! Logged in with Google.`);
                setTimeout(() => onClose(), 1200);
              } else {
                setErrorMsg(res.error || 'Google Sign-In failed.');
              }
            }
          },
        });

        (window as any).google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            const container = document.getElementById('googleSignInBtnContainer');
            if (container) {
              container.innerHTML = '';
              (window as any).google.accounts.id.renderButton(container, {
                theme: 'outline',
                size: 'large',
                width: 300,
                text: 'continue_with',
                shape: 'pill',
              });
            }
          }
        });
      } catch (err: any) {
        console.error('Google Sign-In error:', err);
        setErrorMsg(err.message || 'Error triggering Google Sign-In.');
      }
    } else {
      setErrorMsg('Google Identity Services SDK is loading. Please try again in a moment.');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    soundEngine.playClick();

    if (activeTab === 'register') {
      const res = await registerUser(email, nickname, password);
      setLoading(false);
      if (res.success && res.user) {
        onUserChanged(res.user);
        setSuccessMsg(`Welcome, ${res.user.nickname}! Your account has been created.`);
        setTimeout(() => onClose(), 1200);
      } else {
        setErrorMsg(res.error || 'Registration failed.');
      }
    } else {
      const res = await loginUser(email, password);
      setLoading(false);
      if (res.success && res.user) {
        onUserChanged(res.user);
        setSuccessMsg(`Welcome back, ${res.user.nickname}!`);
        setTimeout(() => onClose(), 1200);
      } else {
        setErrorMsg(res.error || 'Sign in failed. Check your email & password.');
      }
    }
  };

  const handleLogout = () => {
    soundEngine.playClick();
    logoutUser();
    onUserChanged(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md rounded-2xl winter-panel-gold p-6 text-[#edf2f6] shadow-2xl border border-[#e5c783]/40">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-[#e5c783]/20 text-[#e5c783] border border-[#e5c783]/30">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif-display text-white">
              {currentUser ? 'Your Christmas Profile' : 'Christmas World Account'}
            </h2>
            <p className="text-xs text-[#91a1b1]">
              {currentUser
                ? 'Your creations and decorations are saved & synced.'
                : 'Sign in or create an account with email, nickname & password.'}
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

        {currentUser ? (
          /* Logged In View */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#0d1723]/90 border border-[#e5c783]/30 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-amber-500/20 border border-[#e5c783]/40 flex items-center justify-center text-xl shadow-md">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>🎅</span>
                )}
              </div>
              <div className="flex-1 truncate">
                <span className="font-bold text-white text-sm block truncate">
                  {currentUser.nickname}
                </span>
                <span className="text-xs text-[#91a1b1] block truncate">{currentUser.email}</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-300 font-medium">World Synced & Saved</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
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
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl border border-red-500/30 text-red-300 bg-red-950/30 hover:bg-red-950/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all local cache, storage, and reload cleanly?')) {
                    clearAllAppCache(true);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-red-950/30 border border-white/10 hover:border-red-500/30 text-xs text-[#91a1b1] hover:text-red-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Cache & Reset Data</span>
              </button>
            </div>
          </div>
        ) : (
          /* Sign In / Register Forms */
          <div className="space-y-4">
            {/* Google Sign-In Mode */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-center space-y-2.5">
              <button
                type="button"
                onClick={handleTriggerGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95 border border-slate-200"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign in with Google</span>
              </button>

              <div id="googleSignInBtnContainer" className="flex justify-center min-h-[0px]" />

              {showClientIdInput && (
                <div className="pt-2 border-t border-white/10 text-left space-y-1 animate-in fade-in duration-200">
                  <label className="text-[10px] text-amber-200 font-medium block">
                    Google OAuth Client ID:
                  </label>
                  <input
                    type="text"
                    value={customClientId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomClientId(val);
                      try {
                        localStorage.setItem('mcw_google_client_id_override', val);
                      } catch {
                        // ignore
                      }
                    }}
                    placeholder="e.g. xxxxx-xxxx.apps.googleusercontent.com"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-amber-400/40 text-white text-[11px] outline-none focus:border-amber-300 font-mono"
                  />
                  <p className="text-[9px] text-[#91a1b1]">
                    Or configure <code className="text-amber-300">VITE_GOOGLE_CLIENT_ID</code> in environment variables.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-[#91a1b1] uppercase tracking-wider">
              <div className="flex-1 h-[1px] bg-white/10" />
              <span>or Email & Password</span>
              <div className="flex-1 h-[1px] bg-white/10" />
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-black/40 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('login');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-[#e5c783] text-[#0d1723] shadow'
                    : 'text-[#91a1b1] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setActiveTab('register');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-[#e5c783] text-[#0d1723] shadow'
                    : 'text-[#91a1b1] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#91a1b1] mb-1 font-medium flex items-center gap-1">
                  <Mail className="w-3 h-3 text-[#e5c783]" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@domain.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:border-[#e5c783] outline-none"
                />
              </div>

              {activeTab === 'register' && (
                <div>
                  <label className="block text-[11px] text-[#91a1b1] mb-1 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#e5c783]" />
                    <span>Your Nickname</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. SnowCrafter, Alex"
                    className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:border-[#e5c783] outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] text-[#91a1b1] mb-1 font-medium flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-[#e5c783]" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:border-[#e5c783] outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl festive-gradient font-extrabold text-xs text-[#0d1723] hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 mt-2"
              >
                <span>
                  {loading
                    ? 'Processing...'
                    : activeTab === 'register'
                    ? 'Create My Account ✨'
                    : 'Sign In ❄️'}
                </span>
              </button>
            </form>

            {/* Guest note */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] text-[#91a1b1]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#e5c783] shrink-0" />
                <span>Guest mode auto-saves locally on this device.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all local browser cache, saved state, and reload cleanly?')) {
                  clearAllAppCache(true);
                }
              }}
              className="w-full mt-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-red-950/30 border border-white/10 hover:border-red-500/30 text-xs text-[#91a1b1] hover:text-red-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cache & Reset Everything</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
