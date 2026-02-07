#!/bin/bash
#
# status.sh - Unified ClawdBot system status
#
# Combines pi-health.sh + memory-stats.sh + ClawdBot info into a single view.
# Run this for a quick "how's everything?" check.
#
# Usage:
#   ./status.sh              # Human-readable full status
#   ./status.sh --json       # JSON output for scripts
#   ./status.sh --help       # Show this help
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_MODE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo ""
    echo "Unified ClawdBot system status overview."
    echo "Combines system health, memory stats, and ClawdBot info."
    echo ""
    echo "Options:"
    echo "  --json    Output as JSON (for scripts)"
    echo "  --help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0")              # Full status report"
    echo "  $(basename "$0") --json       # JSON for automation"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_MODE=true
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

# Get ClawdBot info
get_clawdbot_info() {
    local version uptime_secs pid
    version=$(clawdbot --version 2>/dev/null | head -1 || echo "unknown")
    
    # Get gateway uptime from process
    pid=$(pgrep -f "clawdbot-gateway" 2>/dev/null | head -1 || echo "")
    if [[ -n "$pid" ]]; then
        uptime_secs=$(ps -p "$pid" -o etimes= 2>/dev/null | tr -d ' ' || echo "0")
    else
        uptime_secs="0"
    fi
    
    echo "$version|$uptime_secs"
}

format_duration() {
    local secs=$1
    local days=$((secs / 86400))
    local hours=$(((secs % 86400) / 3600))
    local mins=$(((secs % 3600) / 60))
    
    if [[ $days -gt 0 ]]; then
        echo "${days}d ${hours}h"
    elif [[ $hours -gt 0 ]]; then
        echo "${hours}h ${mins}m"
    else
        echo "${mins}m"
    fi
}

if $JSON_MODE; then
    # JSON mode: combine all outputs
    CLAWDBOT_INFO=$(get_clawdbot_info)
    CB_VERSION=$(echo "$CLAWDBOT_INFO" | cut -d'|' -f1)
    CB_UPTIME=$(echo "$CLAWDBOT_INFO" | cut -d'|' -f2)
    
    PI_HEALTH=$("$SCRIPT_DIR/pi-health.sh" --json 2>/dev/null || echo '{}')
    MEMORY_STATS=$("$SCRIPT_DIR/memory-stats.sh" --json 2>/dev/null || echo '{}')
    
    cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "clawdbot": {
    "version": "$CB_VERSION",
    "uptime_seconds": $CB_UPTIME
  },
  "system": $PI_HEALTH,
  "memory": $MEMORY_STATS
}
EOF
else
    # Human-readable mode
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}                    📊 SYSTEM STATUS                       ${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
    
    # ClawdBot info
    CLAWDBOT_INFO=$(get_clawdbot_info)
    CB_VERSION=$(echo "$CLAWDBOT_INFO" | cut -d'|' -f1)
    CB_UPTIME=$(echo "$CLAWDBOT_INFO" | cut -d'|' -f2)
    CB_UPTIME_FMT=$(format_duration "$CB_UPTIME")
    
    echo ""
    echo -e "${BLUE}🤖 ClawdBot${NC}"
    echo -e "   Version: ${GREEN}$CB_VERSION${NC}"
    echo -e "   Gateway uptime: $CB_UPTIME_FMT"
    
    # Pi Health (abbreviated)
    echo ""
    echo -e "${BOLD}───────────────────────────────────────────────────────────${NC}"
    "$SCRIPT_DIR/pi-health.sh" 2>/dev/null || echo -e "${RED}   pi-health.sh failed${NC}"
    
    # Memory Stats (abbreviated)
    echo ""
    echo -e "${BOLD}───────────────────────────────────────────────────────────${NC}"
    "$SCRIPT_DIR/memory-stats.sh" 2>/dev/null || echo -e "${RED}   memory-stats.sh failed${NC}"
    
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
    echo -e "   Generated: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
fi
