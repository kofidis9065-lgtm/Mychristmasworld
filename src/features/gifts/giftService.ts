import { User } from '@supabase/supabase-js';
import { ASSET_CATALOG } from '../../game/assets/assetCatalog';
import { AssetDefinition } from '../world/worldTypes';

const GUEST_DAILY_GIFTS_KEY = 'mcw_guest_claimed_daily_gifts_v1';
const LEGACY_LOCAL_DAILY_GIFTS_KEY = 'mcw_claimed_daily_gifts_v1';
export const FREE_DAILY_GIFT_LIMIT = 3; // Up to 3 Secret Gifts per UTC day for free users!

export function getTodayDateString(offsetDays: number = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setUTCDate(d.getUTCDate() + offsetDays);
  }
  return d.toISOString().split('T')[0];
}

export interface ClaimedGiftRecord {
  date: string; // YYYY-MM-DD (UTC)
  assetId: string;
  claimedAt: string;
}

export interface DailyRewardsServerState {
  ok: boolean;
  rewardDate: string;
  todayCount: number;
  dailyLimit: number;
  remainingToday: number;
  isPro: boolean;
  unlockedAssetIds: string[];
  rewards: any[];
  error?: string;
}

export function readGuestDailyGiftRecords(): ClaimedGiftRecord[] {
  try {
    const rawGuest = localStorage.getItem(GUEST_DAILY_GIFTS_KEY);
    if (rawGuest) {
      const list = JSON.parse(rawGuest);
      if (Array.isArray(list)) return list;
    }
    // Non-destructive read fallback from legacy dev/test storage key
    const rawLegacy = localStorage.getItem(LEGACY_LOCAL_DAILY_GIFTS_KEY);
    if (rawLegacy) {
      const list = JSON.parse(rawLegacy);
      if (Array.isArray(list)) return list;
    }
  } catch {
    // ignore
  }
  return [];
}

