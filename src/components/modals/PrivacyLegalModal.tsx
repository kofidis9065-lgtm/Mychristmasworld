import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, FileText, Scale, Lock, Heart, ExternalLink, Receipt } from 'lucide-react';

export type LegalModalTab = 'privacy' | 'refund';

interface Props {
  isOpen: boolean;
  initialTab?: LegalModalTab;
  onClose: () => void;
}

export const PrivacyLegalModal: React.FC<Props> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalModalTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl winter-panel-gold p-5 sm:p-7 text-[#edf2f6] shadow-2xl border border-[#e5c783]/50">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close legal notices"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#91a1b1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4 pr-8">
          <div className="p-3 rounded-2xl bg-amber-500/20 text-[#e5c783] border border-[#e5c783]/30 shrink-0">
            {activeTab === 'refund' ? (
              <Receipt className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-serif-display text-white">
              {activeTab === 'refund'
                ? 'Terms & Refund Policy'
                : 'Privacy, Security & Legal Notices'}
            </h2>
            <p className="text-xs text-[#91a1b1]">
              My Christmas World (myxmas.top) — Digital Purchase & Compliance
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 mb-4 rounded-xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('refund')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'refund'
                ? 'festive-gradient text-white shadow'
                : 'text-[#91a1b1] hover:text-white'
            }`}
          >
            Terms & Refund Policy
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'festive-gradient text-white shadow'
                : 'text-[#91a1b1] hover:text-white'
            }`}
          >
            Privacy & Legal
          </button>
        </div>

        {activeTab === 'refund' ? (
          <div className="space-y-4 text-xs leading-relaxed text-[#cbd5e1]">
            {/* Purchase Summary */}
            <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Receipt className="w-4 h-4" />
                <span>1. One-Time Digital Purchase & Immediate Access</span>
              </div>
              <p>
                <strong>Christmas Pro</strong> is a one-time digital purchase of{' '}
                <strong>€1.99 (including applicable taxes)</strong>. It is not a subscription
                and has no recurring charges or automatic renewals.
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#91a1b1]">
                <li>
                  <strong>Instant Activation:</strong> Upon verified payment, Christmas Pro
                  features (Wonderworld landscape, 30 animated 3D assets, and unlimited Secret
                  Gift unlocks) become immediately accessible on your verified Google account.
                </li>
                <li>
                  <strong>Cross-Device Restoration:</strong> Your Pro entitlement is linked
                  permanently to your Google account and restored automatically whenever you
                  sign in.
                </li>
              </ul>
            </section>

            {/* Refund Policy & Consumer Law */}
            <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Scale className="w-4 h-4" />
                <span>2. Refund Policy & Consumer Rights</span>
              </div>
              <p>
                Because Christmas Pro unlocks immediate access to digital content and in-app
                features, purchases are generally non-refundable once activated, except where
                required by applicable consumer protection law or Paddle&apos;s Refund Policy.
              </p>
              <p className="text-[11px] text-[#91a1b1]">
                Nothing in these terms limits or waives any non-waivable statutory consumer
                rights available under the laws of your country or region (including rights
                concerning faulty, unavailable, or misdescribed digital content).
              </p>
            </section>

            {/* Merchant of Record: Paddle */}
            <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>3. Payment Processing & Support (Paddle)</span>
              </div>
              <p>
                All orders, billing, taxes, receipts, and payment compliance for Christmas Pro
                are processed by <strong>Paddle</strong> acting as the authorized reseller and{' '}
                <strong>Merchant of Record</strong>.
              </p>
              <p className="text-[11px] text-[#91a1b1]">
                For payment questions, order lookups, invoices, or refund requests, please use
                the receipt link in your Paddle confirmation email or contact Paddle Buyer
                Support directly:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="https://www.paddle.com/legal/refund-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-amber-200 font-semibold text-[11px] transition-colors"
                >
                  <span>Paddle Refund Policy</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://www.paddle.com/legal/buyer-terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-amber-200 font-semibold text-[11px] transition-colors"
                >
                  <span>Paddle Buyer Terms</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://paddle.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 text-emerald-300 font-semibold text-[11px] transition-colors"
                >
                  <span>Paddle Buyer Support (paddle.net)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </section>
          </div>
        ) : (
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
                <li><strong>Data Stored:</strong> Account email, nickname, avatar, verified purchase entitlement status, and saved 3D village object coordinates.</li>
                <li><strong>No Behavioral Ad Tracking:</strong> We do not run third-party advertising trackers or sell personal data.</li>
                <li><strong>Right to Erase (GDPR):</strong> You can delete locally stored data and cached credentials instantly using the <em>&quot;Clear Cache &amp; Reset Storage&quot;</em> button in settings.</li>
              </ul>
            </section>

            {/* Section 2: Paddle Payment Terms & Refunds Summary */}
            <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <Scale className="w-4 h-4" />
                <span>2. Merchant of Record & Digital Purchase Summary</span>
              </div>
              <p>
                All digital purchases (Christmas Pro Plan) are securely processed by <strong>Paddle</strong> as Merchant of Record.
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#91a1b1]">
                <li><strong>One-Time Purchase:</strong> The €1.99 Christmas Pro Plan provides permanent access to Pro features with no recurring subscription fees.</li>
                <li><strong>Immediate Digital Access:</strong> Once activated, purchases are generally non-refundable, except where required by applicable consumer law or Paddle&apos;s Refund Policy. Statutory consumer rights remain in effect.</li>
                <li>
                  <strong>Details &amp; Support:</strong> Review the full{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('refund')}
                    className="text-amber-300 underline hover:text-amber-200 cursor-pointer font-semibold"
                  >
                    Terms &amp; Refund Policy
                  </button>{' '}
                  or visit{' '}
                  <a
                    href="https://paddle.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-300 underline hover:text-emerald-200"
                  >
                    Paddle Buyer Support
                  </a>
                  .
                </li>
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
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl festive-gradient font-bold text-xs text-white shadow-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
