#!/bin/bash
#
# setup-memory-cron.sh - Set up weekly memory compaction cron job
#
# Run this from a MAIN SESSION (not from within a cron job).
# The gateway doesn't allow cron modifications from cron sessions.
#
# Usage:
#   ./setup-memory-cron.sh           # Set up the cron job
#   ./setup-memory-cron.sh --check   # Just check if it exists
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[setup]${NC} $1"; }
success() { echo -e "${GREEN}[done]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
error() { echo -e "${RED}[error]${NC} $1" >&2; }

# Check if cron job already exists
check_existing() {
    local jobs
    jobs=$(clawdbot cron list --json 2>/dev/null || echo '[]')
    
    if echo "$jobs" | grep -q "Memory Compaction\|memory-compact"; then
        echo "exists"
        return 0
    fi
    echo "not-found"
    return 1
}

# Parse arguments
CHECK_ONLY=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --check)
            CHECK_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Usage: $(basename "$0") [--check]"
            echo ""
            echo "Set up weekly memory compaction cron job."
            echo ""
            echo "Options:"
            echo "  --check   Only check if job exists (no changes)"
            echo "  --help    Show this help"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

log "Checking for existing memory compaction cron job..."

if [[ $(check_existing) == "exists" ]]; then
    success "Memory compaction cron job already exists!"
    exit 0
fi

if $CHECK_ONLY; then
    warn "Memory compaction cron job NOT found."
    echo ""
    echo "Run without --check to create it."
    exit 1
fi

log "Creating weekly memory compaction cron job..."
echo ""

# Create the cron job
# Schedule: Sunday at 11 PM (0 23 * * 0)
# Uses Haiku model for cost efficiency
clawdbot cron add \
    --schedule "0 23 * * 0" \
    --description "Weekly Memory Compaction" \
    --model haiku \
    --text "Run the memory compaction script to summarize and archive old daily memory files:

cd ~/clawd && ./scripts/memory-compact.sh

Report what was archived and any errors."

if [[ $? -eq 0 ]]; then
    echo ""
    success "Memory compaction cron job created!"
    echo ""
    log "Schedule: Sunday 11 PM (weekly)"
    log "Model: haiku (cost-efficient)"
    log "Script: ~/clawd/scripts/memory-compact.sh"
else
    error "Failed to create cron job"
    echo ""
    echo "Try running manually from Telegram:"
    echo "  'Set up a weekly cron job for memory compaction, Sunday 11 PM, using haiku model'"
    exit 1
fi