function writeGuestDailyGiftRecords(records: ClaimedGiftRecord[]): void {
  try {
    localStorage.setItem(GUEST_DAILY_GIFTS_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save guest daily gifts locally:', err);
  }
}

export function getGuestClaimedDailyGiftAssetIds(): string[] {
  return Array.from(
    new Set(
      readGuestDailyGiftRecords()
        .map((item) => item?.assetId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );
}

export function getAvailableGiftPool(unlockedAssetIds?: string[]): AssetDefinition[] {
  // 22 Secret gifts
  const allSecretGifts = ASSET_CATALOG.filter((a) => a.isSecretGift || a.isDailyReward);
  if (unlockedAssetIds && unlockedAssetIds.length > 0) {
    const unrevealed = allSecretGifts.filter((g) => !unlockedAssetIds.includes(g.id));
    if (unrevealed.length > 0) {
      return unrevealed;
    }
  }
  return allSecretGifts;
}

export async function fetchDailyRewardsState(
  googleUserId: string
): Promise<DailyRewardsServerState> {
  const todayUtc = getTodayDateString(0);
  try {
    const res = await fetch(`/api/daily_rewards/${encodeURIComponent(googleUserId)}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success) {
      return {
        ok: true,
        rewardDate: data.rewardDate || todayUtc,
        todayCount: typeof data.todayCount === 'number' ? data.todayCount : 0,
        dailyLimit: typeof data.dailyLimit === 'number' ? data.dailyLimit : FREE_DAILY_GIFT_LIMIT,
        remainingToday:
          typeof data.remainingToday === 'number'
            ? data.remainingToday
            : Math.max(0, FREE_DAILY_GIFT_LIMIT - (data.todayCount || 0)),
        isPro: Boolean(data.isPro),
        unlockedAssetIds: Array.isArray(data.unlockedAssetIds) ? data.unlockedAssetIds : [],
        rewards: Array.isArray(data.rewards) ? data.rewards : [],
      };
    }

    return {
      ok: false,
      rewardDate: todayUtc,
      todayCount: 0,
      dailyLimit: FREE_DAILY_GIFT_LIMIT,
      remainingToday: FREE_DAILY_GIFT_LIMIT,
      isPro: false,
      unlockedAssetIds: [],
      rewards: [],
      error: data?.error || 'Could not load daily rewards.',
    };
  } catch (err: any) {
    return {
      ok: false,
      rewardDate: todayUtc,
      todayCount: 0,
      dailyLimit: FREE_DAILY_GIFT_LIMIT,
      remainingToday: FREE_DAILY_GIFT_LIMIT,
      isPro: false,
      unlockedAssetIds: [],
      rewards: [],
      error: err?.message || 'Network error while checking daily rewards.',
    };
  }
}

export async function getTodayClaimCount(
  _user: User | null,
  offsetDays: number = 0,
  googleUserId?: string
): Promise<number> {
  const dateKey = getTodayDateString(offsetDays);

  // 1. Authenticated Google users rely exclusively on Supabase server records (UTC day)
  if (googleUserId) {
    const state = await fetchDailyRewardsState(googleUserId);
    if (!state.ok) {
      return 0;
    }
    if (offsetDays === 0 && state.rewardDate === dateKey) {
      return state.todayCount;
    }
    return state.rewards.filter((r: any) => r?.reward_date === dateKey || r?.date === dateKey).length;
  }

  // 2. Guest Mode uses isolated guest localStorage
  const guestRecords = readGuestDailyGiftRecords();
  return guestRecords.filter((r) => r.date === dateKey).length;
}

export async function checkDailyGiftClaimed(
  user: User | null,
  offsetDays: number = 0,
  googleUserId?: string,
  isProUser?: boolean
): Promise<boolean> {
  // Christmas Pro users never use or hit Daily Gift limits
  if (isProUser) {
    return false;
  }

  const count = await getTodayClaimCount(user, offsetDays, googleUserId);
  return count >= FREE_DAILY_GIFT_LIMIT;
}

export async function claimDailyGift(
  assetId: string,
  worldId: string,
  _user: User | null,
  offsetDays: number = 0,
  googleUserId?: string,
  isProUser?: boolean
): Promise<{
  success: boolean;
  error?: string;
  todayCount?: number;
  remainingToday?: number;
  worldRevision?: number;
  unlockedAssetIds?: string[];
  isPro?: boolean;
}> {
  const dateKey = getTodayDateString(offsetDays);
  const now = new Date().toISOString();

  // 1. Authenticated Google User -> Authoritative Supabase RPC endpoint
  if (googleUserId) {
    try {
      const res = await fetch(`/api/daily_rewards/${encodeURIComponent(googleUserId)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          worldId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        return {
          success: false,
          error:
            data?.error ||
            'Could not claim Secret Gift on the server. Please try again.',
          todayCount: typeof data?.todayCount === 'number' ? data.todayCount : undefined,
          remainingToday:
            typeof data?.remainingToday === 'number' ? data.remainingToday : undefined,
          unlockedAssetIds: Array.isArray(data?.unlockedAssetIds)
            ? data.unlockedAssetIds
            : undefined,
          isPro: typeof data?.isPro === 'boolean' ? data.isPro : undefined,
        };
      }

      return {
        success: true,
        todayCount: typeof data.todayCount === 'number' ? data.todayCount : 0,
        remainingToday:
          typeof data.remainingToday === 'number'
            ? data.remainingToday
            : Math.max(0, FREE_DAILY_GIFT_LIMIT - (data.todayCount || 0)),
        worldRevision:
          typeof data.worldRevision === 'number' ? data.worldRevision : undefined,
        unlockedAssetIds: Array.isArray(data.unlockedAssetIds)
          ? data.unlockedAssetIds
          : undefined,
        isPro: Boolean(data.isPro),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error while claiming Secret Gift.',
      };
    }
  }

  // 2. Guest Mode -> Isolated Guest localStorage (3 per UTC day)
  const guestRecords = readGuestDailyGiftRecords();
  const todayRecords = guestRecords.filter((r) => r.date === dateKey);

  if (!isProUser && todayRecords.length >= FREE_DAILY_GIFT_LIMIT) {
    return {
      success: false,
      todayCount: todayRecords.length,
      remainingToday: 0,
      error:
        'Daily limit reached! Free accounts can unlock up to 3 Secret Gifts per UTC day. Upgrade to Christmas Pro for unlimited access!',
    };
  }

  if (todayRecords.some((r) => r.assetId === assetId)) {
    return {
      success: false,
      todayCount: todayRecords.length,
      remainingToday: Math.max(0, FREE_DAILY_GIFT_LIMIT - todayRecords.length),
      error: 'You already unwrapped this Secret Gift today.',
    };
  }

  const nextRecords: ClaimedGiftRecord[] = [
    ...guestRecords,
    {
      date: dateKey,
      assetId,
      claimedAt: now,
    },
  ];
  writeGuestDailyGiftRecords(nextRecords);

  const newCount = todayRecords.length + 1;
  const remainingToday = Math.max(0, FREE_DAILY_GIFT_LIMIT - newCount);

  return {
    success: true,
    todayCount: newCount,
    remainingToday,
  };
}

// Dev helper to reset daily claims for Guest Mode testing
export function devResetDailyClaims(): void {
  try {
    localStorage.removeItem(GUEST_DAILY_GIFTS_KEY);
    localStorage.removeItem(LEGACY_LOCAL_DAILY_GIFTS_KEY);
  } catch {
    // ignore
  }
}
