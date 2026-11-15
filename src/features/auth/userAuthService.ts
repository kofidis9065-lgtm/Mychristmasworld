// User Authentication & Server-Authoritative Entitlement Service

export interface AppUser {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  createdAt: string;
  provider?: 'local' | 'google';
  isPro?: boolean;
}

const CURRENT_USER_SESSION_KEY = 'mcw_current_user_v2';
const LOCAL_ACCOUNTS_KEY = 'mcw_local_accounts_v2';

interface StoredAccount {
  id: string;
  email: string;
  nickname: string;
  passwordHash: string;
  avatar: string;
  createdAt: string;
}

function sanitizeStoredUser(user: AppUser | null): AppUser | null {
  if (!user) return null;
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

    // Clear stale Google profile cache if HttpOnly server session is no longer active
    const cached = getStoredUser();
    if (cached?.provider === 'google') {
      setStoredUser(null);
    }
    return { authenticated: false, user: null, isPro: false };
  } catch {
    return { authenticated: false, user: null, isPro: false };
  }
}

// Simple deterministic hash for local non-Google password checking
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return 'pw_' + Math.abs(hash).toString(36);
}

function getLocalAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: StoredAccount[]) {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn('Error saving local accounts:', err);
  }
}

export function getStoredUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppUser;
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

export async function registerUser(
  email: string,
  nickname: string,
  password: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanNick = nickname.trim() || cleanEmail.split('@')[0];

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!password || password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, nickname: cleanNick, password }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        setStoredUser(data.user);
        return { success: true, user: data.user };
      } else if (data.error) {
        return { success: false, error: data.error };
      }
    }
  } catch {
    // Backend offline fallback
  }

  const accounts = getLocalAccounts();
  const existing = accounts.find((a) => a.email === cleanEmail);
  if (existing) {
    return { success: false, error: 'An account with this email already exists. Please sign in.' };
  }

  const userId = 'usr_' + Math.random().toString(36).substring(2, 10);
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanNick)}&backgroundColor=0d1723`;
  const newAccount: StoredAccount = {
    id: userId,
    email: cleanEmail,
    nickname: cleanNick,
    passwordHash: simpleHash(password),
    avatar,
    createdAt: new Date().toISOString(),
  };

  accounts.push(newAccount);
  saveLocalAccounts(accounts);

  const appUser: AppUser = {
    id: userId,
    email: cleanEmail,
    nickname: cleanNick,
    avatar,
    provider: 'local',
    createdAt: newAccount.createdAt,
  };

  setStoredUser(appUser);
  return { success: true, user: appUser };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AppUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail) {
    return { success: false, error: 'Please enter your email.' };
  }
  if (!password) {
    return { success: false, error: 'Please enter your password.' };
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        setStoredUser(data.user);
        return { success: true, user: data.user };
      } else if (data.error) {
        return { success: false, error: data.error };
      }
    }
  } catch {
    // Backend offline fallback
  }

  const accounts = getLocalAccounts();
  const account = accounts.find((a) => a.email === cleanEmail);
  if (!account) {
    return { success: false, error: 'Account not found. Please create an account first.' };
  }

  if (account.passwordHash !== simpleHash(password)) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  const appUser: AppUser = {
    id: account.id,
    email: account.email,
    nickname: account.nickname,
    avatar: account.avatar,
    provider: 'local',
    createdAt: account.createdAt,
  };

  setStoredUser(appUser);
  return { success: true, user: appUser };
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

export async function saveWorldToCloudBackend(
  world: any,
  userId: string
): Promise<{ success: boolean; mode: 'cloud' | 'local' }> {
  try {
    const res = await fetch(`/api/worlds/${userId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(world),
    });
    if (res.ok) {
      return { success: true, mode: 'cloud' };
    }
  } catch (err) {
    console.warn('Could not save to cloud backend, falling back to local storage:', err);
  }
  return { success: true, mode: 'local' };
}

export async function loadWorldFromCloudBackend(userId: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/worlds/${userId}`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.world) {
        return data.world;
      }
    }
  } catch (err) {
    console.warn('Could not load from cloud backend:', err);
  }
  return null;
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
