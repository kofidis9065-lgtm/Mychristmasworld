import fs from 'fs';
import path from 'path';

function resolveDataDir(): string {
  const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const preferredDir = isVercel
    ? path.join('/tmp', 'mcw-data')
    : path.join(process.cwd(), '.data');

  try {
    if (!fs.existsSync(preferredDir)) {
      fs.mkdirSync(preferredDir, { recursive: true });
    }
    return preferredDir;
  } catch {
    const fallbackDir = path.join('/tmp', 'mcw-data');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    return fallbackDir;
  }
}

export const DATA_DIR = resolveDataDir();
export const WORLDS_FILE = path.join(DATA_DIR, 'worlds.json');
export const REWARDS_FILE = path.join(DATA_DIR, 'daily_rewards.json');

export function readJsonFile<T>(filePath: string, fallback: T): T {
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

export function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

export function clearDataDir(): void {
  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(DATA_DIR, file));
    }
  }
}
