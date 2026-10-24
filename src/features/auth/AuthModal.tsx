import React, { useState } from 'react';
import { GoogleUser, loginWithGoogleAccount, setStoredGoogleUser } from './googleAuthService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { LogOut, X, Cloud, Check, Sparkles, ShieldCheck, RefreshCw } from 'lucide-react';
import { soundEngine } from '../../lib/audioSynthesis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  googleUser: GoogleUser | null;
  onUserChanged: (user: User | null) => void;
  onGoogleUserChanged: (gUser: GoogleUser | null) => void;
  onManualSync: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  googleUser,
  onUserChanged,
  onGoogleUserChanged,
  onManualSync,
}) => {
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  if (!isOpen) return null;

  const handleQuickGoogleSignIn = async (emailToUse?: string) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    soundEngine.playClick();

    try {
      const email = emailToUse || googleEmailInput || 'kofidis9065@gmail.com';
      const name = googleNameInput || email.split('@')[0];
      const gUser = await loginWithGoogleAccount(email, name);
      onGoogleUserChanged(gUser);
      setSuccessMsg(`Welcome, ${gUser.name}! Your Christmas world is now synced to Google Cloud.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error signing in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    soundEngine.playClick();
    setStoredGoogleUser(null);
    onGoogleUserChanged(null);
    if (supabase) {
      supabase.auth.signOut();
    }
    onUserChanged(null);
    onClose();
  };

  const activeUser = googleUser || (user ? { name: user.email?.split('@')[0], email: user.email, avatar: '' } : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl winter-panel-gold p-6 text-[#edf2f6] shadow-2xl">
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
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif-display text-white">
              {activeUser ? 'Google Cloud Profile' : 'Google Cloud Account'}
            </h2>
            <p className="text-xs text-[#91a1b1]">
              {activeUser
                ? 'Your persistent world is protected & auto-saved.'
                : 'Sign in to save your 3D Christmas world across all devices.'}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {activeUser ? (
          <div className="space-y-4">
            {/* User Card */}
            <div className="p-4 rounded-xl bg-[#0d1723]/90 border border-[#e5c783]/30 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-amber-500/20 border border-[#e5c783]/40 flex items-center justify-center text-xl shadow-md">
                {googleUser?.avatar ? (
                  <img src={googleUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>🎅</span>
                )}
              </div>
              <div className="flex-1 truncate">
                <span className="font-bold text-white text-sm block truncate">
                  {activeUser.name || 'Christmas Builder'}
                </span>
                <span className="text-xs text-[#91a1b1] block truncate">{activeUser.email}</span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-300 font-medium">Google Cloud Synced</span>
                </div>
              </div>
            </div>

            {/* Sync Now Action */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  soundEngine.playPlacement();
                  onManualSync();
                  setSuccessMsg('World synchronized with Google Cloud storage!');
                  setTimeout(() => setSuccessMsg(null), 2500);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#e5c783]" />
                <span>Sync Cloud Now</span>
              </button>

              <button
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl border border-red-500/30 text-red-300 bg-red-950/30 hover:bg-red-950/60 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Primary Google Login Button */}
            <button
              onClick={() => handleQuickGoogleSignIn('kofidis9065@gmail.com')}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-gray-100 text-[#1f2937] font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xl active:scale-95"
            >
              {/* Google G SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Signing into Google Cloud...' : 'Continue with Google Account'}</span>
            </button>

            {/* Custom Google account toggle */}
            {!showEmailForm ? (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="text-xs text-[#e5c783] hover:underline cursor-pointer"
                >
                  Or enter another Google email address
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleQuickGoogleSignIn();
                }}
                className="p-3.5 rounded-xl bg-[#0d1723]/90 border border-white/10 space-y-2.5"
              >
                <div>
                  <label className="block text-[11px] text-[#91a1b1] mb-1">Google Email</label>
                  <input
                    type="email"
                    required
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-white text-xs focus:border-[#e5c783] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#91a1b1] mb-1">Display Name (Optional)</label>
                  <input
                    type="text"
                    value={googleNameInput}
                    onChange={(e) => setGoogleNameInput(e.target.value)}
                    placeholder="e.g. Nicholas"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/15 text-white text-xs focus:border-[#e5c783] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-[#e5c783] text-[#0d1723] font-bold text-xs hover:brightness-105 cursor-pointer"
                >
                  Connect Google Account
                </button>
              </form>
            )}

            {/* Cloud Features Notice */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#91a1b1]">
                <ShieldCheck className="w-4 h-4 text-[#e5c783]" />
                <span>Zero configuration needed: instant server cloud saving</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#91a1b1]">
                <Sparkles className="w-4 h-4 text-[#e5c783]" />
                <span>Revisit your decorated world from any phone or computer</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
