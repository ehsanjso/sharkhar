#!/bin/bash
# Backup ~/.clawdbot folder (essential config only)
# Excludes regeneratable caches (browser, skills, media) to save ~80% space
# Usage: ./backup-clawdbot.sh [--dry-run] [--keep N] [--help]

# Defaults
BACKUP_DIR="$HOME/backups/clawdbot"
TIMESTAMP=$(date +%Y-%m-%d_%H%M)
BACKUP_FILE="$BACKUP_DIR/clawdbot-$TIMESTAMP.tar.gz"
KEEP_COUNT=7
DRY_RUN=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run|-n)
            DRY_RUN=true
            shift
            ;;
        --keep|-k)
            KEEP_COUNT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $(basename "$0") [OPTIONS]"
            echo ""
            echo "Backup ClawdBot configuration and essential data."
            echo "Excludes cache directories (browser, skills, media) for ~93% smaller backups."
            echo ""
            echo "Options:"
            echo "  -n, --dry-run    Preview what would be backed up (no changes)"
            echo "  -k, --keep N     Keep last N backups (default: 7)"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $(basename "$0")              # Create backup, keep last 7"
            echo "  $(basename "$0") --dry-run   # Preview without creating backup"
            echo "  $(basename "$0") --keep 14   # Keep last 14 backups"
            echo ""
            echo "What's backed up:"
            echo "  - cron/        Job configurations"
            echo "  - agents/      Session logs"
            echo "  - credentials/ Auth tokens"
            echo "  - identity/    Bot identity"
            echo "  - devices/     Paired devices"
            echo "  - clawdbot.json Main config"
            echo ""
            echo "What's excluded (regeneratable):"
            echo "  - browser/     Chromium profile (~300MB)"
            echo "  - skills/      Downloaded from ClawdHub"
            echo "  - media/       Cached Telegram media"
            echo ""
            echo "Backup location: $BACKUP_DIR"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate keep count
if ! [[ "$KEEP_COUNT" =~ ^[0-9]+$ ]] || [ "$KEEP_COUNT" -lt 1 ]; then
    echo "Error: --keep must be a positive integer"
    exit 1
fi

# Human-readable size
human_size() {
    local bytes=$1
    if [ "$bytes" -ge 1073741824 ]; then
        echo "$(echo "scale=1; $bytes/1073741824" | bc)G"
    elif [ "$bytes" -ge 1048576 ]; then
        echo "$(echo "scale=1; $bytes/1048576" | bc)M"
    elif [ "$bytes" -ge 1024 ]; then
        echo "$(echo "scale=1; $bytes/1024" | bc)K"
    else
        echo "${bytes}B"
    fi
}

echo ""
echo -e "${BLUE}=== ClawdBot Backup ===${NC}"
if $DRY_RUN; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No files will be created${NC}"
fi
echo ""

# Check source exists
if [ ! -d "$HOME/.clawdbot" ]; then
    echo -e "${RED}❌ Error: $HOME/.clawdbot not found${NC}"
    exit 1
fi

# Show what will be backed up
echo -e "${GREEN}📋 Included directories:${NC}"
for dir in cron agents credentials identity devices; do
    if [ -d "$HOME/.clawdbot/$dir" ]; then
        dir_size=$(du -sb "$HOME/.clawdbot/$dir" 2>/dev/null | cut -f1)
        [ -z "$dir_size" ] && dir_size=0
        file_count=$(find "$HOME/.clawdbot/$dir" -type f 2>/dev/null | wc -l)
        echo "   ✓ $dir/ ($file_count files, $(human_size $dir_size))"
    fi
done
# Config file
if [ -f "$HOME/.clawdbot/clawdbot.json" ]; then
    cfg_size=$(stat -c%s "$HOME/.clawdbot/clawdbot.json" 2>/dev/null || echo 0)
    echo "   ✓ clawdbot.json ($(human_size $cfg_size))"
fi
echo ""

