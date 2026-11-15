import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getPaddleEnvironment, PaddleEnvironment } from './paddleConfig.js';
import {
  FREE_DAILY_GIFT_LIMIT,
  getUtcTodayDateString,
  SanitizedWorldSaveInput,
  STARTER_FREE_ASSET_IDS,
  StoredWorldRecord,
} from './worldValidation.js';

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
  provider: 'google';
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
  if (!userRow || userRow.provider !== 'google') return null;

  const isPro = await checkUserProInSupabase(userRow.user_id, env);

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

export interface DailyRewardRowRecord {
  id: string;
  reward_date: string;
  date: string;
  asset_id: string;
  assetId: string;
  world_id: string | null;
  claimed_at: string;
  claimedAt: string;
}

export interface DailyRewardsStateResult {
  rewards: DailyRewardRowRecord[];
  todayDate: string;
  todayCount: number;
  dailyLimit: number;
  remainingToday: number | null;
  isPro: boolean;
  unlockedAssetIds: string[];
}

export async function getUserDailyRewardsFromSupabase(
  userId: string,
  env: PaddleEnvironment = getPaddleEnvironment()
): Promise<DailyRewardsStateResult> {
  const client = requireSupabaseAdmin();
  await ensureBillingEnvironmentSynced(client, env);

  const [{ data: rows, error }, isPro] = await Promise.all([
    client
      .from('user_daily_rewards')
      .select('id, reward_date, asset_id, world_id, claimed_at')
      .eq('user_id', userId)
      .order('claimed_at', { ascending: true }),
    checkUserProInSupabase(userId, env),
  ]);

  if (error) {
    throw new Error(`Failed loading daily rewards: ${error.message}`);
  }

  const todayDate = getUtcTodayDateString();
  const normalizedRows: DailyRewardRowRecord[] = (Array.isArray(rows) ? rows : []).map((row: any) => ({
    id: String(row.id),
    reward_date: String(row.reward_date),
    date: String(row.reward_date),
    asset_id: String(row.asset_id),
    assetId: String(row.asset_id),
    world_id: row.world_id ? String(row.world_id) : null,
    claimed_at: String(row.claimed_at),
    claimedAt: String(row.claimed_at),
  }));

  const todayCount = normalizedRows.filter((r) => r.reward_date === todayDate).length;
  const unlockedAssetIds = Array.from(
    new Set(
      normalizedRows
        .map((r) => r.asset_id)
        .filter((id) => Boolean(id) && !id.startsWith('pro_'))
    )
  );

  return {
    rewards: normalizedRows,
    todayDate,
    todayCount,
    dailyLimit: FREE_DAILY_GIFT_LIMIT,
    remainingToday: isPro ? null : Math.max(0, FREE_DAILY_GIFT_LIMIT - todayCount),
    isPro,
    unlockedAssetIds,
  };
}

export interface ClaimDailyRewardRpcResult {
  claimed: boolean;
  alreadyClaimedToday: boolean;
  reason: string;
  rewardDate: string;
  todayCount: number;
  dailyLimit: number;
  remainingToday: number | null;
  isPro: boolean;
  worldRevision: number | null;
  unlockedAssetIds: string[];
}

export async function claimUserDailyRewardInSupabase(
  userId: string,
  assetId: string,
  worldId?: string | null,
  env: PaddleEnvironment = getPaddleEnvironment()
): Promise<ClaimDailyRewardRpcResult> {
  const client = requireSupabaseAdmin();
  await ensureBillingEnvironmentSynced(client, env);

  const { data, error } = await client.rpc('mcw_claim_daily_reward', {
    p_user_id: userId,
    p_asset_id: assetId,
    p_world_id: worldId || null,
  });

  if (error) {
    throw new Error(`Failed claiming daily reward: ${error.message}`);
  }

  const row: any = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('Empty response from mcw_claim_daily_reward RPC.');
  }

  const rawUnlocked = Array.isArray(row.unlocked_asset_ids) ? row.unlocked_asset_ids : [];
  const unlockedAssetIds = Array.from(
    new Set([
      ...STARTER_FREE_ASSET_IDS,
      ...rawUnlocked.filter((id: unknown): id is string => typeof id === 'string' && !id.startsWith('pro_')),
    ])
  );

  return {
    claimed: Boolean(row.claimed),
    alreadyClaimedToday: Boolean(row.already_claimed_today),
    reason: String(row.reason || ''),
    rewardDate: String(row.reward_date || getUtcTodayDateString()),
    todayCount: Number(row.today_count ?? 0),
    dailyLimit: Number(row.daily_limit ?? FREE_DAILY_GIFT_LIMIT),
    remainingToday:
      row.remaining_today === null || row.remaining_today === undefined
        ? null
        : Number(row.remaining_today),
    isPro: Boolean(row.is_pro),
    worldRevision:
      row.world_revision === null || row.world_revision === undefined
        ? null
        : Number(row.world_revision),
    unlockedAssetIds,
  };
}

