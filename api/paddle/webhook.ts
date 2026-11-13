import type { IncomingMessage, ServerResponse } from 'http';
import { processPaddleWebhook } from '../_lib/paddleWebhook.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const anyReq = req as IncomingMessage & { rawBody?: Buffer | string };
  if (Buffer.isBuffer(anyReq.rawBody)) {
    return anyReq.rawBody;
  }
  if (typeof anyReq.rawBody === 'string') {
    return Buffer.from(anyReq.rawBody, 'utf8');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function sendJson(res: ServerResponse, statusCode: number, payload: Record<string, any>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.end(JSON.stringify(payload));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Allow', 'POST, OPTIONS');
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { success: false, error: 'Method Not Allowed. Use POST.' });
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const signatureHeader = req.headers['paddle-signature'];
    const result = processPaddleWebhook(rawBody, signatureHeader);
    sendJson(res, result.status, result.body);
  } catch (err: any) {
    console.error('[Vercel Paddle Webhook Error]', err);
    sendJson(res, 500, { success: false, error: err?.message || 'Internal Server Error' });
  }
}
