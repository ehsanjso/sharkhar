---
name: cloudflare-deploy
description: Deploy web apps and static sites to Cloudflare Pages with password protection. Use when deploying dashboards, APIs, or any web service to Cloudflare. Handles wrangler setup, basic auth middleware, environment variables, and project configuration.
---

# Cloudflare Deploy

Deploy static sites and serverless apps to Cloudflare Pages with password protection.

## When to Use
- Deploying static sites or Next.js apps to Cloudflare Pages
- Setting up password-protected dashboards
- Managing Cloudflare Pages projects and secrets
- D1 database setup for serverless apps

## When NOT to Use
- **pm2** → Running Node.js apps locally on the Pi
- **homeassistant** → Home automation (not web hosting)
- **simple-backup** → Backing up files (not deploying)

## Token Location

Token stored at: `~/.cloudflare-token`

```bash
# Use token in commands
CLOUDFLARE_API_TOKEN=$(cat ~/.cloudflare-token) npx wrangler <command>
```

## Quick Deploy (3 steps)

```bash
# 1. Create project (first time only)
CLOUDFLARE_API_TOKEN=$(cat ~/.cloudflare-token) npx wrangler pages project create <app-name> --production-branch main

# 2. Deploy
CLOUDFLARE_API_TOKEN=$(cat ~/.cloudflare-token) npx wrangler pages deploy ./public --project-name <app-name> --commit-dirty=true

# 3. Set password (if using auth middleware)
CLOUDFLARE_API_TOKEN=$(cat ~/.cloudflare-token) npx wrangler pages secret put AUTH_USER --project-name <app-name> <<< "admin"
CLOUDFLARE_API_TOKEN=$(cat ~/.cloudflare-token) npx wrangler pages secret put AUTH_PASS --project-name <app-name> <<< "yourpassword"
```

## Prerequisites

- Wrangler CLI: `npm install wrangler` (in project) or `npx wrangler`
- Token saved at `~/.cloudflare-token`

## Quick Deploy (Static Site)

```bash
# Deploy a directory
wrangler pages deploy ./public --project-name my-app

# First-time setup prompts to create project
# Subsequent deploys update the same project
```

## Password Protection

Add basic auth via Pages Functions middleware:

### 1. Create `functions/_middleware.js`

```javascript
const REALM = 'Protected';

export async function onRequest(context) {
  const { request, env, next } = context;
  
  const user = env.AUTH_USER || 'admin';
  const pass = env.AUTH_PASS || 'changeme';
  
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Basic ')) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': `Basic realm="${REALM}"` }
    });
  }
  
  const [u, p] = atob(auth.slice(6)).split(':');
  if (u !== user || p !== pass) {
    return new Response('Invalid credentials', { status: 401 });
  }
  
  return next();
}
```

### 2. Set credentials in Cloudflare Dashboard

Settings → Environment Variables → Add:
- `AUTH_USER` = your_username
- `AUTH_PASS` = your_password

Or via wrangler.toml for local dev:
```toml
[vars]
AUTH_USER = "admin"
AUTH_PASS = "localpass"
```

## Project Structure

```
my-app/
├── public/           # Static files
│   └── index.html
├── functions/        # Serverless functions
│   └── _middleware.js  # Auth middleware
├── wrangler.toml     # Config
└── package.json
```

## wrangler.toml

```toml
name = "my-app"
compatibility_date = "2024-01-01"
pages_build_output_dir = "public"

[vars]
AUTH_USER = "admin"
AUTH_PASS = "devpass"
```

## Deploy Commands

```bash
# Local dev with functions
wrangler pages dev public --port 8080

# Deploy to production
wrangler pages deploy public --project-name my-app

# Deploy with API token (non-interactive)
CLOUDFLARE_API_TOKEN=xxx wrangler pages deploy public
```

## API Token Setup

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create Token → Use template "Edit Cloudflare Workers"
3. Add permissions: Pages:Edit
4. Store token: `export CLOUDFLARE_API_TOKEN=xxx`

## Advanced: Workers Routes

For API endpoints or custom logic, add route handlers:

```
functions/
├── _middleware.js    # Global auth
├── api/
│   └── data.js       # GET /api/data
└── webhook.js        # POST /webhook
```

Example `functions/api/data.js`:
```javascript
export async function onRequest(context) {
  return Response.json({ status: 'ok' });
}
```

## Troubleshooting

- **401 on every request**: Check middleware is in `functions/` not `public/`
- **Functions not running**: Ensure `wrangler.toml` has `pages_build_output_dir`
- **Deploy fails**: Verify API token has Pages:Edit permission
