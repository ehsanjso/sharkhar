---
type: research
tags: [research, home-assistant, ai, voice-assistant, smart-home, automation]
---
# Research: Home Assistant + AI Integration

## Summary

Home Assistant has built comprehensive AI integration, supporting conversation agents from OpenAI, Anthropic (Claude), Google Gemini, and local LLMs via Ollama. These AI agents can both converse naturally AND control smart home devices through HA's Assist API. Combined with ClawdBot's existing homeassistant skill, there are multiple paths to AI-powered smart home control.

## Key Findings

### Native AI Conversation Agents in Home Assistant

**Supported Providers:**
| Provider | Integration | Features | Notes |
|----------|-------------|----------|-------|
| **Anthropic (Claude)** | `anthropic` | Device control, web search, extended thinking | Claude 3.7 Sonnet supports thinking mode |
| **OpenAI (GPT-4o)** | `openai_conversation` | Device control, web search, image generation | Default: gpt-4o-mini |
| **Google Gemini** | `google_generative_ai_conversation` | Device control, TTS, STT, Google Search | Free tier available |
| **Ollama (Local)** | `ollama` | Device control (experimental) | Self-hosted, privacy-focused |

**How It Works:**
1. Configure AI integration in HA with API key
2. Create a Voice Assistant and select the AI as conversation agent
3. Expose specific entities to the AI (controlled via Exposed Entities page)
4. AI can now understand natural language AND control exposed devices

### Control Capabilities

All AI agents can:
- **Turn devices on/off** — lights, switches, climate
- **Adjust settings** — brightness, color, temperature
- **Trigger scenes** — "Movie time", "Good morning"
- **Query state** — "Is the garage door open?"
- **Multi-device commands** — "Turn off all lights in the bedroom"

Important: AI can ONLY control entities you explicitly expose. Security by default.

### Voice Assistant Hardware

**Recommended:** Home Assistant Voice Preview Edition (~$59)
- ESP32-based with wake word detection
- Works with any HA AI conversation agent
- Local processing option available

**DIY Options:**
- $13 ATOM Echo voice remote
- ESP32-S3-BOX
- Android/iOS companion apps
- Analog phone converted to voice assistant (most private!)

### AI Personalities

You can give voice assistants character:
```yaml
# Prompt template example
You are Super Mario from Mario Bros. Be funny and helpful.
When controlling lights, say "Mama mia!" 
```

Supports custom personalities like Super Mario, Santa Claus, or a helpful butler.

### Local LLM Option (Ollama)

For complete privacy and offline operation:
- Requires external Ollama server (not on Pi 5 — needs more power)
- Recommended: expose fewer than 25 entities
- Only models supporting "Tools" can control devices
- Best models: `llama3.1:8b`, `mistral`, `qwen2.5`
- Context window: 8k default (adjustable)

**Pi 5 Limitation:** Running Ollama locally on Pi 5 is challenging due to RAM/CPU constraints. Better to run on a separate machine.

### MCP Integration (Advanced)

From previous research (Feb 2): MCP servers exist for Home Assistant control
- `mcporter` skill already installed
- Could connect HA to ClawdBot via MCP for unified tool access
- Alternative to direct API calls

### ClawdBot homeassistant Skill

You already have a direct integration path:
```bash
# Required env vars
HA_URL=http://your-ha-ip:8123
HA_TOKEN=your-long-lived-token

# Control devices via curl
curl -s -X POST "$HA_URL/api/services/light/turn_on" \
  -H "Authorization: Bearer $HA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "light.living_room"}'
```

## Comparison: HA AI Agent vs ClawdBot Skill

| Feature | HA Native AI Agent | ClawdBot homeassistant Skill |
|---------|-------------------|------------------------------|
| Setup | HA integration wizard | Env vars + API token |
| Voice Support | Full (wake words, STT, TTS) | Via ClawdBot channels |
| Device Discovery | Automatic via HA | Manual entity lookup |
| Conversation Context | Per-voice-session | Per-ClawdBot-session |
| Personality | Prompt template | SOUL.md |
| Integration Depth | Deep (scenes, automations) | API-level |
| Use Case | Voice-first smart home | Text-based automation |

**Verdict:** Use BOTH! HA AI for voice control, ClawdBot skill for text/automation.

## Practical Applications for Ehsan

### Quick Wins

1. **Set Up Anthropic Conversation Agent in HA**
   - You already have Anthropic API access (ClawdBot uses it)
   - Configure in HA → Settings → Devices & Services → Add Integration → Anthropic
   - Create Voice Assistant with Claude as conversation agent
   - Expose key devices (lights, switches, climate)

2. **Configure ClawdBot homeassistant Skill**
   - Create long-lived token in HA (Profile → Long-Lived Access Tokens)
   - Add to Clawdbot: `HA_URL` and `HA_TOKEN` env vars
   - Test: "Turn on the living room lights" via Telegram

3. **Morning/Evening Automations**
   - ClawdBot cron can trigger HA scenes
   - "Good morning" cron at 7am → calls HA scene API
   - "Good night" cron at 11pm → all lights off

### Advanced Ideas

4. **AI-Powered Home Dashboard**
   - Add HA widget to Mission Control
   - Display device states, recent events
   - Control panel for common actions

5. **Camera + AI Analysis**
   - HA doorbell camera snapshot → OpenAI vision
   - "Describe what you see" → notification
   - Motion detected → AI describes the scene

6. **Smart Routines via ClawdBot**
   - "I'm leaving" → trigger HA away mode + set Pi-hole to block streaming
   - "Movie time" → dim lights + set climate + pause Uptime Kuma alerts

## Resources

### Official Documentation
- [Home Assistant Voice Control](https://www.home-assistant.io/voice_control/)
- [Anthropic Integration](https://www.home-assistant.io/integrations/anthropic/)
- [OpenAI Integration](https://www.home-assistant.io/integrations/openai_conversation/)
- [Google Gemini Integration](https://www.home-assistant.io/integrations/google_generative_ai_conversation/)
- [Ollama Integration](https://www.home-assistant.io/integrations/ollama/)
- [Create AI Personality](https://www.home-assistant.io/voice_control/assist_create_open_ai_personality/)

### Model Comparison (for HA control tasks)
- [home-assistant-datasets](https://github.com/allenporter/home-assistant-datasets) — Benchmarks different LLMs on HA control tasks

### Hardware
- [Voice Preview Edition](https://www.home-assistant.io/voice-pe/)
- [$13 Voice Remote Tutorial](https://www.home-assistant.io/voice_control/thirteen-usd-voice-remote/)

### MCP Servers
- [MCP Registry](https://registry.modelcontextprotocol.io/) — Search for "home assistant"
- [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) — Reference implementations

## Next Steps

1. **[ ] Check if HA is already installed** — Do you have Home Assistant running?
2. **[ ] Create HA long-lived token** — Needed for ClawdBot skill
3. **[ ] Configure HA_URL and HA_TOKEN** — Add to ClawdBot env
4. **[ ] Test homeassistant skill** — "List all lights"
5. **[ ] (Optional) Add Claude to HA** — Voice control via AI
6. **[ ] (Optional) Build HA widget for Mission Control** — Visual dashboard

---

*This ties directly into your self-hosted infrastructure (Pi-hole, Uptime Kuma, Mission Control) and extends ClawdBot's automation capabilities into the physical world.*
