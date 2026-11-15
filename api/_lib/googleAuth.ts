import crypto from 'crypto';
import { getGoogleClientId } from './paddleConfig.js';

interface GoogleJwk {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n: string;
  e: string;
}

interface JwksCache {
  keys: GoogleJwk[];
  expiresAt: number;
}

let jwksCache: JwksCache | null = null;

function decodeBase64UrlToBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

function decodeBase64UrlJson<T = any>(input: string): T {
  const buf = decodeBase64UrlToBuffer(input);
  return JSON.parse(buf.toString('utf8')) as T;
}

async function fetchGoogleJwks(forceRefresh = false): Promise<GoogleJwk[]> {
  const now = Date.now();
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!response.ok) {
    throw new Error(`Failed to fetch Google public keys (HTTP ${response.status})`);
  }

  const body = (await response.json()) as { keys?: GoogleJwk[] };
  if (!Array.isArray(body?.keys) || body.keys.length === 0) {
    throw new Error('Google JWKS response returned no public keys');
  }

  let maxAgeSec = 3600;
  const cacheControl = response.headers.get('cache-control') || '';
  const match = cacheControl.match(/max-age=(\d+)/i);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 60) {
      maxAgeSec = parsed;
    }
  }

  jwksCache = {
    keys: body.keys,
    expiresAt: now + maxAgeSec * 1000,
  };
  return body.keys;
}

export interface VerifiedGoogleIdentity {
  userId: string;
  googleSub: string;
  email: string;
  emailVerified: boolean;
  nickname: string;
  avatarUrl: string;
}

/**
 * Cryptographically verifies a Google Identity Services ID token (JWT)
 * against Google's official JWKS public keys.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Missing Google ID token');
  }

  const parts = idToken.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid Google ID token format');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let header: { alg?: string; kid?: string };
  let payload: Record<string, any>;

  try {
    header = decodeBase64UrlJson(encodedHeader);
    payload = decodeBase64UrlJson(encodedPayload);
  } catch {
    throw new Error('Malformed Google ID token JSON');
  }

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported Google ID token algorithm or missing key ID');
  }

  let keys = await fetchGoogleJwks(false);
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    // Key rotation fallback
    keys = await fetchGoogleJwks(true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) {
    throw new Error('Google public signing key not found for token');
  }

  const publicKey = crypto.createPublicKey({
    key: jwk as any,
    format: 'jwk',
  });

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const signatureBuf = decodeBase64UrlToBuffer(encodedSignature);
  const isSignatureValid = verifier.verify(publicKey, signatureBuf);
  if (!isSignatureValid) {
    throw new Error('Invalid Google ID token signature');
  }

  const issuer = String(payload.iss || '');
  if (issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
    throw new Error('Invalid Google ID token issuer');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const exp = Number(payload.exp || 0);
  if (!Number.isFinite(exp) || exp + 60 < nowSec) {
    throw new Error('Google ID token has expired');
  }

  const nbf = payload.nbf !== undefined ? Number(payload.nbf) : null;
  if (nbf !== null && Number.isFinite(nbf) && nbf - 60 > nowSec) {
    throw new Error('Google ID token is not yet valid');
  }

  const expectedClientId = getGoogleClientId();
  if (expectedClientId) {
    const aud = String(payload.aud || '');
    if (aud !== expectedClientId) {
      throw new Error('Google ID token audience mismatch');
    }
  }

  const sub = String(payload.sub || '').trim();
  const email = String(payload.email || '').toLowerCase().trim();
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

  if (!sub || !email) {
    throw new Error('Google ID token missing subject or email');
  }
  if (!emailVerified) {
    throw new Error('Google account email is not verified');
  }

  const nickname = String(payload.name || payload.given_name || email.split('@')[0]).trim();
  const avatarUrl =
    String(payload.picture || '').trim() ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nickname)}&backgroundColor=0d1723`;

  return {
    userId: `google_${sub}`,
    googleSub: sub,
    email,
    emailVerified: true,
    nickname,
    avatarUrl,
  };
}
