---
name: claude-quota-monitor
version: 1.0.0
description: Monitor Claude API quota usage by scraping console.anthropic.com. Tracks session limits, weekly limits, and time until reset.
metadata: {"clawdbot":{"emoji":"📊","requires":{"bins":["node"]}}}
---

# Claude Quota Monitor

Monitor your Claude Max 5x plan quota usage in real-time.

## Features

- **Session quota tracking** - 5-hour window usage percentage
- **Weekly limits** - Sonnet-only and all-models tracking
- **Reset countdown** - Time remaining until quota resets
- **Alert thresholds** - Warn when approaching limits

## Setup

This skill requires browser automation access to console.anthropic.com.

### First run
The script will prompt for your Anthropic console login if needed.

## Usage

### Check current quota
```bash
node check-quota.js
```

### JSON output
```bash
node check-quota.js --json
```

### Set alert threshold (default: 80%)
```bash
node check-quota.js --threshold 90
```

## Output Example

```
📊 Claude Quota Status - Feb 1, 2026 10:36 AM EST

🔄 Session Limit (resets every 5 hours)
   Used: 99% ⚠️
   Resets in: 2h 21m (12:57 PM EST)

📅 Weekly Limits
   Sonnet only: 5% used (resets Sat 5:00 AM)
   All models: 14% used (resets Thu 11:00 PM)

⚠️  WARNING: Session quota at 99% - approaching limit!
```

## Integration with Clawdbot

Add to `AGENTS.md` or cron jobs to monitor quota automatically.

### Example cron job
Monitor quota every hour and alert if >80%:
```bash
0 * * * * cd ~/clawd/skills/claude-quota-monitor && node check-quota.js --threshold 80
```

## Data Storage

Quota snapshots are stored in `quota-history.json` for tracking trends.
