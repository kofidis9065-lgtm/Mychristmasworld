// Paddle Billing Payment Integration Service

declare global {
  interface Window {
    Paddle?: any;
  }
}

export function getPaddleClientToken(): string {
  return (import.meta.env.VITE_PADDLE_CLIENT_TOKEN || '').trim();
}

export function getPaddlePriceId(): string {
  return (import.meta.env.VITE_PADDLE_PRICE_ID || '').trim();
}

let isPaddleInitialized = false;

export function initPaddle(): void {
  if (typeof window === 'undefined') return;

  const clientToken = getPaddleClientToken();
  if (window.Paddle && clientToken && !isPaddleInitialized) {
    try {
      window.Paddle.Environment.set('sandbox');
      window.Paddle.Initialize({
        token: clientToken,
        eventCallback: (data: any) => {
          if (data.name === 'checkout.completed') {
            console.log('Paddle checkout completed:', data);
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
  email?: string;
  onSuccess?: () => void;
  onError?: (errMessage: string) => void;
}

export function openPaddleCheckout(options: CheckoutOptions): void {
  const { userId, email, onSuccess, onError } = options;
  const clientToken = getPaddleClientToken();
  const priceId = getPaddlePriceId();

  initPaddle();

  // If official Paddle JS SDK is ready and configured
  if (window.Paddle && clientToken && priceId) {
    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: email ? { email } : undefined,
        customData: { userId, userEmail: email },
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          locale: 'en',
          successUrl: `${window.location.origin}?pro_success=true`,
        },
      });
      return;
    } catch (err: any) {
      console.error('Error opening Paddle checkout:', err);
      if (onError) onError(err.message || 'Could not open Paddle checkout.');
    }
  }

  // Fallback trigger if Paddle Sandbox keys are currently being configured in Phase B
  console.log('Paddle Sandbox pending config (Token/PriceId):', { clientToken, priceId });
}
