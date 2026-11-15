import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPaddleEnvironment, PaddleEnvironment } from './paddleConfig.js';

let cachedAdminClient: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
}

function getSupabaseServiceRoleKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

export function isSupabaseAdminConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  return Boolean(
    url &&
      key &&
      !url.includes('your-project') &&
      key !== 'your-service-role-key'
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) return null;
  if (!cachedAdminClient) {
    cachedAdminClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return cachedAdminClient;
}

export function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      'Supabase server storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return client;
}

export interface VerifiedUserRecord {
  id: string;
  googleSub: string | null;
  email: string;
  emailVerified: boolean;
  nickname: string;
  avatar: string;
  provider: 'google' | 'local';
  isPro: boolean;
  createdAt: string;
}

export async function ensureBillingEnvironmentSynced(
  client: SupabaseClient,
  env: PaddleEnvironment = getPaddleEnvironment()
): Promise<void> {
  const { data } = await client
    .from('app_billing_config')
    .select('active_paddle_environment')
    .eq('id', true)
    .maybeSingle();

  if (!data) {
    await client
      .from('app_billing_config')
      .upsert({ id: true, active_paddle_environment: env }, { onConflict: 'id' });
    return;
  }

  if (data.active_paddle_environment !== env) {
    await client
      .from('app_billing_config')
      .update({ active_paddle_environment: env })
      .eq('id', true);
  }
}

export async function checkUserProInSupabase(
  userId: string,
  env: PaddleEnvironment = getPaddleEnvironment()
): Promise<boolean> {
  if (!userId || userId.startsWith('guest')) {
    return false;
  }

  const client = requireSupabaseAdmin();
  const { data, error } = await client
    .from('paddle_purchases')
    .select('transaction_id')
    .eq('user_id', userId)
    .eq('environment', env)
    .eq('status', 'active')
    .limit(1);

  if (error) {
    throw new Error(`Failed to verify Pro entitlement: ${error.message}`);
  }

  return Array.isArray(data) && data.length > 0;
}

export async function upsertVerifiedGoogleUserInSupabase(input: {
  userId: string;
  googleSub: string;
  email: string;
  emailVerified: boolean;
  nickname: string;
  avatarUrl: string;
}): Promise<VerifiedUserRecord> {
  const client = requireSupabaseAdmin();
  const env = getPaddleEnvironment();
  await ensureBillingEnvironmentSynced(client, env);

  const now = new Date().toISOString();
  const { error: upsertErr } = await client
    .from('app_users')
    .upsert(
      {
        user_id: input.userId,
        google_sub: input.googleSub,
        email: input.email.toLowerCase().trim(),
        email_verified: input.emailVerified,
        nickname: input.nickname,
        avatar_url: input.avatarUrl,
        provider: 'google',
        last_login_at: now,
      },
      { onConflict: 'user_id' }
    );

  if (upsertErr) {
    throw new Error(`Failed to persist Google user: ${upsertErr.message}`);
  }

  const { data: userRow, error: readErr } = await client
    .from('app_users')
    .select('user_id, google_sub, email, email_verified, nickname, avatar_url, provider, created_at')
    .eq('user_id', input.userId)
    .single();

  if (readErr || !userRow) {
    throw new Error(`Failed to load persisted user: ${readErr?.message || 'not found'}`);
  }

  const isPro = await checkUserProInSupabase(input.userId, env);

  return {
    id: userRow.user_id,
    googleSub: userRow.google_sub,
    email: userRow.email,
    emailVerified: Boolean(userRow.email_verified),
    nickname: userRow.nickname || userRow.email.split('@')[0],
    avatar: userRow.avatar_url || '',
    provider: 'google',
    isPro,
    createdAt: userRow.created_at,
  };
}

