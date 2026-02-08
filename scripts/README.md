# Scripts Directory

Utility scripts for ClawdBot maintenance, automation, and content creation.

## Quick Start

### status.sh
**One command for everything.** Combines system health, memory stats, and ClawdBot info.

```bash
./status.sh              # Full status report
./status.sh --json       # JSON for automation
```

---

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
Quick system health check for Raspberry Pi. Shows CPU temp, **CPU frequency**,
**throttling**, memory, disk, ClawdBot status, and uptime with color-coded indicators.

```bash
./pi-health.sh              # Human-readable health report
./pi-health.sh --json       # JSON output (for scripts/cron)
./pi-health.sh --help       # Show full usage
```

**Checks:** CPU temperature, **CPU frequency** (current vs max MHz), **CPU throttling**
(via `vcgencmd get_throttled`), load average, memory/swap usage, disk space,
ClawdBot process status, Node.js memory, system uptime.

**Frequency monitoring:** Shows actual CPU speed vs max capability:
- Percentage of max speed (e.g., "1500MHz / 2400MHz (62.5%)")
- Status indicator: ✓ (≥95%), ⚠ (80-94%), ↓ (<80%)
- Reveals real impact of thermal throttling on performance

**Throttling detection:** Decodes hardware throttle flags to show:
- Under-voltage detected
- ARM frequency capped
- Currently throttled
- Soft temperature limit active

Both "active now" and "occurred since boot" states are reported. Critical for
diagnosing performance issues on Pi.

### memory-stats.sh
Quick overview of memory folder health and maintenance status. Shows file counts,
folder sizes, archival recommendations, and tracks when MEMORY.md was last updated.

```bash
./memory-stats.sh              # Human-readable overview
./memory-stats.sh --json       # JSON output (for scripts/cron)
./memory-stats.sh --cleanup    # Auto-archive files older than 30 days
./memory-stats.sh --help       # Show full usage
```

**Checks:**
- Total files and size in `memory/`
- Daily journal count (oldest/newest dates)
- Research archive stats
- Build logs stats
- Days since last MEMORY.md review
- **Archival recommendations** (files >30 days old)
- **Large file warnings** (files >10KB)

**Review status indicators:**
- ✓ Green (0-2 days) — Recently reviewed
- ⚠ Yellow (3-4 days) — Review recommended
- ⚠ Red (5+ days) — Overdue for review

**Archival recommendations:** Detects daily journal files older than 30 days and
suggests moving them to `memory/archive/`. Use `--cleanup` to auto-archive.

**Large file detection:** Warns about markdown files over 10KB (unusually large
for notes). Consider splitting or summarizing these.

Useful for the "memory maintenance every 3+ days" guideline.

## Automation Scripts

### nft-price-monitor.js
Monitor NFT prices and send notifications.

```bash
node nft-price-monitor.js
```

### mobbin-scraper.js
Scrape design references from Mobbin.com. Supports searching apps, finding flows,
and downloading screenshots for UI inspiration.

```bash
node mobbin-scraper.js search "Linear"              # Search for app
node mobbin-scraper.js find-flows "Linear"          # List app flows
node mobbin-scraper.js app-flows <app-url>          # Get flows from URL
node mobbin-scraper.js download-flow <url> <N>      # Download flow N
node mobbin-scraper.js screens "dashboard" --limit 15  # Search screens
```

**Platform auto-detection:** "web", "SaaS", "dashboard" → web; "mobile", "iOS" → ios

Requires browser control server running (`clawdbot browser start`).

### switch-cron-model.js
Utility to bulk-update cron job models. Safely switches specific jobs to Haiku
for cost optimization.

```bash
node switch-cron-model.js         # Apply model changes
```

Creates backup at `~/.clawdbot/cron/jobs.json.model-switch-backup` before changes.

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
