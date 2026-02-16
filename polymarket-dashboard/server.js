const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8083;
const USER = process.env.DASHBOARD_USER || 'admin';
const PASS = process.env.DASHBOARD_PASS || 'polymarket2024';

// Path to bot data directory
const BOT_DATA_DIR = path.join(__dirname, '..', 'polymarket-bot', 'data');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function parseBasicAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) return null;
  
  const decoded = Buffer.from(auth.substring(6), 'base64').toString();
  const [user, pass] = decoded.split(':');
  return { user, pass };
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readJSONFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

const server = http.createServer((req, res) => {
  // Basic auth check
  const credentials = parseBasicAuth(req);
  if (!credentials || credentials.user !== USER || credentials.pass !== PASS) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="Polymarket Dashboard"',
      'Content-Type': 'text/plain'
    });
    res.end('Unauthorized');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // API endpoints
  if (pathname === '/api/portfolio') {
    const portfolio = readJSONFile(path.join(BOT_DATA_DIR, 'portfolio.json'));
    if (portfolio) {
      sendJSON(res, portfolio);
    } else {
      sendJSON(res, { error: 'Portfolio not found' }, 404);
    }
    return;
  }

  if (pathname === '/api/bets') {
    const bets = readJSONFile(path.join(BOT_DATA_DIR, 'bets.json'));
    if (bets) {
      sendJSON(res, bets);
    } else {
      sendJSON(res, []);
    }
    return;
  }

  if (pathname === '/api/history') {
    const history = readJSONFile(path.join(BOT_DATA_DIR, 'history.json'));
    if (history) {
      sendJSON(res, history);
    } else {
      sendJSON(res, []);
    }
    return;
  }

  if (pathname === '/api/status') {
    const portfolio = readJSONFile(path.join(BOT_DATA_DIR, 'portfolio.json'));
    const bets = readJSONFile(path.join(BOT_DATA_DIR, 'bets.json')) || [];
    
    const pending = bets.filter(b => !b.resolved);
    const resolved = bets.filter(b => b.resolved);
    
    sendJSON(res, {
      portfolio,
      pending_count: pending.length,
      resolved_count: resolved.length,
      last_updated: new Date().toISOString()
    });
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA routing
        fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`🎰 Polymarket Dashboard running at http://localhost:${PORT}`);
  console.log(`   Username: ${USER}`);
  console.log(`   Password: ${'*'.repeat(PASS.length)}`);
  console.log(`   Bot data: ${BOT_DATA_DIR}`);
});
