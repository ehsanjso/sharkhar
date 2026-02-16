---
type: research
tags: [research, cloudflare, d1, database, serverless, drizzle]
---

# Research: Cloudflare D1 Serverless Database

## Summary
Cloudflare D1 is a fully managed, serverless SQL database built on SQLite that runs at the edge. It reached GA in April 2024 and is now production-ready with features like read replication, point-in-time recovery (Time Travel), and native integration with Workers and Pages. For Ehsan's workflow, D1 is the natural backend solution after deploying to Cloudflare Pages, enabling full-stack edge applications without managing servers.

## Key Findings

### Architecture & Capabilities
- **SQLite-based**: Familiar SQL syntax, runs on SQLite's engine
- **Serverless**: No provisioning, no capacity planning, scale-to-zero
- **Built on Durable Objects**: Each database backed by a single globally-unique DO for consistency
- **Read Replication (GA)**: Distributes reads globally via Sessions API for low latency
- **Time Travel**: Point-in-time recovery to any minute in last 30 days (no config needed)

### Pricing (Very Generous)
| Resource | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Rows read | 5M/day | 25B/month included, then $0.001/million |
| Rows written | 100K/day | 50M/month included, then $1.00/million |
| Storage | 5 GB total | First 5 GB free, then $0.75/GB-mo |
| Databases | 10 | 50,000 (request more) |
| Max DB size | 500 MB | 10 GB |

**No egress charges!** No bandwidth or data transfer fees.

### Limits to Know
- Max database size: 10 GB (design for horizontal scale - many small DBs)
- Max row size: 2 MB
- Max columns per table: 100
- Max query duration: 30 seconds
- Free tier: 50 queries per Worker invocation
- Paid tier: 1,000 queries per Worker invocation

### Sessions API (Read Replication)
```typescript
// Sequential consistency across requests
const token = request.headers.get('x-d1-token') ?? 'first-unconditional'
const session = env.DB.withSession(token)

// Reads go to nearest replica, writes to primary
const { results } = await session.prepare('SELECT * FROM users').all()
```
- `first-unconditional`: Use whatever replica state exists, then maintain consistency
- `first-primary`: Guarantee first read sees latest data
- `<commit_token>`: Resume session from previous request

## Practical Applications for Ehsan

### 1. Backend for Komod AI
Instead of running a database on the Pi (memory constraints), use D1:
- Store wardrobe items, user preferences, wear history
- Edge-deployed = fast globally
- No Pi resources consumed

### 2. Polymarket Dashboard Enhancement
Currently deployed to Cloudflare Pages - add persistent storage:
- Store historical data beyond API limits
- User preferences and watchlists
- Analytics and tracking

### 3. Future SaaS Projects
D1 is designed for multi-tenant apps:
- One database per user/tenant (50K DBs on paid)
- Billing only on actual usage
- No cold start concerns

### 4. Quick Prototypes
With cloudflare-deploy skill already created:
```bash
# Create database
npx wrangler d1 create my-app-db

# Define schema
npx wrangler d1 execute my-app-db --file=./schema.sql

# Deploy Worker with D1 binding
npx wrangler deploy
```

## Drizzle ORM Integration
Type-safe queries with minimal setup:

```typescript
// schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name')
});

// worker.ts
import { drizzle } from 'drizzle-orm/d1';
import { users } from './schema';

export default {
  async fetch(request: Request, env: Env) {
    const db = drizzle(env.DB);
    const result = await db.select().from(users).all();
    return Response.json(result);
  }
};
```

**Migration workflow:**
```bash
# Generate migrations from schema changes
npx drizzle-kit generate

# Push to local D1
npx wrangler d1 migrations apply my-db --local

# Push to production
npx wrangler d1 migrations apply my-db --remote
```

## Resources

### Official Docs
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Getting Started Guide](https://developers.cloudflare.com/d1/get-started/)
- [Time Travel / Backups](https://developers.cloudflare.com/d1/reference/time-travel/)
- [Pricing](https://developers.cloudflare.com/d1/platform/pricing/)

### ORM/Query Builders
- [Drizzle ORM + D1](https://orm.drizzle.team/docs/connect-cloudflare-d1)
- [Prisma + D1](https://www.prisma.io/docs/orm/prisma-client/deployment/edge/deploy-to-cloudflare#d1)
- [Kysely D1 Adapter](https://github.com/aidenwallis/kysely-d1)

### Community Projects
- [d1-console](https://github.com/isaac-mcfadyen/d1-console) - Interactive CLI for D1
- [workers-qb](https://github.com/G4brym/workers-qb) - Zero-dep query builder
- [NuxtHub](https://hub.nuxt.com) - Nuxt + D1/KV/R2 integration

### Architecture Deep Dive
- [Building D1: A Global Database](https://blog.cloudflare.com/building-d1-a-global-database/) - How Sessions API ensures consistency

## Next Steps

1. **Add D1 to cloudflare-deploy skill** - Document D1 setup alongside Pages deployment
2. **Prototype: Komod AI backend** - Create D1 schema for wardrobe items
3. **Prototype: Polymarket history** - Store prediction market snapshots
4. **Test Time Travel** - Practice point-in-time recovery workflow
5. **Benchmark latency** - Compare Pi-hosted SQLite vs D1 edge latency

## Quick Start Commands

```bash
# Install wrangler (if needed)
npm install -g wrangler

# Create database
npx wrangler d1 create my-app

# Add to wrangler.toml
# [[d1_databases]]
# binding = "DB"
# database_name = "my-app"
# database_id = "<from create output>"

# Create schema
echo "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT);" > schema.sql
npx wrangler d1 execute my-app --local --file=./schema.sql

# Query
npx wrangler d1 execute my-app --local --command="SELECT * FROM users"

# Deploy to production
npx wrangler d1 execute my-app --remote --file=./schema.sql
```

---
*Researched 2026-02-15 | Topic naturally follows cloudflare-deploy skill creation (Feb 14)*
