#!/usr/bin/env bash
#
# memory-compact.sh - Summarize and archive old daily memory files
#
# Usage:
#   ./memory-compact.sh              # Process files >7 days old
#   ./memory-compact.sh --dry-run    # Preview without changes
#   ./memory-compact.sh --days 14    # Process files >14 days old
#   ./memory-compact.sh --help       # Show usage
#
# What it does:
#   1. Finds daily memory files older than threshold
#   2. Summarizes each using clawdbot agent (Haiku preferred for cost)
#   3. Appends summaries to MEMORY.md under "## Weekly Archive"
#   4. Moves processed files to memory/archive/
#
# Designed for weekly cron (Sunday 11 PM):
#   0 23 * * 0 cd ~/clawd && ./scripts/memory-compact.sh
#

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════

MEMORY_DIR="${HOME}/clawd/memory"
ARCHIVE_DIR="${MEMORY_DIR}/archive"
MEMORY_FILE="${HOME}/clawd/MEMORY.md"
DEFAULT_DAYS=7
DEFAULT_MODEL="haiku"  # Use cheap model for summarization

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════════════════
# Functions
# ═══════════════════════════════════════════════════════════════════════════

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Summarize and archive old daily memory files.

Options:
  --dry-run       Preview changes without modifying files
  --days N        Process files older than N days (default: 7)
  --model MODEL   Model for summarization (default: haiku)
                  Options: haiku, sonnet, default
  --verbose       Show detailed output
  --help          Show this help message

Examples:
  $(basename "$0")                   # Process files >7 days old
  $(basename "$0") --dry-run         # Preview what would be archived
  $(basename "$0") --days 14         # Archive files >14 days old
  $(basename "$0") --model haiku     # Use Haiku for cheap summarization
EOF
    exit 0
}

log() {
    echo -e "${BLUE}[compact]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[warn]${NC} $1"
}

error() {
    echo -e "${RED}[error]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[done]${NC} $1"
}

# Get list of daily memory files older than threshold
# Returns: list of filenames (YYYY-MM-DD.md format only, not other files)
# Note: Uses filename date, NOT file modification time
get_old_files() {
    local days=$1
    local today_epoch
    today_epoch=$(date +%s)
    local threshold=$((days * 86400))  # days in seconds
    
    # Find all daily files and filter by filename date
    find "$MEMORY_DIR" -maxdepth 1 -type f -name "20[0-9][0-9]-[0-9][0-9]-[0-9][0-9].md" -print0 | \
    while IFS= read -r -d '' filepath; do
        local filename
        filename=$(basename "$filepath" .md)
        
        # Parse date from filename (YYYY-MM-DD)
        local file_epoch
        file_epoch=$(date -d "$filename" +%s 2>/dev/null) || continue
        
        local age=$((today_epoch - file_epoch))
        
        if [[ $age -gt $threshold ]]; then
            echo "$filepath"
        fi
    done | sort
}

# Check if file is already archived
is_archived() {
    local filename=$1
    [[ -f "${ARCHIVE_DIR}/${filename}" ]]
}