export async function getVerifiedUserFromSupabase(
  userId: string
): Promise<VerifiedUserRecord | null> {
  if (!userId) return null;
  const client = requireSupabaseAdmin();
  const env = getPaddleEnvironment();

  const { data: userRow, error } = await client
    .from('app_users')
    .select('user_id, google_sub, email, email_verified, nickname, avatar_url, provider, created_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
  if (!userRow) return null;

  const isPro = await checkUserProInSupabase(userRow.user_id, env);

  return {
    id: userRow.user_id,
    googleSub: userRow.google_sub,
    email: userRow.email,
    emailVerified: Boolean(userRow.email_verified),
    nickname: userRow.nickname || userRow.email.split('@')[0],
    avatar: userRow.avatar_url || '',
    provider: userRow.provider === 'google' ? 'google' : 'local',
    isPro,
    createdAt: userRow.created_at,
  };
}

export async function findVerifiedUserForPaddlePurchase(params: {
  userId?: string;
  email?: string;
}): Promise<{ userId: string; googleSub: string | null; email: string } | null> {
  const client = requireSupabaseAdmin();
  const cleanUserId = (params.userId || '').trim();
  const cleanEmail = (params.email || '').toLowerCase().trim();

  if (cleanUserId && !cleanUserId.startsWith('guest')) {
    const { data, error } = await client
      .from('app_users')
      .select('user_id, google_sub, email, provider')
      .eq('user_id', cleanUserId)
      .maybeSingle();

    if (error) {
      throw new Error(`User lookup failed: ${error.message}`);
    }
    if (data && data.provider === 'google') {
      return {
        userId: data.user_id,
        googleSub: data.google_sub,
        email: data.email,
      };
    }
  }

  // Only fall back to email if there is an unambiguous verified Google user with that email
  if (cleanEmail) {
    const { data, error } = await client
      .from('app_users')
      .select('user_id, google_sub, email')
      .ilike('email', cleanEmail)
      .eq('provider', 'google')
      .eq('email_verified', true);

    if (error) {
      throw new Error(`User email lookup failed: ${error.message}`);
    }
    if (Array.isArray(data) && data.length === 1) {
      return {
        userId: data[0].user_id,
        googleSub: data[0].google_sub,
        email: data[0].email,
      };
    }
  }

  return null;
}

export async function isWebhookEventAlreadyProcessed(eventId: string): Promise<boolean> {
  if (!eventId) return false;
  const client = requireSupabaseAdmin();
  const { data, error } = await client
    .from('paddle_webhook_events')
    .select('event_id, processing_status')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed checking webhook idempotency: ${error.message}`);
  }

  return Boolean(data && (data.processing_status === 'processed' || data.processing_status === 'ignored'));
}

export async function recordWebhookEventLog(input: {
  eventId: string;
  eventType: string;
  transactionId?: string | null;
  environment: PaddleEnvironment;
  occurredAt?: string | null;
  processingStatus: 'processed' | 'ignored' | 'failed';
  notes?: string;
  payload: Record<string, any>;
}): Promise<void> {
  const client = requireSupabaseAdmin();
  const { error } = await client
    .from('paddle_webhook_events')
    .upsert(
      {
        event_id: input.eventId,
        event_type: input.eventType,
        transaction_id: input.transactionId || null,
        environment: input.environment,
        occurred_at: input.occurredAt || null,
        processing_status: input.processingStatus,
        notes: input.notes || null,
        payload: input.payload,
      },
      { onConflict: 'event_id' }
    );

  if (error) {
    throw new Error(`Failed recording webhook event: ${error.message}`);
  }
}

export async function recordVerifiedPaddlePurchase(input: {
  transactionId: string;
  userId: string;
  googleSub: string | null;
  email: string;
  customerId?: string | null;
  priceId: string;
  productId?: string | null;
  environment: PaddleEnvironment;
  amount?: string | null;
  currencyCode?: string | null;
  eventId?: string | null;
  occurredAt?: string | null;
  purchasedAt?: string | null;
  rawCustomData?: Record<string, any>;
  rawPayload?: Record<string, any>;
}): Promise<{ applied: boolean; reason?: string }> {
  const client = requireSupabaseAdmin();
  await ensureBillingEnvironmentSynced(client, input.environment);

  const { data: existing, error: fetchErr } = await client
    .from('paddle_purchases')
    .select('transaction_id, status, last_event_occurred_at')
    .eq('transaction_id', input.transactionId)
    .maybeSingle();

  if (fetchErr) {
    throw new Error(`Failed loading existing purchase: ${fetchErr.message}`);
  }

  if (existing) {
    // Never let an older out-of-order retry re-activate a refunded/chargeback transaction
    if (
      existing.status === 'refunded' ||
      existing.status === 'chargeback' ||
      existing.status === 'canceled'
    ) {
      return { applied: false, reason: `Transaction already ${existing.status}` };
    }
    if (
      existing.last_event_occurred_at &&
      input.occurredAt &&
      new Date(input.occurredAt).getTime() < new Date(existing.last_event_occurred_at).getTime()
    ) {
      return { applied: false, reason: 'Stale out-of-order event' };
    }
  }

  const { error: upsertErr } = await client.from('paddle_purchases').upsert(
    {
      transaction_id: input.transactionId,
      user_id: input.userId,
      google_sub: input.googleSub,
      email: input.email.toLowerCase().trim(),
      customer_id: input.customerId || null,
      price_id: input.priceId,
      product_id: input.productId || null,
      environment: input.environment,
      status: 'active',
      amount: input.amount || null,
      currency_code: input.currencyCode || null,
      last_event_id: input.eventId || null,
      last_event_occurred_at: input.occurredAt || new Date().toISOString(),
      purchased_at: input.purchasedAt || new Date().toISOString(),
      revoked_at: null,
      revocation_reason: null,
      raw_custom_data: input.rawCustomData || {},
      raw_payload: input.rawPayload || {},
    },
    { onConflict: 'transaction_id' }
  );

  if (upsertErr) {
    throw new Error(`Failed storing verified purchase: ${upsertErr.message}`);
  }

  return { applied: true };
}

export async function revokePaddlePurchaseByTransaction(input: {
  transactionId: string;
  status: 'refunded' | 'chargeback' | 'canceled';
  reason: string;
  eventId?: string | null;
  occurredAt?: string | null;
}): Promise<{ revoked: boolean; userId?: string | null }> {
  const client = requireSupabaseAdmin();

  const { data: existing, error: fetchErr } = await client
    .from('paddle_purchases')
    .select('transaction_id, user_id, status, last_event_occurred_at')
    .eq('transaction_id', input.transactionId)
    .maybeSingle();

  if (fetchErr) {
    throw new Error(`Failed loading purchase for revocation: ${fetchErr.message}`);
  }

  if (!existing) {
    return { revoked: false, userId: null };
  }

  if (
    existing.last_event_occurred_at &&
    input.occurredAt &&
    new Date(input.occurredAt).getTime() < new Date(existing.last_event_occurred_at).getTime()
  ) {
    return { revoked: false, userId: existing.user_id };
  }

  const { error: updateErr } = await client
    .from('paddle_purchases')
    .update({
      status: input.status,
      revoked_at: new Date().toISOString(),
      revocation_reason: input.reason,
      last_event_id: input.eventId || null,
      last_event_occurred_at: input.occurredAt || new Date().toISOString(),
    })
    .eq('transaction_id', input.transactionId);

  if (updateErr) {
    throw new Error(`Failed revoking purchase: ${updateErr.message}`);
  }

  return { revoked: true, userId: existing.user_id };
}
