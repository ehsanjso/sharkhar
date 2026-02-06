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
Quick system health check for Raspberry Pi. Shows CPU temp, **CPU throttling**,
memory, disk, ClawdBot status, and uptime with color-coded status indicators.

```bash
./pi-health.sh              # Human-readable health report
./pi-health.sh --json       # JSON output (for scripts/cron)
./pi-health.sh --help       # Show full usage
```

**Checks:** CPU temperature, **CPU throttling** (via `vcgencmd get_throttled`),
load average, memory/swap usage, disk space, ClawdBot process status, Node.js
memory, system uptime.

**Throttling detection:** Decodes hardware throttle flags to show:
- Under-voltage detected
- ARM frequency capped
- Currently throttled
- Soft temperature limit active

Both "active now" and "occurred since boot" states are reported. Critical for
diagnosing performance issues on Pi.

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
