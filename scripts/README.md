# Scripts Directory

Utility scripts for ClawdBot maintenance, automation, and content creation.

## Maintenance Scripts

### backup-clawdbot.sh
Backup ClawdBot configuration and essential data. Excludes cache directories 
(browser, skills, media) for ~90% smaller backups.

```bash
./backup-clawdbot.sh              # Create backup, keep last 7
./backup-clawdbot.sh --dry-run    # Preview without creating backup
./backup-clawdbot.sh --keep 14    # Keep last 14 backups
./backup-clawdbot.sh --help       # Show full usage
```

**What's backed up:** cron/, agents/, credentials/, identity/, devices/, clawdbot.json

**What's excluded (regeneratable):** browser/ (~300MB), skills/, media/

Backups stored in `~/backups/clawdbot/`.

### prune-sessions.sh
Clean up old ClawdBot session logs to save disk space. Archives files before
deletion and supports preview mode.

```bash
./prune-sessions.sh              # Prune sessions older than 7 days
./prune-sessions.sh --dry-run    # Preview without deleting
./prune-sessions.sh --days 14    # Keep last 14 days
./prune-sessions.sh --help       # Show full usage
```

**Directories cleaned:**
- Main sessions (`~/.clawdbot/agents/main/sessions/`)
- Subagent sessions (`~/.clawdbot/subagents/`)
- Cron run logs (`~/.clawdbot/cron/runs/`)

Archives kept for 30 days in `~/backups/clawdbot/archived-sessions/`.

### pi-health.sh
Quick system health check for Raspberry Pi. Shows CPU temp, memory, disk,
ClawdBot status, and uptime with color-coded status indicators.

```bash
./pi-health.sh              # Human-readable health report
./pi-health.sh --json       # JSON output (for scripts/cron)
./pi-health.sh --help       # Show full usage
```

**Checks:** CPU temperature, load average, memory/swap usage, disk space,
ClawdBot process status, Node.js memory, system uptime.

## Automation Scripts

### nft-price-monitor.js
Monitor NFT prices and send notifications.

```bash
node nft-price-monitor.js
```

## Subdirectories

### 📹 video/
Video processing tools (ffmpeg wrappers)
- `clip.sh` - Extract single clips
- `shorts.sh` - Generate social media shorts

See [video/README.md](video/README.md) for detailed documentation.

### 📊 market/
Market analysis and trading tools

---

**Note:** All scripts assume they're run from the scripts directory or with proper paths.
