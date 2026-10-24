import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { User } from '@supabase/supabase-js';
import { ASSET_CATALOG } from '../../game/assets/assetCatalog';
import { AssetDefinition } from '../world/worldTypes';

const LOCAL_DAILY_GIFTS_KEY = 'mcw_claimed_daily_gifts_v1';

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

export async function checkDailyGiftClaimed(
  user: User | null,
  offsetDays: number = 0,
  googleUserId?: string
): Promise<boolean> {
  const dateKey = getTodayDateString(offsetDays);

  // If Google Cloud logged in, check server API
  if (googleUserId) {
    try {
      const res = await fetch(`/api/daily_rewards/${googleUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.records && Array.isArray(data.records)) {
          const hasToday = data.records.some((r: any) => r.reward_date === dateKey || r.date === dateKey);
          if (hasToday) return true;
        }
      }
    } catch {
      // fallback
    }
  }

  // If Supabase is configured and user logged in
  if (isSupabaseConfigured && supabase && user) {
    try {
      const { data, error } = await supabase
        .from('daily_rewards')
        .select('id')
        .eq('owner_user_id', user.id)
        .eq('reward_date', dateKey)
        .maybeSingle();

      if (!error && data) {
        return true;
      }
    } catch (err) {
      console.warn('Error checking cloud daily rewards:', err);
    }
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(LOCAL_DAILY_GIFTS_KEY);
    if (raw) {
      const list: ClaimedGiftRecord[] = JSON.parse(raw);
      return list.some(r => r.date === dateKey);
    }
  } catch {
    // ignore
  }

  return false;
}

export async function claimDailyGift(
  assetId: string,
  worldId: string,
  user: User | null,
  offsetDays: number = 0,
  googleUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const dateKey = getTodayDateString(offsetDays);
  const now = new Date().toISOString();

  // Check if already claimed
  const alreadyClaimed = await checkDailyGiftClaimed(user, offsetDays, googleUserId);
  if (alreadyClaimed) {
    return { success: false, error: "Today's gift has already been claimed! Return tomorrow for another surprise." };
  }

  // 1. If Google Cloud logged in
  if (googleUserId) {
    try {
      await fetch(`/api/daily_rewards/${googleUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: {
            reward_date: dateKey,
            reward_type: assetId,
            world_id: worldId,
            claimed_at: now,
          },
        }),
      });
    } catch (err) {
      console.warn('Google Cloud claim error, will store locally:', err);
    }
  }

  // 2. If Supabase configured and user logged in
  if (isSupabaseConfigured && supabase && user) {
    try {
      const { error } = await supabase.from('daily_rewards').insert([
        {
          owner_user_id: user.id,
          reward_date: dateKey,
          reward_type: assetId,
          world_id: worldId.startsWith('world_') ? null : worldId,
          created_at: now,
        },
      ]);

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'A reward was already recorded for today in the cloud.' };
        }
        throw error;
      }
    } catch (err: any) {
      console.warn('Cloud claim error, storing locally:', err);
    }
  }

  // 3. Always record in local storage
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

  return { success: true };
}

export async function recordAdRewardClaim(
  assetId: string,
  worldId: string,
  user: User | null,
  googleUserId?: string
): Promise<{ success: boolean; error?: string }> {
  const dateKey = getTodayDateString(0) + '_ad_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();

  // 1. If Google Cloud logged in
  if (googleUserId) {
    try {
      await fetch(`/api/daily_rewards/${googleUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record: {
            reward_date: dateKey,
            reward_type: assetId,
            world_id: worldId,
            claimed_at: now,
          },
        }),
      });
    } catch {
      // ignore
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
    console.error('Failed to save ad gift locally:', err);
  }

  return { success: true };
}

// Dev helper to reset daily claims for rapid testing
export function devResetDailyClaims(): void {
  try {
    localStorage.removeItem(LOCAL_DAILY_GIFTS_KEY);
  } catch {
    // ignore
  }
}
