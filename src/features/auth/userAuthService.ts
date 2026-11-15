// User Authentication & Server-Authoritative Entitlement Service

export interface AppUser {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  createdAt: string;
  provider: 'google';
  isPro?: boolean;
}

const CURRENT_USER_SESSION_KEY = 'mcw_current_user_v2';

function sanitizeStoredUser(user: AppUser | null): AppUser | null {
  if (!user || user.provider !== 'google') return null;
  // Never store or trust isPro inside localStorage as proof of purchase
  const { isPro: _ignored, ...safeProfile } = user;
  return safeProfile;
}

export async function loginWithGoogleCredential(
  credentialToken: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  if (!credentialToken) {
    return { success: false, error: 'Missing Google credential token.' };
  }

  try {
    const res = await fetch('/api/auth/google-sync', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: credentialToken }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success || !data?.user) {
      return {
        success: false,
        error: data?.error || 'Could not verify Google Sign-In on the server.',
      };
    }

    const verifiedUser: AppUser = data.user;
    setStoredUser(verifiedUser);
    return { success: true, user: verifiedUser };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while verifying Google Sign-In.',
    };
  }
}

export async function fetchServerAuthSession(): Promise<{
  authenticated: boolean;
  user: AppUser | null;
  isPro: boolean;
}> {
  try {
    const res = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      return { authenticated: false, user: null, isPro: false };
    }
    const data = await res.json();
    if (data?.authenticated && data?.user) {
      setStoredUser(data.user);
      return {
        authenticated: true,
        user: data.user,
        isPro: Boolean(data.isPro ?? data.user.isPro),
      };
    }

    // Clear stale profile cache if HttpOnly server session is no longer active
    const cached = getStoredUser();
    if (cached) {
      setStoredUser(null);
    }
    return { authenticated: false, user: null, isPro: false };
  } catch {
    return { authenticated: false, user: null, isPro: false };
  }
}

export function getStoredUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppUser;
      // Only verified Google profiles are supported; legacy local sessions fall back to Guest Mode
      if (!parsed || parsed.provider !== 'google') {
        return null;
      }
      // Server is authoritative for Pro status; never read isPro from localStorage
      return sanitizeStoredUser(parsed);
    }
  } catch (err) {
    console.error('Error reading user session:', err);
  }
  return null;
}

export function setStoredUser(user: AppUser | null) {
  try {
    const safeUser = sanitizeStoredUser(user);
    if (safeUser) {
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(safeUser));
    } else {
      localStorage.removeItem(CURRENT_USER_SESSION_KEY);
    }
  } catch (err) {
    console.error('Error setting user session:', err);
  }
}

export async function logoutUser(): Promise<void> {
  setStoredUser(null);
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
    });
  } catch {
    // ignore network error on logout
  }
}

export type GoogleUser = AppUser;
export const getStoredGoogleUser = getStoredUser;
export const setStoredGoogleUser = setStoredUser;

export interface CloudSaveResult {
  success: boolean;
  mode: 'cloud' | 'local';
  revision?: number;
  updatedAt?: string;
  unlockedAssetIds?: string[];
  conflict?: boolean;
  serverWorld?: any;
  error?: string;
  status?: number;
}

export interface CloudLoadResult {
  ok: boolean;
  exists: boolean;
  world: any | null;
  error?: string;
  status?: number;
}

export async function saveWorldToCloudBackend(
  world: any,
  userId: string
): Promise<CloudSaveResult> {
  try {
    const payload = {
      ...world,
      revision: typeof world?.revision === 'number' ? world.revision : 0,
    };

    const res = await fetch(`/api/worlds/${encodeURIComponent(userId)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.success) {
      return {
        success: true,
        mode: 'cloud',
        revision: typeof data.revision === 'number' ? data.revision : undefined,
        updatedAt: data.updatedAt,
        unlockedAssetIds: Array.isArray(data.unlockedAssetIds)
          ? data.unlockedAssetIds
          : undefined,
        status: res.status,
      };
    }

    if (res.status === 409 && (data?.conflict || data?.serverWorld)) {
      return {
        success: false,
        mode: 'cloud',
        conflict: true,
        revision: typeof data.revision === 'number' ? data.revision : undefined,
        updatedAt: data.updatedAt,
        unlockedAssetIds: Array.isArray(data.unlockedAssetIds)
          ? data.unlockedAssetIds
          : undefined,
        serverWorld: data.serverWorld,
        error: data?.error || 'A newer version of this world was saved from another session.',
        status: 409,
      };
    }

    return {
      success: false,
      mode: 'cloud',
      error: data?.error || 'Could not save world to cloud storage.',
      status: res.status,
    };
  } catch (err: any) {
    console.warn('Could not save to cloud backend:', err);
    return {
      success: false,
      mode: 'cloud',
      error: err?.message || 'Network error while saving world.',
    };
  }
}

export async function loadWorldFromCloudBackendResult(
  userId: string
): Promise<CloudLoadResult> {
  try {
    const res = await fetch(`/api/worlds/${encodeURIComponent(userId)}`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.success) {
      return {
        ok: true,
        exists: Boolean(data.world),
        world: data.world || null,
        status: res.status,
      };
    }

    return {
      ok: false,
      exists: false,
      world: null,
      error: data?.error || 'Could not load world from cloud storage.',
      status: res.status,
    };
  } catch (err: any) {
    console.warn('Could not load from cloud backend:', err);
    return {
      ok: false,
      exists: false,
      world: null,
      error: err?.message || 'Network error while loading cloud world.',
    };
  }
}

export async function loadWorldFromCloudBackend(userId: string): Promise<any | null> {
  const result = await loadWorldFromCloudBackendResult(userId);
  return result.world;
}

/**
 * Always checks the server (Supabase via HttpOnly session cookie) for authoritative Pro status.
 * Never trusts localStorage as proof of purchase.
 */
export async function checkProStatus(): Promise<boolean> {
  try {
    const res = await fetch('/api/user/pro-status', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data?.isPro);
    }
  } catch (err) {
    console.warn('Pro status check error:', err);
  }

  return false;
}

export async function confirmPaddleTransaction(
  transactionId?: string
): Promise<{ isPro: boolean; pendingWebhook?: boolean; error?: string }> {
  try {
    const res = await fetch('/api/paddle/confirm-transaction', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      isPro: Boolean(data?.isPro),
      pendingWebhook: Boolean(data?.pendingWebhook),
      error: data?.error,
    };
  } catch (err: any) {
    return { isPro: false, pendingWebhook: true, error: err?.message };
  }
}
