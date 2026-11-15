import crypto from 'crypto';
import {
  getPaddleEnvironment,
  getPaddlePriceId,
  getPaddleWebhookSecret,
  PaddleEnvironment,
} from './paddleConfig.js';
import {
  findVerifiedUserForPaddlePurchase,
  isSupabaseAdminConfigured,
  isWebhookEventAlreadyProcessed,
  recordVerifiedPaddlePurchase,
  recordWebhookEventLog,
  revokePaddlePurchaseByTransaction,
} from './supabaseAdmin.js';

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

export function extractTransactionItemDetails(data: Record<string, any>): {
  priceIds: string[];
  productIds: string[];
} {
  const priceIds: string[] = [];
  const productIds: string[] = [];

  if (Array.isArray(data?.items)) {
    for (const item of data.items) {
      const pid = String(item?.price?.id || item?.price_id || '').trim();
      if (pid) priceIds.push(pid);
      const prodId = String(item?.price?.product_id || item?.product?.id || item?.product_id || '').trim();
      if (prodId) productIds.push(prodId);
    }
  }

  const fallbackPriceId = String(data?.price_id || '').trim();
  if (fallbackPriceId && !priceIds.includes(fallbackPriceId)) {
    priceIds.push(fallbackPriceId);
  }

  return { priceIds, productIds };
}

export function detectPayloadEnvironmentMismatch(
  event: Record<string, any>,
  configuredEnv: PaddleEnvironment
): string | null {
  const data = event?.data || {};
  const customEnv = String(data?.custom_data?.paddleEnv || data?.custom_data?.paddle_env || '')
    .toLowerCase()
    .trim();
  if (customEnv && (customEnv === 'sandbox' || customEnv === 'production') && customEnv !== configuredEnv) {
    return `Payload custom_data paddleEnv (${customEnv}) does not match configured environment (${configuredEnv})`;
  }

  const checkoutUrl = String(data?.checkout?.url || '').toLowerCase();
  if (configuredEnv === 'production' && checkoutUrl.includes('sandbox')) {
    return 'Sandbox checkout payload cannot grant production entitlements';
  }

  return null;
}

export interface WebhookProcessResult {
  status: number;
  body: Record<string, any>;
}

/**
 * Verifies signature against rawBody, enforces idempotency and Price/Environment/User checks,
 * and persists Paddle Billing transactions & revocations into Supabase.
 */
