// Real Google H5 Games Ad Placement API Integration
// Official Documentation: https://econpy.github.io/h5-games-ads/ or AdSense H5 Games Ads Guide

declare global {
  interface Window {
    adsbygoogle?: any[];
    adBreak?: (options: AdBreakOptions) => void;
    adConfig?: (options: AdConfigOptions) => void;
  }
}

export interface AdBreakOptions {
  type: 'reward' | 'preroll' | 'start' | 'pause' | 'next';
  name?: string;
  beforeReward?: (showAdFn: () => void) => void;
  adViewed?: () => void;
  adDismissed?: () => void;
  adCompleted?: () => void;
  adError?: (error: any) => void;
}

export interface AdConfigOptions {
  sound?: 'on' | 'off';
  preloadAdBreaks?: 'on' | 'auto';
  dataAdManaAppId?: string;
}

export function getPublisherId(): string {
  const envPub = import.meta.env.VITE_ADSENSE_PUBLISHER_ID;
  if (envPub && envPub.trim()) {
    return envPub.trim();
  }
  return 'pub-6972943555103902';
}

export function initGoogleH5Ads(): void {
  if (typeof window === 'undefined') return;

  window.adsbygoogle = window.adsbygoogle || [];
  if (!window.adConfig) {
    window.adConfig = window.adBreak = function (o: any) {
      window.adsbygoogle?.push(o);
    };
  }

  try {
    const pubId = getPublisherId();
    const cleanPubId = pubId.startsWith('pub-') ? pubId : `pub-${pubId}`;
    window.adConfig({
      sound: 'on',
      preloadAdBreaks: 'on',
    });
  } catch (err) {
    console.warn('Google H5 Ads initialization warning:', err);
  }
}

export function isGoogleH5AdsAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof window.adBreak === 'function' && Array.isArray(window.adsbygoogle);
}

/**
 * Trigger Real Google Rewarded Ad.
 * REQUIREMENT #2: Unlocks ONLY after Google's official adViewed callback confirms the reward!
 */
export function showRewardedAd(
  adName: string = 'daily_gift_reward'
): Promise<{ success: boolean; errorMsg?: string }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve({
        success: false,
        errorMsg: 'Ads temporarily unavailable (SSR environment).',
      });
    }

    const pubId = getPublisherId();

    // Check if AdSense H5 Ads API is loaded in window
    if (typeof window.adBreak !== 'function' || !window.adsbygoogle) {
      return resolve({
        success: false,
        errorMsg: `Ads temporarily unavailable. Google H5 Games Ads script is loading or pending AdSense account approval (${pubId}).`,
      });
    }

    let adViewedConfirmed = false;
    let isAdShown = false;

    try {
      window.adBreak({
        type: 'reward',
        name: adName,
        beforeReward: (showAd) => {
          isAdShown = true;
          showAd();
        },
        adViewed: () => {
          // STRICT REQUIREMENT #2: Confirmed ONLY by Google's official adViewed callback
          adViewedConfirmed = true;
        },
        adDismissed: () => {
          // User closed ad early or skipped
        },
        adCompleted: () => {
          if (adViewedConfirmed) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              errorMsg:
                'Ad was skipped or closed before completion. You must watch the full ad to unlock your gift.',
            });
          }
        },
        adError: (error: any) => {
          console.warn('Google H5 Games Rewarded Ad Error:', error);
          resolve({
            success: false,
            errorMsg: `Ads temporarily unavailable. AdSense Publisher ID (${pubId}) requires H5 Games Ad Placement API approval in Google AdSense portal.`,
          });
        },
      });

      // Safety timeout: if adBreak never invokes callbacks within 12s, resolve as unavailable
      setTimeout(() => {
        if (!isAdShown && !adViewedConfirmed) {
          resolve({
            success: false,
            errorMsg: `Ads temporarily unavailable. AdSense Ad Placement API did not return an available ad for publisher ${pubId}.`,
          });
        }
      }, 12000);
    } catch (err: any) {
      console.error('Error invoking window.adBreak:', err);
      resolve({
        success: false,
        errorMsg: 'Ads temporarily unavailable. Could not initialize Google Ad Placement.',
      });
    }
  });
}
