import React, { useState } from 'react';
import { Camera, Download, X, Check, Image as ImageIcon } from 'lucide-react';
import { soundEngine } from '../../lib/audioSynthesis';

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

  // Generate preview when opening or changing ratio
  React.useEffect(() => {
    if (isOpen) {
      updateSnapshot(aspectRatio);
    } else {
      setPreviewUrl(null);
      setDownloadSuccess(false);
    }
  }, [isOpen, aspectRatio]);

  const updateSnapshot = (ratio: 'standard' | 'square' | 'vertical') => {
    const dataUrl = getCanvasDataUrl(ratio);
    setPreviewUrl(dataUrl);
    setDownloadSuccess(false);
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    setIsExporting(true);
    soundEngine.playClick();

    const link = document.createElement('a');
    link.download = `my-christmas-world-${aspectRatio}-${Date.now()}.png`;
    link.href = previewUrl;
    link.click();

    setTimeout(() => {
      setIsExporting(false);
      setDownloadSuccess(true);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-2xl winter-panel p-6 text-[#edf2f6] shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-[#e5c783]/20 text-[#e5c783] border border-[#e5c783]/30">
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
        <div className="relative w-full h-64 bg-[#0d1723] rounded-xl overflow-hidden border border-white/10 flex items-center justify-center mb-5">
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
            className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all cursor-pointer ${
              downloadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-[#e5c783] to-[#f3dc9b] text-[#0d1723] hover:brightness-105 shadow-lg'
            }`}
          >
            {downloadSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Downloaded PNG!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Exporting...' : 'Download High-Res PNG'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
