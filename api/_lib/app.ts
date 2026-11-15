import express, { Request, Response } from 'express';
import { clearDataDir } from './storage.js';
import { extractTransactionItemDetails, processPaddleWebhook } from './paddleWebhook.js';
import { verifyGoogleIdToken } from './googleAuth.js';
import {
  clearSessionCookie,
  getAuthenticatedSession,
  setSessionCookie,
} from './session.js';
import {
  getPaddleApiBaseUrl,
  getPaddleApiKey,
  getPaddleEnvironment,
  getPaddlePriceId,
} from './paddleConfig.js';
import {
  checkUserProInSupabase,
  claimUserDailyRewardInSupabase,
  getUserDailyRewardsFromSupabase,
  getUserWorldFromSupabase,
  getVerifiedUserFromSupabase,
  isSupabaseAdminConfigured,
  recordVerifiedPaddlePurchase,
  saveUserWorldInSupabase,
  upsertVerifiedGoogleUserInSupabase,
} from './supabaseAdmin.js';
import {
  isEligibleSecretGiftAsset,
  STARTER_FREE_ASSET_IDS,
  validateAndSanitizeWorldSave,
} from './worldValidation.js';

export function createApiApp() {
  const app = express();

  // Anti-caching middleware: ensure browser never uses stale cached API or HTML data
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // IMPORTANT: Register Paddle webhook BEFORE express.json() so raw body bytes are preserved for HMAC verification
  app.post(
    '/api/paddle/webhook',
    express.raw({ type: '*/*', limit: '2mb' }),
    async (req: Request, res: Response) => {
      try {
        const rawBody = Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from(typeof req.body === 'string' ? req.body : '', 'utf8');
        const signatureHeader = req.headers['paddle-signature'];
        const result = await processPaddleWebhook(rawBody, signatureHeader);
        return res.status(result.status).json(result.body);
      } catch (err: any) {
        console.error('[Paddle Webhook Error]', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }
  );

  // Standard JSON parser for all remaining API routes (bounded to 2MB for safety)
  app.use(express.json({ limit: '2mb' }));

  // Development-only internal data cache reset (disabled in production)
  app.all('/api/clear-cache', (_req: Request, res: Response) => {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Cache reset endpoint is disabled in production.',
      });
    }
    try {
      clearDataDir();
      return res.json({ success: true, message: 'Server cache cleared successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Auth 0: Verify Google ID token server-side, upsert user in Supabase, set HttpOnly session cookie
  app.post('/api/auth/google-sync', async (req: Request, res: Response) => {
    try {
      const credential = String(req.body?.credential || '').trim();
      if (!credential) {
        return res.status(400).json({
          success: false,
          error: 'Verified Google ID token credential is required.',
        });
      }

      if (!isSupabaseAdminConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Authentication database is not configured on the server.',
        });
      }

      const verifiedIdentity = await verifyGoogleIdToken(credential);
      const user = await upsertVerifiedGoogleUserInSupabase({
        userId: verifiedIdentity.userId,
        googleSub: verifiedIdentity.googleSub,
        email: verifiedIdentity.email,
        emailVerified: verifiedIdentity.emailVerified,
        nickname: verifiedIdentity.nickname,
        avatarUrl: verifiedIdentity.avatarUrl,
      });

      setSessionCookie(req, res, {
        uid: user.id,
        sub: verifiedIdentity.googleSub,
        email: user.email,
        provider: 'google',
      });

      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          provider: 'google',
          isPro: user.isPro,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.warn('[Google Auth Error]', err?.message || err);
      return res.status(401).json({
        success: false,
        error: err?.message || 'Google ID token verification failed.',
      });
    }
  });

  // Auth Session Restore: Reads HttpOnly mcw_session cookie and returns authoritative user + Pro status
  app.get('/api/auth/session', async (req: Request, res: Response) => {
    try {
      const session = getAuthenticatedSession(req);
      if (!session || session.provider !== 'google') {
        return res.json({ success: true, authenticated: false, user: null, isPro: false });
      }

      if (!isSupabaseAdminConfigured()) {
        return res.json({ success: true, authenticated: false, user: null, isPro: false });
      }

      const user = await getVerifiedUserFromSupabase(session.uid);
      if (!user) {
        clearSessionCookie(req, res);
        return res.json({ success: true, authenticated: false, user: null, isPro: false });
      }

      return res.json({
        success: true,
        authenticated: true,
        isPro: user.isPro,
        environment: getPaddleEnvironment(),
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          provider: user.provider,
          isPro: user.isPro,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      console.error('[Session Check Error]', err);
      return res.status(500).json({ success: false, authenticated: false, isPro: false });
    }
  });

  // Auth Logout: Clears HttpOnly session cookie
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    return res.json({ success: true });
  });

  // Authoritative Pro Status Check (requires verified HttpOnly session cookie)
  app.get('/api/user/pro-status', async (req: Request, res: Response) => {
    try {
      const session = getAuthenticatedSession(req);
      if (!session || session.provider !== 'google' || !isSupabaseAdminConfigured()) {
        return res.json({ success: true, authenticated: false, isPro: false });
      }

      const env = getPaddleEnvironment();
      const isPro = await checkUserProInSupabase(session.uid, env);
      return res.json({
        success: true,
        authenticated: true,
        isPro,
        environment: env,
      });
    } catch (err: any) {
      console.error('[Pro Status Error]', err);
      return res.status(500).json({ success: false, isPro: false, error: err?.message });
    }
  });

  // Backward-compatible route enforcing that requested :userId matches verified session cookie
  app.get('/api/user/pro-status/:userId', async (req: Request, res: Response) => {
    try {
      const session = getAuthenticatedSession(req);
      const { userId } = req.params;
      if (
        !session ||
        session.provider !== 'google' ||
        session.uid !== userId ||
        !isSupabaseAdminConfigured()
      ) {
        return res.json({ success: true, authenticated: false, isPro: false });
      }

      const env = getPaddleEnvironment();
      const isPro = await checkUserProInSupabase(session.uid, env);
      return res.json({
        success: true,
        authenticated: true,
        isPro,
        environment: env,
      });
    } catch (err: any) {
      console.error('[Pro Status Param Error]', err);
      return res.status(500).json({ success: false, isPro: false, error: err?.message });
    }
  });

  // DISABLED: Unauthenticated client-side Pro grants are permanently blocked
  app.post('/api/user/grant-pro', (_req: Request, res: Response) => {
    return res.status(403).json({
      success: false,
      error:
        'Direct Pro activation is disabled. Christmas Pro is granted exclusively after verified Paddle payment.',
    });
  });

  // Optional fast post-checkout confirmation for verified Google users
  app.post('/api/paddle/confirm-transaction', async (req: Request, res: Response) => {
    try {
      const session = getAuthenticatedSession(req);
      if (!session || session.provider !== 'google') {
        return res.status(401).json({
          success: false,
          error: 'Verified Google Sign-In session is required.',
        });
      }

      if (!isSupabaseAdminConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Database is not configured on the server.',
        });
      }

      const configuredEnv = getPaddleEnvironment();
      // 1. Check if webhook has already recorded this user's active purchase
      const alreadyPro = await checkUserProInSupabase(session.uid, configuredEnv);
      if (alreadyPro) {
        return res.json({ success: true, isPro: true, source: 'database' });
      }

      const transactionId = String(req.body?.transactionId || '').trim();
      const apiKey = getPaddleApiKey();
      const configuredPriceId = getPaddlePriceId();

      if (!transactionId || !apiKey || !configuredPriceId) {
        return res.json({ success: true, isPro: false, pendingWebhook: true });
      }

      // 2. Verify transaction directly with Paddle Billing API
      const paddleRes = await fetch(
        `${getPaddleApiBaseUrl(configuredEnv)}/transactions/${encodeURIComponent(transactionId)}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!paddleRes.ok) {
        return res.json({ success: true, isPro: false, pendingWebhook: true });
      }

      const paddleJson = (await paddleRes.json()) as { data?: any };
      const tx = paddleJson?.data;
      if (!tx) {
        return res.json({ success: true, isPro: false, pendingWebhook: true });
      }

      const txStatus = String(tx.status || '').toLowerCase().trim();
      if (txStatus !== 'completed' && txStatus !== 'paid') {
        return res.json({ success: true, isPro: false, pendingWebhook: true, status: txStatus });
      }

      const { priceIds, productIds } = extractTransactionItemDetails(tx);
      if (!priceIds.includes(configuredPriceId)) {
        return res.status(400).json({
          success: false,
          isPro: false,
          error: 'Transaction Price ID does not match Christmas Pro.',
        });
      }

      const txUserId = String(tx?.custom_data?.userId || tx?.custom_data?.user_id || '').trim();
      if (txUserId !== session.uid) {
        return res.status(403).json({
          success: false,
          isPro: false,
          error: 'Transaction does not belong to the signed-in Google account.',
        });
      }

      const txCustomEnv = String(tx?.custom_data?.paddleEnv || '').toLowerCase().trim();
      if (txCustomEnv && txCustomEnv !== configuredEnv) {
        return res.status(403).json({
          success: false,
          isPro: false,
          error: 'Transaction environment mismatch.',
        });
      }

      const totals = tx?.details?.totals || {};
      await recordVerifiedPaddlePurchase({
        transactionId: String(tx.id),
        userId: session.uid,
        googleSub: session.sub || null,
        email: session.email,
        customerId: String(tx?.customer_id || '').trim() || null,
        priceId: configuredPriceId,
        productId: productIds[0] || null,
        environment: configuredEnv,
        amount: totals?.total !== undefined ? String(totals.total) : null,
        currencyCode: String(tx?.currency_code || totals?.currency_code || '').trim() || null,
        purchasedAt: String(tx?.billed_at || tx?.created_at || new Date().toISOString()),
        rawCustomData: tx?.custom_data || {},
        rawPayload: tx,
      });

      const confirmedPro = await checkUserProInSupabase(session.uid, configuredEnv);
      return res.json({ success: true, isPro: confirmedPro, source: 'paddle_api' });
    } catch (err: any) {
      console.error('[Confirm Transaction Error]', err);
      return res.status(500).json({ success: false, isPro: false, error: err?.message });
    }
  });

  async function requireVerifiedOwner(req: Request, res: Response) {
    const session = getAuthenticatedSession(req);
    if (!session || session.provider !== 'google') {
      res.status(401).json({
        success: false,
        error: 'Verified Google Sign-In session is required.',
      });
      return null;
    }

    const requestedUserId = String(req.params.userId || '').trim();
    if (!requestedUserId || requestedUserId !== session.uid) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: requested account does not match your signed-in session.',
      });
      return null;
    }

    if (!isSupabaseAdminConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Persistent cloud storage is not configured on the server.',
      });
      return null;
    }

    const verifiedUser = await getVerifiedUserFromSupabase(session.uid);
    if (!verifiedUser) {
      clearSessionCookie(req, res);
      res.status(401).json({
        success: false,
        error: 'Session is no longer valid. Please sign in with Google again.',
      });
      return null;
    }

    return verifiedUser;
  }

  // 1. Get authenticated Google user's saved world from Supabase
  app.get('/api/worlds/:userId', async (req: Request, res: Response) => {
    try {
      const verifiedUser = await requireVerifiedOwner(req, res);
      if (!verifiedUser) return;

      const world = await getUserWorldFromSupabase(verifiedUser.id);
      return res.json({ success: true, world });
    } catch (err: any) {
      console.error('[Load World Error]', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to load world from cloud storage.',
      });
    }
  });

  // 2. Save authenticated Google user's world to Supabase with optimistic concurrency (revision)
  app.post('/api/worlds/:userId', async (req: Request, res: Response) => {
    try {
      const verifiedUser = await requireVerifiedOwner(req, res);
      if (!verifiedUser) return;

      const env = getPaddleEnvironment();
      const [existingWorld, rewardState] = await Promise.all([
        getUserWorldFromSupabase(verifiedUser.id),
        getUserDailyRewardsFromSupabase(verifiedUser.id, env),
      ]);

      const serverUnlockedAssetIds = new Set<string>([
        ...STARTER_FREE_ASSET_IDS,
        ...(existingWorld?.unlockedAssetIds || []),
        ...rewardState.unlockedAssetIds,
      ]);

      const validated = validateAndSanitizeWorldSave({
        rawBody: req.body,
        userId: verifiedUser.id,
        existingWorld,
        serverUnlockedAssetIds,
        isPro: verifiedUser.isPro,
      });

      if (validated.ok === false) {
        return res.status(validated.status).json({
          success: false,
          error: validated.error,
        });
      }

      const saved = await saveUserWorldInSupabase(verifiedUser.id, validated.data);

      if (saved.conflict || !saved.applied) {
        return res.status(409).json({
          success: false,
          conflict: true,
          error: 'A newer version of this world was saved from another session or device.',
          revision: saved.revision,
          updatedAt: saved.updatedAt,
          unlockedAssetIds: saved.unlockedAssetIds,
          serverWorld: saved.serverWorld,
        });
      }

      return res.json({
        success: true,
        mode: 'cloud',
        revision: saved.revision,
        updatedAt: saved.updatedAt,
        unlockedAssetIds: saved.unlockedAssetIds,
      });
    } catch (err: any) {
      console.error('[Save World Error]', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to save world to cloud storage.',
      });
    }
  });

  // 3. Claim a verified Secret Gift in Supabase (fixed 3/day UTC limit for Free, unlimited for Pro)
  app.post('/api/daily_rewards/:userId', async (req: Request, res: Response) => {
    try {
      const verifiedUser = await requireVerifiedOwner(req, res);
      if (!verifiedUser) return;

      const assetId = String(
        req.body?.assetId || req.body?.record?.reward_type || ''
      ).trim();

      if (!assetId || !isEligibleSecretGiftAsset(assetId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or ineligible Secret Gift asset ID.',
        });
      }

      const rawWorldId = req.body?.worldId ?? req.body?.record?.world_id ?? null;
      const worldId =
        typeof rawWorldId === 'string' && rawWorldId.trim()
          ? rawWorldId.trim().slice(0, 128)
          : null;

      const result = await claimUserDailyRewardInSupabase(
        verifiedUser.id,
        assetId,
        worldId,
        getPaddleEnvironment()
      );

      if (result.reason === 'daily_limit_reached') {
        return res.status(429).json({
          success: false,
          error:
            'Daily limit reached! Free accounts can unlock up to 3 Secret Gifts per UTC day. Upgrade to Christmas Pro for unlimited access!',
          ...result,
        });
      }

      if (result.reason === 'already_claimed_asset_today') {
        return res.status(409).json({
          success: false,
          error: 'You already unwrapped this Secret Gift today.',
          ...result,
        });
      }

      return res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      console.error('[Claim Daily Reward Error]', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to claim daily reward.',
      });
    }
  });

  // 4. Get authenticated user's persistent daily rewards state from Supabase (UTC day)
  app.get('/api/daily_rewards/:userId', async (req: Request, res: Response) => {
    try {
      const verifiedUser = await requireVerifiedOwner(req, res);
      if (!verifiedUser) return;

      const state = await getUserDailyRewardsFromSupabase(
        verifiedUser.id,
        getPaddleEnvironment()
      );

      return res.json({
        success: true,
        ...state,
      });
    } catch (err: any) {
      console.error('[Get Daily Rewards Error]', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to load daily rewards.',
      });
    }
  });

  return app;
}
