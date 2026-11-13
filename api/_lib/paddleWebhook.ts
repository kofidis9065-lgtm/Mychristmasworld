import crypto from 'crypto';
import { grantProAccess, revokeProAccess } from './storage';

const SIGNATURE_TOLERANCE_SECONDS = 300; // 5 minutes replay window

export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
  ts?: number;
}

/**
 * Verifies Paddle Billing webhook `Paddle-Signature` header (`ts=...;h1=...`)
 * against the exact raw request body bytes using `PADDLE_WEBHOOK_SECRET`.
 */
export function verifyPaddleSignature(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
  secret: string
): SignatureVerificationResult {
  if (!secret) {
    return { valid: false, error: 'PADDLE_WEBHOOK_SECRET is not configured' };
  }

  const headerValue = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
  if (!headerValue || typeof headerValue !== 'string') {
    return { valid: false, error: 'Missing Paddle-Signature header' };
  }

  if (!rawBody || rawBody.length === 0) {
    return { valid: false, error: 'Empty webhook request body' };
  }

  let tsStr = '';
  const h1Signatures: string[] = [];

  for (const part of headerValue.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key === 'ts' && val) {
      tsStr = val;
    } else if (key === 'h1' && val) {
      h1Signatures.push(val);
    }
  }

  if (!tsStr || h1Signatures.length === 0) {
    return { valid: false, error: 'Malformed Paddle-Signature header' };
  }

  const tsNum = Number(tsStr);
  if (!Number.isFinite(tsNum) || tsNum <= 0) {
    return { valid: false, error: 'Invalid timestamp in Paddle-Signature header' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsNum) > SIGNATURE_TOLERANCE_SECONDS) {
    return { valid: false, error: 'Webhook timestamp outside allowed tolerance window' };
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${tsStr}:`);
  hmac.update(rawBody);
  const expectedHex = hmac.digest('hex');
  const expectedBuffer = Buffer.from(expectedHex, 'hex');

  const matches = h1Signatures.some((sig) => {
    if (!/^[a-fA-F0-9]+$/.test(sig)) return false;
    const sigBuffer = Buffer.from(sig, 'hex');
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, sigBuffer);
  });

  if (!matches) {
    return { valid: false, error: 'Invalid Paddle webhook signature' };
  }

  return { valid: true, ts: tsNum };
}

export interface WebhookProcessResult {
  status: number;
  body: Record<string, any>;
}

/**
 * Verifies signature against rawBody and processes Paddle Billing webhook events.
 */
export function processPaddleWebhook(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined
): WebhookProcessResult {
  const webhookSecret = (process.env.PADDLE_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    console.error('[Paddle Webhook] PADDLE_WEBHOOK_SECRET environment variable is missing');
    return {
      status: 500,
      body: { success: false, error: 'Webhook secret not configured on server' },
    };
  }

  const verification = verifyPaddleSignature(rawBody, signatureHeader, webhookSecret);
  if (!verification.valid) {
    console.warn('[Paddle Webhook] Signature verification failed:', verification.error);
    return {
      status: 401,
      body: { success: false, error: verification.error || 'Invalid webhook signature' },
    };
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return {
      status: 400,
      body: { success: false, error: 'Invalid JSON payload' },
    };
  }

  const eventType = String(event?.event_type || event?.type || '');
  const data = event?.data || event || {};
  const customData = data?.custom_data || {};
  const userId = String(customData?.userId || customData?.user_id || '').trim();
  const customerEmail = String(
    data?.customer?.email ||
      data?.checkout?.customer_email ||
      customData?.userEmail ||
      customData?.email ||
      ''
  )
    .toLowerCase()
    .trim();

  console.log(`[Paddle Webhook Verified] event=${eventType}`);

  // Grant Christmas Pro on completed/paid transaction events
  if (
    eventType === 'transaction.completed' ||
    eventType === 'transaction.paid' ||
    eventType.includes('order.created') ||
    eventType.includes('payment.succeeded')
  ) {
    if (userId || customerEmail) {
      grantProAccess(userId, customerEmail);
    }
    return {
      status: 200,
      body: { success: true, received: true, verified: true, eventType, action: 'granted' },
    };
  }

  // Handle refunds and chargebacks by revoking entitlement
  const adjustmentAction = String(data?.action || '').toLowerCase();
  const adjustmentStatus = String(data?.status || '').toLowerCase();
  if (
    eventType === 'transaction.refunded' ||
    eventType === 'chargeback.created' ||
    ((eventType === 'adjustment.created' || eventType === 'adjustment.updated') &&
      (adjustmentAction === 'refund' || adjustmentAction === 'chargeback') &&
      (!adjustmentStatus || adjustmentStatus === 'approved'))
  ) {
    if (userId || customerEmail) {
      revokeProAccess(userId, customerEmail);
    }
    return {
      status: 200,
      body: { success: true, received: true, verified: true, eventType, action: 'revoked' },
    };
  }

  return {
    status: 200,
    body: { success: true, received: true, verified: true, eventType },
  };
}
