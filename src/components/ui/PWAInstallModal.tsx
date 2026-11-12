import React, { useState } from 'react';
import { Download, Sparkles, X, Smartphone, Share, PlusSquare, Check, Copy, ExternalLink, Monitor, Globe } from 'lucide-react';
import { usePWAInstall } from '../../lib/usePWAInstall';
import { soundEngine } from '../../lib/audioSynthesis';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  installPWA?: () => Promise<boolean>;
  isInstallable?: boolean;
  isIOS?: boolean;
  isStandalone?: boolean;
}

export const PWAInstallModal: React.FC<Props> = ({
  isOpen,
  onClose,
  installPWA,
  isInstallable: propIsInstallable,
  isIOS: propIsIOS,
  isStandalone: propIsStandalone,
}) => {
  const pwaHook = usePWAInstall();
  const isInstallable = propIsInstallable ?? pwaHook.isInstallable;
  const isIOS = propIsIOS ?? pwaHook.isIOS;
  const isInstalled = propIsStandalone ?? pwaHook.isInstalled;
  const installFn = installPWA ?? pwaHook.install;

  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [activeBrowserTab, setActiveBrowserTab] = useState<'chrome' | 'ios' | 'other'>(isIOS ? 'ios' : 'chrome');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    soundEngine.playClick();
    if (isInstallable && installFn) {
      const success = await installFn();
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
        return;
      }
    }
  };

  const handleCopyUrl = () => {
    soundEngine.playClick();
    const appUrl = typeof window !== 'undefined' ? window.location.origin || 'https://myxmas.top' : 'https://myxmas.top';
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl winter-panel-gold p-5 sm:p-6 text-[#edf2f6] shadow-2xl border border-[#e5c783]/60 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Santa App Icon Display Header */}
        <div className="relative inline-flex items-center justify-center mb-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-b from-[#1c324b] to-[#0d1723] p-1 border-2 border-[#e5c783] shadow-2xl overflow-hidden flex items-center justify-center">
            <img
              src="/pwa-icon.svg"
              alt="Santa App Icon"
              className="w-full h-full object-cover filter drop-shadow"
            />
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-300 animate-spin" />
        </div>

        {/* Catchphrases */}
        <h2 className="text-xl sm:text-2xl font-extrabold font-serif-display text-white mb-1 gold-glow">
          No Downloads. Just Christmas Magic.
        </h2>
        <p className="text-xs sm:text-sm text-amber-200 font-medium mb-4">
          App in 1 magic click on Android, Chrome & iOS.
        </p>

        {/* Status: Already installed */}
        {isInstalled || installedSuccess ? (
          <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-center gap-2 mb-3">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>My Christmas World is installed on your home screen!</span>
          </div>
        ) : (
          <div>
            {/* Install Trigger Button */}
            {isInstallable && (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 px-4 mb-4 rounded-xl festive-gradient font-black text-sm uppercase tracking-wider shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 border border-amber-200/50"
              >
                <Download className="w-4.5 h-4.5 animate-bounce" />
                <span>Install to Home Screen Now ✨</span>
              </button>
            )}

            {/* Browser Guide Selector Tabs */}
            <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 mb-4 text-xs font-semibold">
              <button
                onClick={() => setActiveBrowserTab('chrome')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeBrowserTab === 'chrome'
                    ? 'festive-gradient text-white'
                    : 'text-[#91a1b1] hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Chrome / Desktop</span>
              </button>
              <button
                onClick={() => setActiveBrowserTab('ios')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeBrowserTab === 'ios'
                    ? 'festive-gradient text-white'
                    : 'text-[#91a1b1] hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>
              <button
                onClick={() => setActiveBrowserTab('other')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeBrowserTab === 'other'
                    ? 'festive-gradient text-white'
                    : 'text-[#91a1b1] hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Edge / Android</span>
              </button>
            </div>

            {/* Tab 1: Chrome / PC Installation */}
            {activeBrowserTab === 'chrome' && (
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-left text-xs space-y-2.5 mb-4">
                <div className="flex items-center justify-between text-amber-300 font-bold border-b border-white/10 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-amber-300" />
                    Chrome & PC Install Steps:
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-400/20 text-amber-200">
                    Native Web App
                  </span>
                </div>
                <ul className="space-y-2 text-[#cbd5e1] text-[11px] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-300 shrink-0">1.</span>
                    <span>Look at the right side of Chrome's address bar for the <strong>Install App icon (⊕)</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-300 shrink-0">2.</span>
                    <span>Or click Chrome Menu <strong>⋮ (3 dots)</strong> ➔ <strong>"Install My Christmas World..."</strong> or <strong>"Save and Share ➔ Create Shortcut"</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-300 shrink-0">3.</span>
                    <span>Check <strong>"Open as window"</strong> for full 3D app view with Santa's face desktop icon!</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Tab 2: iOS Safari Instructions */}
            {activeBrowserTab === 'ios' && (
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-left text-xs space-y-2.5 mb-4">
                <div className="flex items-center justify-between text-amber-300 font-bold border-b border-white/10 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-300" />
                    iPhone & iPad Safari Install:
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-200">
                    iOS Safari
                  </span>
                </div>
                <ol className="space-y-2 text-[#cbd5e1] text-[11px] list-decimal list-inside leading-relaxed">
                  <li className="flex items-center gap-1.5">
                    <span>1. Tap Safari's</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 text-white font-bold">
                      <Share className="w-3 h-3 text-cyan-300" /> Share
                    </span>
                    <span>button in the toolbar.</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span>2. Scroll down and tap</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/15 text-white font-bold">
                      <PlusSquare className="w-3 h-3 text-emerald-300" /> Add to Home Screen
                    </span>
                  </li>
                  <li>3. Launch My Christmas World directly in 1 magic click!</li>
                </ol>
              </div>
            )}

            {/* Tab 3: Edge & Android */}
            {activeBrowserTab === 'other' && (
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-left text-xs space-y-2.5 mb-4">
                <div className="flex items-center justify-between text-amber-300 font-bold border-b border-white/10 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-amber-300" />
                    Android & Edge Instructions:
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200">
                    Android / Edge
                  </span>
                </div>
                <ul className="space-y-2 text-[#cbd5e1] text-[11px] leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-300 shrink-0">1.</span>
                    <span>Open browser menu <strong>⋮ (3 dots)</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-300 shrink-0">2.</span>
                    <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-amber-300 shrink-0">3.</span>
                    <span>Enjoy standalone 3D Christmas diorama mode!</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Copy Direct App Link Action */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-xs">
              <span className="text-[#91a1b1] text-[11px] truncate">
                Direct Web App Link: <span className="text-white font-mono">myxmas.top</span>
              </span>
              <button
                onClick={handleCopyUrl}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
