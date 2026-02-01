# Mission Control

Second Brain dashboard for ClawdBot - view memory files, manage tasks, and track your AI assistant's work.

## Features

- 📝 **Document Viewer** - Browse and read all memory files (journals, research, builds)
- ✅ **Task Board** - Kanban board for tracking automation projects
- 🔍 **Type Filters** - Filter by document type (journal, research, content, etc.)
- 🎨 **Dark Theme** - GitHub-inspired dark UI with shadcn/ui components

## Quick Start

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production (Systemd Service)

Mission Control runs as a systemd service on Raspberry Pi:

```bash
# Install and start service
sudo ./setup-service.sh

# Check status
sudo systemctl status mission-control

# View logs
journalctl -u mission-control -f
```

Access at: `http://192.168.0.217:3000` or `http://localhost:3000`

## Architecture

- **Framework:** Next.js 16 with App Router
- **UI:** shadcn/ui components + Tailwind CSS
- **Data Source:** Memory files from `~/clawd/memory/`
- **Deployment:** Standalone server via systemd

## File Structure

```
src/
├── app/
│   ├── page.tsx          # Documents viewer (main page)
│   └── tasks/page.tsx    # Task board
└── components/ui/        # shadcn/ui components
```

## Memory Files

Mission Control reads from:
- `~/clawd/memory/*.md` - Daily journals
- `~/clawd/memory/research/` - Research documents
- `~/clawd/memory/builds/` - Nightly build logs

Files use YAML frontmatter for metadata:
```yaml
---
type: journal
tags: [clawdbot, automation]
---
```

## Inspired By

Alex Finn's "5 insane ClawdBot use cases" video - Mission Control is the visual second brain for your AI assistant.

## Tech Stack

- Next.js 16.1.6
- React 19
- shadcn/ui (Zinc theme)
- Tailwind CSS 4.0
- Lucide Icons
