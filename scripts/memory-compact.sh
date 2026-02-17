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
#   2. Summarizes each using Haiku (cheap, fast)
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
  --dry-run     Preview changes without modifying files
  --days N      Process files older than N days (default: 7)
  --verbose     Show detailed output
  --help        Show this help message

Examples:
  $(basename "$0")              # Process files >7 days old
  $(basename "$0") --dry-run    # Preview what would be archived
  $(basename "$0") --days 14    # Archive files >14 days old
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
# Returns: list of filenames (YYYY-MM-DD.md format)
get_old_files() {
    local days=$1
    find "$MEMORY_DIR" -maxdepth 1 -name "20*.md" -type f -mtime +"$days" | sort
}

# Check if file is already archived
is_archived() {
    local filename=$1
    [[ -f "${ARCHIVE_DIR}/${filename}" ]]
}

# Summarize a memory file using Haiku
# TODO: Session 2 - Implement actual summarization
summarize_file() {
    local filepath=$1
    local filename
    filename=$(basename "$filepath")
    
    # TODO: Call Haiku via clawdbot sessions_send or direct API
    # For now, placeholder that extracts headers/key lines
    
    echo "# PLACEHOLDER SUMMARY for ${filename}"
    echo "# Session 2: Replace with actual Haiku summarization"
    echo ""
    
    # Extract section headers as rough summary
    grep -E "^##" "$filepath" 2>/dev/null | head -5 || echo "- (no sections found)"
}

# Append summary to MEMORY.md under Weekly Archive section
append_to_memory() {
    local date_str=$1
    local summary=$2
    
    # TODO: Session 2 - Implement proper appending
    # Should add under "## Weekly Archive" section
    # Create section if doesn't exist
    
    echo "### ${date_str}"
    echo "$summary"
    echo ""
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
    
    # Ensure archive directory exists
    mkdir -p "$ARCHIVE_DIR"
    
    log "Scanning for files older than ${days} days..."
    
    # Get files to process
    local files
    files=$(get_old_files "$days")
    
    if [[ -z "$files" ]]; then
        log "No files older than ${days} days found."
        exit 0
    fi
    
    local count=0
    local skipped=0
    
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
            echo "  [DRY RUN] Would archive to: ${ARCHIVE_DIR}/${filename}"
        else
            # TODO: Session 2 - Implement actual processing
            # 1. Summarize with Haiku
            # 2. Append to MEMORY.md  
            # 3. Archive file
            
            echo "  [NOT IMPLEMENTED] Summarization pending Session 2"
        fi
        
        count=$((count + 1))
    done <<< "$files"
    
    echo ""
    success "Processed: ${count} files"
    if [[ $skipped -gt 0 ]]; then
        log "Skipped: ${skipped} files (already archived)"
    fi
    
    if $dry_run; then
        warn "Dry run - no changes made"
    fi
}

main "$@"
