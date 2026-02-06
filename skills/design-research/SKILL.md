---
name: design-research
version: 1.0.0
description: Best-of-breed design research using Mobbin. Analyzes a product URL or description, finds the best UX flows from multiple top-rated apps, downloads screenshots, and packages with a ready-to-use prompt for AI design agents.
metadata: {"clawdbot":{"emoji":"🎨","requires":{"bins":["node"]}}}
---

# Design Research Tool

Find the best UX patterns for any product by analyzing top-rated apps on Mobbin.

## When to Use

Trigger on:
- "Design research for [URL]"
- "Find design inspiration for [product description]"
- "Best UX patterns for [type of app]"
- "Get Mobbin flows for [app concept]"
- User shares a URL and asks for design help

## How It Works

1. **Analyze** — Read the URL/description to understand the product type
2. **Categorize** — Determine what flows are needed (onboarding, dashboard, checkout, etc.)
3. **Find best-of-breed** — Search Mobbin across iOS + Web for apps with the best flows for each category
4. **Download** — Get sequential screenshots from each flow
5. **Package** — Create a zip with organized folders + PROMPT.md for AI design agents

## Product Categories

The tool recognizes 20+ product types and knows what flows each needs:

| Category | Example Products | Key Flows |
|----------|-----------------|-----------|
| **SaaS Dashboard** | Linear, Notion, Figma | Onboarding, Dashboard, Settings, Billing |
| **AI Tool** | ChatGPT, Perplexity | Chat interface, Model selection, History |
| **Marketplace** | Fiverr, Upwork, Airbnb | Listing creation, Search/browse, Booking, Reviews |
| **E-commerce** | Shopify, Amazon | Product pages, Cart, Checkout, Order tracking |
| **Fintech** | Revolut, Wise | Onboarding/KYC, Dashboard, Transfers, Cards |
| **Social/Creator** | Instagram, TikTok | Feed, Profile, Create post, Notifications |
| **Dev Tools** | Vercel, GitHub | Dashboard, Deploy, Logs, Settings |
| **Health/Wellness** | Headspace, Calm | Onboarding, Dashboard, Tracking, Programs |
| **Education** | Duolingo, Coursera | Onboarding, Course view, Progress, Quizzes |
| **Travel** | Airbnb, Booking.com | Search, Listing detail, Booking, Trip management |
| **Food Delivery** | DoorDash, Uber Eats | Browse, Menu, Cart, Order tracking |
| **Real Estate** | Zillow, Redfin | Search, Property detail, Saved homes |
| **Dating** | Hinge, Tinder, Bumble | Onboarding, Discovery, Profile, Messaging |
| **Notes/PKM** | Notion, Obsidian | Editor, Navigation, Search, Templates |
| **Music/Audio** | Spotify, SoundCloud | Player, Library, Search, Playlists |
| **Video Streaming** | Netflix, YouTube | Browse, Player, Watchlist, Profiles |
| **Communication** | Slack, Discord | Channels, Messaging, Threads, Calls |
| **HR/Recruiting** | LinkedIn, Greenhouse | Job search, Application, Profile |
| **IoT/Smart Home** | Google Home, Ring | Dashboard, Device control, Automation |
| **Gaming** | Steam, Xbox | Store, Library, Profile, Achievements |
| **Photography** | VSCO, Lightroom | Gallery, Editor, Filters, Albums |
| **Scheduling** | Calendly, Cal.com | Calendar, Booking page, Availability |
| **Legal** | DocuSign | Document view, Signing, Templates |
| **Analytics** | Amplitude, Mixpanel | Dashboard, Reports, Charts |

## Scripts

### Main Research (recommended)
```bash
# Full pipeline: URL → analyze → find apps → download → zip
node skills/design-research/scripts/research.js "https://example.com"
node skills/design-research/scripts/research.js "AI writing assistant SaaS"
```

### Individual Commands
```bash
# Search for an app by name
node scripts/mobbin-scraper.js search "Linear" --platform web

# Find an app and list its flows
node scripts/mobbin-scraper.js find-flows "Shopify web dashboard"

# List flows from a known app URL
node scripts/mobbin-scraper.js app-flows <mobbin-app-url>

# Download a specific flow
node scripts/mobbin-scraper.js download-flow <mobbin-app-url> 1 "label"
```

### Platform Detection

The tool auto-detects platform from keywords:
- **Web**: "web", "SaaS", "dashboard", "website", "browser", "desktop"
- **iOS**: "mobile", "iOS", "app store", "phone", "android"

Or specify explicitly: `--platform web` / `--platform ios`

## Output Format

```
/product-design-research/
├── 01-ui-reference-{app}/     # Best UI design language
├── 02-{flow}-{app}/           # Best flow for each category
├── 03-{flow}-{app}/
├── ...
└── PROMPT.md                  # Ready-to-paste prompt for v0/Cursor
```

## PROMPT.md Contents

The generated prompt includes:
- Product overview (from URL analysis)
- Design recommendations (which app for which aspect)
- Flow mapping table (product feature → reference app)
- Ready-to-paste prompt for AI design agents
- Tech stack suggestion (Next.js, shadcn/ui, Tailwind)

## Configuration

No API keys required for basic operation (uses browser automation).

Optional (for sentiment research):
- `TAVILY_API_KEY` — Search Reddit/blogs for UX sentiment
- `EXA_API_KEY` — Alternative neural search

## Examples

```
User: "Design research for https://myapp.com"
→ Fetches landing page, categorizes as "SaaS + AI", finds Linear + Perplexity + Shopify flows, packages 50+ screens with PROMPT.md

User: "Best UX patterns for a two-sided marketplace"
→ Searches Fiverr + Upwork + Airbnb, downloads onboarding + listing + search flows from each

User: "Find Mobbin flows for fintech onboarding"
→ Searches Revolut + Wise + Coinbase, downloads KYC + onboarding flows
```

## Limitations

- Requires Mobbin login (browser session must be authenticated)
- Best-of-breed selection is based on Mobbin ratings + agent knowledge
- Some niche app categories may not have great Mobbin coverage
- Downloads are 1080px PNG (sufficient for design reference)
