# 🧠 Long-term Memory

*Last updated: 2026-02-08*

## About Ehsan

- **Name:** Ehsan Jso
- **Telegram:** @EhsanJso
- **Timezone:** America/Toronto (EST)
- **Platform:** Raspberry Pi 5

## ⚠️ Active Issues

### Pi 5 Thermal Throttling (Feb 6)
**Status:** Pi running at 84.2°C with active throttling (flags 0xe0008)
- Soft temperature limit active
- ARM frequency capping occurring
- Affects ALL services: ClawdBot, Uptime Kuma, Mission Control, bots

**Immediate fix:** Order Official Active Cooler ($5 USD)
- Drops temps 25-30°C
- Dead-simple installation
- Has PWM fan control via config.txt

**Workaround until cooler arrives:**
- Position Pi for better airflow
- Monitor with `pi-health.sh` (now has throttle detection)

**Research:** `memory/research/2026-02-06-raspberry-pi-5-thermal-management.md`

---

## Our Projects

### Uptime Kuma (Service Monitoring)

Monitoring all services on the Raspberry Pi via Docker.

**Access:**
- URL: http://192.168.0.217:3001
- Username: admin
- Password: clawd2026!

**Running in Docker:**
- Container: `uptime-kuma`
- Auto-restart: enabled
- Data: persisted in Docker volume
- Stable version (no SQL bugs)

**Monitors (9 total, all UP):**
1. Pi-hole Web Interface (HTTP)
2. Pi-hole DNS Port (53)
3. ClawdBot Web (port 3000)
4. SSH Service (port 22)
5. Raspberry Pi 5 (ping)
6. Uptime Kuma (self-monitoring)
7. Router/Gateway (192.168.0.1)
8. Internet Connectivity (8.8.8.8)
9. External Web Access (google.com)

**Docker commands:**
```bash
sudo docker ps                    # Check status
sudo docker logs uptime-kuma      # View logs
sudo docker restart uptime-kuma   # Restart
sudo docker stop uptime-kuma      # Stop
sudo docker start uptime-kuma     # Start
```

**API management:**
```bash
# Using the kuma.py skill script
export UPTIME_KUMA_URL="http://localhost:3001"
export UPTIME_KUMA_USERNAME="admin"
export UPTIME_KUMA_PASSWORD="clawd2026!"
python /home/ehsanjso/clawd/skills/uptime-kuma/scripts/kuma.py list
```

---

### Claude Quota Monitoring

Automated tracking to pace Claude usage optimally.

**Cron job:** "Claude Quota Monitor" runs 9am, 3pm, 9pm daily
**Cache:** `memory/quota-cache.json` (session, weeklyAll, weeklySonnet)

**Reset windows:**
- Session: ~every 5 hours
- Weekly All: Thursday 10:59 PM
- Weekly Sonnet: Saturday 4:59 PM

**Goal:** Pace to hit ~80% at each reset (maximize value without wasting quota)

---

### Mission Control (Second Brain)

My second brain app for viewing and organizing memories, journals, and documents.

**What it does:**
- Shows all documents from `memory/` folder
- Daily journal entries tracking our conversations
- Filter by type: Journal, Content, Newsletters, Other
- Markdown viewer with nice formatting
- Input bar for sending messages (UI ready)

**Access:**
- App: http://192.168.0.217:3000
- Tasks: http://192.168.0.217:3000/tasks

**How I use it:**
1. Create daily journal entries in `memory/YYYY-MM-DD.md`
2. Flesh out important concepts in separate docs
3. Review past conversations to maintain context
4. Track tasks and progress visually

**New pages (Feb 2026):**
- `/agent` — Agent Dashboard for context recovery (quota, crons, recent activity)
- `/crons` — Detailed cron job viewer with success/failure tracking

The Agent Dashboard helps me wake up each session knowing what happened.

**API:**
- `/api/agent-context` — Fetches live data from gateway (quota, crons, activity)
- Quota data from `memory/quota-cache.json` (updated by quota monitor cron)

---

## ClawdBot Setup (from Alex Finn's video)

### Use Cases to Implement

1. **Morning Brief (8am)** — Daily summary with:
   - Weather
   - Trending videos
   - Today's tasks
   - What I worked on overnight
   - Suggested priorities

2. **Proactive Coder (11pm)** — Nightly builds:
   - Build tools/features while Ehsan sleeps
   - Create PRs for review
   - Don't push live, just prepare for testing

3. **Daily Research Report (afternoon)** — Deep dives on:
   - Concepts Ehsan is interested in
   - Workflow improvements
   - Business ideas

4. **Last30Days Skill** — Trend research from X/Reddit
   - GitHub: github.com/mvanhorn/last30days-skill

---

## Preferences & Patterns

- Prefers dark mode UIs
- Interested in AI tooling and automation
- Uses Telegram for communication
- Values proactive help over waiting to be asked

---

## Integration Opportunities (Discovered Feb 2026)

### MCP Servers
- **mcporter** already installed at `/home/ehsanjso/.npm-global/bin/mcporter`
- MCP = "USB-C for AI" — standardized tool access protocol
- **Quick wins:** Home Assistant MCP, SQLite queries via chat, enhanced Git ops
- **Pipedream MCP** gives access to 2,500+ APIs at once
- Research: `memory/research/2026-02-02-mcp-servers-ecosystem.md`