# Summarize a memory file using clawdbot agent
summarize_file() {
    local filepath=$1
    local filename
    filename=$(basename "$filepath")
    local content
    local model="${COMPACT_MODEL:-haiku}"
    
    # Read file content
    content=$(cat "$filepath")
    
    # Truncate very long files (>10KB) to avoid token limits
    if [[ ${#content} -gt 10000 ]]; then
        content="${content:0:10000}

[... truncated ...]"
    fi
    
    # Call clawdbot agent with summarization prompt
    local prompt="Summarize this daily memory file into 3-5 bullet points of key learnings, decisions, or notable events. Be concise. Skip routine entries. Output ONLY the bullet points, no preamble.

If nothing significant, output exactly: No significant entries.

---
${content}
---"

    local result
    local exit_code
    
    # Try up to 3 times with exponential backoff
    for attempt in 1 2 3; do
        result=$(clawdbot agent --message "$prompt" --session-id "memory-compact-$(date +%Y%m%d)" --model "$model" --json --timeout 120 2>&1)
        exit_code=$?
        
        if [[ $exit_code -eq 0 ]]; then
            # Check for valid JSON response
            if echo "$result" | jq -e '.result.payloads[0].text' > /dev/null 2>&1; then
                echo "$result" | jq -r '.result.payloads[0].text'
                return 0
            fi
        fi
        
        # Log retry
        if [[ $attempt -lt 3 ]]; then
            warn "  Attempt ${attempt} failed, retrying in $((attempt * 5))s..."
            sleep $((attempt * 5))
        fi
    done
    
    # All attempts failed
    echo "Failed to summarize (exit: ${exit_code})"
    return 1
}

# Ensure MEMORY.md has the Weekly Archive section
ensure_archive_section() {
    if ! grep -q "^## Weekly Archive" "$MEMORY_FILE" 2>/dev/null; then
        echo "" >> "$MEMORY_FILE"
        echo "## Weekly Archive" >> "$MEMORY_FILE"
        echo "" >> "$MEMORY_FILE"
        echo "_Automated summaries of archived daily memory files._" >> "$MEMORY_FILE"
        echo "" >> "$MEMORY_FILE"
    fi
}

# Append summary to MEMORY.md under Weekly Archive section
append_to_memory() {
    local date_str=$1
    local summary=$2
    
    ensure_archive_section
    
    # Create temp file with new content inserted after "## Weekly Archive" header
    local temp_file
    temp_file=$(mktemp)
    
    awk -v date="$date_str" -v summary="$summary" '
        /^## Weekly Archive/ {
            print
            getline  # skip blank line after header
            print
            getline  # skip description line
            print
            print ""
            print "### " date
            print summary
            next
        }
        { print }
    ' "$MEMORY_FILE" > "$temp_file"
    
    mv "$temp_file" "$MEMORY_FILE"
}

# Move file to archive
archive_file() {
    local filepath=$1
    local filename
    filename=$(basename "$filepath")
    
    mv "$filepath" "${ARCHIVE_DIR}/${filename}"
}

# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

main() {
    local dry_run=false
    local days=$DEFAULT_DAYS
    local verbose=false
    local model=$DEFAULT_MODEL
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run=true
                shift
                ;;
            --days)
                days=$2
                shift 2
                ;;
            --model)
                model=$2
                shift 2
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --help|-h)
                usage
                ;;
            *)
                error "Unknown option: $1"
                usage
                ;;
        esac
    done
    
    # Export model for summarize function
    export COMPACT_MODEL="$model"
    
    # Ensure archive directory exists
    mkdir -p "$ARCHIVE_DIR"
    
    log "Scanning for files older than ${days} days..."
    log "Using model: ${model}"
    
    # Get files to process
    local files
    files=$(get_old_files "$days")
    
    if [[ -z "$files" ]]; then
        log "No files older than ${days} days found."
        exit 0
    fi
    
    local count=0
    local skipped=0
    local processed_dates=""
    
    while IFS= read -r filepath; do
        local filename
        filename=$(basename "$filepath")
        local date_str="${filename%.md}"
        
        # Skip if already archived
        if is_archived "$filename"; then
            if $verbose; then
                warn "Skipping ${filename} (already archived)"
            fi
            skipped=$((skipped + 1))
            continue
        fi
        
        log "Processing ${filename}..."
        
        if $dry_run; then
            echo "  [DRY RUN] Would summarize: ${filepath}"
            echo "  [DRY RUN] Would append to: ${MEMORY_FILE}"
            echo "  [DRY RUN] Would archive to: ${ARCHIVE_DIR}/${filename}"
        else
            # 1. Summarize with clawdbot agent
            log "  Summarizing..."
            local summary
            summary=$(summarize_file "$filepath")
            
            if [[ -n "$summary" && "$summary" != "Failed to summarize" ]]; then
                # 2. Append to MEMORY.md
                log "  Appending to MEMORY.md..."
                append_to_memory "$date_str" "$summary"
                
                # 3. Archive file
                log "  Archiving..."
                archive_file "$filepath"
                
                processed_dates="${processed_dates}${date_str} "
            else
                warn "  Failed to summarize ${filename}, skipping archive"
                skipped=$((skipped + 1))
                continue
            fi
        fi
        
        count=$((count + 1))
    done <<< "$files"
    
    echo ""
    success "Processed: ${count} files"
    if [[ $skipped -gt 0 ]]; then
        log "Skipped: ${skipped} files (already archived or failed)"
    fi
    
    if $dry_run; then
        warn "Dry run - no changes made"
    else
        if [[ $count -gt 0 ]]; then
            log "Archived dates: ${processed_dates}"
        fi
    fi
}

main "$@"
