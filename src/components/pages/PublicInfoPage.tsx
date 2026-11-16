import React, { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  Heart,
  Lock,
  Receipt,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
} from 'lucide-react';

export type PublicRoute = '/pricing' | '/terms' | '/privacy' | '/refunds';

export function parsePublicRoute(pathname: string): PublicRoute | null {
  const normalized = (pathname || '/').toLowerCase().replace(/\/+$/, '') || '/';
  if (
    normalized === '/pricing' ||
    normalized === '/terms' ||
    normalized === '/privacy' ||
    normalized === '/refunds'
  ) {
    return normalized;
  }
  return null;
}

const ROUTE_META: Record<
  PublicRoute,
  {
    label: string;
    title: string;
    subtitle: string;
    docTitle: string;
  }
> = {
  '/pricing': {
    label: 'Pricing',
    title: 'Christmas Pro Plan Pricing',
    subtitle: 'My Christmas World (myxmas.top) — One-Time Purchase & Features',
    docTitle: 'Pricing — My Christmas World',
  },
  '/terms': {
    label: 'Terms of Service',
    title: 'Terms of Service',
    subtitle: 'My Christmas World (myxmas.top) — Terms & Digital Purchase Conditions',
    docTitle: 'Terms of Service — My Christmas World',
  },
  '/privacy': {
    label: 'Privacy Policy',
    title: 'Privacy Policy',
    subtitle: 'My Christmas World (myxmas.top) — GDPR Data Protection & Legal Notices',
    docTitle: 'Privacy Policy — My Christmas World',
  },
  '/refunds': {
    label: 'Refund Policy',
    title: 'Refund Policy',
    subtitle: 'My Christmas World (myxmas.top) — Digital Purchase & Consumer Rights',
    docTitle: 'Refund Policy — My Christmas World',
  },
};

const NAV_ROUTES: PublicRoute[] = ['/pricing', '/terms', '/privacy', '/refunds'];

interface Props {
  route: PublicRoute;
  onNavigate: (path: PublicRoute | '/') => void;
}

