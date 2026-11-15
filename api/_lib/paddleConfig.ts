export type PaddleEnvironment = 'sandbox' | 'production';

export function getPaddleEnvironment(): PaddleEnvironment {
  const raw = (process.env.PADDLE_ENV || process.env.VITE_PADDLE_ENV || 'sandbox')
    .trim()
    .toLowerCase();
  return raw === 'production' ? 'production' : 'sandbox';
}

export function getPaddlePriceId(): string {
  return (process.env.PADDLE_PRICE_ID || process.env.VITE_PADDLE_PRICE_ID || '').trim();
}

export function getPaddleWebhookSecret(): string {
  return (process.env.PADDLE_WEBHOOK_SECRET || '').trim();
}

export function getPaddleApiKey(): string {
  return (process.env.PADDLE_API_KEY || '').trim();
}

export function getGoogleClientId(): string {
  return (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
}

export function getPaddleApiBaseUrl(env: PaddleEnvironment = getPaddleEnvironment()): string {
  return env === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';
}
