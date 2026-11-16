import React, { useState } from 'react';
import { Camera, Download, X, Check, Image as ImageIcon, Sparkles, Copy } from 'lucide-react';
import { soundEngine } from '../../lib/audioSynthesis';

const AI_PROMPT =
  'Transform this scene into a magical, cinematic, realistic 3D world. Preserve the original landscape, objects and composition. Enhance lighting, textures and details.';

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = /data:([^;]+);/i.exec(header || '');
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  getCanvasDataUrl: (aspectRatio: 'standard' | 'square' | 'vertical') => string | null;
}

export const ImageExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  getCanvasDataUrl,
}) => {
  const [aspectRatio, setAspectRatio] = useState<'standard' | 'square' | 'vertical'>('standard');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Generate preview when opening or changing ratio
  React.useEffect(() => {
    if (isOpen) {
      updateSnapshot(aspectRatio);
    } else {
      setPreviewUrl(null);
      setDownloadSuccess(false);
      setCopied(false);
    }
  }, [isOpen, aspectRatio]);

  const updateSnapshot = (ratio: 'standard' | 'square' | 'vertical') => {
    const dataUrl = getCanvasDataUrl(ratio);
    setPreviewUrl(dataUrl);
    setDownloadSuccess(false);
    setCopied(false);
  };

  const handleDownload = async () => {
    if (!previewUrl) return;
    setIsExporting(true);
    soundEngine.playClick();

    const filename = `my-christmas-world-${aspectRatio}-${Date.now()}.png`;
    let sharedViaSheet = false;

    try {
      const blob = dataUrlToBlob(previewUrl);
      const isIOS =
        typeof navigator !== 'undefined' &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      const isStandalone =
        typeof window !== 'undefined' &&
        ((window.navigator as any).standalone === true ||
          window.matchMedia?.('(display-mode: standalone)')?.matches === true);

      // In iOS Home Screen standalone PWA mode, <a download> is ignored by WebKit; use Share sheet
      if (isIOS && isStandalone && typeof navigator.share === 'function' && typeof File !== 'undefined') {
        const file = new File([blob], filename, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'My Christmas World',
            });
            sharedViaSheet = true;
          } catch (shareErr: any) {
            if (shareErr?.name === 'AbortError') {
              setIsExporting(false);
              return;
            }
          }
        }
      }

      if (!sharedViaSheet) {
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = objectUrl;
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.setTimeout(() => {
          URL.revokeObjectURL(objectUrl);
        }, 10000);
      }
    } catch {
      const link = document.createElement('a');
      link.download = filename;
      link.href = previewUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setTimeout(() => {
      setIsExporting(false);
      setDownloadSuccess(true);
    }, 400);
  };

  const handleCopyPrompt = async () => {
    soundEngine.playClick();
    let success = false;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(AI_PROMPT);
        success = true;
      }
    } catch {
      success = false;
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = AI_PROMPT;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        success = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  if (downloadSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none animate-in fade-in duration-200">
        <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl winter-panel-gold p-5 sm:p-6 text-[#edf2f6] shadow-2xl border border-[#e5c783]/60">
          {/* Close Button */}
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            aria-label="Close"
            className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4 pr-8">
            <div className="p-2.5 sm:p-3 rounded-2xl festive-gradient text-white shadow-xl shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 mb-0.5">
                <Check className="w-3.5 h-3.5" />
                <span>PNG screenshot saved</span>
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold font-serif-display text-white tracking-wide gold-glow">
                ✨ Bring Your World to Life!
              </h2>
            </div>
          </div>

          {/* Instruction */}
          <p className="text-xs sm:text-sm text-[#cfdbe5] leading-relaxed mb-3">
            Upload your screenshot to any AI image tool and use this prompt:
          </p>

          {/* Prompt Box */}
          <div className="p-3.5 sm:p-4 mb-5 rounded-xl bg-black/40 border border-[#e5c783]/35 text-xs sm:text-sm text-[#edf2f6] leading-relaxed select-text">
            {AI_PROMPT}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              onClick={handleCopyPrompt}
              className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-emerald-600 text-white border border-emerald-400/50'
                  : 'festive-gradient text-white hover:brightness-110'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy AI Prompt</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="py-2.5 px-5 rounded-xl border border-white/20 text-[#edf2f6] text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl winter-panel p-5 sm:p-6 text-[#edf2f6] shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pr-8">
          <div className="p-3 rounded-xl bg-[#e5c783]/20 text-[#e5c783] border border-[#e5c783]/30 shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif-display text-white">Capture Winter World</h2>
            <p className="text-xs text-[#91a1b1]">
              Export a pristine high-resolution snapshot of your 3D Christmas creation.
            </p>
          </div>
        </div>

        {/* Ratio Selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setAspectRatio('standard')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              aspectRatio === 'standard'
                ? 'bg-[#e5c783]/20 border-[#e5c783] text-[#e5c783]'
                : 'bg-[#0d1723]/60 border-white/10 text-[#91a1b1] hover:border-white/30'
            }`}
          >
            Landscape (16:9)
          </button>
          <button
            onClick={() => setAspectRatio('square')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              aspectRatio === 'square'
                ? 'bg-[#e5c783]/20 border-[#e5c783] text-[#e5c783]'
                : 'bg-[#0d1723]/60 border-white/10 text-[#91a1b1] hover:border-white/30'
            }`}
          >
            Square (1:1)
          </button>
          <button
            onClick={() => setAspectRatio('vertical')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              aspectRatio === 'vertical'
                ? 'bg-[#e5c783]/20 border-[#e5c783] text-[#e5c783]'
                : 'bg-[#0d1723]/60 border-white/10 text-[#91a1b1] hover:border-white/30'
            }`}
          >
            Story / Reel (9:16)
          </button>
        </div>

        {/* Snapshot Viewport Preview */}
        <div className="relative w-full h-56 sm:h-64 bg-[#0d1723] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center mb-5">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="World Preview"
              className="max-h-full max-w-full object-contain rounded-lg shadow-md"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[#91a1b1] text-xs">
              <ImageIcon className="w-8 h-8 opacity-40" />
              <span>Rendering 3D viewport...</span>
            </div>
          )}

          <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-amber-200/90 font-serif-display">
            My Christmas World ❄️
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => updateSnapshot(aspectRatio)}
            className="py-2.5 px-4 rounded-xl border border-white/20 text-[#edf2f6] text-xs font-medium hover:bg-white/10 transition-all cursor-pointer"
          >
            Retake Angle
          </button>
          <button
            onClick={handleDownload}
            disabled={!previewUrl || isExporting}
            className="flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer bg-gradient-to-r from-[#e5c783] to-[#f3dc9b] text-[#0d1723] hover:brightness-105 shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Download High-Res PNG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
