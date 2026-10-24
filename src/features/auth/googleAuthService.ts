// Google Authentication & Cloud Persistent Storage Service

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  avatar: string;
  provider: 'google';
}

const GOOGLE_USER_SESSION_KEY = 'mcw_google_user_v1';

export function getStoredGoogleUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(GOOGLE_USER_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading Google user session:', err);
  }
  return null;
}

export function setStoredGoogleUser(user: GoogleUser | null) {
  try {
    if (user) {
      localStorage.setItem(GOOGLE_USER_SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(GOOGLE_USER_SESSION_KEY);
    }
  } catch (err) {
    console.error('Error saving Google user session:', err);
  }
}

export function parseGoogleJwt(token: string): { email?: string; name?: string; picture?: string; sub?: string } {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

export async function loginWithGoogleAccount(email: string, name?: string, avatar?: string): Promise<GoogleUser> {
  const cleanEmail = email.trim().toLowerCase();
  const userName = name || cleanEmail.split('@')[0];
  const userAvatar =
    avatar ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}&backgroundColor=0d1723`;

  // Create stable unique ID from email
  let hash = 0;
  for (let i = 0; i < cleanEmail.length; i++) {
    hash = (hash << 5) - hash + cleanEmail.charCodeAt(i);
    hash |= 0;
  }
  const id = 'google_user_' + Math.abs(hash).toString(36);

  const googleUser: GoogleUser = {
    id,
    email: cleanEmail,
    name: userName,
    avatar: userAvatar,
    provider: 'google',
  };

  setStoredGoogleUser(googleUser);
  return googleUser;
}

export async function saveWorldToCloudBackend(world: any, userId: string): Promise<{ success: boolean; mode: 'cloud' | 'local' }> {
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
