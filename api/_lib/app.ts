import express, { Request, Response } from 'express';
import {
  WORLDS_FILE,
  REWARDS_FILE,
  USERS_FILE,
  readJsonFile,
  writeJsonFile,
  clearDataDir,
} from './storage.js';
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
  getVerifiedUserFromSupabase,
  isSupabaseAdminConfigured,
  recordVerifiedPaddlePurchase,
  upsertVerifiedGoogleUserInSupabase,
} from './supabaseAdmin.js';

// Helper to hash password for optional local-only guest/dev email accounts
function serverHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return 'pw_' + Math.abs(hash).toString(36);
}

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

  // Standard JSON parser for all remaining API routes
  app.use(express.json({ limit: '10mb' }));

  // Clear local non-database cache only
  app.all('/api/clear-cache', (_req: Request, res: Response) => {
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

  // Auth 1: Register Local Email Account (does not grant Pro)
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { email, nickname, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNick = (nickname || cleanEmail.split('@')[0]).trim();
    const users = readJsonFile<Record<string, any>>(USERS_FILE, {});

    if (users[cleanEmail]) {
      return res.status(409).json({
        success: false,
        error: 'Account already exists with this email. Please sign in.',
      });
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 10);
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanNick)}&backgroundColor=0d1723`;
    const newUser = {
      id: userId,
      email: cleanEmail,
      nickname: cleanNick,
      passwordHash: serverHash(password),
      avatar,
      provider: 'local',
      isPro: false,
      createdAt: new Date().toISOString(),
    };

    users[cleanEmail] = newUser;
    writeJsonFile(USERS_FILE, users);

    const { passwordHash: _, ...userSafe } = newUser;
    return res.json({ success: true, user: userSafe });
  });

  // Auth 2: Login Local Email Account
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = readJsonFile<Record<string, any>>(USERS_FILE, {});
    const user = users[cleanEmail];

    if (!user || user.passwordHash !== serverHash(password)) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const { passwordHash: _, ...userSafe } = user;
    return res.json({ success: true, user: { ...userSafe, isPro: false } });
  });

  // 1. Get user world by User ID
  app.get('/api/worlds/:userId', (req: Request, res: Response) => {
    const { userId } = req.params;
    const worlds = readJsonFile<Record<string, any>>(WORLDS_FILE, {});
    const userWorld = worlds[userId];
    if (userWorld) {
      return res.json({ success: true, world: userWorld });
    }
    return res.json({ success: true, world: null });
  });

  // 2. Save user world by User ID
  app.post('/api/worlds/:userId', (req: Request, res: Response) => {
    const { userId } = req.params;
    const worldData = req.body;
    if (!worldData) {
      return res.status(400).json({ success: false, error: 'No world data provided' });
    }

    const worlds = readJsonFile<Record<string, any>>(WORLDS_FILE, {});
    worlds[userId] = {
      ...worldData,
      updatedAt: new Date().toISOString(),
    };
    writeJsonFile(WORLDS_FILE, worlds);

    return res.json({ success: true, mode: 'cloud' });
  });

  // 3. Claim daily reward in cloud
  app.post('/api/daily_rewards/:userId', (req: Request, res: Response) => {
    const { userId } = req.params;
    const { date, assetId } = req.body;
    if (!date || !assetId) {
      return res.status(400).json({ success: false, error: 'Missing date or assetId' });
    }

    const rewards = readJsonFile<Record<string, any[]>>(REWARDS_FILE, {});
    const userRewards = rewards[userId] || [];

    if (userRewards.some((r) => r.date === date)) {
      return res.status(409).json({ success: false, error: "Today's gift already claimed!" });
    }

    userRewards.push({ date, assetId, claimedAt: new Date().toISOString() });
    rewards[userId] = userRewards;
    writeJsonFile(REWARDS_FILE, rewards);

    return res.json({ success: true });
  });

  // 4. Check user daily rewards
  app.get('/api/daily_rewards/:userId', (req: Request, res: Response) => {
    const { userId } = req.params;
    const rewards = readJsonFile<Record<string, any[]>>(REWARDS_FILE, {});
    return res.json({ success: true, rewards: rewards[userId] || [] });
  });

  return app;
}
