#!/usr/bin/env node
// Maison Élite — Restaurant Chatbot Server
// Pure Node.js: no npm packages required

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const bot = require('./chatbot');

const PORT   = process.env.PORT || 3001;
const PUBLIC = path.join(__dirname, '../frontend/public');

// ── MIME types ────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ── Helpers ───────────────────────────────────────────────
function json(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch(e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function serveStatic(res, filePath) {
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    }
  });
}

// ── Router ────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const route  = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // ── API routes ─────────────────────────────────────────

  // POST /api/session
  if (route === '/api/session' && method === 'POST') {
    const body = await readBody(req);
    const sid  = body.sessionId || randomUUID();
    const hist = bot.getHistory(sid);
    return json(res, { sessionId: sid, messageCount: hist.length });
  }

  // POST /api/chat
  if (route === '/api/chat' && method === 'POST') {
    const { sessionId, message } = await readBody(req);
    if (!sessionId || !message?.trim())
      return json(res, { error: 'sessionId and message required' }, 400);
    try {
      const response = bot.process(sessionId, message);
      return json(res, { response, timestamp: new Date().toISOString() });
    } catch(e) {
      console.error('Chat error:', e);
      return json(res, { error: 'Internal error' }, 500);
    }
  }

  // GET /api/chat/:sid/history
  if (/^\/api\/chat\/[^/]+\/history$/.test(route) && method === 'GET') {
    const sid = route.split('/')[3];
    return json(res, { history: bot.getHistory(sid) });
  }

  // GET /api/menu
  if (route === '/api/menu' && method === 'GET') {
    return json(res, { menu: bot.getMenu() });
  }

  // GET /api/menu/search?q=
  if (route === '/api/menu/search' && method === 'GET') {
    // Handled by chatbot fuzzy search — just return empty for now
    return json(res, { items: [] });
  }

  // POST /api/order/add
  if (route === '/api/order/add' && method === 'POST') {
    const { sessionId, itemId, quantity } = await readBody(req);
    const result = bot.addToOrder(sessionId, itemId, quantity || 1);
    if (result.success)
      return json(res, { success: true, message: `${result.item.name} added to order!` });
    return json(res, { success: false, message: 'Item not found' }, 400);
  }

  // GET /api/order/:sid
  if (/^\/api\/order\/[^/]+$/.test(route) && method === 'GET') {
    const sid = route.split('/')[3];
    return json(res, bot.getOrder(sid));
  }

  // POST /api/order/confirm
  if (route === '/api/order/confirm' && method === 'POST') {
    const { sessionId } = await readBody(req);
    const result = bot.confirmOrder(sessionId);
    if (!result) return json(res, { error: 'No pending order' }, 404);
    return json(res, { success: true, ...result });
  }

  // GET /api/admin/stats
  if (route === '/api/admin/stats' && method === 'GET') {
    return json(res, bot.getStats());
  }

  // POST /api/feedback
  if (route === '/api/feedback' && method === 'POST') {
    const { sessionId, rating, comment } = await readBody(req);
    const db = require('./database');
    db.prepare('INSERT INTO feedback (session_id,rating,comment) VALUES (?,?,?)').run(sessionId, rating, comment);
    return json(res, { success: true });
  }

  // ── Static files ───────────────────────────────────────
  if (method === 'GET') {
    let filePath = path.join(PUBLIC, route === '/' ? 'index.html' : route);
    // Prevent path traversal
    if (!filePath.startsWith(PUBLIC)) {
      res.writeHead(403); return res.end('Forbidden');
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveStatic(res, filePath);
    }
    // SPA fallback
    return serveStatic(res, path.join(PUBLIC, 'index.html'));
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('  🍽️  Maison Élite — Restaurant Chatbot');
  console.log('  ─────────────────────────────────────');
  console.log(`  ✅  Server running at http://localhost:${PORT}`);
  console.log('  📦  No npm install needed — pure Node.js!');
  console.log('  🗄️  SQLite database auto-initialized');
  console.log('');
});
