#!/bin/bash
# Memory Stats - Quick overview of memory folder health
# Usage: ./memory-stats.sh [--json] [--help]

set -e

JSON_OUTPUT=false
MEMORY_DIR="${HOME}/clawd/memory"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json|-j)
            JSON_OUTPUT=true
            shift
            ;;
        --help|-h)
            echo "Usage: $(basename "$0") [OPTIONS]"
            echo ""
            echo "Quick overview of memory folder health and maintenance status."
            echo ""
            echo "Options:"
            echo "  -j, --json     Output as JSON (for scripts/cron)"
            echo "  -h, --help     Show this help message"
            echo ""
            echo "Checks: file counts, folder sizes, daily journals, research archive,"
            echo "builds archive, and days since last memory review."
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Check if memory directory exists
if [ ! -d "$MEMORY_DIR" ]; then
    echo "Error: Memory directory not found at $MEMORY_DIR"
    exit 1
fi

# Count daily journal files (YYYY-MM-DD.md pattern in root)
DAILY_FILES=$(find "$MEMORY_DIR" -maxdepth 1 -name "202?-??-??.md" -type f 2>/dev/null | wc -l)
OLDEST_DAILY=$(find "$MEMORY_DIR" -maxdepth 1 -name "202?-??-??.md" -type f 2>/dev/null | sort | head -1 | xargs -r basename 2>/dev/null | sed 's/.md$//')
NEWEST_DAILY=$(find "$MEMORY_DIR" -maxdepth 1 -name "202?-??-??.md" -type f 2>/dev/null | sort | tail -1 | xargs -r basename 2>/dev/null | sed 's/.md$//')

# Research folder stats
RESEARCH_DIR="$MEMORY_DIR/research"
RESEARCH_COUNT=0
RESEARCH_SIZE="0K"
if [ -d "$RESEARCH_DIR" ]; then
    RESEARCH_COUNT=$(find "$RESEARCH_DIR" -name "*.md" -type f 2>/dev/null | wc -l)
    RESEARCH_SIZE=$(du -sh "$RESEARCH_DIR" 2>/dev/null | cut -f1)
fi

# Builds folder stats
BUILDS_DIR="$MEMORY_DIR/builds"
BUILDS_COUNT=0
BUILDS_SIZE="0K"
if [ -d "$BUILDS_DIR" ]; then
    BUILDS_COUNT=$(find "$BUILDS_DIR" -name "*.md" -type f 2>/dev/null | wc -l)
    BUILDS_SIZE=$(du -sh "$BUILDS_DIR" 2>/dev/null | cut -f1)
fi

# Total stats
TOTAL_FILES=$(find "$MEMORY_DIR" -type f 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$MEMORY_DIR" 2>/dev/null | cut -f1)

# Try to detect last memory review from MEMORY.md "Last updated" line
MEMORY_MD="$MEMORY_DIR/../MEMORY.md"
LAST_REVIEW=""
DAYS_SINCE_REVIEW=""
if [ -f "$MEMORY_MD" ]; then
    LAST_REVIEW=$(grep -m1 "Last updated:" "$MEMORY_MD" 2>/dev/null | sed 's/.*Last updated: //' | sed 's/\*//g' | tr -d ' ')
    if [ -n "$LAST_REVIEW" ]; then
        # Calculate days since review
        REVIEW_EPOCH=$(date -d "$LAST_REVIEW" +%s 2>/dev/null || echo "")
        if [ -n "$REVIEW_EPOCH" ]; then
            NOW_EPOCH=$(date +%s)
            DAYS_SINCE_REVIEW=$(( (NOW_EPOCH - REVIEW_EPOCH) / 86400 ))
        fi
    fi
fi

# Determine status
if [ -n "$DAYS_SINCE_REVIEW" ]; then
    if [ "$DAYS_SINCE_REVIEW" -le 2 ]; then
        REVIEW_STATUS="ok"
    elif [ "$DAYS_SINCE_REVIEW" -le 4 ]; then
        REVIEW_STATUS="due"
    else
        REVIEW_STATUS="overdue"
    fi
else
    REVIEW_STATUS="unknown"
fi

# JSON output
if $JSON_OUTPUT; then
    cat <<EOF
{
  "memory_dir": "$MEMORY_DIR",
  "total_files": $TOTAL_FILES,
  "total_size": "$TOTAL_SIZE",
  "daily_journals": {
    "count": $DAILY_FILES,
    "oldest": "$OLDEST_DAILY",
    "newest": "$NEWEST_DAILY"
  },
  "research": {
    "count": $RESEARCH_COUNT,
    "size": "$RESEARCH_SIZE"
  },
  "builds": {
    "count": $BUILDS_COUNT,
    "size": "$BUILDS_SIZE"
  },
  "last_review": "$LAST_REVIEW",
  "days_since_review": ${DAYS_SINCE_REVIEW:-null},
  "review_status": "$REVIEW_STATUS"
}
EOF
    exit 0
fi

# Human-readable output
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                    📝 MEMORY STATS                            ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Total overview
echo -e "${BLUE}📁 Overview${NC}"
echo -e "   Total files:  ${GREEN}$TOTAL_FILES${NC}"
echo -e "   Total size:   ${GREEN}$TOTAL_SIZE${NC}"
echo ""

# Daily journals
echo -e "${BLUE}📅 Daily Journals${NC}"
echo -e "   Count:    ${GREEN}$DAILY_FILES${NC} files"
if [ -n "$OLDEST_DAILY" ]; then
    echo -e "   Oldest:   $OLDEST_DAILY"
fi
if [ -n "$NEWEST_DAILY" ]; then
    echo -e "   Newest:   $NEWEST_DAILY"
fi
echo ""

# Research
echo -e "${BLUE}🔬 Research Archive${NC}"
echo -e "   Files:  ${GREEN}$RESEARCH_COUNT${NC}"
echo -e "   Size:   ${GREEN}$RESEARCH_SIZE${NC}"
echo ""

# Builds
echo -e "${BLUE}🔧 Build Logs${NC}"
echo -e "   Files:  ${GREEN}$BUILDS_COUNT${NC}"
echo -e "   Size:   ${GREEN}$BUILDS_SIZE${NC}"
echo ""

# Memory review status
echo -e "${BLUE}🧠 Memory Review Status${NC}"
if [ -n "$LAST_REVIEW" ]; then
    echo -e "   Last updated:  $LAST_REVIEW"
    if [ -n "$DAYS_SINCE_REVIEW" ]; then
        case $REVIEW_STATUS in
            ok)
                echo -e "   Days since:    ${GREEN}$DAYS_SINCE_REVIEW days${NC} ✓"
                ;;
            due)
                echo -e "   Days since:    ${YELLOW}$DAYS_SINCE_REVIEW days${NC} ⚠ (review recommended)"
                ;;
            overdue)
                echo -e "   Days since:    ${RED}$DAYS_SINCE_REVIEW days${NC} ⚠ (overdue!)"
                ;;
        esac
    fi
else
    echo -e "   ${YELLOW}Could not detect last review date${NC}"
fi
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
