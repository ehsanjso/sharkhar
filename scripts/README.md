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

## Logging & Memory

### devlog.sh
Quick CLI for appending timestamped notes to daily memory files. Useful for
logging thoughts, progress, or debugging notes without opening an editor.

```bash
./devlog.sh "Fixed the API timeout issue"          # Simple note
./devlog.sh --section "Debug" "Bug on line 42"     # With section header
echo "Long note" | ./devlog.sh                     # From stdin/pipe
./devlog.sh --dry-run "Test entry"                 # Preview only
./devlog.sh --list                                 # Show today's entries
./devlog.sh --search "API"                         # Search today's file
./devlog.sh --tail 10                              # Show last 10 lines
./devlog.sh --count                                # Count entries/sections
./devlog.sh --week                                 # Weekly summary (last 7 days)
./devlog.sh --month                                # Monthly summary (last 30 days)
./devlog.sh --yesterday "Forgot to log this"       # Add to yesterday's file
./devlog.sh -y --search "bug"                      # Search yesterday's file
./devlog.sh -y --tail 5                            # Last 5 lines of yesterday
./devlog.sh --date 2026-02-08 "Historical note"    # Target specific date
./devlog.sh -D 2026-02-08 --list                   # View any date's entries
./devlog.sh --edit                                 # Open in $EDITOR
./devlog.sh -y --list                              # View yesterday's entries
./devlog.sh --range 2026-02-08 2026-02-11 --list   # Entries across date range
./devlog.sh -R 2026-02-08 2026-02-11 --search "API" # Search across range
./devlog.sh --range 2026-02-08 2026-02-11 --count  # Stats across range
```

**Range queries:** Use `-R`/`--range START END` with `--list`, `--search`, or
`--count` to process multiple dates. Shows entries from all dates in range with
date headers. Great for weekly reviews and project tracking.

Notes are appended to `memory/YYYY-MM-DD.md` with timestamps.

### weekly-report.sh
Wrapper around devlog.sh for generating formatted weekly summaries. Perfect for
standups, retrospectives, or exporting reports.

```bash
./weekly-report.sh              # This week's report
./weekly-report.sh --last       # Last week's report
./weekly-report.sh --offset 2   # 2 weeks ago
./weekly-report.sh --summary    # Stats only (no entries)
./weekly-report.sh -s "API"     # Filter entries by keyword
./weekly-report.sh -m > report.md  # Export as markdown
```

**Options:**
- `-l, --last` - Last week (shortcut for --offset 1)
- `-o, --offset N` - Go back N weeks
- `-s, --search TERM` - Filter entries by term
- `--summary` - Stats only, skip full entries
- `-m, --markdown` - Markdown output for sharing

**Date targeting:** Use `-D`/`--date YYYY-MM-DD` to target any specific date.
Overrides `--yesterday` if both are specified.

**Search:** Use `-S`/`--search TERM` for case-insensitive grep within the target
file. Combines with `-y`/`--date` to search any date's entries.

**Append to section:** Use `-a`/`--append` with `--section` to add entries to an
existing section instead of creating a new one. If the section doesn't exist, it
creates a new section normally.

**Stats:** Use `-c`/`--count` to get a quick summary of entries and sections for
a given date.

**Bash alias:** After sourcing `~/.bashrc`, use `devlog` instead of `./devlog.sh`.
Tab completion available for options and common section names.

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

### prune-artifacts.sh
Clean up old generated files from the artifacts directory. Perfect for keeping
disk space free from temporary exports, downloads, and build outputs.

```bash
./prune-artifacts.sh              # Dry run (preview deletions)
./prune-artifacts.sh --delete     # Actually delete old files
./prune-artifacts.sh --days 3     # Delete files older than 3 days
./prune-artifacts.sh --help       # Show full usage
```

**Target directory:** `~/clawd/artifacts/`
**Default threshold:** 7 days
**Protected files:** README.md, .gitkeep

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

### gateway-health.sh
ClawdBot Gateway diagnostics. Use when experiencing timeouts, slowness, or
connectivity issues. Checks gateway process, websocket, cron jobs, sessions, and errors.