export async function processPaddleWebhook(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined
): Promise<WebhookProcessResult> {
  const webhookSecret = getPaddleWebhookSecret();
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

  if (!isSupabaseAdminConfigured()) {
    console.error('[Paddle Webhook] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
    return {
      status: 500,
      body: { success: false, error: 'Server database not configured' },
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

  const eventId = String(event?.event_id || '').trim();
  const eventType = String(event?.event_type || event?.type || '').trim();
  const occurredAt = event?.occurred_at ? String(event.occurred_at) : null;
  const data = event?.data || {};
  const configuredEnv = getPaddleEnvironment();

  if (!eventId || !eventType) {
    return {
      status: 400,
      body: { success: false, error: 'Webhook payload missing event_id or event_type' },
    };
  }

  // Idempotency check
  const alreadyProcessed = await isWebhookEventAlreadyProcessed(eventId);
  if (alreadyProcessed) {
    return {
      status: 200,
      body: {
        success: true,
        received: true,
        verified: true,
        duplicate: true,
        eventId,
        eventType,
      },
    };
  }

  const envMismatchReason = detectPayloadEnvironmentMismatch(event, configuredEnv);
  if (envMismatchReason) {
    await recordWebhookEventLog({
      eventId,
      eventType,
      transactionId: String(data?.transaction_id || data?.id || '').trim() || null,
      environment: configuredEnv,
      occurredAt,
      processingStatus: 'ignored',
      notes: envMismatchReason,
      payload: event,
    });
    return {
      status: 200,
      body: {
        success: true,
        received: true,
        verified: true,
        ignored: true,
        reason: envMismatchReason,
        eventType,
      },
    };
  }

  // 1. Grant Pro ONLY on verified transaction.completed / transaction.paid
  if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
    const transactionId = String(data?.id || '').trim();
    const txStatus = String(data?.status || '').toLowerCase().trim();
    const configuredPriceId = getPaddlePriceId();

    if (!configuredPriceId) {
      console.error('[Paddle Webhook] PADDLE_PRICE_ID / VITE_PADDLE_PRICE_ID is not configured');
      return {
        status: 500,
        body: { success: false, error: 'Server Price ID not configured' },
      };
    }

    if (!transactionId) {
      await recordWebhookEventLog({
        eventId,
        eventType,
        transactionId: null,
        environment: configuredEnv,
        occurredAt,
        processingStatus: 'failed',
        notes: 'Missing transaction id in completed transaction webhook',
        payload: event,
      });
      return {
        status: 400,
        body: { success: false, error: 'Missing transaction id' },
      };
    }

    if (txStatus !== 'completed' && txStatus !== 'paid') {
      await recordWebhookEventLog({
        eventId,
        eventType,
        transactionId,
        environment: configuredEnv,
        occurredAt,
        processingStatus: 'ignored',
        notes: `Unexpected transaction status: ${txStatus || 'empty'}`,
        payload: event,
      });
      return {
        status: 200,
        body: {
          success: true,
          received: true,
          verified: true,
          ignored: true,
          reason: 'transaction_not_completed',
          eventType,
        },
      };
    }

    const { priceIds, productIds } = extractTransactionItemDetails(data);
    if (!priceIds.includes(configuredPriceId)) {
      await recordWebhookEventLog({
        eventId,
        eventType,
        transactionId,
        environment: configuredEnv,
        occurredAt,
        processingStatus: 'ignored',
        notes: `Price ID mismatch. Expected ${configuredPriceId}, got [${priceIds.join(', ')}]`,
        payload: event,
      });
      return {
        status: 200,
        body: {
          success: true,
          received: true,
          verified: true,
          ignored: true,
          reason: 'price_id_mismatch',
          eventType,
        },
      };
    }

    const customData = data?.custom_data || {};
    const rawUserId = String(customData?.userId || customData?.user_id || '').trim();
    const rawEmail = String(
      data?.customer?.email ||
        data?.checkout?.customer_email ||
        customData?.userEmail ||
        customData?.email ||
        ''
    )
      .toLowerCase()
      .trim();

    const verifiedUser = await findVerifiedUserForPaddlePurchase({
      userId: rawUserId,
      email: rawEmail,
    });

    if (!verifiedUser) {
      await recordWebhookEventLog({
        eventId,
        eventType,
        transactionId,
        environment: configuredEnv,
        occurredAt,
        processingStatus: 'failed',
        notes: `No verified Google user found for userId=${rawUserId || 'none'} email=${rawEmail || 'none'}`,
        payload: event,
      });
      return {
        status: 422,
        body: {
          success: false,
          error: 'No verified Google user associated with transaction',
          transactionId,
        },
      };
    }

    const totals = data?.details?.totals || {};
    const grantResult = await recordVerifiedPaddlePurchase({
      transactionId,
      userId: verifiedUser.userId,
      googleSub: verifiedUser.googleSub,
      email: verifiedUser.email,
      customerId: String(data?.customer_id || data?.customer?.id || '').trim() || null,
      priceId: configuredPriceId,
      productId: productIds[0] || null,
      environment: configuredEnv,
      amount: totals?.total !== undefined ? String(totals.total) : null,
      currencyCode: String(data?.currency_code || totals?.currency_code || '').trim() || null,
      eventId,
      occurredAt,
      purchasedAt: String(data?.billed_at || data?.created_at || occurredAt || new Date().toISOString()),
      rawCustomData: customData,
      rawPayload: event,
    });

    await recordWebhookEventLog({
      eventId,
      eventType,
      transactionId,
      environment: configuredEnv,
      occurredAt,
      processingStatus: 'processed',
      notes: grantResult.applied ? 'Granted Christmas Pro entitlement' : grantResult.reason,
      payload: event,
    });

    return {
      status: 200,
      body: {
        success: true,
        received: true,
        verified: true,
        eventId,
        eventType,
        transactionId,
        environment: configuredEnv,
        action: grantResult.applied ? 'granted' : 'ignored',
        reason: grantResult.reason,
      },
    };
  }

  // 2. Handle Refunds, Chargebacks, and Cancellations by transaction_id
  const adjustmentAction = String(data?.action || '').toLowerCase().trim();
  const adjustmentStatus = String(data?.status || '').toLowerCase().trim();

  let revocationStatus: 'refunded' | 'chargeback' | 'canceled' | null = null;
  if (eventType === 'transaction.refunded') {
    revocationStatus = 'refunded';
  } else if (eventType === 'chargeback.created') {
    revocationStatus = 'chargeback';
  } else if (eventType === 'transaction.canceled' || eventType === 'transaction.payment_failed') {
    revocationStatus = 'canceled';
  } else if (
    (eventType === 'adjustment.created' || eventType === 'adjustment.updated') &&
    (adjustmentAction === 'refund' || adjustmentAction === 'chargeback') &&
    (!adjustmentStatus || adjustmentStatus === 'approved')
  ) {
    revocationStatus = adjustmentAction === 'chargeback' ? 'chargeback' : 'refunded';
  }

  if (revocationStatus) {
    const targetTxnId = String(data?.transaction_id || data?.id || '').trim();
    if (!targetTxnId) {
      await recordWebhookEventLog({
        eventId,
        eventType,
        transactionId: null,
        environment: configuredEnv,
        occurredAt,
        processingStatus: 'ignored',
        notes: 'Revocation webhook missing transaction_id',
        payload: event,
      });
      return {
        status: 200,
        body: { success: true, received: true, verified: true, eventType, action: 'ignored' },
      };
    }

    const revResult = await revokePaddlePurchaseByTransaction({
      transactionId: targetTxnId,
      status: revocationStatus,
      reason: `${eventType}${adjustmentAction ? `:${adjustmentAction}` : ''}`,
      eventId,
      occurredAt,
    });

    await recordWebhookEventLog({
      eventId,
      eventType,
      transactionId: targetTxnId,
      environment: configuredEnv,
      occurredAt,
      processingStatus: 'processed',
      notes: revResult.revoked
        ? `Revoked Christmas Pro (${revocationStatus}) for user ${revResult.userId}`
        : `No active purchase found for transaction ${targetTxnId}`,
      payload: event,
    });

    return {
      status: 200,
      body: {
        success: true,
        received: true,
        verified: true,
        eventId,
        eventType,
        transactionId: targetTxnId,
        action: revResult.revoked ? 'revoked' : 'no_matching_purchase',
      },
    };
  }

  // 3. Record other verified Paddle events cleanly for idempotency
  await recordWebhookEventLog({
    eventId,
    eventType,
    transactionId: String(data?.transaction_id || data?.id || '').trim() || null,
    environment: configuredEnv,
    occurredAt,
    processingStatus: 'ignored',
    notes: 'Unhandled Paddle event type',
    payload: event,
  });

  return {
    status: 200,
    body: { success: true, received: true, verified: true, eventId, eventType, action: 'ignored' },
  };
}
