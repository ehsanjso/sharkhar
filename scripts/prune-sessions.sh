#!/bin/bash
# Prune old Clawdbot sessions to manage disk space
# Usage: ./prune-sessions.sh [--dry-run] [--days N] [--help]

# Don't use set -e, arithmetic expressions can return non-zero

# Defaults
SESSIONS_DIR="$HOME/.clawdbot/agents/main/sessions"
SUBAGENTS_DIR="$HOME/.clawdbot/subagents"
CRON_RUNS_DIR="$HOME/.clawdbot/cron/runs"
ARCHIVE_DIR="$HOME/backups/clawdbot/archived-sessions"
DAYS_TO_KEEP=7
DRY_RUN=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run|-n)
            DRY_RUN=true
            shift
            ;;
        --days|-d)
            DAYS_TO_KEEP="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $(basename $0) [OPTIONS]"
            echo ""
            echo "Prune old Clawdbot session logs to save disk space."
            echo "Files are archived before deletion (kept for 30 days)."
            echo ""
            echo "Options:"
            echo "  -n, --dry-run    Preview what would be deleted (no changes)"
            echo "  -d, --days N     Keep sessions from last N days (default: 7)"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $(basename $0)              # Prune sessions older than 7 days"
            echo "  $(basename $0) --dry-run   # Preview without deleting"
            echo "  $(basename $0) --days 14   # Keep last 14 days"
            echo ""
            echo "Directories cleaned:"
            echo "  - Main sessions:    $SESSIONS_DIR"
            echo "  - Subagent sessions: $SUBAGENTS_DIR"
            echo "  - Cron run logs:    $CRON_RUNS_DIR"
            echo ""
            echo "Archive location: $ARCHIVE_DIR"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate days
if ! [[ "$DAYS_TO_KEEP" =~ ^[0-9]+$ ]] || [ "$DAYS_TO_KEEP" -lt 1 ]; then
    echo "Error: --days must be a positive integer"
    exit 1
fi

echo ""
echo -e "${BLUE}=== Clawdbot Session Pruning ===${NC}"
if $DRY_RUN; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No files will be deleted${NC}"
fi
echo "Keeping sessions from last $DAYS_TO_KEEP days"
echo ""

# Create archive directory (even in dry-run for display)
if ! $DRY_RUN; then
    mkdir -p "$ARCHIVE_DIR"
fi

# Track totals
TOTAL_FILES=0
TOTAL_BYTES=0

# Function to get human-readable size
human_size() {
    local bytes=$1
    if [ $bytes -ge 1073741824 ]; then
        echo "$(echo "scale=1; $bytes/1073741824" | bc)G"
    elif [ $bytes -ge 1048576 ]; then
        echo "$(echo "scale=1; $bytes/1048576" | bc)M"
    elif [ $bytes -ge 1024 ]; then
        echo "$(echo "scale=1; $bytes/1024" | bc)K"
    else
        echo "${bytes}B"
    fi
}

# Function to prune old files with detailed reporting
prune_old_files() {
    local dir=$1
    local pattern=$2
    local label=$3
    local count=0
    local bytes=0
    local files_list=""
    
    if [ ! -d "$dir" ]; then
        echo -e "${YELLOW}⚠️  $label: Directory not found${NC}"
        echo ""
        return
    fi
    
    # Calculate current state
    local before_count=$(find "$dir" -name "$pattern" -type f 2>/dev/null | wc -l)
    local before_size=$(du -sb "$dir" 2>/dev/null | cut -f1)
    [ -z "$before_size" ] && before_size=0
    
    # Find old files
    while IFS= read -r -d '' file; do
        filename=$(basename "$file")
        # Don't delete sessions.json index file
        if [ "$filename" != "sessions.json" ]; then
            file_size=$(stat -c%s "$file" 2>/dev/null || echo 0)
            bytes=$((bytes + file_size))
            ((count++))
            if [ $count -le 5 ]; then
                files_list+="    - $(basename "$file") ($(human_size $file_size))\n"
            fi
            
            if ! $DRY_RUN; then
                # Archive then delete
                cp "$file" "$ARCHIVE_DIR/" 2>/dev/null || true
                rm "$file"
            fi
        fi
    done < <(find "$dir" -name "$pattern" -type f -mtime +$DAYS_TO_KEEP -print0 2>/dev/null)
    
    # Update totals
    TOTAL_FILES=$((TOTAL_FILES + count))
    TOTAL_BYTES=$((TOTAL_BYTES + bytes))
    
    # Report
    echo -e "${GREEN}📁 $label${NC}"
    echo "   Before: $before_count files ($(human_size $before_size))"
    if [ $count -gt 0 ]; then
        if $DRY_RUN; then
            echo -e "   ${YELLOW}Would prune: $count files ($(human_size $bytes))${NC}"
        else
            local after_count=$(find "$dir" -name "$pattern" -type f 2>/dev/null | wc -l)
            local after_size=$(du -sb "$dir" 2>/dev/null | cut -f1)
            [ -z "$after_size" ] && after_size=0
            echo -e "   ${RED}Pruned: $count files ($(human_size $bytes))${NC}"
            echo "   After: $after_count files ($(human_size $after_size))"
        fi
        if [ $count -le 5 ]; then
            echo -e "$files_list" | head -5
        else
            echo -e "$files_list"
            echo "    ... and $((count - 5)) more"
        fi
    else
        echo -e "   ${GREEN}✓ Nothing to prune${NC}"
    fi
    echo ""
}

# Prune each directory
prune_old_files "$SESSIONS_DIR" "*.jsonl" "Main Sessions"
prune_old_files "$SUBAGENTS_DIR" "*.jsonl" "Subagent Sessions"
prune_old_files "$CRON_RUNS_DIR" "*.jsonl" "Cron Run Logs"

# Clean up old archives (keep last 30 days of archives)
if ! $DRY_RUN && [ -d "$ARCHIVE_DIR" ]; then
    echo -e "${GREEN}📦 Archive Cleanup${NC}"
    archive_pruned=$(find "$ARCHIVE_DIR" -name "*.jsonl" -type f -mtime +30 -delete -print 2>/dev/null | wc -l)
    echo "   Removed $archive_pruned archived files older than 30 days"
    echo "   Archive size: $(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1)"
    echo ""
fi

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
if $DRY_RUN; then
    echo -e "${YELLOW}🔍 DRY RUN: Would prune $TOTAL_FILES files ($(human_size $TOTAL_BYTES))${NC}"
    echo ""
    echo "Run without --dry-run to actually delete files."
else
    echo -e "${GREEN}✅ Pruned $TOTAL_FILES files, freed $(human_size $TOTAL_BYTES)${NC}"
fi
echo ""
