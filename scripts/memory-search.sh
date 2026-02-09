#!/bin/bash
# Memory Search - Simple grep-based search for memory files
# Stopgap until RAG/semantic search is set up
# Usage: ./memory-search.sh "query" [--context N] [--files-only] [--json]

# Don't exit on grep returning no matches
set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

MEMORY_DIR="${HOME}/clawd/memory"
CONTEXT_LINES=2
FILES_ONLY=false
JSON_OUTPUT=false
WORD_BOUNDARY=false
RECENT_DAYS=0
FILE_TYPE=""
QUERY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --context|-c)
            CONTEXT_LINES="$2"
            shift 2
            ;;
        --files-only|-f)
            FILES_ONLY=true
            shift
            ;;
        --json|-j)
            JSON_OUTPUT=true
            shift
            ;;
        --word|-w)
            WORD_BOUNDARY=true
            shift
            ;;
        --recent|-r)
            RECENT_DAYS="$2"
            shift 2
            ;;
        --type|-t)
            FILE_TYPE="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $(basename "$0") \"query\" [OPTIONS]"
            echo ""
            echo "Search memory files with context. Case-insensitive by default."
            echo ""
            echo "Options:"
            echo "  -c, --context N    Lines of context around match (default: 2)"
            echo "  -f, --files-only   Only show matching filenames"
            echo "  -w, --word         Match whole words only (no partial matches)"
            echo "  -r, --recent N     Only search files from last N days"
            echo "  -t, --type TYPE    Filter by file type: daily|research|builds"
            echo "  -j, --json         Output as JSON"
            echo "  -h, --help         Show this help message"
            echo ""
            echo "Examples:"
            echo "  $(basename "$0") \"quota\"                 # Find quota mentions"
            echo "  $(basename "$0") \"ollama\" --context 5    # More context"
            echo "  $(basename "$0") \"rag\" --files-only      # Just filenames"
            echo "  $(basename "$0") \"api\" --recent 7        # Last 7 days only"
            echo "  $(basename "$0") \"script\" --type builds  # Only build sessions"
            echo ""
            echo "Searches: memory/*.md, memory/**/*.md, MEMORY.md"
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Use --help for usage"
            exit 1
            ;;
        *)
            QUERY="$1"
            shift
            ;;
    esac
done

if [[ -z "$QUERY" ]]; then
    echo "Error: No search query provided"
    echo "Usage: $(basename "$0") \"query\" [OPTIONS]"
    exit 1
fi

# Build grep pattern
if $WORD_BOUNDARY; then
    PATTERN="\\b${QUERY}\\b"
else
    PATTERN="$QUERY"
fi

# Find all markdown files (optionally filtered by recency and type)
find_files() {
    local find_args=()
    local base_path="$MEMORY_DIR"
    
    # Determine search path based on type
    case "$FILE_TYPE" in
        daily)
            # Only root-level YYYY-MM-DD.md files
            find_args+=("-maxdepth" "1" "-regex" ".*/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]\.md")
            ;;
        research)
            base_path="$MEMORY_DIR/research"
            ;;
        builds)
            base_path="$MEMORY_DIR/builds"
            ;;
        "")
            # No filter - search all
            ;;
        *)
            echo "Unknown type: $FILE_TYPE (use: daily|research|builds)" >&2
            exit 1
            ;;
    esac
    
    # Add recency filter if specified
    if [[ "$RECENT_DAYS" -gt 0 ]]; then
        find_args+=("-mtime" "-$RECENT_DAYS")
    fi
    
    # Type-specific searches
    if [[ "$FILE_TYPE" == "daily" ]]; then
        find "$MEMORY_DIR" "${find_args[@]}" -type f 2>/dev/null
    elif [[ -n "$FILE_TYPE" ]]; then
        # Subdir type (research/builds)
        if [[ -d "$base_path" ]]; then
            find "$base_path" -name "*.md" -type f "${find_args[@]}" 2>/dev/null
        fi
    else
        # All files
        find "$MEMORY_DIR" -name "*.md" -type f "${find_args[@]}" 2>/dev/null
        # Include MEMORY.md if no type filter
        if [[ -f "${HOME}/clawd/MEMORY.md" ]]; then
            if [[ "$RECENT_DAYS" -gt 0 ]]; then
                if find "${HOME}/clawd/MEMORY.md" -mtime -"$RECENT_DAYS" 2>/dev/null | grep -q .; then
                    echo "${HOME}/clawd/MEMORY.md"
                fi
            else
                echo "${HOME}/clawd/MEMORY.md"
            fi
        fi
    fi
}