echo -e "${YELLOW}🚫 Excluded (regeneratable):${NC}"
for dir in browser skills media; do
    if [ -d "$HOME/.clawdbot/$dir" ]; then
        dir_size=$(du -sb "$HOME/.clawdbot/$dir" 2>/dev/null | cut -f1)
        [ -z "$dir_size" ] && dir_size=0
        echo "   ✗ $dir/ ($(human_size $dir_size) saved)"
    fi
done
echo ""

# Calculate total source size vs excluded
total_size=$(du -sb "$HOME/.clawdbot" 2>/dev/null | cut -f1)
[ -z "$total_size" ] && total_size=0
excluded_size=0
for dir in browser skills media; do
    if [ -d "$HOME/.clawdbot/$dir" ]; then
        ds=$(du -sb "$HOME/.clawdbot/$dir" 2>/dev/null | cut -f1)
        [ -n "$ds" ] && excluded_size=$((excluded_size + ds))
    fi
done
included_size=$((total_size - excluded_size))
if [ "$total_size" -gt 0 ]; then
    savings=$((excluded_size * 100 / total_size))
else
    savings=0
fi

echo -e "${BLUE}📊 Size estimate:${NC}"
echo "   Total .clawdbot: $(human_size $total_size)"
echo "   Excluded:        $(human_size $excluded_size) ($savings% savings)"
echo "   Backup size:     ~$(human_size $included_size) (before compression)"
echo ""

if $DRY_RUN; then
    echo -e "${YELLOW}🔍 DRY RUN: Would create $BACKUP_FILE${NC}"
    echo ""
    
    # Show existing backups
    existing=$(ls -1 "$BACKUP_DIR"/clawdbot-*.tar.gz 2>/dev/null | wc -l)
    if [ "$existing" -gt 0 ]; then
        echo -e "${BLUE}📦 Existing backups: $existing${NC}"
        ls -lh "$BACKUP_DIR"/clawdbot-*.tar.gz 2>/dev/null | awk '{print "   " $NF " (" $5 ")"}'
        if [ "$existing" -ge "$KEEP_COUNT" ]; then
            would_remove=$((existing - KEEP_COUNT + 1))
            echo -e "   ${YELLOW}Would remove $would_remove old backup(s) (keeping $KEEP_COUNT)${NC}"
        fi
    fi
    echo ""
    echo "Run without --dry-run to create the backup."
    exit 0
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup with exclusions
echo -e "${GREEN}📦 Creating backup...${NC}"
tar -czf "$BACKUP_FILE" \
    --exclude='.clawdbot/browser' \
    --exclude='.clawdbot/skills' \
    --exclude='.clawdbot/media' \
    -C "$HOME" .clawdbot 2>/dev/null

# Verify
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup FAILED: $BACKUP_FILE not created${NC}"
    exit 1
fi

backup_size=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || echo 0)
echo -e "   ${GREEN}✅ Created: $BACKUP_FILE${NC}"
echo "   Size: $(human_size $backup_size)"
echo ""

# Clean old backups
old_count=$(ls -1 "$BACKUP_DIR"/clawdbot-*.tar.gz 2>/dev/null | wc -l)
if [ "$old_count" -gt "$KEEP_COUNT" ]; then
    removed=$((old_count - KEEP_COUNT))
    cd "$BACKUP_DIR" && ls -t clawdbot-*.tar.gz 2>/dev/null | tail -n +$((KEEP_COUNT + 1)) | xargs -r rm --
    echo -e "${YELLOW}🗑️  Removed $removed old backup(s) (keeping $KEEP_COUNT)${NC}"
else
    echo -e "${GREEN}📦 Backups on disk: $old_count (limit: $KEEP_COUNT)${NC}"
fi

# Show disk usage
total_backup_size=$(du -sb "$BACKUP_DIR" 2>/dev/null | cut -f1)
[ -z "$total_backup_size" ] && total_backup_size=0
echo "   Total backup storage: $(human_size $total_backup_size)"
echo ""

echo -e "${BLUE}=== Backup Complete ===${NC}"
echo ""
