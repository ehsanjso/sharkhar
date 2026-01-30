#!/bin/bash
# Backup ~/.clawdbot folder
# Keeps last 7 backups to save disk space

BACKUP_DIR="$HOME/backups/clawdbot"
TIMESTAMP=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/clawdbot-$TIMESTAMP.tar.gz"

# Create backup
tar -czf "$BACKUP_FILE" -C "$HOME" .clawdbot 2>/dev/null

# Keep only last 7 backups
cd "$BACKUP_DIR" && ls -t clawdbot-*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm --

# Output for logging
echo "Backup created: $BACKUP_FILE"
du -h "$BACKUP_FILE"
echo "Total backups: $(ls -1 $BACKUP_DIR/clawdbot-*.tar.gz 2>/dev/null | wc -l)"