```bash
./gateway-health.sh              # Human-readable health report
./gateway-health.sh --json       # JSON output (for scripts/cron)
./gateway-health.sh --quick      # Skip slow checks (websocket ping)
./gateway-health.sh --verbose    # Show more detail
./gateway-health.sh --watch      # Live monitoring (5s refresh)
./gateway-health.sh --watch 10   # Live monitoring (custom interval)
./gateway-health.sh --help       # Show full usage
```

**Checks:**
- **Process status** — Gateway running, PID, uptime, memory (warns >500MB), CPU
- **Websocket** — Port 18789 reachability and latency
- **Cron jobs** — Job counts, enabled vs disabled, last run time
- **Sessions** — Active sessions in last 24h, total session count
- **Errors** — Scans recent logs for errors/exceptions

**Status levels:**
- 🟢 HEALTHY — All checks pass
- 🟡 WARNING — High memory or many recent errors
- 🔴 CRITICAL — Gateway not running or websocket unreachable

**Recommendations:** Automatically suggests actions based on detected issues
(restart gateway, check logs, etc.).

### cron-audit.sh
Analyze cron jobs for cost optimization opportunities. Shows all jobs with their
models and suggests which could be switched to Haiku for savings.

```bash
./cron-audit.sh              # Full audit with all jobs
./cron-audit.sh --expensive  # Only show jobs using expensive models
./cron-audit.sh --suggest    # Show optimization suggestions per job
./cron-audit.sh --summary    # Stats only (no job list)
./cron-audit.sh --json       # JSON output for scripts
./cron-audit.sh --help       # Show full usage
```

**Output:**
- Summary stats (total jobs, enabled, by model)
- Color-coded job list with model and schedule
- Optimization suggestions based on job name patterns
- Potential savings estimate

**Suggestion heuristics:**
- `--suggest` detects simple task patterns (status, check, reminder, backup)
- Recommends Haiku for simple tasks, keeps current for complex (analyze, code, review)
- Jobs already on Haiku show "already-optimal"

### memory-search.sh
Simple grep-based search for memory files. Stopgap until RAG/semantic search 
is set up. Searches all memory/*.md files plus MEMORY.md.

```bash
./memory-search.sh "quota"                 # Search with context
./memory-search.sh "rag" --word            # Whole words only (no partials)
./memory-search.sh "ollama" --files-only   # Just filenames
./memory-search.sh "api" --context 5       # More context lines
./memory-search.sh "api" --recent 7        # Last 7 days only
./memory-search.sh "script" --type builds  # Only build session files
./memory-search.sh "bug" --json            # JSON output for scripts
```

**Options:** 
- `--word` — Whole words only (avoid partial matches)
- `--context N` — Lines of context around match (default: 2)
- `--recent N` — Only search files modified in last N days
- `--type TYPE` — Filter by type: `daily` | `research` | `builds`
- `--files-only` — Only show matching filenames
- `--json` — JSON output for scripts

### memory-compact.sh
Automatically summarize and archive old daily memory files. Uses Haiku for
cost-efficient summarization, then archives processed files.

```bash
./memory-compact.sh              # Process files >7 days old
./memory-compact.sh --dry-run    # Preview without changes
./memory-compact.sh --days 14    # Process files >14 days old
./memory-compact.sh --model haiku  # Use Haiku (default, cheapest)
./memory-compact.sh --model sonnet # Use Sonnet for better summaries
./memory-compact.sh --verbose    # Show detailed progress
```

**What it does:**
1. Finds daily memory files older than threshold
2. Summarizes each using the specified model (default: Haiku)
3. Appends summaries to MEMORY.md under "## Weekly Archive"
4. Moves processed files to `memory/archive/`

**Error handling:**
- Retries up to 3 times with exponential backoff
- Truncates large files (>10KB) to avoid token limits
- Skips files that fail summarization (keeps original)

**Setup:** Run `./setup-memory-cron.sh` from main session to create the weekly cron job.

### setup-memory-cron.sh
Set up the weekly memory compaction cron job. Must be run from main session
(not from within a cron job due to gateway restrictions).

```bash
./setup-memory-cron.sh           # Create the cron job
./setup-memory-cron.sh --check   # Just check if it exists
```

Creates a Sunday 11 PM cron job using Haiku model for cost efficiency.

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
