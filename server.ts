import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Anti-caching middleware: ensure browser never uses stale cached API or HTML data
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Ensure persistent data directory exists
const DATA_DIR = path.join(__dirname, '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const WORLDS_FILE = path.join(DATA_DIR, 'worlds.json');
const REWARDS_FILE = path.join(DATA_DIR, 'daily_rewards.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Clear server-side cache and persistent data
app.all('/api/clear-cache', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(DATA_DIR)) {
      const files = fs.readdirSync(DATA_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(DATA_DIR, file));
      }
    }
    return res.json({ success: true, message: 'Server cache and data cleared successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to hash password
function serverHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return 'pw_' + Math.abs(hash).toString(36);
}

// Helper to read JSON file safely
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

// Helper to write JSON file safely
function writeJsonFile<T>(filePath: string, data: T) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// API Routes
// Auth 0: Google Sign-In Sync
app.post('/api/auth/google-sync', (req: Request, res: Response) => {
  const { id, email, nickname, avatar } = req.body;
  if (!email || !id) {
    return res.status(400).json({ success: false, error: 'User ID and Email required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanNick = (nickname || cleanEmail.split('@')[0]).trim();
  const users = readJsonFile<Record<string, any>>(USERS_FILE, {});

  const googleUser = {
    id,
    email: cleanEmail,
    nickname: cleanNick,
    avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanNick)}&backgroundColor=0d1723`,
    provider: 'google',
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
    return res.status(409).json({ success: false, error: 'Account already exists with this email. Please sign in.' });
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

// Mount Vite or serve static production build
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[My Christmas World] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
