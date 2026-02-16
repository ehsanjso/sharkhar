const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8083;
const USER = process.env.DASHBOARD_USER || 'admin';
const PASS = process.env.DASHBOARD_PASS || 'polymarket2024';

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

  // Serve static files
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
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
});
