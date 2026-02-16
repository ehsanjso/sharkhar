# Cloudflare Deploy Patterns

## Full Stack App Template

```
project/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── functions/
│   ├── _middleware.js      # Global auth
│   ├── api/
│   │   ├── [[path]].js     # Catch-all API route
│   │   └── health.js       # GET /api/health
│   └── webhook.js          # POST /webhook
├── wrangler.toml
└── package.json
```

## Auth Patterns

### IP Allowlist + Basic Auth

```javascript
const ALLOWED_IPS = ['1.2.3.4', '5.6.7.8'];

export async function onRequest(context) {
  const ip = context.request.headers.get('CF-Connecting-IP');
  
  // Skip auth for allowed IPs
  if (ALLOWED_IPS.includes(ip)) {
    return context.next();
  }
  
  // Otherwise require basic auth
  // ... basic auth logic ...
}
```

### Path-based Auth (some routes public)

```javascript
const PUBLIC_PATHS = ['/health', '/api/public'];

export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  if (PUBLIC_PATHS.some(p => url.pathname.startsWith(p))) {
    return context.next();
  }
  
  // Require auth for all other paths
  // ... basic auth logic ...
}
```

### JWT Auth

```javascript
export async function onRequest(context) {
  const auth = context.request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response('Missing token', { status: 401 });
  }
  
  const token = auth.slice(7);
  try {
    // Verify JWT (use jose or similar)
    const payload = await verifyJWT(token, context.env.JWT_SECRET);
    context.data.user = payload;
    return context.next();
  } catch {
    return new Response('Invalid token', { status: 401 });
  }
}
```

## Environment Variables

### Production vs Preview

In `wrangler.toml`:
```toml
[vars]
API_URL = "https://api.example.com"

[env.preview.vars]
API_URL = "https://staging-api.example.com"
```

### Secrets (never commit)

```bash
# Set production secret
wrangler pages secret put AUTH_PASS --project-name my-app

# Or via dashboard: Settings → Environment Variables → Encrypt
```

## Custom Domains

1. Add domain in Cloudflare Pages dashboard
2. Update DNS: CNAME `app.example.com` → `my-app.pages.dev`
3. SSL auto-provisions

## Build Commands

For frameworks that need building:

```toml
# wrangler.toml
[build]
command = "npm run build"

[site]
bucket = "./dist"
```

Common commands:
- React: `npm run build` → `./build`
- Next.js: `npx @cloudflare/next-on-pages` → `.vercel/output/static`
- Vite: `npm run build` → `./dist`
- Static: no build needed

## Caching Headers

```javascript
// functions/static/[[path]].js
export async function onRequest(context) {
  const response = await context.next();
  
  // Cache static assets for 1 year
  const url = new URL(context.request.url);
  if (url.pathname.match(/\.(js|css|png|jpg|woff2)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000');
  }
  
  return response;
}
```

## Rate Limiting

```javascript
// Simple in-memory (resets per-worker)
const requests = new Map();
const LIMIT = 100;
const WINDOW = 60000;

export async function onRequest(context) {
  const ip = context.request.headers.get('CF-Connecting-IP');
  const now = Date.now();
  
  const record = requests.get(ip) || { count: 0, reset: now + WINDOW };
  if (now > record.reset) {
    record.count = 0;
    record.reset = now + WINDOW;
  }
  
  record.count++;
  requests.set(ip, record);
  
  if (record.count > LIMIT) {
    return new Response('Rate limited', { status: 429 });
  }
  
  return context.next();
}
```

## CORS Headers

```javascript
export async function onRequest(context) {
  const response = await context.next();
  
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}
```