function mapWorldRowToRecord(
  row: any,
  rewardUnlockedIds: string[] = []
): StoredWorldRecord {
  const existingUnlocked = Array.isArray(row.unlocked_asset_ids)
    ? row.unlocked_asset_ids.filter(
        (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0 && !id.startsWith('pro_')
      )
    : [];

  const unlockedAssetIds = Array.from(
    new Set([...STARTER_FREE_ASSET_IDS, ...existingUnlocked, ...rewardUnlockedIds])
  );

  return {
    id: String(row.world_id || `world_${row.user_id}`),
    ownerUserId: String(row.user_id),
    name: String(row.name || 'My Christmas World'),
    landscapeType: row.landscape_type || 'village',
    placedObjects: Array.isArray(row.placed_objects) ? row.placed_objects : [],
    landscapeDecorations:
      row.landscape_decorations && typeof row.landscape_decorations === 'object'
        ? row.landscape_decorations
        : {
            village: [],
            mountain: [],
            river: [],
            city: [],
            wonderworld: [],
          },
    unlockedAssetIds,
    cameraState: row.camera_state || null,
    settings: row.settings || {
      timeOfDay: 'night',
      snowfallDensity: 'moderate',
      soundEnabled: true,
      bloomEnabled: true,
    },
    version: Number(row.schema_version || 1),
    revision: Number(row.revision || 1),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

export async function getUserWorldFromSupabase(userId: string): Promise<StoredWorldRecord | null> {
  const client = requireSupabaseAdmin();
  const [{ data: row, error }, { data: rewardRows, error: rewardErr }] = await Promise.all([
    client
      .from('user_worlds')
      .select(
        'user_id, world_id, name, landscape_type, placed_objects, landscape_decorations, unlocked_asset_ids, camera_state, settings, schema_version, revision, created_at, updated_at'
      )
      .eq('user_id', userId)
      .maybeSingle(),
    client.from('user_daily_rewards').select('asset_id').eq('user_id', userId),
  ]);

  if (error) {
    throw new Error(`Failed loading user world: ${error.message}`);
  }
  if (rewardErr) {
    throw new Error(`Failed loading reward unlocks: ${rewardErr.message}`);
  }
  if (!row) {
    return null;
  }

  const rewardUnlocked = (Array.isArray(rewardRows) ? rewardRows : [])
    .map((r: any) => String(r.asset_id || ''))
    .filter((id) => Boolean(id) && !id.startsWith('pro_'));

  return mapWorldRowToRecord(row, rewardUnlocked);
}

export interface SaveWorldRpcResult {
  applied: boolean;
  conflict: boolean;
  revision: number;
  updatedAt: string | null;
  unlockedAssetIds: string[];
  serverWorld: StoredWorldRecord | null;
}

export async function saveUserWorldInSupabase(
  userId: string,
  input: SanitizedWorldSaveInput
): Promise<SaveWorldRpcResult> {
  const client = requireSupabaseAdmin();

  const { data, error } = await client.rpc('mcw_save_user_world', {
    p_user_id: userId,
    p_world_id: input.worldId,
    p_name: input.name,
    p_landscape_type: input.landscapeType,
    p_placed_objects: input.placedObjects,
    p_landscape_decorations: input.landscapeDecorations,
    p_camera_state: input.cameraState,
    p_settings: input.settings,
    p_schema_version: input.schemaVersion,
    p_expected_revision: input.expectedRevision,
    p_client_updated_at: input.clientUpdatedAt,
  });

  if (error) {
    throw new Error(`Failed saving world to Supabase: ${error.message}`);
  }

  const row: any = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('Empty response from mcw_save_user_world RPC.');
  }

  const rawUnlocked = Array.isArray(row.unlocked_asset_ids) ? row.unlocked_asset_ids : [];
  const unlockedAssetIds = Array.from(
    new Set([
      ...STARTER_FREE_ASSET_IDS,
      ...rawUnlocked.filter((id: unknown): id is string => typeof id === 'string' && !id.startsWith('pro_')),
    ])
  );

  let serverWorld: StoredWorldRecord | null = null;
  if (row.server_world && typeof row.server_world === 'object') {
    const sw = row.server_world;
    const swUnlocked = Array.isArray(sw.unlockedAssetIds) ? sw.unlockedAssetIds : [];
    serverWorld = {
      id: String(sw.id || `world_${userId}`),
      ownerUserId: String(sw.ownerUserId || userId),
      name: String(sw.name || 'My Christmas World'),
      landscapeType: sw.landscapeType || 'village',
      placedObjects: Array.isArray(sw.placedObjects) ? sw.placedObjects : [],
      landscapeDecorations: sw.landscapeDecorations || {
        village: [],
        mountain: [],
        river: [],
        city: [],
        wonderworld: [],
      },
      unlockedAssetIds: Array.from(
        new Set([
          ...STARTER_FREE_ASSET_IDS,
          ...swUnlocked.filter((id: unknown): id is string => typeof id === 'string' && !id.startsWith('pro_')),
        ])
      ),
      cameraState: sw.cameraState || null,
      settings: sw.settings || {
        timeOfDay: 'night',
        snowfallDensity: 'moderate',
        soundEnabled: true,
        bloomEnabled: true,
      },
      version: Number(sw.version || 1),
      revision: Number(sw.revision || 1),
      createdAt: String(sw.createdAt || new Date().toISOString()),
      updatedAt: String(sw.updatedAt || new Date().toISOString()),
    };
  }

  return {
    applied: Boolean(row.applied),
    conflict: Boolean(row.conflict),
    revision: Number(row.revision ?? 0),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    unlockedAssetIds,
    serverWorld,
  };
}