### Pi-hole Advanced Features
- **CLI:** Full control via `pihole` command
- **REST API:** Modern API at `http://pi.hole/api/`
- **Local DNS:** Can create custom `.local` domains (mission-control.local, etc.)
- **Regex filtering:** mmotti/pihole-regex for pattern-based blocking
- **DHCP mode:** Can replace router DHCP for automatic DNS assignment
- Potential: Pi-hole stats page in Mission Control
- Research: `memory/research/2026-02-01-pihole-advanced-features.md`

### Ollama / Local LLMs (Researched Feb 4)
- **Viable on Pi 5** — 1-3B models run at 5-15 tokens/sec
- **Install:** `curl -fsSL https://ollama.com/install.sh | sh`
- **Best small models:** tinyllama (638MB), llama3.2:1b (1.3GB), phi4-mini (2.5GB)
- **OpenAI-compatible API** at localhost:11434
- **HA native integration** — Ollama as conversation agent for voice control
- **Hybrid approach** — Local for simple queries, Claude for complex reasoning
- **Benefits:** Quota relief, offline capability, privacy for sensitive queries
- Research: `memory/research/2026-02-04-ollama-local-llms-raspberry-pi.md`

### Caddy Reverse Proxy (Researched Feb 5)
- **Best choice for Pi 5** — Single binary, ~40MB RAM, dead-simple config
- **Install:** `apt install caddy`
- **`tls internal`** auto-generates LAN certs (no Let's Encrypt needed)
- **Pi-hole + Caddy combo:** DNS resolves `*.home` to Pi, Caddy routes to correct port
- **Setup:** ~35 min from zero to clean URLs
- **Blocked by:** Port 80 conflict with Pi-hole (move lighttpd to 8080 first)
- **Goal:** `mission.home`, `uptime.home`, `pihole.home` instead of IP:port
- Research: `memory/research/2026-02-05-reverse-proxy-homelab.md`

### Home Assistant + AI (Researched Feb 3)
- HA supports Claude, GPT-4o, Gemini, and Ollama as conversation agents
- Device control via AI — lights, climate, scenes
- Entity exposure security model (choose which devices AI can access)
- Voice hardware options: $13-$59 for wake-word-triggered assistants
- **Two paths:** HA AI for voice, ClawdBot homeassistant skill for text/cron
- Research: `memory/research/2026-02-03-home-assistant-ai-integration.md`

### Social Media Trend Monitoring (Researched Feb 7)
- **Last30Days skill** — Claude Code skill that searches Reddit + X + web, synthesizes with engagement weighting
- **Requires:** OpenAI key (for Reddit web_search) + xAI key (for X search)
- **Works without keys** but loses engagement metrics
- **Judge Agent pattern** — Weights Reddit/X higher than web due to engagement signals
- **Alternatives:** PRAW (free Python Reddit API, 100 queries/min), Tavily/Exa for web
- **Use cases:** Investor sentiment (r/wallstreetbets), AI trend monitoring, product research
- **Gap:** No web search APIs configured yet (Brave, Tavily, Exa all missing keys)
- Research: `memory/research/2026-02-07-social-media-trend-monitoring.md`

### 🐛 Ralph Wiggum Approach (ALWAYS use for coding!)

Work in small, iterative loops. "I'm helping!" one tiny step at a time.

1. **Pick ONE small task** — Not a whole feature
2. **Smallest possible piece** — What's the tiniest next step?
3. **Verify it works** — Test before moving on
4. **Commit frequently** — Each commit = one small thing
5. **Loop** — Back to step 1

**Rules:**
- NO big rewrites in one go
- If stuck, make the step SMALLER
- "I'm helping!" > "I'll fix everything"
- Compound small wins into big progress

---

## Spare Capacity Pattern (Working Well)

The spare capacity cron runs at noon daily. Priority order:
1. Memory maintenance (if >3 days since last review)
2. Code improvements (polymarket-bot, manifold-bot, investor-tracker)
3. Research (AI news, ArXiv, tools/skills)
4. Documentation

**Recent code improvements:**
- Investor-tracker: fixed indentation bug in `fetch_13f_summary()` — 13F processing only ran in fallback case (Feb 7)
- Polymarket scanner: added timeouts, retry logic, specific exception handling, logging (Feb 3)
- Scripts: enhanced backup-clawdbot.sh (dry-run, --keep, --help) and prune-sessions.sh (Feb 4)
- Pi-health.sh: added CPU throttle detection with bit decoding (Feb 5) — this revealed the 84°C throttling issue!

**Research archive:** `memory/research/` — accumulating nicely:
- Remotion on Pi, competitor scanning, LLM routing (Jan 30-31)
- Pi-hole advanced, MCP ecosystem, HA + AI, Ollama, ArXiv papers (Feb 1-4)
- AI news digest with industry trends (Feb 3)

---

## Design Research Tools

### Mobbin Design Pipeline (Feb 5)
- Built a workflow to fetch best-in-class UI flows from Mobbin
- Takes URL/description → analyzes product → finds best flows from multiple apps → downloads
- **Key insight:** Power is mixing flows from *different* apps (e.g., Linear for onboarding, Perplexity for chat UI)
- First test: Bayclaw — 51 screens across Linear, Perplexity, Shopify
- Scripts: `skills/frontend-design/design-research/`

---

## Lessons Learned

- **Mission Control is MY tool** — Use it actively, not just build it
- **Memory = continuity** — Write everything down, mental notes don't survive sessions
- **Match the reference** — When building from a video, get actual screenshots
- **Task board = visibility** — Helps both of us track progress
- **Spare capacity cron works** — Good pattern for using downtime productively
- **Research compounds** — Each topic builds on previous (MCP → HA → Ollama → all connect)
- **Small code fixes matter** — Timeouts, retries, and proper error handling prevent silent failures
