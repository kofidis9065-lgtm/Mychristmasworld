// Local User Authentication & Persistent Cloud Storage Service

export interface AppUser {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  createdAt: string;
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

// Simple deterministic hash for password checking
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
      if (raw.toLowerCase().includes('kofidis')) {
        localStorage.removeItem(CURRENT_USER_SESSION_KEY);
        return null;
      }
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading user session:', err);
  }
  return null;
}

export function setStoredUser(user: AppUser | null) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(user));
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

  // 1. Try server backend first
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
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
    // Backend offline / static mode fallback
  }

  // 2. Local fallback
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

  // 1. Try server backend first
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
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

  // 2. Local fallback
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
    createdAt: account.createdAt,
  };

  setStoredUser(appUser);
  return { success: true, user: appUser };
}

export function logoutUser() {
  setStoredUser(null);
}

// Backward compatibility alias for existing code
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
    const res = await fetch(`/api/worlds/${userId}`);
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
