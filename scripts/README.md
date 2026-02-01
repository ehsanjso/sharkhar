# Scripts Directory

Utility scripts for ClawdBot maintenance, automation, and content creation.

## Maintenance Scripts

### backup-clawdbot.sh
Backup ClawdBot configuration and data.

```bash
./backup-clawdbot.sh
```

### prune-sessions.sh
Clean up old ClawdBot session logs to save disk space.

```bash
./prune-sessions.sh
```

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
