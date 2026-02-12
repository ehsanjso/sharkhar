#!/bin/bash
# weekly-report.sh - Generate a formatted weekly summary from memory files
# Uses devlog.sh --range under the hood

set -e

# Colors
BOLD='\033[1m'
BLUE='\033[0;34m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RESET='\033[0m'

# Configuration
MEMORY_DIR="${CLAWD_MEMORY:-$HOME/clawd/memory}"
DEVLOG="$(dirname "$0")/devlog.sh"

# Parse arguments
OUTPUT_FORMAT="text"
WEEK_OFFSET=0
SHOW_HELP=false
SEARCH_TERM=""
SUMMARY_ONLY=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -l|--last)
            WEEK_OFFSET=1
            shift
            ;;
        -o|--offset)
            WEEK_OFFSET="$2"
            shift 2
            ;;
        -s|--search)
            SEARCH_TERM="$2"
            shift 2
            ;;
        --summary)
            SUMMARY_ONLY=true
            shift
            ;;
        -m|--markdown)
            OUTPUT_FORMAT="markdown"
            shift
            ;;
        -h|--help)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo "Unknown option: $1" >&2
            exit 1
            ;;
    esac
done

if [[ "$SHOW_HELP" == true ]]; then
    cat << 'EOF'
Usage: weekly-report.sh [OPTIONS]

Generate a formatted weekly summary from memory files.

Options:
  -l, --last        Show last week (equivalent to --offset 1)
  -o, --offset N    Go back N weeks (0 = this week, 1 = last week)
  -s, --search TERM Only show entries matching TERM
  --summary         Stats only, skip full entries
  -m, --markdown    Output in markdown format (for copying)
  -h, --help        Show this help

Examples:
  weekly-report.sh              # This week's report
  weekly-report.sh --last       # Last week's report
  weekly-report.sh --offset 2   # Report from 2 weeks ago
  weekly-report.sh --summary    # Just stats, no entries
  weekly-report.sh -s "API"     # Only entries mentioning API
  weekly-report.sh -m > report.md  # Export as markdown

EOF
    exit 0
fi

# Calculate week boundaries
# Week starts on Monday
get_monday() {
    local date="$1"
    local day_of_week=$(date -d "$date" +%u)  # 1=Mon, 7=Sun
    local days_back=$((day_of_week - 1))
    date -d "$date - $days_back days" +%Y-%m-%d
}

TODAY=$(date +%Y-%m-%d)
REFERENCE_DATE=$(date -d "$TODAY - $((WEEK_OFFSET * 7)) days" +%Y-%m-%d)
WEEK_START=$(get_monday "$REFERENCE_DATE")
WEEK_END=$(date -d "$WEEK_START + 6 days" +%Y-%m-%d)

# Cap end date to today if in current week
if [[ "$WEEK_END" > "$TODAY" ]]; then
    WEEK_END="$TODAY"
fi

# Format header
if [[ "$OUTPUT_FORMAT" == "markdown" ]]; then
    echo "# Weekly Report"
    echo ""
    echo "**Period:** $WEEK_START to $WEEK_END"
    if [[ "$WEEK_OFFSET" -eq 0 ]]; then
        echo "**Note:** This week (in progress)"
    fi
    echo ""
else
    echo -e "${BOLD}═══════════════════════════════════════════════════════════${RESET}"
    echo -e "${BOLD}                    📅 WEEKLY REPORT                        ${RESET}"
    echo -e "${BOLD}═══════════════════════════════════════════════════════════${RESET}"
    echo ""
    echo -e "${BLUE}Period:${RESET} $WEEK_START to $WEEK_END"
    if [[ "$WEEK_OFFSET" -eq 0 ]]; then
        echo -e "${YELLOW}(This week - in progress)${RESET}"
    elif [[ "$WEEK_OFFSET" -eq 1 ]]; then
        echo -e "${CYAN}(Last week)${RESET}"
    else
        echo -e "${CYAN}($WEEK_OFFSET weeks ago)${RESET}"
    fi
    echo ""
fi

# Get stats
if [[ "$OUTPUT_FORMAT" == "markdown" ]]; then
    echo "## Statistics"
    echo ""
    echo '```'
    "$DEVLOG" --range "$WEEK_START" "$WEEK_END" --count 2>/dev/null || echo "No entries found"
    echo '```'
    echo ""
else
    echo -e "${BOLD}───────────────────────────────────────────────────────────${RESET}"
    echo -e "${GREEN}📊 Statistics${RESET}"
    echo -e "${BOLD}───────────────────────────────────────────────────────────${RESET}"
    "$DEVLOG" --range "$WEEK_START" "$WEEK_END" --count 2>/dev/null || echo "No entries found"
    echo ""
fi

# Exit early if summary only
if [[ "$SUMMARY_ONLY" == true ]]; then
    exit 0
fi

# Get entries
if [[ "$OUTPUT_FORMAT" == "markdown" ]]; then
    echo "## Entries"
    echo ""
    if [[ -n "$SEARCH_TERM" ]]; then
        echo "**Filtered by:** \`$SEARCH_TERM\`"
        echo ""
        "$DEVLOG" --range "$WEEK_START" "$WEEK_END" --search "$SEARCH_TERM" 2>/dev/null || echo "No matches found"
    else
        "$DEVLOG" --range "$WEEK_START" "$WEEK_END" --list 2>/dev/null || echo "No entries found"
    fi
else
    echo -e "${BOLD}───────────────────────────────────────────────────────────${RESET}"
    if [[ -n "$SEARCH_TERM" ]]; then
        echo -e "${GREEN}📝 Entries matching '$SEARCH_TERM'${RESET}"
    else
        echo -e "${GREEN}📝 All Entries${RESET}"
    fi
    echo -e "${BOLD}───────────────────────────────────────────────────────────${RESET}"
    
    if [[ -n "$SEARCH_TERM" ]]; then
        "$DEVLOG" --range "$WEEK_START" "$WEEK_END" --search "$SEARCH_TERM" 2>/dev/null || echo "No matches found"
    else
        "$DEVLOG" --range "$WEEK_START" "$WEEK_END" --list 2>/dev/null || echo "No entries found"
    fi
fi

# Footer
if [[ "$OUTPUT_FORMAT" != "markdown" ]]; then
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════════════${RESET}"
    echo -e "   Generated: $(date '+%Y-%m-%d %H:%M:%S')"
fi