export const PublicInfoPage: React.FC<Props> = ({ route, onNavigate }) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const meta = ROUTE_META[route];

  useEffect(() => {
    document.title = meta.docTitle;
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [route, meta.docTitle]);

  const handleLinkClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    target: PublicRoute | '/'
  ) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    onNavigate(target);
  };

  return (
    <div
      ref={scrollContainerRef}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain touch-pan-y select-text bg-[#0d1723] text-[#edf2f6]"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Ambient Winter Background Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1c324b] via-[#0f1b29] to-[#070d14] pointer-events-none opacity-90" />

      <div className="relative z-10 min-h-full w-full max-w-3xl mx-auto px-4 py-6 sm:py-10 flex flex-col">
        {/* Top Brand & Return Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <a
            href="/"
            onClick={(e) => handleLinkClick(e, '/')}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#e5c783] hover:text-[#f3dc9b] transition-colors px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Christmas World</span>
          </a>

          <span className="text-xs font-serif-display font-bold tracking-wider uppercase text-white/90 gold-glow">
            My Christmas World
          </span>
        </header>

        {/* Public Page Navigation Links */}
        <nav
          aria-label="Legal and pricing pages"
          className="flex flex-wrap gap-2 p-1.5 mb-6 rounded-xl bg-black/40 border border-white/10"
        >
          {NAV_ROUTES.map((itemRoute) => {
            const active = route === itemRoute;
            return (
              <a
                key={itemRoute}
                href={itemRoute}
                onClick={(e) => handleLinkClick(e, itemRoute)}
                aria-current={active ? 'page' : undefined}
                className={`flex-1 min-w-[110px] text-center py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? 'festive-gradient text-white shadow'
                    : 'text-[#91a1b1] hover:text-white hover:bg-white/5'
                }`}
              >
                {ROUTE_META[itemRoute].label}
              </a>
            );
          })}
        </nav>

        {/* Main Card */}
        <main className="rounded-2xl winter-panel-gold p-5 sm:p-8 shadow-2xl border border-[#e5c783]/50 flex-1">
          {/* Card Header */}
          <div className="flex items-center gap-3.5 mb-6 border-b border-white/10 pb-5">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-[#e5c783] border border-[#e5c783]/30 shrink-0">
              {route === '/pricing' ? (
                <Ticket className="w-6 h-6" />
              ) : route === '/refunds' ? (
                <Receipt className="w-6 h-6" />
              ) : route === '/terms' ? (
                <FileText className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-serif-display text-white tracking-wide">
                {meta.title}
              </h1>
              <p className="text-xs text-[#91a1b1] mt-0.5">{meta.subtitle}</p>
            </div>
          </div>

          {route === '/pricing' && (
            <div className="space-y-5 text-xs sm:text-sm leading-relaxed text-[#cbd5e1]">
              {/* Header Badge */}
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl festive-gradient text-white shadow-xl shrink-0">
                  <Sparkles className="w-6 h-6" />
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
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#1b2f44] to-amber-500/15 border border-[#e5c783]/40 text-center">
                <span className="text-xs text-[#91a1b1] block uppercase tracking-wider font-semibold">
                  One-time price — No Subscriptions
                </span>
                <div className="text-3xl sm:text-4xl font-black font-serif-display text-[#e5c783] my-1 gold-glow">
                  €1.99{' '}
                  <span className="text-xs text-white font-sans font-normal">
                    (tax inclusive)
                  </span>
                </div>
              </div>

              {/* Feature List */}
              <section className="space-y-3 bg-black/30 p-4 sm:p-5 rounded-xl border border-white/10">
                <div className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Wonderworld Landscape</span>
                    <span className="text-xs text-[#91a1b1] leading-relaxed block">
                      Spectacular London Winter Wonderland-inspired 3D amusement park with central ice rink and festive fairground lighting.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">
                      30 Exclusive Premium Animated 3D Assets
                    </span>
                    <span className="text-xs text-[#91a1b1] leading-relaxed block">
                      Ferris wheel, roller coaster, carousel, train, bumper cars, swing ride, hot air balloon, fireworks launcher &amp; 22 more attractions. Works across all landscapes!
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">
                      All 22 Secret Gifts Unlocked
                    </span>
                    <span className="text-xs text-[#91a1b1] leading-relaxed block">
                      Instant lifetime access to the complete secret holiday library with zero daily limits or waiting timers.
                    </span>
                  </div>
                </div>
              </section>

              {/* Account & Merchant of Record Details */}
              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Instant Activation &amp; Merchant of Record (Paddle)</span>
                </div>
                <p>
                  <strong>Christmas Pro</strong> is a one-time digital purchase of{' '}
                  <strong>€1.99 (including applicable taxes)</strong>. It is not a subscription
                  and has no recurring charges or automatic renewals.
                </p>
                <p className="text-[11px] text-[#91a1b1]">
                  Upon verified payment, Christmas Pro features become immediately accessible and
                  are automatically linked to your verified Google account for cross-device
                  restoration. All orders, billing, taxes, receipts, and payment compliance are
                  processed by <strong>Paddle</strong> acting as the authorized reseller and{' '}
                  <strong>Merchant of Record</strong>.
                </p>
                <p className="text-[11px] text-[#cbd5e1]/85">
                  Christmas Pro is a one-time digital purchase with immediate access to premium
                  content. Once activated, purchases are generally non-refundable, except where
                  required by applicable consumer law or Paddle&apos;s refund policies. Review our{' '}
                  <a
                    href="/refunds"
                    onClick={(e) => handleLinkClick(e, '/refunds')}
                    className="text-amber-300 underline hover:text-amber-200 font-semibold"
                  >
                    Refund Policy
                  </a>{' '}
                  and{' '}
                  <a
                    href="/terms"
                    onClick={(e) => handleLinkClick(e, '/terms')}
                    className="text-amber-300 underline hover:text-amber-200 font-semibold"
                  >
                    Terms of Service
                  </a>
                  .
                </p>
              </section>

              {/* CTA back to app */}
              <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
                <a
                  href="/"
                  onClick={(e) => handleLinkClick(e, '/')}
                  className="w-full sm:w-auto py-3 px-6 rounded-xl festive-gradient font-bold text-xs uppercase tracking-wider shadow-xl hover:brightness-105 transition-all text-center inline-flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>Launch My Christmas World</span>
                </a>
                <div className="flex items-center gap-1.5 text-xs text-[#91a1b1]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Secure Paddle Checkout</span>
                </div>
              </div>
            </div>
          )}

          {route === '/terms' && (
            <div className="space-y-4 text-xs leading-relaxed text-[#cbd5e1]">
              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <FileText className="w-4 h-4" />
                  <span>1. Terms of Service</span>
                </div>
                <p>
                  By exploring or creating in My Christmas World, you agree to use the application
                  respectfully. All 3D designs, assets, and branding are protected creative property
                  for personal entertainment use.
                </p>
              </section>

              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Receipt className="w-4 h-4" />
                  <span>2. One-Time Digital Purchase &amp; Immediate Access</span>
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
                    permanently to your Google account and restored automatically whenever you sign
                    in.
                  </li>
                </ul>
              </section>

              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span>3. Protection of Minors &amp; Parental Guidance</span>
                </div>
                <p>
                  My Christmas World is a family-friendly holiday creative experience. Digital
                  purchases must be authorized by a parent or legal guardian if the account holder is
                  under 18 years of age.
                </p>
              </section>

              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Scale className="w-4 h-4 text-emerald-400" />
                  <span>4. Payment Processing, Merchant of Record &amp; Refunds (Paddle)</span>
                </div>
                <p>
                  All orders, billing, taxes, receipts, and payment compliance for Christmas Pro are
                  processed by <strong>Paddle</strong> acting as the authorized reseller and{' '}
                  <strong>Merchant of Record</strong>.
                </p>
                <p className="text-[11px] text-[#91a1b1]">
                  Once activated, purchases are generally non-refundable, except where required by
                  applicable consumer law or Paddle&apos;s Refund Policy. Statutory consumer rights
                  remain in effect. Read our{' '}
                  <a
                    href="/refunds"
                    onClick={(e) => handleLinkClick(e, '/refunds')}
                    className="text-amber-300 underline hover:text-amber-200 font-semibold"
                  >
                    Refund Policy
                  </a>{' '}
                  and{' '}
                  <a
                    href="/privacy"
                    onClick={(e) => handleLinkClick(e, '/privacy')}
                    className="text-amber-300 underline hover:text-amber-200 font-semibold"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
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
                    href="https://www.paddle.com/legal/refund-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-amber-200 font-semibold text-[11px] transition-colors"
                  >
                    <span>Paddle Refund Policy</span>
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
          )}

          {route === '/privacy' && (
            <div className="space-y-4 text-xs leading-relaxed text-[#cbd5e1]">
              {/* Section 1: GDPR Privacy */}
              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Lock className="w-4 h-4" />
                  <span>1. GDPR Data Protection &amp; Privacy Safeguards</span>
                </div>
                <p>
                  My Christmas World is committed to privacy-first web gaming. We collect only
                  minimal essential data required to save your 3D Christmas worlds and maintain
                  account credentials.
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-[#91a1b1]">
                  <li>
                    <strong>Data Stored:</strong> Account email, nickname, avatar, verified purchase
                    entitlement status, and saved 3D village object coordinates.
                  </li>
                  <li>
                    <strong>No Behavioral Ad Tracking:</strong> We do not run third-party
                    advertising trackers or sell personal data.
                  </li>
                  <li>
                    <strong>Right to Erase (GDPR):</strong> You can sign out at any time from the
                    Account menu to end your session, or clear local site data through your browser
                    settings.
                  </li>
                </ul>
              </section>

              {/* Section 2: Paddle Payment Terms & Refunds Summary */}
              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Scale className="w-4 h-4" />
                  <span>2. Merchant of Record &amp; Digital Purchase Summary</span>
                </div>
                <p>
                  All digital purchases (Christmas Pro Plan) are securely processed by{' '}
                  <strong>Paddle</strong> as Merchant of Record.
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-[#91a1b1]">
                  <li>
                    <strong>One-Time Purchase:</strong> The €1.99 Christmas Pro Plan provides
                    permanent access to Pro features with no recurring subscription fees.
                  </li>
                  <li>
                    <strong>Immediate Digital Access:</strong> Once activated, purchases are
                    generally non-refundable, except where required by applicable consumer law or
                    Paddle&apos;s Refund Policy. Statutory consumer rights remain in effect.
                  </li>
                  <li>
                    <strong>Details &amp; Support:</strong> Review the full{' '}
                    <a
                      href="/refunds"
                      onClick={(e) => handleLinkClick(e, '/refunds')}
                      className="text-amber-300 underline hover:text-amber-200 font-semibold"
                    >
                      Refund Policy
                    </a>{' '}
                    and{' '}
                    <a
                      href="/terms"
                      onClick={(e) => handleLinkClick(e, '/terms')}
                      className="text-amber-300 underline hover:text-amber-200 font-semibold"
                    >
                      Terms of Service
                    </a>{' '}
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
                  <span>3. Protection of Minors &amp; Parental Guidance</span>
                </div>
                <p>
                  My Christmas World is a family-friendly holiday creative experience. Digital
                  purchases must be authorized by a parent or legal guardian if the account holder is
                  under 18 years of age.
                </p>
              </section>

              {/* Section 4: Terms of Service Reference */}
              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <FileText className="w-4 h-4" />
                  <span>4. Terms of Service</span>
                </div>
                <p>
                  By exploring or creating in My Christmas World, you agree to use the application
                  respectfully. All 3D designs, assets, and branding are protected creative property
                  for personal entertainment use.
                </p>
              </section>
            </div>
          )}

          {route === '/refunds' && (
            <div className="space-y-4 text-xs leading-relaxed text-[#cbd5e1]">
              {/* Purchase Summary */}
              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Receipt className="w-4 h-4" />
                  <span>1. One-Time Digital Purchase &amp; Immediate Access</span>
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
                    permanently to your Google account and restored automatically whenever you sign
                    in.
                  </li>
                </ul>
              </section>

              {/* Refund Policy & Consumer Law */}
              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Scale className="w-4 h-4" />
                  <span>2. Refund Policy &amp; Consumer Rights</span>
                </div>
                <p>
                  Because Christmas Pro unlocks immediate access to digital content and in-app
                  features, purchases are generally non-refundable once activated, except where
                  required by applicable consumer protection law or Paddle&apos;s Refund Policy.
                </p>
                <p className="text-[11px] text-[#91a1b1]">
                  Nothing in these terms limits or waives any non-waivable statutory consumer rights
                  available under the laws of your country or region (including rights concerning
                  faulty, unavailable, or misdescribed digital content).
                </p>
              </section>

              {/* Merchant of Record: Paddle */}
              <section className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>3. Payment Processing &amp; Support (Paddle)</span>
                </div>
                <p>
                  All orders, billing, taxes, receipts, and payment compliance for Christmas Pro are
                  processed by <strong>Paddle</strong> acting as the authorized reseller and{' '}
                  <strong>Merchant of Record</strong>.
                </p>
                <p className="text-[11px] text-[#91a1b1]">
                  For payment questions, order lookups, invoices, or refund requests, please use the
                  receipt link in your Paddle confirmation email or contact Paddle Buyer Support
                  directly:
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
          )}
        </main>

        {/* Footer */}
        <footer className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#91a1b1]">
          <span>My Christmas World (myxmas.top)</span>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/pricing"
              onClick={(e) => handleLinkClick(e, '/pricing')}
              className="hover:text-white transition-colors"
            >
              Pricing
            </a>
            <a
              href="/terms"
              onClick={(e) => handleLinkClick(e, '/terms')}
              className="hover:text-white transition-colors"
            >
              Terms
            </a>
            <a
              href="/privacy"
              onClick={(e) => handleLinkClick(e, '/privacy')}
              className="hover:text-white transition-colors"
            >
              Privacy
            </a>
            <a
              href="/refunds"
              onClick={(e) => handleLinkClick(e, '/refunds')}
              className="hover:text-white transition-colors"
            >
              Refunds
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
