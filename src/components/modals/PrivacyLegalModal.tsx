import React from 'react';
import { X, ShieldCheck, FileText, Scale, Lock, RefreshCw, Heart } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyLegalModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl winter-panel-gold p-5 sm:p-7 text-[#edf2f6] shadow-2xl border border-[#e5c783]/50">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-white/10 pb-4">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-[#e5c783] border border-[#e5c783]/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif-display text-white">
              Privacy, Security & Legal Notices
            </h2>
            <p className="text-xs text-[#91a1b1]">
              My Christmas World (myxmas.top) — Public Release Compliance
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-[#cbd5e1]">
          {/* Section 1: GDPR Privacy */}
          <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Lock className="w-4 h-4" />
              <span>1. GDPR Data Protection & Privacy Safeguards</span>
            </div>
            <p>
              My Christmas World is committed to privacy-first web gaming. We collect only minimal essential data required to save your 3D Christmas worlds and maintain account credentials.
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-[#91a1b1]">
              <li><strong>Data Stored:</strong> Account email, nickname, avatar seed, and saved 3D village object coordinates.</li>
              <li><strong>No Behavioral Ad Tracking:</strong> We do not run third-party advertising trackers or sell personal data.</li>
              <li><strong>Right to Erase (GDPR):</strong> You can delete all locally stored data and cached credentials instantly using the <em>"Clear Cache & Reset Storage"</em> button in settings.</li>
            </ul>
          </section>

          {/* Section 2: Paddle Payment Terms & Refunds */}
          <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Scale className="w-4 h-4" />
              <span>2. Merchant of Record & Refund Policy</span>
            </div>
            <p>
              All digital purchases (Christmas Pro Plan) are securely processed by <strong>Paddle</strong> as Merchant of Record.
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-[#91a1b1]">
              <li><strong>One-Time Purchase:</strong> The €1.99 Christmas Pro Plan provides permanent lifetime access with no recurring subscription fees.</li>
              <li><strong>EU 14-Day Consumer Right:</strong> Under EU digital content consumer directives, you acknowledge that instant delivery of digital features (Wonderworld landscape & 30 premium assets) begins immediately upon purchase.</li>
              <li><strong>Chargebacks & Support:</strong> For refund inquiries or payment assistance, contact support via Paddle or our contact team.</li>
            </ul>
          </section>

          {/* Section 3: Protection of Minors */}
          <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <Heart className="w-4 h-4 text-rose-400" />
              <span>3. Protection of Minors & Parental Guidance</span>
            </div>
            <p>
              My Christmas World is a family-friendly holiday creative experience. Digital purchases must be authorized by a parent or legal guardian if the account holder is under 18 years of age.
            </p>
          </section>

          {/* Section 4: Terms of Service */}
          <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
              <FileText className="w-4 h-4" />
              <span>4. Terms of Service</span>
            </div>
            <p>
              By exploring or creating in My Christmas World, you agree to use the application respectfully. All 3D designs, assets, and branding are protected creative property for personal entertainment use.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl festive-gradient font-bold text-xs text-white shadow-lg cursor-pointer"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