if $FILES_ONLY; then
    # Just list matching files
    if $JSON_OUTPUT; then
        echo "{"
        echo "  \"query\": \"$QUERY\","
        echo "  \"files\": ["
        first=true
        while IFS= read -r file; do
            if grep -Eqi "$PATTERN" "$file" 2>/dev/null; then
                if $first; then
                    first=false
                else
                    echo ","
                fi
                # Get relative path
                relpath="${file#${HOME}/clawd/}"
                count=$(grep -Eci "$PATTERN" "$file" 2>/dev/null || echo "0")
                printf '    {"path": "%s", "matches": %s}' "$relpath" "$count"
            fi
        done < <(find_files)
        echo ""
        echo "  ]"
        echo "}"
    else
        echo -e "${BOLD}Files matching \"$QUERY\":${NC}"
        echo ""
        found=0
        while IFS= read -r file; do
            if grep -Eqi "$PATTERN" "$file" 2>/dev/null; then
                relpath="${file#${HOME}/clawd/}"
                count=$(grep -Eci "$PATTERN" "$file" 2>/dev/null || echo "0")
                echo -e "  ${GREEN}$relpath${NC} (${count} matches)"
                ((found++))
            fi
        done < <(find_files)
        echo ""
        echo -e "${CYAN}Found in $found files${NC}"
    fi
else
    # Show matches with context
    if $JSON_OUTPUT; then
        echo "{"
        echo "  \"query\": \"$QUERY\","
        echo "  \"results\": ["
        first=true
        while IFS= read -r file; do
            if grep -Eqi "$PATTERN" "$file" 2>/dev/null; then
                relpath="${file#${HOME}/clawd/}"
                # Get matches with line numbers
                while IFS=: read -r linenum content; do
                    if $first; then
                        first=false
                    else
                        echo ","
                    fi
                    # Escape for JSON
                    escaped=$(echo "$content" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g')
                    printf '    {"file": "%s", "line": %s, "text": "%s"}' "$relpath" "$linenum" "$escaped"
                done < <(grep -Ein "$PATTERN" "$file" 2>/dev/null | head -20)
            fi
        done < <(find_files)
        echo ""
        echo "  ]"
        echo "}"
    else
        echo -e "${BOLD}Searching for \"$QUERY\" with $CONTEXT_LINES lines context:${NC}"
        echo ""
        
        total_matches=0
        while IFS= read -r file; do
            if grep -Eqi "$PATTERN" "$file" 2>/dev/null; then
                relpath="${file#${HOME}/clawd/}"
                echo -e "${BLUE}━━━ ${GREEN}$relpath${NC} ${BLUE}━━━${NC}"
                
                # Show matches with context, highlight query
                grep -Ein -B"$CONTEXT_LINES" -A"$CONTEXT_LINES" "$PATTERN" "$file" 2>/dev/null | \
                    sed "s/\($QUERY\)/$(printf "${YELLOW}\\1${NC}")/gi" | \
                    head -50
                
                count=$(grep -Eci "$PATTERN" "$file" 2>/dev/null || echo "0")
                ((total_matches += count))
                echo ""
            fi
        done < <(find_files)
        
        echo -e "${CYAN}Total: $total_matches matches${NC}"
    fi
fi
