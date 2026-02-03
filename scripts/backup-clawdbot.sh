#!/bin/bash
# Backup ~/.clawdbot folder (essential config only)
# Excludes regeneratable caches (browser, skills, media) to save ~80% space
# Keeps last 7 backups

BACKUP_DIR="$HOME/backups/clawdbot"
TIMESTAMP=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/clawdbot-$TIMESTAMP.tar.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup with exclusions for cache directories
# - browser/: Chromium profile data (~300MB, regenerated automatically)
# - skills/: Downloaded from ClawdHub (can be re-fetched)
# - media/: Cached Telegram media (can be re-downloaded)
tar -czf "$BACKUP_FILE" \
  --exclude='.clawdbot/browser' \
  --exclude='.clawdbot/skills' \
  --exclude='.clawdbot/media' \
  -C "$HOME" .clawdbot 2>/dev/null

# Check if backup was created successfully
if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup FAILED: $BACKUP_FILE not created"
  exit 1
fi

# Keep only last 7 backups
cd "$BACKUP_DIR" && ls -t clawdbot-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm --

# Output for logging
echo "✅ Backup created: $BACKUP_FILE"
du -h "$BACKUP_FILE"
echo "📦 Total backups: $(ls -1 $BACKUP_DIR/clawdbot-*.tar.gz 2>/dev/null | wc -l)"

# Show what's included (for verification)
echo "📋 Contents:"
tar -tzf "$BACKUP_FILE" 2>/dev/null | grep -E "^\.clawdbot/[^/]+/?$" | head -10
