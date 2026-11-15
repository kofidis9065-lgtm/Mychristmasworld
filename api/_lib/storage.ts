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

export function clearDataDir(): void {
  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR);
    for (const file of files) {
      fs.unlinkSync(path.join(DATA_DIR, file));
    }
  }
}
