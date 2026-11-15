export type PaddleEnvironment = 'sandbox' | 'production';

export function normalizePaddleEnvironment(
  rawValue?: string | null
): PaddleEnvironment | null {
  const raw = (rawValue || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'live' || raw === 'production' || raw === 'prod') {
    return 'production';
  }
  if (raw === 'sandbox' || raw === 'test' || raw === 'testing') {
    return 'sandbox';
  }
  return null;
}

export function getPaddleEnvironment(): PaddleEnvironment {
  const explicit =
    normalizePaddleEnvironment(process.env.PADDLE_ENV) ||
    normalizePaddleEnvironment(process.env.VITE_PADDLE_ENV);
  if (explicit) {
    return explicit;
  }

  const apiKey = getPaddleApiKey();
  const clientToken = (process.env.VITE_PADDLE_CLIENT_TOKEN || '').trim();
  if (apiKey.startsWith('pdl_live_') || clientToken.startsWith('live_')) {
    return 'production';
  }

  return 'sandbox';
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
