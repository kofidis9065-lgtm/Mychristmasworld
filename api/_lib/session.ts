import crypto from 'crypto';
import type { Request, Response } from 'express';

const SESSION_COOKIE_NAME = 'mcw_session';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface SessionPayload {
  uid: string;
  sub?: string;
  email: string;
  provider: 'google' | 'local';
  iat: number;
  exp: number;
}

let ephemeralLocalSecret: Buffer | null = null;

function getSessionSigningKey(): Buffer {
  const explicitSecret = (process.env.SESSION_SECRET || '').trim();
  if (explicitSecret) {
    return crypto.createHmac('sha256', 'mcw-session-key-v1').update(explicitSecret).digest();
  }

  // Derive a consistent server-side HMAC key across serverless instances from configured server secrets
  const serviceSecret = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const webhookSecret = (process.env.PADDLE_WEBHOOK_SECRET || '').trim();
  if (serviceSecret || webhookSecret) {
    return crypto
      .createHmac('sha256', 'mcw-derived-session-key-v1')
      .update(`${serviceSecret}:${webhookSecret}`)
      .digest();
  }

  if (!ephemeralLocalSecret) {
    ephemeralLocalSecret = crypto.randomBytes(32);
  }
  return ephemeralLocalSecret;
}

function toBase64Url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

export function createSessionToken(user: {
  uid: string;
  sub?: string;
  email: string;
  provider: 'google' | 'local';
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    uid: user.uid,
    sub: user.sub,
    email: user.email,
    provider: user.provider,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', getSessionSigningKey()).update(encodedPayload).digest();
  return `${encodedPayload}.${toBase64Url(sig)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return null;

  const encodedPayload = token.slice(0, dotIdx);
  const encodedSig = token.slice(dotIdx + 1);
  if (!encodedPayload || !encodedSig) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSessionSigningKey())
      .update(encodedPayload)
      .digest();
    const actualSig = fromBase64Url(encodedSig);
    if (expectedSig.length !== actualSig.length) return null;
    if (!crypto.timingSafeEqual(expectedSig, actualSig)) return null;

    const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8')) as SessionPayload;
    if (!payload || !payload.uid || !payload.email) return null;
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(payload.exp) || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

function shouldUseSecureCookie(req: Request): boolean {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  if (forwardedProto.includes('https')) return true;
  if (req.secure) return true;
  return Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
}

export function setSessionCookie(
  req: Request,
  res: Response,
  user: { uid: string; sub?: string; email: string; provider: 'google' | 'local' }
): void {
  const token = createSessionToken(user);
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (shouldUseSecureCookie(req)) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (shouldUseSecureCookie(req)) {
    parts.push('Secure');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function getAuthenticatedSession(req: Request): SessionPayload | null {
  const cookies = parseCookies(req.headers.cookie);
  return verifySessionToken(cookies[SESSION_COOKIE_NAME]);
}
