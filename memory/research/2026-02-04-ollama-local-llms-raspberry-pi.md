---
type: research
tags: [research, ollama, local-llm, raspberry-pi, self-hosted, home-assistant]
---
# Research: Ollama & Local LLMs on Raspberry Pi 5

## Summary

Ollama enables running large language models locally without cloud API costs. With 8GB RAM on the Pi 5, Ehsan can run small-to-medium models (1B-3B parameters) for simple tasks like smart home control, quick Q&A, and local privacy-focused queries—complementing Claude for complex work while reducing API costs.

## Key Findings

### Why This Matters for Ehsan

- **Quota relief**: Use local models for simple tasks, save Claude quota for complex reasoning
- **Privacy**: Keep sensitive queries completely local (no data leaves the Pi)
- **Zero cost**: No per-token charges for local inference
- **Home Assistant integration**: Native HA support for voice/conversation agents
- **Self-hosted theme**: Perfect fit with Pi-hole, Uptime Kuma, Mission Control stack
- **Offline capability**: Works without internet (good for IoT/HA control)

### Installation (Simple!)

```bash
# One-liner install on Raspberry Pi/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Start the server (runs as systemd service)
ollama serve

# Test with a small model
ollama run tinyllama "What's the capital of France?"
```

### Recommended Models for Pi 5 (8GB RAM)

| Model | Size | RAM Needed | Best For | Speed |
|-------|------|------------|----------|-------|
| **tinyllama** | 638MB | ~2GB | Quick Q&A, chat | Fast |
| **smollm2:1.7b** | 1GB | ~3GB | General chat, simple tasks | Fast |
| **gemma3:1b** | 815MB | ~2.5GB | Chat, basic reasoning | Fast |
| **llama3.2:1b** | 1.3GB | ~3GB | Best quality small model | Medium |
| **llama3.2:3b** | 2GB | ~4.5GB | Better quality, still fits | Slower |
| **phi4-mini** | 2.5GB | ~5GB | Math, coding, reasoning | Slower |
| **deepscaler** | ~1GB | ~3GB | Math/reasoning specialist | Fast |

**Rule of thumb**: Model needs ~1.5-2x its file size in RAM to run comfortably.

### Performance Expectations on Pi 5

- **1-3B models**: 5-15 tokens/second (usable for chat)
- **7B models**: 1-3 tokens/second (slow but works)
- **13B+ models**: Not recommended (too slow, may OOM)

CPU-only inference (no GPU acceleration on Pi), but the Pi 5's improved CPU makes small models viable.

### Home Assistant Integration

HA natively supports Ollama as a conversation agent:

1. **Install Ollama** on Pi or another machine on network
2. **Expose network access**: Edit `/etc/systemd/system/ollama.service` to add `OLLAMA_HOST=0.0.0.0`
3. **Add integration** in HA: Settings → Devices & Services → Add Integration → Ollama
4. **Configure**: Enter URL (e.g., `http://192.168.0.217:11434`), select model
5. **Expose entities**: Choose which devices the AI can control

**Important notes**:
- Only models with [Tools support](https://ollama.com/search?c=tools) can control HA
- Keep exposed entities <25 for small models
- Consider separate configs: one for chat, one for device control

### REST API (ClawdBot Integration Potential)

Ollama exposes an OpenAI-compatible API:

```bash
# Generate response
curl http://localhost:11434/api/generate -d '{
  "model": "tinyllama",
  "prompt": "Turn on the living room lights"
}'

# Chat format (OpenAI compatible)
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2:1b",
  "messages": [{"role": "user", "content": "What time is it?"}]
}'
```

### Architecture Options

**Option A: Pi 5 runs everything (simplest)**
- Ollama + models on same Pi as ClawdBot
- Pros: Simple, single point of management
- Cons: Competes for resources with other services

**Option B: Dedicated Ollama server (recommended)**
- Ollama on another machine (old laptop, mini PC with 16GB+ RAM)
- ClawdBot/HA connect over network
- Pros: Better performance, can run larger models
- Cons: Another machine to maintain

**Option C: Hybrid with cloud fallback**
- Use local Ollama for simple queries
- Fall back to Claude/GPT for complex tasks
- Tools like "Minions" (Stanford research) automate this

### Web UI Options

**Open WebUI** - ChatGPT-like interface for Ollama:
```bash
docker run -d -p 3002:8080 \
  -e OLLAMA_BASE_URL=http://192.168.0.217:11434 \
  -v open-webui:/app/backend/data \
  --name open-webui \
  ghcr.io/open-webui/open-webui:main-slim
```

Access at `http://192.168.0.217:3002`

## Practical Applications

### 1. **Smart Home Voice Control**
- Use Ollama as HA conversation agent
- "Turn off the lights" / "What's the temperature?"
- Works offline, instant response

### 2. **Quick Local Queries**
- Define terms, simple calculations
- Generate quick text (emails, notes)
- No quota burn for trivial questions

### 3. **Privacy-Sensitive Tasks**
- Personal notes/journals
- Financial questions
- Health-related queries

### 4. **Cron Job Automation**
- Simple text processing tasks
- Log summarization
- Basic classification

### 5. **Embedding Generation**
- `nomic-embed-text` for vector embeddings
- Local RAG without API costs
- Pair with your memory files

## Resources

### Documentation
- Ollama docs: https://docs.ollama.com
- Model library: https://ollama.com/library
- HA integration: https://www.home-assistant.io/integrations/ollama/
- Open WebUI: https://docs.openwebui.com

### Tools & SDKs
- Python: `pip install ollama` → https://github.com/ollama/ollama-python
- JavaScript: `npm install ollama` → https://github.com/ollama/ollama-js
- REST API at `http://localhost:11434`

### Community
- Discord: https://discord.gg/ollama
- Reddit: https://reddit.com/r/ollama
- GitHub: https://github.com/ollama/ollama

## Next Steps

### Quick Wins (Today)
1. **Install Ollama**: `curl -fsSL https://ollama.com/install.sh | sh`
2. **Pull tinyllama**: `ollama pull tinyllama`
3. **Test it**: `ollama run tinyllama "Hello, who are you?"`

### This Week
4. **Benchmark on Pi**: Test response times with different models
5. **HA Integration**: Add Ollama to Home Assistant
6. **Expose network**: Configure for ClawdBot access

### Future
7. **ClawdBot skill?**: Consider building an Ollama skill for local fallback
8. **Open WebUI**: Add web interface via Docker
9. **Hybrid routing**: Route simple queries to Ollama, complex to Claude

## Cost-Benefit Analysis

| Scenario | Cloud Cost | Local Alternative |
|----------|------------|-------------------|
| 100 simple queries/day | ~$0.50-2/day | $0 (Ollama) |
| HA voice control | API calls add up | Free, instant |
| Private queries | Privacy risk | 100% local |
| Offline use | Impossible | Works fine |

**Bottom line**: Not a Claude replacement, but a powerful complement. Use Ollama for the "80% of queries that are simple" and save Claude for the 20% that need real reasoning.

---

*Research completed: 2026-02-04 2:00 PM*
*Related: HA research (Feb 3), MCP ecosystem (Feb 2), quota optimization (Feb 1)*
