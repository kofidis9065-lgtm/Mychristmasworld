// Centralized Cache and Storage Management Utility
export async function clearAllAppCache(reloadPage: boolean = true): Promise<void> {
  try {
    // 1. Wipe client localStorage keys
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('mcw_') ||
            key.startsWith('sb-') ||
            key.includes('google') ||
            key.includes('supabase') ||
            key.includes('auth'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      // Specifically target explicit keys
      localStorage.removeItem('mcw_google_user_v1');
      localStorage.removeItem('mcw_current_user_v2');
      localStorage.removeItem('mcw_local_accounts_v2');
      localStorage.removeItem('mcw_local_accounts_v1');
      localStorage.removeItem('mcw_saved_world_v1');
      localStorage.removeItem('mcw_daily_gifts_v1');
      localStorage.removeItem('supabase.auth.token');
    }

    // 2. Wipe sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.clear();
    }

    // 3. Wipe browser CacheStorage (service workers / offline caches if any)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      } catch {
        // ignore
      }
    }

    // 4. Wipe server-side .data directory
    try {
      await fetch('/api/clear-cache', { method: 'POST' });
    } catch {
      // ignore
    }

    // 5. Reload cleanly if requested
    if (reloadPage && typeof window !== 'undefined') {
      window.location.href = window.location.origin + '?cleared=' + Date.now();
    }
  } catch (err) {
    console.error('Error clearing cache:', err);
    if (reloadPage && typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}

// Startup sanitation: remove any lingering legacy account or keys
export function sanitizeClientStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    // Check for explicit query parameter (?clearcache, ?clear, ?reset)
    const search = window.location.search || '';
    if (
      search.includes('clearcache') ||
      search.includes('clear=1') ||
      search.includes('reset=1')
    ) {
      localStorage.clear();
      sessionStorage.clear();
      // Remove query param without reload loop
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    // Remove legacy Google tokens
    localStorage.removeItem('mcw_google_user_v1');
    localStorage.removeItem('supabase.auth.token');
    localStorage.removeItem('g_state');

    // Remove any user session if it contains 'kofidis'
    const currentUserRaw = localStorage.getItem('mcw_current_user_v2');
    if (currentUserRaw && currentUserRaw.toLowerCase().includes('kofidis')) {
      localStorage.removeItem('mcw_current_user_v2');
    }

    const localAccountsRaw = localStorage.getItem('mcw_local_accounts_v2');
    if (localAccountsRaw && localAccountsRaw.toLowerCase().includes('kofidis')) {
      try {
        const accounts = JSON.parse(localAccountsRaw);
        const filtered = Array.isArray(accounts)
          ? accounts.filter((a: any) => !a?.email?.toLowerCase().includes('kofidis'))
          : [];
        localStorage.setItem('mcw_local_accounts_v2', JSON.stringify(filtered));
      } catch {
        localStorage.removeItem('mcw_local_accounts_v2');
      }
    }
  } catch (e) {
    console.warn('Storage sanitation warning:', e);
  }
}
