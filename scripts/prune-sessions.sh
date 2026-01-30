#!/bin/bash
# Prune old Clawdbot sessions to manage disk space
# Keeps sessions modified within last 7 days

SESSIONS_DIR="$HOME/.clawdbot/agents/main/sessions"
SUBAGENTS_DIR="$HOME/.clawdbot/subagents"
CRON_RUNS_DIR="$HOME/.clawdbot/cron/runs"
ARCHIVE_DIR="$HOME/backups/clawdbot/archived-sessions"
DAYS_TO_KEEP=7

echo "=== Clawdbot Session Pruning ==="
echo "Keeping sessions from last $DAYS_TO_KEEP days"
echo ""

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

# Function to prune old files
prune_old_files() {
    local dir=$1
    local pattern=$2
    local count=0
    
    if [ -d "$dir" ]; then
        while IFS= read -r -d '' file; do
            filename=$(basename "$file")
            # Don't delete sessions.json index file
            if [ "$filename" != "sessions.json" ]; then
                # Archive then delete
                cp "$file" "$ARCHIVE_DIR/" 2>/dev/null
                rm "$file"
                ((count++))
            fi
        done < <(find "$dir" -name "$pattern" -type f -mtime +$DAYS_TO_KEEP -print0 2>/dev/null)
    fi
    echo "$count"
}

# Prune main sessions
echo "Main sessions:"
echo "  Before: $(find "$SESSIONS_DIR" -name "*.jsonl" 2>/dev/null | wc -l) files, $(du -sh "$SESSIONS_DIR" 2>/dev/null | cut -f1)"
pruned=$(prune_old_files "$SESSIONS_DIR" "*.jsonl")
echo "  Pruned: $pruned old session files"
echo "  After: $(find "$SESSIONS_DIR" -name "*.jsonl" 2>/dev/null | wc -l) files, $(du -sh "$SESSIONS_DIR" 2>/dev/null | cut -f1)"
echo ""

# Prune subagent sessions
echo "Subagent sessions:"
if [ -d "$SUBAGENTS_DIR" ]; then
    echo "  Before: $(find "$SUBAGENTS_DIR" -name "*.jsonl" 2>/dev/null | wc -l) files, $(du -sh "$SUBAGENTS_DIR" 2>/dev/null | cut -f1)"
    pruned=$(prune_old_files "$SUBAGENTS_DIR" "*.jsonl")
    echo "  Pruned: $pruned old subagent files"
    echo "  After: $(find "$SUBAGENTS_DIR" -name "*.jsonl" 2>/dev/null | wc -l) files, $(du -sh "$SUBAGENTS_DIR" 2>/dev/null | cut -f1)"
else
    echo "  No subagent directory"
fi
echo ""

# Prune old cron run logs
echo "Cron run logs:"
if [ -d "$CRON_RUNS_DIR" ]; then
    echo "  Before: $(find "$CRON_RUNS_DIR" -name "*.jsonl" 2>/dev/null | wc -l) files, $(du -sh "$CRON_RUNS_DIR" 2>/dev/null | cut -f1)"
    pruned=$(prune_old_files "$CRON_RUNS_DIR" "*.jsonl")
    echo "  Pruned: $pruned old cron logs"
    echo "  After: $(find "$CRON_RUNS_DIR" -name "*.jsonl" 2>/dev/null | wc -l) files, $(du -sh "$CRON_RUNS_DIR" 2>/dev/null | cut -f1)"
else
    echo "  No cron runs directory"
fi
echo ""

# Clean up old archives (keep last 30 days of archives)
echo "Cleaning archives older than 30 days..."
find "$ARCHIVE_DIR" -name "*.jsonl" -type f -mtime +30 -delete 2>/dev/null
echo "Archive size: $(du -sh "$ARCHIVE_DIR" 2>/dev/null | cut -f1)"
echo ""

echo "=== Pruning complete ==="
