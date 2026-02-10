#!/bin/bash
#
# devlog.sh - Quick CLI for appending notes to daily memory files
#
# Appends timestamped notes to memory/YYYY-MM-DD.md for easy logging
# during development without opening an editor.
#
# Usage:
#   ./devlog.sh "Fixed the API timeout"          # Simple note
#   ./devlog.sh --section "Debug" "Bug details"  # With section header
#   echo "Long note" | ./devlog.sh               # From stdin
#   ./devlog.sh --dry-run "Test entry"           # Preview only
#   ./devlog.sh --list                           # Show today's entries
#   ./devlog.sh --help                           # Show help
#

set -euo pipefail

# Config
MEMORY_DIR="${HOME}/clawd/memory"
TODAY=$(date '+%Y-%m-%d')
TODAY_FILE="${MEMORY_DIR}/${TODAY}.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Defaults
SECTION=""
DRY_RUN=false
LIST_MODE=false
MESSAGE=""

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS] [MESSAGE]

Quick CLI for appending timestamped notes to daily memory files.

Options:
  -s, --section NAME   Add section header (e.g., "Debug", "Work Log")
  -d, --dry-run        Preview without writing
  -l, --list           Show today's entries
  -h, --help           Show this help

Examples:
  $(basename "$0") "Fixed the API timeout issue"
  $(basename "$0") --section "Debug" "Traced bug to line 42"
  echo "Long note from pipe" | $(basename "$0")
  $(basename "$0") --dry-run "Test entry"

Notes are appended to: ${MEMORY_DIR}/YYYY-MM-DD.md
EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--section)
            SECTION="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -l|--list)
            LIST_MODE=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}" >&2
            usage
            exit 1
            ;;
        *)
            MESSAGE="$1"
            shift
            ;;
    esac
done

# List mode - show today's entries
if $LIST_MODE; then
    if [[ -f "$TODAY_FILE" ]]; then
        echo -e "${CYAN}📝 Today's entries (${TODAY}):${NC}"
        echo ""
        cat "$TODAY_FILE"
    else
        echo -e "${YELLOW}No entries for today (${TODAY})${NC}"
    fi
    exit 0
fi

# Read from stdin if no message provided
if [[ -z "$MESSAGE" ]]; then
    if [[ ! -t 0 ]]; then
        # Reading from pipe/stdin
        MESSAGE=$(cat)
    else
        echo -e "${RED}Error: No message provided${NC}" >&2
        echo "Usage: $(basename "$0") \"Your message here\"" >&2
        echo "   Or: echo \"message\" | $(basename "$0")" >&2
        exit 1
    fi
fi

# Validate message
if [[ -z "$MESSAGE" ]]; then
    echo -e "${RED}Error: Empty message${NC}" >&2
    exit 1
fi

# Format the entry
TIMESTAMP=$(date '+%I:%M %p')
ENTRY=""

# Add section header if provided
if [[ -n "$SECTION" ]]; then
    ENTRY+="## ${SECTION} (${TIMESTAMP})"$'\n'
    ENTRY+="- ${MESSAGE}"$'\n'
else
    ENTRY+="- **${TIMESTAMP}** — ${MESSAGE}"$'\n'
fi

# Dry run - just show what would be written
if $DRY_RUN; then
    echo -e "${CYAN}📝 Would append to: ${TODAY_FILE}${NC}"
    echo ""
    echo -e "${YELLOW}${ENTRY}${NC}"
    exit 0
fi

# Create file with header if it doesn't exist
if [[ ! -f "$TODAY_FILE" ]]; then
    cat > "$TODAY_FILE" <<EOF
# Daily Log - ${TODAY}

EOF
    echo -e "${GREEN}✓ Created ${TODAY_FILE}${NC}"
fi

# Append the entry
echo "" >> "$TODAY_FILE"
echo -n "$ENTRY" >> "$TODAY_FILE"

echo -e "${GREEN}✓ Logged to ${TODAY}${NC}"
echo -e "  ${ENTRY}"
