---
type: research
tags: [research, competitor-analysis, trend-monitoring, automation, web-scraping]
---
# Research: Competitor & Trend Scanning Automation

## Summary

Automated competitor and trend monitoring combines website change detection, AI-powered web scraping, and social listening to track market movements without manual effort. The ecosystem has matured significantly with self-hosted, privacy-respecting options that integrate well with AI agents like ClawdBot. Key tools include changedetection.io for website monitoring, Firecrawl/ScrapeGraphAI for LLM-ready data extraction, and Huginn for building custom automation workflows.

## Key Findings

### 🔍 Website Change Detection

**changedetection.io** - The standout self-hosted solution
- **Docker-ready**: `docker run -p 5000:5000 dgtlmoon/changedetection.io`
- **Visual selector**: Target specific page elements without code
- **Browser automation**: Login to sites, click buttons, fill forms before monitoring
- **Smart alerts**: Discord, Telegram, Slack, Email, Webhooks
- **Price tracking**: Built-in restock/price drop detection
- **Conditional triggers**: Only alert when price < $X or keyword appears
- **Schedule control**: Monitor only during business hours, specific timezones
- **Chrome extension**: Quick-add pages to monitor
- **Cost**: Free self-hosted, or $8.99/month SaaS

**Use cases:**
- Competitor pricing changes
- Job postings on company career pages
- Government/regulatory updates
- Product restocks
- API/documentation changes

### 🤖 AI-Powered Web Scraping

**Firecrawl** - Turn websites into LLM-ready data
- Crawls entire sites, returns clean markdown
- Handles anti-bot, JavaScript rendering, proxies
- Structured data extraction with AI
- MCP Server available: `firecrawl/firecrawl-mcp-server`
- Integrations: LangChain, LlamaIndex, CrewAI, n8n, Zapier
- **Self-hostable** (requires some setup)
- API: Free tier available, paid plans for scale

**ScrapeGraphAI** - Python library for intelligent scraping
- Natural language: "Extract company info, founders, social links"
- Works with any LLM (OpenAI, Ollama/local models)
- Handles JavaScript sites via Playwright
- Multiple graph types: single page, search results, multi-page
- MCP Server available at smithery.ai
- **Runs locally** with Ollama

**Crawlee** (by Apify) - Production-grade crawler
- TypeScript/Python versions
- Built for scale with proxy rotation
- Cheerio, Puppeteer, or Playwright backends
- Designed for AI/RAG pipelines

### 🌐 Self-Hosted Automation Platform

**Huginn** - "Hackable IFTTT/Zapier on your own server"
- 45k+ GitHub stars, mature project
- Agents create events → trigger actions
- Built-in integrations: Twitter, RSS, weather, webhooks, email
- Custom JavaScript/CoffeeScript functions
- Location tracking, SMS alerts, digest emails
- Perfect for: "When X mentions spike on Twitter, alert me"

**Example Huginn workflow:**
1. WebsiteAgent monitors competitor's blog RSS
2. TriggerAgent filters for specific keywords
3. EmailDigestAgent sends daily summary
4. SlackAgent posts urgent items immediately

### 📱 Social Media Monitoring

**Open source options:**
- **MoodScope** - Chrome extension for real-time sentiment across Twitter, Facebook, Instagram, LinkedIn, Reddit, YouTube
- **OpenSocialMonitor** - Detect bots and coordinated campaigns
- **Social Otter** - Track brand mentions (Python)
- **Facebook Ads Library Scrapers** - Multiple repos for competitor ad research

**For Twitter/X specifically:**
- Huginn's Twitter agents (track keywords, mentions, spikes)
- Custom scripts with Twitter API
- Nitter instances for public monitoring

### 🔗 Integration Patterns for ClawdBot

**Tier 1: Quick Wins (Today)**
1. **changedetection.io** → Telegram webhook → ClawdBot session
   - Monitor competitor sites, get alerts in Telegram
   - ClawdBot can analyze changes, summarize, suggest actions

2. **Huginn RSS Agent** → Webhook → ClawdBot
   - Aggregate competitor blogs, news, social
   - Daily digest or real-time alerts

**Tier 2: AI-Enhanced (This Week)**
1. **Firecrawl MCP** → ClawdBot skill
   - "Scrape competitor X's features page"
   - Returns structured, LLM-ready data

2. **ScrapeGraphAI** → Local script → ClawdBot exec
   - "Extract pricing from these 5 competitor sites"
   - Uses Ollama, no API costs

**Tier 3: Advanced Automation**
1. Build a "Competitor Watch" cron job:
   - Weekly scrape of key competitor pages
   - AI summary of changes
   - Saved to `memory/competitive-intel/`
   - Morning brief includes highlights

2. Trend Detection Pipeline:
   - Huginn monitors Twitter/Reddit for keywords
   - Spikes trigger ClawdBot research session
   - Auto-generates trend report

## Practical Applications

### For Ehsan's Setup

1. **Quick Start: changedetection.io on Pi**
   ```bash
   docker run -d --restart always \
     -p 5001:5000 \
     -v ~/clawd/changedetection-data:/datastore \
     dgtlmoon/changedetection.io
   ```
   Access at http://192.168.0.217:5001

2. **Add Telegram Notifications**
   - In changedetection.io settings, add Telegram webhook
   - Messages flow to same chat as ClawdBot

3. **ClawdBot Skill Idea**: `competitor-scan`
   - Input: competitor URL or domain
   - Output: Structured report (features, pricing, positioning)
   - Uses Firecrawl or ScrapeGraphAI under the hood

4. **Weekly Intel Cron**
   ```
   Every Sunday 9am:
   - Scrape watchlist of competitor pages
   - Compare to last week's snapshots
   - Generate summary of changes
   - Save to memory/competitive-intel/YYYY-MM-DD.md
   ```

## Resources

### Tools
| Tool | Type | Self-Hosted | URL |
|------|------|-------------|-----|
| changedetection.io | Website monitoring | ✅ Docker | github.com/dgtlmoon/changedetection.io |
| Firecrawl | AI web scraping | ✅ (complex) | github.com/firecrawl/firecrawl |
| ScrapeGraphAI | LLM scraping lib | ✅ Local | github.com/ScrapeGraphAI/Scrapegraph-ai |
| Huginn | Automation platform | ✅ Docker | github.com/huginn/huginn |
| Crawlee | Production crawler | ✅ | github.com/apify/crawlee |

### Tutorials & Docs
- changedetection.io tutorials: changedetection.io/tutorials
- Firecrawl docs: docs.firecrawl.dev
- ScrapeGraphAI: scrapegraph-ai.readthedocs.io
- Huginn wiki: github.com/huginn/huginn/wiki

### MCP Servers (for AI integration)
- Firecrawl MCP: github.com/firecrawl/firecrawl-mcp-server
- ScrapeGraph MCP: smithery.ai/server/@ScrapeGraphAI/scrapegraph-mcp

## Next Steps

1. **Today**: Deploy changedetection.io on Pi, add 3-5 competitor sites
2. **This week**: Connect Telegram notifications, test workflow
3. **Next week**: Create `competitor-scan` ClawdBot skill using ScrapeGraphAI
4. **Later**: Set up weekly competitive intel cron job
5. **Consider**: Huginn for complex multi-source monitoring

## Notes

- Pi 5 with 8GB RAM can comfortably run changedetection.io + Playwright
- ScrapeGraphAI with Ollama/llama3.2 keeps costs at $0
- Start simple (changedetection.io) before building complex pipelines
- Privacy win: all data stays on your hardware
