import express, { Request, Response } from 'express';
import {
  WORLDS_FILE,
  REWARDS_FILE,
  USERS_FILE,
  readJsonFile,
  writeJsonFile,
  clearDataDir,
  grantProAccess,
  checkProAccess,
} from './storage.js';
import { processPaddleWebhook } from './paddleWebhook.js';

// Helper to hash password
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
    (req: Request, res: Response) => {
      try {
        const rawBody = Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from(typeof req.body === 'string' ? req.body : '', 'utf8');
        const signatureHeader = req.headers['paddle-signature'];
        const result = processPaddleWebhook(rawBody, signatureHeader);
        return res.status(result.status).json(result.body);
      } catch (err: any) {
        console.error('[Paddle Webhook Error]', err);
        return res.status(500).json({ success: false, error: err.message });
      }
    }
  );

  // Standard JSON parser for all remaining API routes
  app.use(express.json({ limit: '10mb' }));

  // Clear server-side cache and persistent data
  app.all('/api/clear-cache', (_req: Request, res: Response) => {
    try {
      clearDataDir();
      return res.json({ success: true, message: 'Server cache and data cleared successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Check user Christmas Pro Plan status
  app.get('/api/user/pro-status/:userId', (req: Request, res: Response) => {
    const { userId } = req.params;
    const email = (req.query.email as string || '').toLowerCase().trim();
    const isPro = checkProAccess(userId, email);
    return res.json({ success: true, isPro });
  });

  // Grant Pro status to user
  app.post('/api/user/grant-pro', (req: Request, res: Response) => {
    const { userId, email } = req.body;
    if (!userId && !email) {
      return res.status(400).json({ success: false, error: 'UserId or email required' });
    }

    grantProAccess(userId, email);
    return res.json({ success: true, message: 'Christmas Pro Plan granted successfully' });
  });

  // Auth 0: Google Sign-In Sync
  app.post('/api/auth/google-sync', (req: Request, res: Response) => {
    const { id, email, nickname, avatar } = req.body;
    if (!email || !id) {
      return res.status(400).json({ success: false, error: 'User ID and Email required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNick = (nickname || cleanEmail.split('@')[0]).trim();
    const users = readJsonFile<Record<string, any>>(USERS_FILE, {});

    const existingIsPro = Boolean(users[cleanEmail]?.isPro || checkProAccess(id, cleanEmail));
    const googleUser = {
      id,
      email: cleanEmail,
      nickname: cleanNick,
      avatar:
        avatar ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanNick)}&backgroundColor=0d1723`,
      provider: 'google',
      isPro: existingIsPro,
      updatedAt: new Date().toISOString(),
    };

    users[cleanEmail] = googleUser;
    writeJsonFile(USERS_FILE, users);

    return res.json({ success: true, user: googleUser });
  });

  // Auth 1: Register Account
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
      createdAt: new Date().toISOString(),
    };

    users[cleanEmail] = newUser;
    writeJsonFile(USERS_FILE, users);

    const { passwordHash: _, ...userSafe } = newUser;
    return res.json({ success: true, user: userSafe });
  });

  // Auth 2: Login Account
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
    return res.json({ success: true, user: userSafe });
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

  // 2. Save user world by Google User ID
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
