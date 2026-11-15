// Paddle Billing Payment Integration Service

declare global {
  interface Window {
    Paddle?: any;
  }
}

export type PaddleClientEnv = 'sandbox' | 'production';

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
let activeCheckoutCallbacks: {
  onSuccess?: (transactionId?: string) => void;
  onClose?: () => void;
  onError?: (errMessage: string) => void;
} = {};

export function initPaddle(): void {
  if (typeof window === 'undefined') return;

  const clientToken = getPaddleClientToken();
  const env = getPaddleEnvironment();

  if (window.Paddle && clientToken && !isPaddleInitialized) {
    try {
      if (env === 'sandbox') {
        window.Paddle.Environment.set('sandbox');
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
            const msg = event?.error?.detail || event?.data?.error || 'Paddle Checkout encountered an error.';
            if (activeCheckoutCallbacks.onError) {
              activeCheckoutCallbacks.onError(String(msg));
            }
          }
        },
      });
      isPaddleInitialized = true;
    } catch (err) {
      console.warn('Paddle initialization warning:', err);
    }
  }
}

export interface CheckoutOptions {
  userId: string;
  email: string;
  onSuccess?: (transactionId?: string) => void;
  onClose?: () => void;
  onError?: (errMessage: string) => void;
}

export function openPaddleCheckout(options: CheckoutOptions): boolean {
  const { userId, email, onSuccess, onClose, onError } = options;
  const clientToken = getPaddleClientToken();
  const priceId = getPaddlePriceId();
  const env = getPaddleEnvironment();

  if (!userId || !userId.startsWith('google_') || !email) {
    if (onError) onError('Please sign in with Google before starting checkout.');
    return false;
  }

  activeCheckoutCallbacks = { onSuccess, onClose, onError };
  initPaddle();

  if (!window.Paddle) {
    if (onError) onError('Paddle Checkout is still loading. Please try again in a moment.');
    return false;
  }

  if (!clientToken || !priceId) {
    if (onError) onError('Paddle Billing is not configured yet (missing client token or price ID).');
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
    console.error('Error opening Paddle checkout:', err);
    if (onError) onError(err?.message || 'Could not open Paddle checkout.');
    return false;
  }
}
