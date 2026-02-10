---
type: research
tags: [research, n8n, automation, homelab, workflows]
---
# Research: n8n Workflow Automation for Homelab

## Summary

n8n is a visual workflow automation platform with 400+ integrations that can self-host on your Pi 5. It bridges all your existing services (Home Assistant, Telegram, Ollama) with a drag-and-drop interface. Think "Zapier but local and free" — perfect for connecting your homelab stack without writing code for every automation.

## Why This Topic

Looking at your recent work:
- **Tailscale** (Feb 9) — Remote access to services
- **RAG** (Feb 8) — Local AI for knowledge search
- **Ollama** (Feb 4) — Local LLMs on Pi 5
- **Home Assistant** (Feb 3) — Smart home control

**The missing piece:** A way to *connect* all these services into automated workflows without custom coding for each integration. n8n is that glue layer.

## Key Findings

### What n8n Does
- **Visual workflow builder** — Drag-and-drop nodes, connect them with wires
- **400+ built-in integrations** — Telegram, Home Assistant, HTTP, SQL, Git, Slack, email, and more
- **Webhook triggers** — Start workflows from external events
- **Schedule triggers** — Cron-like scheduling (alternative to ClawdBot crons for some tasks)
- **AI nodes** — Native Ollama integration for local LLM-powered workflows

### n8n AI Starter Kit (Perfect for Your Stack)

n8n offers a Docker Compose template that bundles:
- ✅ **n8n** — The automation platform
- ✅ **Ollama** — Local LLMs (you already researched this!)
- ✅ **Qdrant** — Vector database (similar to LanceDB from your RAG research)
- ✅ **PostgreSQL** — Production-grade database

**Clone and run:**
```bash
git clone https://github.com/n8n-io/self-hosted-ai-starter-kit.git
cd self-hosted-ai-starter-kit
cp .env.example .env  # Edit with your secrets
docker compose --profile cpu up  # No GPU needed for Pi 5
```

Access at: `http://192.168.0.217:5678`

### Key Integrations for Your Setup

| Integration | What It Can Do |
|-------------|----------------|
| **Telegram** | Send/receive messages, photos, files, locations, callbacks |
| **Home Assistant** | Control devices, get states, call services, camera snapshots |
| **Ollama** | Use local LLMs in workflows (text generation, classification) |
| **HTTP Request** | Call any API (Uptime Kuma, Pi-hole, etc.) |
| **Execute Command** | Run shell commands on the Pi |
| **Schedule Trigger** | Cron expressions for timed workflows |
| **Webhook** | Receive events from external services |

### n8n vs Node-RED

| Aspect | n8n | Node-RED |
|--------|-----|----------|
| **UI** | Modern, polished | Functional, dated |
| **Learning curve** | Lower | Higher |
| **AI nodes** | Built-in Ollama/OpenAI | Requires custom nodes |
| **Integrations** | 400+ native | 5000+ (but many community-maintained) |
| **Best for** | API orchestration, AI workflows | IoT, hardware, MQTT |
| **RAM on Pi** | ~200-400MB | ~100-200MB |
| **Ecosystem** | Growing | Mature |

**Verdict:** n8n for API/AI workflows, Node-RED if you're doing heavy IoT/MQTT. Your stack is more API-heavy, so n8n fits better.

### Docker Installation (Standalone)

If you don't want the full AI starter kit:

```bash
docker volume create n8n_data

docker run -d --restart=always \
  --name n8n \
  -p 5678:5678 \
  -e GENERIC_TIMEZONE="America/Toronto" \
  -e TZ="America/Toronto" \
  -e N8N_RUNNERS_ENABLED=true \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

Access: `http://192.168.0.217:5678`

### Example Workflows You Could Build

1. **Morning Brief Alternative**
   - Schedule Trigger (8am) → Weather API → Calendar API → Format with Ollama → Telegram Send

2. **Uptime Kuma Alerts → Home Assistant**
   - Webhook (Uptime Kuma alert) → Home Assistant (flash lights red)

3. **AI Document Processing**
   - Telegram file received → Local Ollama analysis → Save to memory folder → Reply summary

4. **Price Monitor**
   - Schedule (daily) → Web scrape → Compare to threshold → Telegram alert if changed

5. **Git Backup Automation**
   - Schedule (nightly) → Execute Command (git status) → If changes → Commit and push

### Resource Usage on Pi 5

Based on similar setups:
- **RAM:** 200-400MB (n8n alone), 600MB+ (with Qdrant/Postgres)
- **CPU:** Minimal unless running workflows constantly
- **Storage:** ~500MB for Docker image + workflow data

**Note:** With your thermal throttling situation (84°C noted in MEMORY.md), the full AI starter kit might push temps. Consider:
1. Getting the Active Cooler first ($5)
2. Or running n8n standalone without Qdrant/Postgres

## Practical Applications for Your Setup

### 1. Connect Existing Services
n8n becomes the "brain" connecting:
- **ClawdBot** ↔ **Home Assistant** ↔ **Telegram**
- Webhooks from Uptime Kuma → automated responses
- Pi-hole API data → visualizations

### 2. Complement ClawdBot Crons
Some tasks fit n8n better:
- Simple webhook-to-action flows (no AI reasoning needed)
- Multi-step API orchestrations
- Visual debugging of complex workflows

ClawdBot crons are better for:
- Tasks requiring Claude's reasoning
- Memory context awareness
- Conversational responses

### 3. Local AI Workflows Without API Costs
With the Ollama integration:
- Document summarization
- Text classification
- Data extraction
- All running locally on your Pi

## Resources

- **n8n Docs:** https://docs.n8n.io/
- **AI Starter Kit:** https://github.com/n8n-io/self-hosted-ai-starter-kit
- **Workflow Templates:** https://n8n.io/workflows/
- **Docker Installation:** https://docs.n8n.io/hosting/installation/docker/
- **Home Assistant Node:** https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.homeassistant/
- **Telegram Node:** https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.telegram/
- **Community Forum:** https://community.n8n.io/

## Next Steps

1. **Install Active Cooler** — Thermal headroom before adding more Docker containers
2. **Try standalone n8n** — Simple Docker run without the full AI kit
3. **Build one workflow** — Start with "Uptime Kuma webhook → Telegram alert"
4. **Add Caddy reverse proxy** — Access at `n8n.home` (connects to Feb 5 research)
5. **Explore AI Starter Kit later** — Once thermals are sorted, add Qdrant for RAG workflows

## Integration with Your Stack

```
Current Stack                    + n8n
─────────────────────────────────────────────────
Pi 5 (192.168.0.217)
├── ClawdBot (3000)              → Webhook triggers n8n?
├── Uptime Kuma (3001)           → Alerts trigger workflows
├── Pi-hole (80)                 → Query stats via HTTP
├── Ollama (11434)               → AI in n8n workflows
└── [n8n] (5678) ← NEW           → Visual automation layer

Caddy ← Reverse proxy all via *.home
Tailscale ← Access remotely
```

n8n slots perfectly into your existing infrastructure as a visual automation layer — no new paradigms, just a new interface for connecting what you already have.
