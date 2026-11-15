-- Supabase Database Schema Migration for My Christmas World
-- 03_user_worlds_and_gifts.sql
--
-- Purpose:
--   Persistent storage for authenticated Google users' 3D Christmas worlds,
--   independent per-landscape decorations, unlocked Secret Gifts, and daily gift claims.
--
-- Non-Destructive Guarantee:
--   - Uses CREATE TABLE IF NOT EXISTS and does NOT modify or drop existing
--     01_init.sql or 02_paddle_pro.sql tables, Paddle purchases, or Pro entitlements.
--   - Preserves existing asset IDs, landscape IDs, object transforms, and World format.
--
-- Daily Reset Timezone Specification:
--   - Authoritative daily reset timezone is UTC (00:00:00 UTC), computed server-side
--     as (pg_catalog.now() AT TIME ZONE 'UTC')::DATE.
--   - Matches frontend `getTodayDateString()` (`new Date().toISOString().split('T')[0]`).

-- 1. Persistent User Worlds Table (One authoritative cloud world per verified Google user)
CREATE TABLE IF NOT EXISTS public.user_worlds (
  user_id TEXT PRIMARY KEY REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  world_id TEXT NOT NULL CHECK (pg_catalog.char_length(pg_catalog.btrim(world_id)) > 0),
  name TEXT NOT NULL DEFAULT 'My Christmas World',
  landscape_type TEXT NOT NULL DEFAULT 'village'
    CHECK (landscape_type IN ('village', 'mountain', 'river', 'city', 'wonderworld')),
  placed_objects JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (pg_catalog.jsonb_typeof(placed_objects) = 'array'),
  landscape_decorations JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (pg_catalog.jsonb_typeof(landscape_decorations) = 'object'),
  unlocked_asset_ids JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (pg_catalog.jsonb_typeof(unlocked_asset_ids) = 'array'),
  camera_state JSONB
    CHECK (camera_state IS NULL OR pg_catalog.jsonb_typeof(camera_state) = 'object'),
  settings JSONB NOT NULL DEFAULT '{"timeOfDay":"night","snowfallDensity":"moderate","soundEnabled":true,"bloomEnabled":true}'::jsonb
    CHECK (pg_catalog.jsonb_typeof(settings) = 'object'),
  schema_version INTEGER NOT NULL DEFAULT 1
    CHECK (schema_version >= 1),
  revision BIGINT NOT NULL DEFAULT 1
    CHECK (revision >= 1),
  client_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_worlds_updated_at
  ON public.user_worlds (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_worlds_landscape_type
  ON public.user_worlds (landscape_type);

-- 2. Persistent Daily Gift Claims Table
--    Allows up to 3 claims per UTC day for free accounts and unlimited claims for active Pro users.
--    Unique constraint prevents duplicate claims of the same gift asset on the same UTC date.
CREATE TABLE IF NOT EXISTS public.user_daily_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.app_users(user_id) ON DELETE CASCADE,
  reward_date DATE NOT NULL,
  asset_id TEXT NOT NULL CHECK (pg_catalog.char_length(pg_catalog.btrim(asset_id)) > 0),
  world_id TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_daily_rewards_user_date_asset UNIQUE (user_id, reward_date, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_rewards_user_date
  ON public.user_daily_rewards (user_id, reward_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_daily_rewards_user_claimed_at
  ON public.user_daily_rewards (user_id, claimed_at DESC);

-- 3. Dedicated Automatic updated_at Trigger for user_worlds
--    Uses its own trigger function name so existing 02_paddle_pro.sql functions
--    (such as public.mcw_set_updated_at()) and their permissions remain untouched.
CREATE OR REPLACE FUNCTION public.mcw_user_worlds_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_worlds_updated_at ON public.user_worlds;
CREATE TRIGGER trg_user_worlds_updated_at
  BEFORE UPDATE ON public.user_worlds
  FOR EACH ROW
  EXECUTE FUNCTION public.mcw_user_worlds_set_updated_at();

-- 4. Atomic Server-Side Daily Gift Claim Function
--    - Acquires row locks in fixed order: app_users -> user_worlds (prevents deadlocks).
--    - Computes authoritative UTC calendar day (00:00:00 UTC reset) and active Pro status.
--    - Enforces a fixed Free daily gift limit of 3 per UTC day (no client override parameter).
--    - Rejects malformed or premium (pro_*) asset IDs at the database layer; backend API MUST
--      additionally validate asset_id against the canonical Secret Gift ASSET_CATALOG.
--    - Synchronizes user_worlds.unlocked_asset_ids AND increments user_worlds.revision
--      whenever user_worlds is modified, returning updated world_revision & unlocked_asset_ids.
DROP FUNCTION IF EXISTS public.mcw_claim_daily_reward(TEXT, TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.mcw_claim_daily_reward(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.mcw_claim_daily_reward(
  p_user_id TEXT,
  p_asset_id TEXT,
  p_world_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  claimed BOOLEAN,
  already_claimed_today BOOLEAN,
  reason TEXT,
  reward_date DATE,
  today_count INTEGER,
  daily_limit INTEGER,
  remaining_today INTEGER,
  is_pro BOOLEAN,
  world_revision BIGINT,
  unlocked_asset_ids JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_free_daily_limit CONSTANT INTEGER := 3;
  v_user_id TEXT;
  v_asset_id TEXT;
  v_reward_date DATE;
  v_active_env TEXT;
  v_is_pro BOOLEAN := FALSE;
  v_today_count INTEGER := 0;
  v_already_exists BOOLEAN := FALSE;
  v_has_world BOOLEAN := FALSE;
  v_world_revision BIGINT := NULL;
  v_world_unlocked_ids JSONB := NULL;
  v_effective_unlocked_ids JSONB := '[]'::jsonb;
BEGIN
  v_user_id := NULLIF(pg_catalog.btrim(p_user_id), '');
  v_asset_id := NULLIF(pg_catalog.btrim(p_asset_id), '');

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Verified user_id is required to claim a daily reward';
  END IF;

  IF v_asset_id IS NULL THEN
    RAISE EXCEPTION 'asset_id is required to claim a daily reward';
  END IF;

  IF v_asset_id !~ '^[a-z0-9_]{1,64}$' THEN
    RAISE EXCEPTION 'Invalid reward asset_id format: %', v_asset_id;
  END IF;

  IF v_asset_id LIKE 'pro\_%' ESCAPE '\' THEN
    RAISE EXCEPTION 'Premium assets cannot be claimed as daily rewards: %', v_asset_id;
  END IF;

  -- Authoritative UTC calendar day (daily reset at 00:00:00 UTC)
  v_reward_date := (pg_catalog.now() AT TIME ZONE 'UTC')::DATE;

  -- Serialize concurrent operations per user (lock order: app_users -> user_worlds)
  PERFORM 1
  FROM public.app_users AS u
  WHERE u.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % does not exist in app_users', v_user_id;
  END IF;

  SELECT w.revision, w.unlocked_asset_ids
  INTO v_world_revision, v_world_unlocked_ids
  FROM public.user_worlds AS w
  WHERE w.user_id = v_user_id
  FOR UPDATE;

  v_has_world := FOUND;

  -- Compute authoritative Pro entitlement for the active Paddle environment
  SELECT cfg.active_paddle_environment
  INTO v_active_env
  FROM public.app_billing_config AS cfg
  WHERE cfg.id = TRUE;

  IF v_active_env IS NULL THEN
    v_active_env := 'production';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.paddle_purchases AS p
    WHERE p.user_id = v_user_id
      AND p.environment = v_active_env
      AND p.status = 'active'
  ) INTO v_is_pro;

  -- Check if this exact asset was already claimed by this user on the current UTC date
  SELECT EXISTS (
    SELECT 1
    FROM public.user_daily_rewards AS r
    WHERE r.user_id = v_user_id
      AND r.reward_date = v_reward_date
      AND r.asset_id = v_asset_id
  ) INTO v_already_exists;

  SELECT COUNT(*)::INTEGER
  INTO v_today_count
  FROM public.user_daily_rewards AS r
  WHERE r.user_id = v_user_id
    AND r.reward_date = v_reward_date;

  IF v_already_exists THEN
    -- Self-heal unlocked_asset_ids on existing world row if missing, bumping revision atomically
    IF v_has_world AND NOT (COALESCE(v_world_unlocked_ids, '[]'::jsonb) @> pg_catalog.jsonb_build_array(v_asset_id)) THEN
      UPDATE public.user_worlds AS w
      SET
        unlocked_asset_ids = COALESCE(w.unlocked_asset_ids, '[]'::jsonb) || pg_catalog.jsonb_build_array(v_asset_id),
        revision = w.revision + 1
      WHERE w.user_id = v_user_id
      RETURNING w.revision, w.unlocked_asset_ids
      INTO v_world_revision, v_world_unlocked_ids;
    END IF;

    IF v_has_world THEN
      v_effective_unlocked_ids := COALESCE(v_world_unlocked_ids, '[]'::jsonb);
    ELSE
      SELECT COALESCE(
        pg_catalog.jsonb_agg(sub.asset_id ORDER BY sub.first_claimed_at ASC, sub.asset_id ASC),
        '[]'::jsonb
      )
      INTO v_effective_unlocked_ids
      FROM (
        SELECT r.asset_id, MIN(r.claimed_at) AS first_claimed_at
        FROM public.user_daily_rewards AS r
        WHERE r.user_id = v_user_id
        GROUP BY r.asset_id
      ) AS sub;
    END IF;

    RETURN QUERY SELECT
      FALSE,
      TRUE,
      'already_claimed_asset_today'::TEXT,
      v_reward_date,
      v_today_count,
      v_free_daily_limit,
      CASE WHEN v_is_pro THEN NULL::INTEGER ELSE GREATEST(0, v_free_daily_limit - v_today_count) END,
      v_is_pro,
      v_world_revision,
      v_effective_unlocked_ids;
    RETURN;
  END IF;

  -- Enforce fixed daily free allowance (3 per UTC day) atomically
  IF NOT v_is_pro AND v_today_count >= v_free_daily_limit THEN
    IF v_has_world THEN
      v_effective_unlocked_ids := COALESCE(v_world_unlocked_ids, '[]'::jsonb);
    ELSE
      SELECT COALESCE(
        pg_catalog.jsonb_agg(sub.asset_id ORDER BY sub.first_claimed_at ASC, sub.asset_id ASC),
        '[]'::jsonb
      )
      INTO v_effective_unlocked_ids
      FROM (
        SELECT r.asset_id, MIN(r.claimed_at) AS first_claimed_at
        FROM public.user_daily_rewards AS r
        WHERE r.user_id = v_user_id
        GROUP BY r.asset_id
      ) AS sub;
    END IF;

    RETURN QUERY SELECT
      FALSE,
      FALSE,
      'daily_limit_reached'::TEXT,
      v_reward_date,
      v_today_count,
      v_free_daily_limit,
      0,
      FALSE,
      v_world_revision,
      v_effective_unlocked_ids;
    RETURN;
  END IF;

  INSERT INTO public.user_daily_rewards (
    user_id,
    reward_date,
    asset_id,
    world_id,
    claimed_at
  )
  VALUES (
    v_user_id,
    v_reward_date,
    v_asset_id,
    NULLIF(pg_catalog.btrim(COALESCE(p_world_id, '')), ''),
    pg_catalog.now()
  );

  v_today_count := v_today_count + 1;

  -- Keep user_worlds.unlocked_asset_ids synchronized and increment revision when mutated
  IF v_has_world THEN
    IF NOT (COALESCE(v_world_unlocked_ids, '[]'::jsonb) @> pg_catalog.jsonb_build_array(v_asset_id)) THEN
      UPDATE public.user_worlds AS w
      SET
        unlocked_asset_ids = COALESCE(w.unlocked_asset_ids, '[]'::jsonb) || pg_catalog.jsonb_build_array(v_asset_id),
        revision = w.revision + 1
      WHERE w.user_id = v_user_id
      RETURNING w.revision, w.unlocked_asset_ids
      INTO v_world_revision, v_world_unlocked_ids;
    END IF;
    v_effective_unlocked_ids := COALESCE(v_world_unlocked_ids, '[]'::jsonb);
  ELSE
    SELECT COALESCE(
      pg_catalog.jsonb_agg(sub.asset_id ORDER BY sub.first_claimed_at ASC, sub.asset_id ASC),
      '[]'::jsonb
    )
    INTO v_effective_unlocked_ids
    FROM (
      SELECT r.asset_id, MIN(r.claimed_at) AS first_claimed_at
      FROM public.user_daily_rewards AS r
      WHERE r.user_id = v_user_id
      GROUP BY r.asset_id
    ) AS sub;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    FALSE,
    'claimed'::TEXT,
    v_reward_date,
    v_today_count,
    v_free_daily_limit,
    CASE WHEN v_is_pro THEN NULL::INTEGER ELSE GREATEST(0, v_free_daily_limit - v_today_count) END,
    v_is_pro,
    v_world_revision,
    v_effective_unlocked_ids;
END;
$$;

-- 5. Optimistic Concurrency-Safe World Save Function
--    - Lock order: app_users -> user_worlds (matches mcw_claim_daily_reward).
--    - When no row exists yet: requires p_expected_revision IS NULL or 0; inserts revision = 1.
--    - When a row exists: requires p_expected_revision = current revision; otherwise returns
--      applied = FALSE, conflict = TRUE along with the authoritative current row state.
--    - Does NOT accept or trust client-provided unlocked_asset_ids.
--      unlocked_asset_ids is derived strictly from starter free assets, existing server
--      user_worlds.unlocked_asset_ids (non-destructive preservation), and server-confirmed
--      claims in public.user_daily_rewards (excluding any pro_* entries).
DROP FUNCTION IF EXISTS public.mcw_save_user_world(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, JSONB, INTEGER, BIGINT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.mcw_save_user_world(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, INTEGER, BIGINT, TIMESTAMPTZ);
CREATE OR REPLACE FUNCTION public.mcw_save_user_world(
  p_user_id TEXT,
  p_world_id TEXT,
  p_name TEXT,
  p_landscape_type TEXT,
  p_placed_objects JSONB,
  p_landscape_decorations JSONB,
  p_camera_state JSONB DEFAULT NULL,
  p_settings JSONB DEFAULT '{"timeOfDay":"night","snowfallDensity":"moderate","soundEnabled":true,"bloomEnabled":true}'::jsonb,
  p_schema_version INTEGER DEFAULT 1,
  p_expected_revision BIGINT DEFAULT NULL,
  p_client_updated_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  applied BOOLEAN,
  conflict BOOLEAN,
  revision BIGINT,
  updated_at TIMESTAMPTZ,
  unlocked_asset_ids JSONB,
  server_world JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT;
  v_existing public.user_worlds%ROWTYPE;
  v_has_existing BOOLEAN := FALSE;
  v_new_revision BIGINT;
  v_new_updated_at TIMESTAMPTZ;
  v_world_id TEXT;
  v_name TEXT;
  v_landscape_type TEXT;
  v_placed_objects JSONB;
  v_landscape_decorations JSONB;
  v_merged_unlocked_ids JSONB;
  v_settings JSONB;
  v_schema_version INTEGER;
BEGIN
  v_user_id := NULLIF(pg_catalog.btrim(p_user_id), '');
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Verified user_id is required to save world';
  END IF;

  IF p_placed_objects IS NOT NULL AND pg_catalog.jsonb_typeof(p_placed_objects) <> 'array' THEN
    RAISE EXCEPTION 'placed_objects must be a JSON array';
  END IF;
  IF p_landscape_decorations IS NOT NULL AND pg_catalog.jsonb_typeof(p_landscape_decorations) <> 'object' THEN
    RAISE EXCEPTION 'landscape_decorations must be a JSON object';
  END IF;
  IF p_camera_state IS NOT NULL AND pg_catalog.jsonb_typeof(p_camera_state) <> 'object' THEN
    RAISE EXCEPTION 'camera_state must be a JSON object or NULL';
  END IF;
  IF p_settings IS NOT NULL AND pg_catalog.jsonb_typeof(p_settings) <> 'object' THEN
    RAISE EXCEPTION 'settings must be a JSON object';
  END IF;

  v_world_id := COALESCE(NULLIF(pg_catalog.btrim(p_world_id), ''), 'world_' || v_user_id);
  v_name := COALESCE(NULLIF(pg_catalog.btrim(p_name), ''), 'My Christmas World');
  v_landscape_type := COALESCE(NULLIF(pg_catalog.btrim(p_landscape_type), ''), 'village');

  IF v_landscape_type NOT IN ('village', 'mountain', 'river', 'city', 'wonderworld') THEN
    RAISE EXCEPTION 'Invalid landscape_type: %', v_landscape_type;
  END IF;

  v_placed_objects := COALESCE(p_placed_objects, '[]'::jsonb);
  v_landscape_decorations := COALESCE(p_landscape_decorations, '{}'::jsonb);
  v_settings := COALESCE(
    p_settings,
    '{"timeOfDay":"night","snowfallDensity":"moderate","soundEnabled":true,"bloomEnabled":true}'::jsonb
  );
  v_schema_version := GREATEST(COALESCE(p_schema_version, 1), 1);

  -- Verify user exists and serialize concurrent operations (lock order: app_users -> user_worlds)
  PERFORM 1
  FROM public.app_users AS u
  WHERE u.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % does not exist in app_users', v_user_id;
  END IF;

  -- Lock existing world row if present
  SELECT *
  INTO v_existing
  FROM public.user_worlds AS w
  WHERE w.user_id = v_user_id
  FOR UPDATE;

  v_has_existing := FOUND;

  IF NOT v_has_existing AND p_expected_revision IS NOT NULL AND p_expected_revision > 0 THEN
    -- Client expected an existing revision (> 0) that does not exist
    RETURN QUERY SELECT
      FALSE,
      TRUE,
      0::BIGINT,
      NULL::TIMESTAMPTZ,
      '[]'::jsonb,
      NULL::JSONB;
    RETURN;
  END IF;

  IF v_has_existing AND (p_expected_revision IS NULL OR p_expected_revision <> v_existing.revision) THEN
    -- Stale revision conflict: return authoritative server world without overwriting
    RETURN QUERY SELECT
      FALSE,
      TRUE,
      v_existing.revision,
      v_existing.updated_at,
      v_existing.unlocked_asset_ids,
      pg_catalog.jsonb_build_object(
        'id', v_existing.world_id,
        'ownerUserId', v_existing.user_id,
        'name', v_existing.name,
        'landscapeType', v_existing.landscape_type,
        'placedObjects', v_existing.placed_objects,
        'landscapeDecorations', v_existing.landscape_decorations,
        'unlockedAssetIds', v_existing.unlocked_asset_ids,
        'cameraState', v_existing.camera_state,
        'settings', v_existing.settings,
        'version', v_existing.schema_version,
        'revision', v_existing.revision,
        'createdAt', v_existing.created_at,
        'updatedAt', v_existing.updated_at
      );
    RETURN;
  END IF;

  -- Compute authoritative unlocked_asset_ids strictly from server-side sources:
  --   1. Starter free asset IDs (always available to every player)
  --   2. Existing public.user_worlds.unlocked_asset_ids (preserves legitimate pre-existing unlocks)
  --   3. Server-confirmed daily gift claims in public.user_daily_rewards
  -- Premium assets (pro_*) are never stored in unlocked_asset_ids; Pro access is checked via billing.
  SELECT COALESCE(
    (
      SELECT pg_catalog.jsonb_agg(item.asset_id ORDER BY item.first_ord)
      FROM (
        SELECT
          raw.asset_id,
          MIN(raw.ord) AS first_ord
        FROM (
          SELECT starter.asset_id, starter.ord
          FROM (
            VALUES
              ('christmas_tree', 1::BIGINT),
              ('christmas_house', 2::BIGINT),
              ('street_lamp', 3::BIGINT),
              ('gift_box', 4::BIGINT),
              ('snowman', 5::BIGINT),
              ('christmas_train', 6::BIGINT),
              ('park_bench', 7::BIGINT)
          ) AS starter(asset_id, ord)

          UNION ALL

          SELECT
            pg_catalog.btrim(t.elem #>> '{}') AS asset_id,
            (1000::BIGINT + t.ord::BIGINT) AS ord
          FROM pg_catalog.jsonb_array_elements(
            CASE WHEN v_has_existing THEN COALESCE(v_existing.unlocked_asset_ids, '[]'::jsonb) ELSE '[]'::jsonb END
          ) WITH ORDINALITY AS t(elem, ord)
          WHERE pg_catalog.jsonb_typeof(t.elem) = 'string'
            AND pg_catalog.btrim(t.elem #>> '{}') <> ''
            AND pg_catalog.btrim(t.elem #>> '{}') NOT LIKE 'pro\_%' ESCAPE '\'

          UNION ALL

          SELECT
            pg_catalog.btrim(r.asset_id) AS asset_id,
            (1000000000::BIGINT + ROW_NUMBER() OVER (ORDER BY r.claimed_at ASC, r.asset_id ASC)) AS ord
          FROM public.user_daily_rewards AS r
          WHERE r.user_id = v_user_id
            AND pg_catalog.btrim(r.asset_id) <> ''
            AND pg_catalog.btrim(r.asset_id) NOT LIKE 'pro\_%' ESCAPE '\'
        ) AS raw
        GROUP BY raw.asset_id
      ) AS item
    ),
    '[]'::jsonb
  )
  INTO v_merged_unlocked_ids;

  IF NOT v_has_existing THEN
    INSERT INTO public.user_worlds AS w (
      user_id,
      world_id,
      name,
      landscape_type,
      placed_objects,
      landscape_decorations,
      unlocked_asset_ids,
      camera_state,
      settings,
      schema_version,
      revision,
      client_updated_at
    )
    VALUES (
      v_user_id,
      v_world_id,
      v_name,
      v_landscape_type,
      v_placed_objects,
      v_landscape_decorations,
      v_merged_unlocked_ids,
      p_camera_state,
      v_settings,
      v_schema_version,
      1,
      p_client_updated_at
    )
    RETURNING w.revision, w.updated_at
    INTO v_new_revision, v_new_updated_at;

    RETURN QUERY SELECT
      TRUE,
      FALSE,
      v_new_revision,
      v_new_updated_at,
      v_merged_unlocked_ids,
      NULL::JSONB;
    RETURN;
  END IF;

  v_new_revision := v_existing.revision + 1;

  UPDATE public.user_worlds AS w
  SET
    world_id = v_world_id,
    name = v_name,
    landscape_type = v_landscape_type,
    placed_objects = v_placed_objects,
    landscape_decorations = v_landscape_decorations,
    unlocked_asset_ids = v_merged_unlocked_ids,
    camera_state = COALESCE(p_camera_state, w.camera_state),
    settings = v_settings,
    schema_version = GREATEST(w.schema_version, v_schema_version),
    revision = v_new_revision,
    client_updated_at = p_client_updated_at
  WHERE w.user_id = v_user_id
  RETURNING w.updated_at INTO v_new_updated_at;

  RETURN QUERY SELECT
    TRUE,
    FALSE,
    v_new_revision,
    v_new_updated_at,
    v_merged_unlocked_ids,
    NULL::JSONB;
END;
$$;

-- 6. Row Level Security (RLS) & Privilege Hardening
--    All reads and writes must go through authenticated backend API routes
--    using SUPABASE_SERVICE_ROLE_KEY (never exposed to the frontend).
ALTER TABLE public.user_worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_rewards ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.user_worlds FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.user_daily_rewards FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.user_worlds TO service_role;
GRANT ALL ON TABLE public.user_daily_rewards TO service_role;

-- Restrict SECURITY DEFINER function execution privileges strictly to new functions only
REVOKE ALL ON FUNCTION public.mcw_user_worlds_set_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mcw_claim_daily_reward(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcw_claim_daily_reward(TEXT, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.mcw_save_user_world(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, INTEGER, BIGINT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcw_save_user_world(TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, INTEGER, BIGINT, TIMESTAMPTZ) TO service_role;

DROP POLICY IF EXISTS "Deny public access to user_worlds" ON public.user_worlds;
CREATE POLICY "Deny public access to user_worlds"
  ON public.user_worlds
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny public access to user_daily_rewards" ON public.user_daily_rewards;
CREATE POLICY "Deny public access to user_daily_rewards"
  ON public.user_daily_rewards
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
