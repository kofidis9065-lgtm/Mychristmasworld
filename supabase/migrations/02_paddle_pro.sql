-- Supabase Database Schema Migration for My Christmas World
-- 02_paddle_pro.sql
-- Persistent Google-authenticated users, Paddle Billing purchases,
-- environment-isolated Pro entitlements, webhook event idempotency,
-- refund/chargeback handling, and strict RLS & trigger hardening.

-- 1. Billing Environment Configuration Table (Single-row source of truth)
-- Defaults to 'sandbox' on first install; ON CONFLICT DO NOTHING preserves
-- 'production' once switched so re-running migrations never downgrades live mode.
CREATE TABLE IF NOT EXISTS public.app_billing_config (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  active_paddle_environment TEXT NOT NULL DEFAULT 'sandbox'
    CHECK (active_paddle_environment IN ('sandbox', 'production')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_billing_config (id, active_paddle_environment)
VALUES (TRUE, 'sandbox')
ON CONFLICT (id) DO NOTHING;

-- 2. Verified Users Table (Compatible with existing Google GIS IDs: 'google_' || sub)
CREATE TABLE IF NOT EXISTS public.app_users (
  user_id TEXT PRIMARY KEY,
  google_sub TEXT UNIQUE,
  email TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  nickname TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL DEFAULT 'google',
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  is_pro_sandbox BOOLEAN NOT NULL DEFAULT FALSE,
  is_pro_production BOOLEAN NOT NULL DEFAULT FALSE,
  pro_granted_at TIMESTAMPTZ,
  pro_revoked_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS is_pro_sandbox BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_pro_production BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_app_users_email_lower
  ON public.app_users (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_app_users_is_pro_true
  ON public.app_users (user_id)
  WHERE is_pro = TRUE;

CREATE INDEX IF NOT EXISTS idx_app_users_is_pro_production_true
  ON public.app_users (user_id)
  WHERE is_pro_production = TRUE;

-- 3. Paddle Purchases Table (One row per Paddle transaction_id)
CREATE TABLE IF NOT EXISTS public.paddle_purchases (
  transaction_id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.app_users(user_id) ON DELETE SET NULL,
  google_sub TEXT,
  email TEXT,
  customer_id TEXT,
  price_id TEXT NOT NULL,
  product_id TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'refunded', 'chargeback', 'canceled')),
  amount TEXT,
  currency_code TEXT,
  last_event_id TEXT,
  last_event_occurred_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  raw_custom_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paddle_purchases_user_id
  ON public.paddle_purchases (user_id);

CREATE INDEX IF NOT EXISTS idx_paddle_purchases_user_status
  ON public.paddle_purchases (user_id, status);

CREATE INDEX IF NOT EXISTS idx_paddle_purchases_user_env_status
  ON public.paddle_purchases (user_id, environment, status);

CREATE INDEX IF NOT EXISTS idx_paddle_purchases_email_lower
  ON public.paddle_purchases (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_paddle_purchases_customer_id
  ON public.paddle_purchases (customer_id);

-- 4. Paddle Webhook Events Table (Idempotency & audit log by event_id)
CREATE TABLE IF NOT EXISTS public.paddle_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  transaction_id TEXT,
  environment TEXT NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production')),
  occurred_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'processed'
    CHECK (processing_status IN ('processed', 'ignored', 'failed')),
  notes TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paddle_webhook_events_transaction_id
  ON public.paddle_webhook_events (transaction_id);

CREATE INDEX IF NOT EXISTS idx_paddle_webhook_events_type_occurred
  ON public.paddle_webhook_events (event_type, occurred_at DESC);

-- 5. Hardened SECURITY DEFINER Functions & Triggers
-- All SECURITY DEFINER functions use an empty search_path ('') with explicit
-- pg_catalog / public schema qualification to prevent search_path hijacking.

CREATE OR REPLACE FUNCTION public.mcw_set_updated_at()
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

DROP TRIGGER IF EXISTS trg_app_billing_config_updated_at ON public.app_billing_config;
CREATE TRIGGER trg_app_billing_config_updated_at
  BEFORE UPDATE ON public.app_billing_config
  FOR EACH ROW
  EXECUTE FUNCTION public.mcw_set_updated_at();

DROP TRIGGER IF EXISTS trg_app_users_updated_at ON public.app_users;
CREATE TRIGGER trg_app_users_updated_at
  BEFORE UPDATE ON public.app_users
  FOR EACH ROW
  EXECUTE FUNCTION public.mcw_set_updated_at();

DROP TRIGGER IF EXISTS trg_paddle_purchases_updated_at ON public.paddle_purchases;
CREATE TRIGGER trg_paddle_purchases_updated_at
  BEFORE UPDATE ON public.paddle_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.mcw_set_updated_at();

-- Recomputes environment-isolated entitlements for a single user.
-- Sandbox purchases ONLY set is_pro_sandbox (and is_pro while active_paddle_environment = 'sandbox').
-- When active_paddle_environment = 'production', ONLY environment = 'production' purchases grant is_pro.
-- If app_billing_config has no row, fail-closed to 'production'.
CREATE OR REPLACE FUNCTION public.mcw_recompute_user_pro_entitlement(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_active_env TEXT;
  v_has_sandbox BOOLEAN;
  v_has_production BOOLEAN;
  v_has_active BOOLEAN;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

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
    WHERE p.user_id = p_user_id
      AND p.environment = 'sandbox'
      AND p.status = 'active'
  ) INTO v_has_sandbox;

  SELECT EXISTS (
    SELECT 1
    FROM public.paddle_purchases AS p
    WHERE p.user_id = p_user_id
      AND p.environment = 'production'
      AND p.status = 'active'
  ) INTO v_has_production;

  v_has_active := CASE
    WHEN v_active_env = 'sandbox' THEN v_has_sandbox
    ELSE v_has_production
  END;

  UPDATE public.app_users AS u
  SET
    is_pro = v_has_active,
    is_pro_sandbox = v_has_sandbox,
    is_pro_production = v_has_production,
    pro_granted_at = CASE
      WHEN v_has_active THEN COALESCE(u.pro_granted_at, pg_catalog.now())
      ELSE u.pro_granted_at
    END,
    pro_revoked_at = CASE
      WHEN NOT v_has_active AND (u.is_pro IS TRUE OR u.pro_granted_at IS NOT NULL) THEN pg_catalog.now()
      WHEN v_has_active THEN NULL
      ELSE u.pro_revoked_at
    END,
    updated_at = pg_catalog.now()
  WHERE u.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcw_sync_user_pro_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.mcw_recompute_user_pro_entitlement(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.mcw_recompute_user_pro_entitlement(NEW.user_id);
    IF TG_OP = 'UPDATE' AND OLD.user_id IS NOT NULL AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      PERFORM public.mcw_recompute_user_pro_entitlement(OLD.user_id);
    END IF;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_paddle_purchases_sync_pro ON public.paddle_purchases;
CREATE TRIGGER trg_paddle_purchases_sync_pro
  AFTER INSERT OR UPDATE OR DELETE ON public.paddle_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.mcw_sync_user_pro_entitlement();

-- Automatically recomputes all users' active is_pro flag if active_paddle_environment changes
-- (e.g., switching from 'sandbox' to 'production' revokes sandbox-only is_pro flags immediately).
CREATE OR REPLACE FUNCTION public.mcw_sync_all_users_on_env_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.active_paddle_environment IS DISTINCT FROM NEW.active_paddle_environment THEN
    UPDATE public.app_users AS u
    SET
      is_pro = CASE
        WHEN NEW.active_paddle_environment = 'sandbox' THEN u.is_pro_sandbox
        ELSE u.is_pro_production
      END,
      pro_revoked_at = CASE
        WHEN (
          CASE
            WHEN NEW.active_paddle_environment = 'sandbox' THEN u.is_pro_sandbox
            ELSE u.is_pro_production
          END
        ) THEN NULL
        WHEN u.is_pro IS TRUE THEN pg_catalog.now()
        ELSE u.pro_revoked_at
      END,
      updated_at = pg_catalog.now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_billing_config_sync_users ON public.app_billing_config;
CREATE TRIGGER trg_app_billing_config_sync_users
  AFTER UPDATE OF active_paddle_environment ON public.app_billing_config
  FOR EACH ROW
  EXECUTE FUNCTION public.mcw_sync_all_users_on_env_change();

-- 6. Row Level Security (RLS) & Strict Access Control
-- All writes/reads to these tables must go through server-side API routes
-- using SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS).
ALTER TABLE public.app_billing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paddle_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paddle_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.app_billing_config FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.app_users FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.paddle_purchases FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.paddle_webhook_events FROM PUBLIC, anon, authenticated;

-- Restrict execution privileges on all SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.mcw_set_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mcw_sync_user_pro_entitlement() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mcw_sync_all_users_on_env_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mcw_recompute_user_pro_entitlement(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcw_recompute_user_pro_entitlement(TEXT) TO service_role;

GRANT ALL ON TABLE public.app_billing_config TO service_role;
GRANT ALL ON TABLE public.app_users TO service_role;
GRANT ALL ON TABLE public.paddle_purchases TO service_role;
GRANT ALL ON TABLE public.paddle_webhook_events TO service_role;

DROP POLICY IF EXISTS "Deny public access to app_billing_config" ON public.app_billing_config;
CREATE POLICY "Deny public access to app_billing_config"
  ON public.app_billing_config
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny public access to app_users" ON public.app_users;
CREATE POLICY "Deny public access to app_users"
  ON public.app_users
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny public access to paddle_purchases" ON public.paddle_purchases;
CREATE POLICY "Deny public access to paddle_purchases"
  ON public.paddle_purchases
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny public access to paddle_webhook_events" ON public.paddle_webhook_events;
CREATE POLICY "Deny public access to paddle_webhook_events"
  ON public.paddle_webhook_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
