// HTTP-сервер: статика из dist/ + health endpoint для Docker + push endpoints
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { getVapidPublicKey, saveSubscription, removeSubscription, sendPushNotification } from './server/push.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_DIR = join(__dirname, 'dist');
const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function sendJson(res: ServerResponse, status: number, body: object): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

// Read POST body
async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function serveStatic(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url || '/';
  let filePath = join(DIST_DIR, url === '/' ? 'index.html' : url);

  if (!existsSync(filePath)) {
    filePath = join(DIST_DIR, 'index.html');
  }

  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('404 - Not Found');
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end('500 - Internal Server Error');
  }
}

const server = createServer(async (req, res) => {
  const url = req.url || '/';
  const pathname = new URL(url, 'http://localhost').pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok', service: 'strateg-russia' });
    return;
  }

  if (pathname.startsWith('/api/push/')) {
    if (pathname === '/api/push/vapid-public-key' && req.method === 'GET') {
      sendJson(res, 200, { publicKey: getVapidPublicKey() });
      return;
    }

    if (pathname === '/api/push/subscribe' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        const { userId, subscription } = JSON.parse(body);

        if (!userId || !subscription) {
          sendJson(res, 400, { error: 'Missing userId or subscription' });
          return;
        }

        saveSubscription(userId, subscription);
        sendJson(res, 200, { success: true });
      } catch {
        sendJson(res, 500, { error: 'Failed to save subscription' });
      }
      return;
    }

    if (pathname === '/api/push/unsubscribe' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        const { userId } = JSON.parse(body);

        if (!userId) {
          sendJson(res, 400, { error: 'Missing userId' });
          return;
        }

        removeSubscription(userId);
        sendJson(res, 200, { success: true });
      } catch {
        sendJson(res, 500, { error: 'Failed to remove subscription' });
      }
      return;
    }

    if (pathname === '/api/push/send' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        const { userId, title, body: notificationBody, data } = JSON.parse(body);

        if (!userId || !title) {
          sendJson(res, 400, { error: 'Missing userId or title' });
          return;
        }

        const success = await sendPushNotification(userId, title, notificationBody || '', data);
        sendJson(res, 200, { success });
      } catch {
        sendJson(res, 500, { error: 'Failed to send push notification' });
      }
      return;
    }
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});
