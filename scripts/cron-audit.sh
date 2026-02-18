#!/usr/bin/env bash
#
# cron-audit.sh - Analyze cron jobs for optimization opportunities
#
# Usage:
#   ./cron-audit.sh              # Show all jobs with model info
#   ./cron-audit.sh --expensive  # Only show jobs using expensive models
#   ./cron-audit.sh --suggest    # Show optimization suggestions
#   ./cron-audit.sh --json       # JSON output for scripts
#   ./cron-audit.sh --help       # Show usage
#
# Shows:
#   - All cron jobs with their models
#   - Jobs that could potentially use Haiku
#   - Estimated quota impact
#

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════

JOBS_FILE="${HOME}/.clawdbot/cron/jobs.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Model costs (relative units - Sonnet is baseline)
# These are rough estimates for comparison
declare -A MODEL_COST=(
    ["default"]=10
    ["sonnet"]=10
    ["haiku"]=1
    ["opus"]=50
)

# ═══════════════════════════════════════════════════════════════════════════
# Functions
# ═══════════════════════════════════════════════════════════════════════════

usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Analyze cron jobs for cost optimization opportunities.

Options:
  --expensive    Only show jobs using expensive models (default/sonnet/opus)
  --suggest      Show optimization suggestions for each job
  --summary      Show only summary stats
  --json         Output as JSON
  --help         Show this help message

Examples:
  $(basename "$0")                # Full audit
  $(basename "$0") --expensive    # Focus on high-cost jobs
  $(basename "$0") --suggest      # Get recommendations
EOF
    exit 0
}

check_deps() {
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error:${NC} jq is required but not installed."
        exit 1
    fi
    
    if [[ ! -f "$JOBS_FILE" ]]; then
        echo -e "${RED}Error:${NC} Cron jobs file not found: $JOBS_FILE"
        exit 1
    fi
}

# Get job info as JSON
get_jobs() {
    jq -r '.jobs' "$JOBS_FILE"
}

# Count jobs by model
count_by_model() {
    jq -r '.jobs | group_by(.model // "default") | map({model: .[0].model // "default", count: length}) | .[]' "$JOBS_FILE"
}

# Get execution frequency (runs per week)
get_weekly_runs() {
    local schedule="$1"
    
    # Parse cron expression (simplified)
    # Format: min hour dom month dow
    local hour_part=$(echo "$schedule" | awk '{print $2}')
    local dow_part=$(echo "$schedule" | awk '{print $5}')
    
    # Count hours in schedule
    local hours_per_day=1
    if [[ "$hour_part" == *","* ]]; then
        hours_per_day=$(echo "$hour_part" | tr ',' '\n' | wc -l)
    fi
    
    # Count days per week
    local days_per_week=7
    if [[ "$dow_part" == "1-5" ]]; then
        days_per_week=5
    elif [[ "$dow_part" == "0" || "$dow_part" == "7" ]]; then
        days_per_week=1
    fi
    
    echo $((hours_per_day * days_per_week))
}

# Suggest if job could use Haiku
suggest_model() {
    local text="$1"
    local current_model="$2"
    
    # Already on Haiku - no change needed
    if [[ "$current_model" == "haiku" ]]; then
        echo "already-optimal"
        return
    fi
    
    # Keywords suggesting simple tasks (good for Haiku)
    local simple_patterns="status|check|ping|reminder|heartbeat|prune|cleanup|backup|simple|quick"
    
    # Keywords suggesting complex tasks (need Sonnet+)
    local complex_patterns="analyze|code|debug|review|research|write|create|build|design"
    
    if echo "$text" | grep -qiE "$simple_patterns"; then
        echo "consider-haiku"
    elif echo "$text" | grep -qiE "$complex_patterns"; then
        echo "keep-current"
    else
        echo "review-needed"
    fi
}

# Print job row
print_job() {
    local id="$1"
    local text="$2"
    local schedule="$3"
    local model="$4"
    local enabled="$5"
    
    # Truncate text
    local short_text="${text:0:40}"
    [[ ${#text} -gt 40 ]] && short_text="${short_text}..."
    
    # Model color
    local model_color
    case "$model" in
        haiku) model_color="${GREEN}" ;;
        opus) model_color="${RED}" ;;
        *) model_color="${YELLOW}" ;;
    esac
    
    # Enabled indicator
    local status_icon
    if [[ "$enabled" == "true" ]]; then
        status_icon="${GREEN}●${NC}"
    else
        status_icon="${GRAY}○${NC}"
    fi
    
    printf "${status_icon} ${CYAN}%-8s${NC} ${model_color}%-8s${NC} %-12s %s\n" \
        "${id:0:8}" "$model" "$schedule" "$short_text"
}

