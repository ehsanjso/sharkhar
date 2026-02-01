# Clawd Workspace

Personal workspace for ClawdBot automation, scripts, and AI-powered content creation.

## 🎯 What's Here

### 📱 Mission Control
Second Brain dashboard - view memory files, task board, document browser.
```bash
cd mission-control && npm run dev
```
[More info →](mission-control/README.md)

### 🎬 Remotion Videos
Programmatic video creation with React + Remotion. Optimized for Raspberry Pi 5.
```bash
cd remotion-videos && ./render.sh TextTitle --pi-optimize
```
[More info →](remotion-videos/README.md) | [Templates →](remotion-videos/TEMPLATES.md)

### 📜 Scripts
Utility scripts for maintenance, automation, and content creation.
- **Video:** Extract clips, create social media shorts ([video/README.md](scripts/video/README.md))
- **Maintenance:** Backup, session pruning
- **Automation:** NFT monitoring, market tools

[More info →](scripts/README.md)

### 🧠 Memory
ClawdBot's persistent memory and daily journals.
- `memory/*.md` - Daily journal entries
- `memory/research/` - Research documents
- `memory/builds/` - Nightly build logs

### 🎨 Skills
ClawdBot agent skills and capabilities.

See installed skills:
```bash
ls ~/.clawdbot/skills/
```

## 🤖 ClawdBot Setup

This workspace is managed by ClawdBot, an AI assistant running on Raspberry Pi 5.

**Key files:**
- `SOUL.md` - ClawdBot's personality and behavior
- `USER.md` - User preferences and context
- `AGENTS.md` - Agent workspace guidelines
- `TOOLS.md` - Local tool configurations
- `MEMORY.md` - Long-term curated memories

## 🚀 Quick Commands

```bash
# Check ClawdBot status
clawdbot status

# View Mission Control
open http://localhost:3000

# Render a video (Pi-optimized)
cd remotion-videos && ./render.sh Quote --pi

# Extract video clip
cd scripts/video && ./clip.sh video.mp4 -s 00:01:30 -d 30
```

## 📊 Active Cron Jobs

- **8:00 AM** - Morning Brief (weather, overnight builds, priorities)
- **2:00 PM** - Daily Research Report
- **11:00 PM** - Proactive Coder (overnight builds)

View jobs: `crontab -l`

## 🔗 Resources

- [ClawdBot Docs](https://docs.clawd.bot)
- [ClawdHub Skills](https://clawdhub.com)
- [Remotion Docs](https://remotion.dev)
- [shadcn/ui Components](https://ui.shadcn.com)

---

**Platform:** Raspberry Pi 5 (8GB) • **OS:** Raspberry Pi OS • **Node:** v22.22.0
