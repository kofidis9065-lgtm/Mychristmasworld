import React, { useState } from 'react';
import { Download, Sparkles, X, Smartphone, Share, PlusSquare, Check } from 'lucide-react';
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
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl winter-panel-gold p-6 text-[#edf2f6] shadow-2xl border border-[#e5c783]/50 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Sparkles */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl festive-gradient flex items-center justify-center text-white shadow-xl">
            <Download className="w-8 h-8 animate-bounce" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-300 animate-spin" />
        </div>

        {/* Catchphrases */}
        <h2 className="text-xl sm:text-2xl font-extrabold font-serif-display text-white mb-1.5 gold-glow">
          No Downloads. Just Christmas Magic.
        </h2>
        <p className="text-xs sm:text-sm text-amber-200 font-medium mb-5">
          App in 1 magic click on Android and iOS.
        </p>

        {isInstalled || installedSuccess ? (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            <span>My Christmas World is already installed on your device!</span>
          </div>
        ) : isInstallable ? (
          /* Native Chrome / Android / Desktop Install Flow */
          <div className="space-y-4">
            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              Install My Christmas World to your home screen for instant fullscreen access, fast loading, and offline performance.
            </p>
            <button
              onClick={handleInstallClick}
              className="w-full py-3 px-4 rounded-xl festive-gradient font-bold text-sm shadow-xl hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Install to Home Screen Now ✨</span>
            </button>
          </div>
        ) : isIOS ? (
          /* iOS Safari Step-by-Step Instructions */
          <div className="space-y-3 p-4 rounded-xl bg-black/40 border border-white/10 text-left text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Smartphone className="w-4 h-4" />
              <span>How to Install on iPhone & iPad:</span>
            </div>
            <ol className="space-y-2 text-[#cbd5e1] text-[11px] list-decimal list-inside leading-relaxed">
              <li className="flex items-center gap-2">
                <span>1. Tap the</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-white font-medium">
                  <Share className="w-3 h-3" /> Share
                </span>
                <span>button in Safari.</span>
              </li>
              <li className="flex items-center gap-2">
                <span>2. Scroll down and tap</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 text-white font-medium">
                  <PlusSquare className="w-3 h-3" /> Add to Home Screen
                </span>
              </li>
              <li>3. Launch My Christmas World in 1 magic click!</li>
            </ol>
            <button
              onClick={onClose}
              className="w-full mt-2 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Got it, thanks!
            </button>
          </div>
        ) : (
          /* Browser fallback instruction */
          <div className="space-y-3">
            <p className="text-xs text-[#cbd5e1] leading-relaxed">
              Open your browser menu (Chrome / Safari / Edge) and select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong> to launch instantly in 1 click!
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
