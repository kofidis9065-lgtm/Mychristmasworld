// Paddle Billing v2 Payment Integration Service

declare global {
  interface Window {
    Paddle?: any;
  }
}

export type PaddleClientEnv = 'sandbox' | 'production';

const PADDLE_SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js';

export function getPaddleEnvironment(): PaddleClientEnv {
  const raw = (import.meta.env.VITE_PADDLE_ENV || 'sandbox').trim().toLowerCase();
  return raw === 'production' ? 'production' : 'sandbox';
}

export function getPaddleClientToken(): string {
  return (import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '').trim();
}

export function getPaddlePriceId(): string {
  return (import.meta.env.VITE_PADDLE_PRICE_ID || '').trim();
}

let isPaddleInitialized = false;
let initializedToken = '';
let initializedEnv: PaddleClientEnv | null = null;
let paddleScriptLoadPromise: Promise<void> | null = null;

let activeCheckoutCallbacks: {
  onSuccess?: (transactionId?: string) => void;
  onClose?: () => void;
  onError?: (errMessage: string) => void;
} = {};

/**
 * Ensures Paddle Billing v2 JS SDK (`cdn.paddle.com/paddle/v2/paddle.js`) is loaded into `window.Paddle`.
 * Uses the <script> in index.html if present or injects it dynamically on demand.
 */
export function loadPaddleScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Paddle Checkout is only available in the browser.'));
  }

  if (window.Paddle) {
    return Promise.resolve();
  }

  if (paddleScriptLoadPromise) {
    return paddleScriptLoadPromise;
  }

  paddleScriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${PADDLE_SCRIPT_SRC}"]`
    );

    const handleLoaded = () => {
      if (window.Paddle) {
        resolve();
      } else {
        paddleScriptLoadPromise = null;
        reject(new Error('Paddle.js loaded, but window.Paddle is unavailable.'));
      }
    };

    const handleError = () => {
      paddleScriptLoadPromise = null;
      reject(
        new Error(
          'Unable to load Paddle Checkout script (cdn.paddle.com). Please check your network or disable content blockers and try again.'
        )
      );
    };

    if (existingScript) {
      // Wait briefly if script tag is already in DOM and loading
      let pollCount = 0;
      const pollTimer = window.setInterval(() => {
        if (window.Paddle) {
          window.clearInterval(pollTimer);
          resolve();
          return;
        }
        pollCount += 1;
        if (pollCount >= 80) {
          // 8 seconds timeout -> retry with a fresh script element
          window.clearInterval(pollTimer);
          paddleScriptLoadPromise = null;
          reject(
            new Error(
              'Timed out waiting for Paddle Checkout script to load. Please refresh or check content blockers.'
            )
          );
        }
      }, 100);

      existingScript.addEventListener('load', () => {
        window.clearInterval(pollTimer);
        handleLoaded();
      }, { once: true });

      existingScript.addEventListener('error', () => {
        window.clearInterval(pollTimer);
        handleError();
      }, { once: true });

      return;
    }

    const script = document.createElement('script');
    script.src = PADDLE_SCRIPT_SRC;
    script.async = true;
    script.onload = handleLoaded;
    script.onerror = handleError;
    document.head.appendChild(script);
  });

  return paddleScriptLoadPromise;
}

/**
 * Loads Paddle.js and runs Paddle.Environment.set + Paddle.Initialize.
 * Never silently swallows configuration or initialization failures.
 */
export async function ensurePaddleInitialized(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Paddle Checkout requires a browser environment.' };
  }

  const clientToken = getPaddleClientToken();
  const priceId = getPaddlePriceId();
  const env = getPaddleEnvironment();

  if (!clientToken) {
    return {
      ok: false,
      error: 'Paddle Billing client token (VITE_PADDLE_CLIENT_TOKEN) is not configured.',
    };
  }

  if (!priceId) {
    return {
      ok: false,
      error: 'Paddle Billing price ID (VITE_PADDLE_PRICE_ID) is not configured.',
    };
  }

  if (env === 'sandbox' && clientToken.startsWith('live_')) {
    console.warn('[Paddle] Sandbox environment configured with a live_ client token.');
  } else if (env === 'production' && clientToken.startsWith('test_')) {
    console.warn('[Paddle] Production environment configured with a test_ client token.');
  }

  try {
    await loadPaddleScript();
  } catch (err: any) {
    console.error('[Paddle] Script load error:', err);
    return {
      ok: false,
      error: err?.message || 'Failed to load Paddle Checkout SDK.',
    };
  }

  if (!window.Paddle) {
    return { ok: false, error: 'Paddle Checkout SDK did not initialize on window.Paddle.' };
  }

  if (isPaddleInitialized && initializedToken === clientToken && initializedEnv === env) {
    return { ok: true };
  }

  try {
    if (env === 'sandbox') {
      window.Paddle.Environment.set('sandbox');
    } else if (typeof window.Paddle.Environment?.set === 'function') {
      window.Paddle.Environment.set('production');
    }

    window.Paddle.Initialize({
      token: clientToken,
      eventCallback: (event: any) => {
        const eventName = event?.name;
        if (eventName === 'checkout.completed') {
          const transactionId =
            event?.data?.transaction_id || event?.data?.id || undefined;
          if (activeCheckoutCallbacks.onSuccess) {
            activeCheckoutCallbacks.onSuccess(transactionId);
          }
        } else if (eventName === 'checkout.closed') {
          if (activeCheckoutCallbacks.onClose) {
            activeCheckoutCallbacks.onClose();
          }
        } else if (eventName === 'checkout.error') {
          const msg =
            event?.error?.detail ||
            event?.data?.error?.detail ||
            event?.data?.error ||
            'Paddle Checkout encountered an error.';
          console.error('[Paddle] Checkout event error:', event);
          if (activeCheckoutCallbacks.onError) {
            activeCheckoutCallbacks.onError(String(msg));
          }
        }
      },
    });

    isPaddleInitialized = true;
    initializedToken = clientToken;
    initializedEnv = env;
    return { ok: true };
  } catch (err: any) {
    isPaddleInitialized = false;
    console.error('[Paddle] Initialization error:', err);
    return {
      ok: false,
      error: err?.message || 'Failed to initialize Paddle Checkout.',
    };
  }
}

export interface CheckoutOptions {
  userId: string;
  email: string;
  onSuccess?: (transactionId?: string) => void;
  onClose?: () => void;
  onError?: (errMessage: string) => void;
}

export async function openPaddleCheckout(options: CheckoutOptions): Promise<boolean> {
  const { userId, email, onSuccess, onClose, onError } = options;
  const priceId = getPaddlePriceId();
  const env = getPaddleEnvironment();

  if (!userId || !userId.startsWith('google_') || !email) {
    if (onError) onError('Please sign in with Google before starting checkout.');
    return false;
  }

  activeCheckoutCallbacks = { onSuccess, onClose, onError };

  const initResult = await ensurePaddleInitialized();
  if (!initResult.ok) {
    if (onError) onError(initResult.error || 'Could not initialize Paddle Checkout.');
    return false;
  }

  try {
    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email },
      customData: {
        userId,
        userEmail: email,
        paddleEnv: env,
      },
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        locale: 'en',
        successUrl: `${window.location.origin}?pro_success=true`,
      },
    });
    return true;
  } catch (err: any) {
    console.error('[Paddle] Error opening checkout:', err);
    if (onError) onError(err?.message || 'Could not open Paddle checkout.');
    return false;
  }
}
