import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { ASSET_CATALOG } from '../../game/assets/assetCatalog';
import { AssetDefinition } from '../world/worldTypes';

const LOCAL_DAILY_GIFTS_KEY = 'mcw_claimed_daily_gifts_v1';
export const FREE_DAILY_GIFT_LIMIT = 3; // Up to 3 Secret Gifts per day for free users!

export function getTodayDateString(offsetDays: number = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return d.toISOString().split('T')[0];
}

export interface ClaimedGiftRecord {
  date: string; // YYYY-MM-DD
  assetId: string;
  claimedAt: string;
}

export function getAvailableGiftPool(unlockedAssetIds?: string[]): AssetDefinition[] {
  // 22 Secret gifts
  const allSecretGifts = ASSET_CATALOG.filter(a => a.isSecretGift || a.isDailyReward);
  if (unlockedAssetIds && unlockedAssetIds.length > 0) {
    const unrevealed = allSecretGifts.filter(g => !unlockedAssetIds.includes(g.id));
    if (unrevealed.length > 0) {
      return unrevealed;
    }
  }
  return allSecretGifts;
}

export async function getTodayClaimCount(
  user: User | null,
  offsetDays: number = 0,
  googleUserId?: string
): Promise<number> {
  const dateKey = getTodayDateString(offsetDays);
  let count = 0;

  // 1. Check server API if logged in
  if (googleUserId) {
    try {
      const res = await fetch(`/api/daily_rewards/${googleUserId}`);
      if (res.ok) {
        const data = await res.json();
        const records = data.rewards || data.records || [];
        if (Array.isArray(records)) {
          count = records.filter((r: any) => (r.reward_date === dateKey || r.date === dateKey)).length;
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. Check local storage
  try {
    const raw = localStorage.getItem(LOCAL_DAILY_GIFTS_KEY);
    if (raw) {
      const list: ClaimedGiftRecord[] = JSON.parse(raw);
      const localCount = list.filter(r => r.date === dateKey).length;
      count = Math.max(count, localCount);
    }
  } catch {
    // ignore
  }

  return count;
}

export async function checkDailyGiftClaimed(
  user: User | null,
  offsetDays: number = 0,
  googleUserId?: string,
  isProUser?: boolean
): Promise<boolean> {
  // If user has Christmas Pro Plan, they can unlock all 22 Secret Gifts with no daily limits!
  if (isProUser) {
    return false;
  }

  const count = await getTodayClaimCount(user, offsetDays, googleUserId);
  return count >= FREE_DAILY_GIFT_LIMIT;
}

export async function claimDailyGift(
  assetId: string,
  worldId: string,
  user: User | null,
  offsetDays: number = 0,
  googleUserId?: string,
  isProUser?: boolean
): Promise<{ success: boolean; error?: string; remainingToday?: number }> {
  const dateKey = getTodayDateString(offsetDays);
  const now = new Date().toISOString();

  // Check if daily limit reached
  if (!isProUser) {
    const currentCount = await getTodayClaimCount(user, offsetDays, googleUserId);
    if (currentCount >= FREE_DAILY_GIFT_LIMIT) {
      return {
        success: false,
        error: `Daily limit reached! Free accounts can unlock up to 3 Secret Gifts per day. Upgrade to Christmas Pro for unlimited access!`,
      };
    }
  }

  // 1. Record in Google / Server Backend
  if (googleUserId) {
    try {
      await fetch(`/api/daily_rewards/${googleUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateKey,
          assetId,
          record: {
            reward_date: dateKey,
            reward_type: assetId,
            world_id: worldId,
            claimed_at: now,
          },
        }),
      });
    } catch (err) {
      console.warn('Server claim error, saving locally:', err);
    }
  }

  // 2. Always record in local storage
  try {
    const raw = localStorage.getItem(LOCAL_DAILY_GIFTS_KEY);
    const list: ClaimedGiftRecord[] = raw ? JSON.parse(raw) : [];
    list.push({
      date: dateKey,
      assetId,
      claimedAt: now,
    });
    localStorage.setItem(LOCAL_DAILY_GIFTS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save gift locally:', err);
  }

  const newCount = await getTodayClaimCount(user, offsetDays, googleUserId);
  const remainingToday = Math.max(0, FREE_DAILY_GIFT_LIMIT - newCount);

  return { success: true, remainingToday };
}

// Dev helper to reset daily claims for testing
export function devResetDailyClaims(): void {
  try {
    localStorage.removeItem(LOCAL_DAILY_GIFTS_KEY);
  } catch {
    // ignore
  }
}