# Main audit function
run_audit() {
    local show_expensive=false
    local show_suggest=false
    local show_summary=false
    local json_output=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --expensive) show_expensive=true; shift ;;
            --suggest) show_suggest=true; shift ;;
            --summary) show_summary=true; shift ;;
            --json) json_output=true; shift ;;
            --help|-h) usage ;;
            *) echo "Unknown option: $1"; usage ;;
        esac
    done
    
    check_deps
    
    # JSON output mode
    if $json_output; then
        jq '{
            total: (.jobs | length),
            enabled: ([.jobs[] | select(.enabled)] | length),
            by_model: (.jobs | group_by(.model | if . == null then "default" else . end) | map({model: (.[0].model | if . == null then "default" else . end), count: length})),
            expensive_jobs: [.jobs[] | select(.model == null or .model == "default" or .model == "sonnet" or .model == "opus") | {id: .id, name: .name, model: (if .model == null then "default" else .model end), schedule: .schedule.expr}]
        }' "$JOBS_FILE"
        return
    fi
    
    # Header
    echo -e "\n${BOLD}🔍 Cron Job Audit${NC}"
    echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    # Summary stats
    local total=$(jq '.jobs | length' "$JOBS_FILE")
    local enabled=$(jq '[.jobs[] | select(.enabled)] | length' "$JOBS_FILE")
    local haiku_count=$(jq '[.jobs[] | select(.model == "haiku")] | length' "$JOBS_FILE")
    local default_count=$(jq '[.jobs[] | select(.model == null or .model == "default" or .model == "sonnet")] | length' "$JOBS_FILE")
    local opus_count=$(jq '[.jobs[] | select(.model == "opus")] | length' "$JOBS_FILE")
    
    echo -e "${BOLD}Summary${NC}"
    echo -e "  Total jobs:     ${CYAN}$total${NC}"
    echo -e "  Enabled:        ${GREEN}$enabled${NC}"
    echo -e "  Using Haiku:    ${GREEN}$haiku_count${NC} (cheap)"
    echo -e "  Using Default:  ${YELLOW}$default_count${NC} (expensive)"
    [[ $opus_count -gt 0 ]] && echo -e "  Using Opus:     ${RED}$opus_count${NC} (very expensive)"
    echo ""
    
    if $show_summary; then
        return
    fi
    
    # Job listing
    echo -e "${BOLD}Jobs${NC}"
    echo -e "${GRAY}Status   ID       Model    Schedule     Description${NC}"
    echo -e "${GRAY}──────────────────────────────────────────────────────────────────${NC}"
    
    # Read jobs and print
    while IFS= read -r job; do
        local id=$(echo "$job" | jq -r '.id')
        local name=$(echo "$job" | jq -r '.name // ""')
        local message=$(echo "$job" | jq -r '.payload.message // ""')
        # Prefer name, fall back to first line of message
        local text="$name"
        if [[ -z "$text" || "$text" == "null" ]]; then
            text=$(echo "$message" | head -n1 | sed 's/^[[:space:]]*//')
        fi
        [[ -z "$text" ]] && text="(unnamed job)"
        local schedule=$(echo "$job" | jq -r '.schedule.expr // "(no schedule)"')
        local model=$(echo "$job" | jq -r '.model // "default"')
        local enabled=$(echo "$job" | jq -r '.enabled')
        
        # Filter if --expensive
        if $show_expensive; then
            if [[ "$model" == "haiku" ]]; then
                continue
            fi
        fi
        
        print_job "$id" "$text" "$schedule" "$model" "$enabled"
        
        # Suggestions
        if $show_suggest && [[ "$model" != "haiku" ]]; then
            local suggestion=$(suggest_model "$text" "$model")
            case "$suggestion" in
                "consider-haiku")
                    echo -e "  ${GREEN}↳ Suggestion: Could use Haiku (simple task pattern detected)${NC}"
                    ;;
                "review-needed")
                    echo -e "  ${YELLOW}↳ Review: Check if Haiku would work${NC}"
                    ;;
            esac
        fi
        
    done < <(jq -c '.jobs[]' "$JOBS_FILE")
    
    echo ""
    
    # Optimization potential
    if [[ $default_count -gt 0 ]]; then
        local potential_savings=$((default_count * 9))  # 9x cheaper with Haiku
        echo -e "${BOLD}💡 Optimization Potential${NC}"
        echo -e "  Switching $default_count jobs from Default→Haiku could save ~${GREEN}${potential_savings}x${NC} API costs"
        echo -e "  Run with ${CYAN}--suggest${NC} to see recommendations"
        echo ""
    fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

run_audit "$@"
