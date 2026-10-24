import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Ensure persistent data directory exists
const DATA_DIR = path.join(__dirname, '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const WORLDS_FILE = path.join(DATA_DIR, 'worlds.json');
const REWARDS_FILE = path.join(DATA_DIR, 'daily_rewards.json');

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
// 1. Get user world by Google User ID / Account ID
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
