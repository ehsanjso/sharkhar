#!/bin/bash
#
# gateway-health.sh - ClawdBot Gateway Diagnostics
#
# Quick health check specifically for the gateway process and related systems.
# Use this when experiencing timeouts or slowness.
#
# Usage:
#   ./gateway-health.sh              # Human-readable report
#   ./gateway-health.sh --json       # JSON output for scripts
#   ./gateway-health.sh --quick      # Skip slow checks (ws ping)
#   ./gateway-health.sh --verbose    # More detail
#   ./gateway-health.sh --help       # Show help
#

set -euo pipefail

# Configuration
GATEWAY_WS_URL="ws://127.0.0.1:18789"
GATEWAY_PORT=18789
CLAWDBOT_DIR="${HOME}/.clawdbot"
CRON_JOBS_FILE="${CLAWDBOT_DIR}/cron/jobs.json"
CRON_RUNS_DIR="${CLAWDBOT_DIR}/cron/runs"
SESSIONS_DIR="${CLAWDBOT_DIR}/agents/main/sessions"
LOG_FILE="${CLAWDBOT_DIR}/gateway.log"

# Options
JSON_MODE=false
QUICK_MODE=false
VERBOSE_MODE=false
WATCH_MODE=false
WATCH_INTERVAL=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Status tracking for JSON output
declare -A STATUS_DATA

usage() {
    echo "Usage: $(basename "$0") [OPTIONS]"
    echo ""
    echo "ClawdBot Gateway health diagnostics."
    echo "Use when experiencing timeouts, slowness, or connectivity issues."
    echo ""
    echo "Options:"
    echo "  --json         Output as JSON (for scripts/automation)"
    echo "  --quick        Skip slow checks (websocket ping)"
    echo "  --verbose      Show more detail (recent logs, session list)"
    echo "  --watch [N]    Continuous monitoring (refresh every N seconds, default: 5)"
    echo "  --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $(basename "$0")              # Quick health check"
    echo "  $(basename "$0") --json       # JSON for monitoring"
    echo "  $(basename "$0") --verbose    # Full diagnostic"
    echo "  $(basename "$0") --watch      # Live monitoring (5s refresh)"
    echo "  $(basename "$0") --watch 10   # Live monitoring (10s refresh)"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json|-j)
            JSON_MODE=true
            shift
            ;;
        --quick|-q)
            QUICK_MODE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE_MODE=true
            shift
            ;;
        --watch|-w)
            WATCH_MODE=true
            # Check if next arg is a number (interval)
            if [[ ${2:-} =~ ^[0-9]+$ ]]; then
                WATCH_INTERVAL=$2
                shift
            fi
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

#==============================================================================
# HELPER FUNCTIONS
#==============================================================================

format_duration() {
    local secs=$1
    local days=$((secs / 86400))
    local hours=$(((secs % 86400) / 3600))
    local mins=$(((secs % 3600) / 60))
    
    if [[ $days -gt 0 ]]; then
        echo "${days}d ${hours}h"
    elif [[ $hours -gt 0 ]]; then
        echo "${hours}h ${mins}m"
    elif [[ $mins -gt 0 ]]; then
        echo "${mins}m"
    else
        echo "${secs}s"
    fi
}

format_bytes() {
    local bytes=$1
    if [[ $bytes -ge 1073741824 ]]; then
        echo "$(awk "BEGIN {printf \"%.1f\", $bytes/1073741824}")GB"
    elif [[ $bytes -ge 1048576 ]]; then
        echo "$(awk "BEGIN {printf \"%.1f\", $bytes/1048576}")MB"
    elif [[ $bytes -ge 1024 ]]; then
        echo "$(awk "BEGIN {printf \"%.1f\", $bytes/1024}")KB"
    else
        echo "${bytes}B"
    fi
}

#==============================================================================
# CHECK: GATEWAY PROCESS
#==============================================================================

check_gateway_process() {
    local pid uptime_secs mem_kb cpu_pct status_icon status_text
    
    # Find gateway process
    pid=$(pgrep -f "clawdbot-gateway" 2>/dev/null | head -1 || echo "")
    
    if [[ -z "$pid" ]]; then
        # Try alternative pattern
        pid=$(pgrep -f "node.*clawdbot.*gateway" 2>/dev/null | head -1 || echo "")
    fi
    
    if [[ -z "$pid" ]]; then
        STATUS_DATA[process_running]="false"
        STATUS_DATA[process_status]="NOT_RUNNING"
        if ! $JSON_MODE; then
            echo -e "Process:     ${RED}✗ Not running${NC}"
        fi
        return 1
    fi
    
    # Get process details
    STATUS_DATA[process_running]="true"
    STATUS_DATA[process_pid]="$pid"
    
    # Uptime
    uptime_secs=$(ps -p "$pid" -o etimes= 2>/dev/null | tr -d ' ' || echo "0")
    STATUS_DATA[process_uptime_seconds]="$uptime_secs"
    
    # Memory (RSS in KB)
    mem_kb=$(ps -p "$pid" -o rss= 2>/dev/null | tr -d ' ' || echo "0")
    STATUS_DATA[process_memory_kb]="$mem_kb"
    
    # CPU
    cpu_pct=$(ps -p "$pid" -o %cpu= 2>/dev/null | tr -d ' ' || echo "0")
    STATUS_DATA[process_cpu_percent]="$cpu_pct"
    
    # Determine status
    if [[ $mem_kb -gt 512000 ]]; then  # > 500MB
        status_icon="${YELLOW}⚠${NC}"
        status_text="High memory"
        STATUS_DATA[process_status]="WARNING"
    else
        status_icon="${GREEN}✓${NC}"
        status_text="Running"
        STATUS_DATA[process_status]="OK"
    fi
    
    if ! $JSON_MODE; then
        local uptime_fmt=$(format_duration "$uptime_secs")
        local mem_fmt=$(format_bytes $((mem_kb * 1024)))
        echo -e "Process:     ${status_icon} ${status_text} (PID ${pid}, ${uptime_fmt} uptime)"
        echo -e "Memory:      ${mem_fmt} | CPU: ${cpu_pct}%"
    fi
    
    return 0
}

#==============================================================================
# CHECK: WEBSOCKET CONNECTIVITY
#==============================================================================

check_websocket() {
    if $QUICK_MODE; then
        STATUS_DATA[ws_checked]="false"
        STATUS_DATA[ws_status]="SKIPPED"
        if ! $JSON_MODE; then
            echo -e "Websocket:   ${CYAN}⊘ Skipped (--quick mode)${NC}"
        fi
        return 0
    fi
    
    # Quick port check using netcat or /dev/tcp
    local port_open=false
    local start_time end_time latency_ms
    
    start_time=$(date +%s%3N)
    
    if command -v nc &>/dev/null; then
        if nc -z -w 2 127.0.0.1 $GATEWAY_PORT 2>/dev/null; then
            port_open=true
        fi
    elif [[ -e /dev/tcp/127.0.0.1/$GATEWAY_PORT ]]; then
        port_open=true
    fi
    
    end_time=$(date +%s%3N)
    latency_ms=$((end_time - start_time))
    
    STATUS_DATA[ws_checked]="true"
    STATUS_DATA[ws_port_open]="$port_open"
    STATUS_DATA[ws_latency_ms]="$latency_ms"
    
    if $port_open; then
        STATUS_DATA[ws_status]="OK"
        if ! $JSON_MODE; then
            if [[ $latency_ms -lt 100 ]]; then
                echo -e "Websocket:   ${GREEN}✓ Port open${NC} (${latency_ms}ms)"
            else
                echo -e "Websocket:   ${YELLOW}⚠ Port open but slow${NC} (${latency_ms}ms)"
            fi
        fi
    else
        STATUS_DATA[ws_status]="UNREACHABLE"
        if ! $JSON_MODE; then
            echo -e "Websocket:   ${RED}✗ Port ${GATEWAY_PORT} not responding${NC}"
        fi
        # Don't return 1 - continue with other checks
    fi
    
    return 0
}

#==============================================================================
# CHECK: CRON JOBS
#==============================================================================

check_cron_jobs() {
    local job_count enabled_count recent_runs last_run_ago
    
    if [[ ! -f "$CRON_JOBS_FILE" ]]; then
        STATUS_DATA[cron_available]="false"
        if ! $JSON_MODE; then
            echo -e "Cron Jobs:   ${YELLOW}⚠ No jobs.json found${NC}"
        fi
        return 0
    fi
    
    STATUS_DATA[cron_available]="true"
    
    # Count jobs
    job_count=$(jq 'length' "$CRON_JOBS_FILE" 2>/dev/null || echo "0")
    enabled_count=$(jq '[.[] | select(.enabled != false)] | length' "$CRON_JOBS_FILE" 2>/dev/null || echo "0")
    
    STATUS_DATA[cron_total_jobs]="$job_count"
    STATUS_DATA[cron_enabled_jobs]="$enabled_count"
    
    # Check recent runs
    if [[ -d "$CRON_RUNS_DIR" ]]; then
        recent_runs=$(find "$CRON_RUNS_DIR" -name "*.json" -mmin -60 2>/dev/null | wc -l || echo "0")
        STATUS_DATA[cron_runs_last_hour]="$recent_runs"
        
        # Most recent run
        local newest_run=$(find "$CRON_RUNS_DIR" -name "*.json" -type f 2>/dev/null | xargs -r ls -t | head -1)
        if [[ -n "$newest_run" ]]; then
            local run_time=$(stat -c %Y "$newest_run" 2>/dev/null || echo "0")
            local now=$(date +%s)
            last_run_ago=$((now - run_time))
            STATUS_DATA[cron_last_run_seconds_ago]="$last_run_ago"
        fi
    fi
    
    if ! $JSON_MODE; then
        local last_run_fmt=""
        if [[ -n "${last_run_ago:-}" && "$last_run_ago" -gt 0 ]]; then
            last_run_fmt=" (last run: $(format_duration "$last_run_ago") ago)"
        fi
        echo -e "Cron Jobs:   ${enabled_count}/${job_count} enabled${last_run_fmt}"
        
        if $VERBOSE_MODE && [[ $job_count -gt 0 ]]; then
            echo -e "${CYAN}   Jobs:${NC}"
            jq -r '.[] | select(.enabled != false) | "     - \(.label // .id) [\(.model // "default")]"' "$CRON_JOBS_FILE" 2>/dev/null | head -8
        fi
    fi
    
    return 0
}

#==============================================================================
# CHECK: ACTIVE SESSIONS
#==============================================================================

check_sessions() {
    local session_count oldest_session
    
    if [[ ! -d "$SESSIONS_DIR" ]]; then
        STATUS_DATA[sessions_available]="false"
        if ! $JSON_MODE; then
            echo -e "Sessions:    ${YELLOW}⚠ Sessions directory not found${NC}"
        fi
        return 0
    fi
    
    STATUS_DATA[sessions_available]="true"
    
    # Count active sessions (modified in last 24h)
    session_count=$(find "$SESSIONS_DIR" -name "*.json" -mmin -1440 -type f 2>/dev/null | wc -l || echo "0")
    STATUS_DATA[sessions_active_24h]="$session_count"
    
    # Total sessions
    local total_sessions=$(find "$SESSIONS_DIR" -name "*.json" -type f 2>/dev/null | wc -l || echo "0")
    STATUS_DATA[sessions_total]="$total_sessions"
    
    if ! $JSON_MODE; then
        echo -e "Sessions:    ${session_count} active (${total_sessions} total)"
    fi
    
    return 0
}

#==============================================================================
# CHECK: RECENT ERRORS
#==============================================================================

check_errors() {
    local error_count recent_errors
    
    if [[ ! -f "$LOG_FILE" ]]; then
        # Try alternate log locations
        LOG_FILE="${CLAWDBOT_DIR}/logs/gateway.log"
    fi
    
    if [[ ! -f "$LOG_FILE" ]]; then
        STATUS_DATA[errors_available]="false"
        if ! $JSON_MODE && $VERBOSE_MODE; then
            echo -e "Errors:      ${CYAN}⊘ No log file found${NC}"
        fi
        return 0
    fi
    
    STATUS_DATA[errors_available]="true"
    
    # Count errors in last hour (approximate by looking at recent lines)
    error_count=$(tail -1000 "$LOG_FILE" 2>/dev/null | grep -ci "error\|exception\|fatal" || echo "0")
    STATUS_DATA[errors_recent]="$error_count"
    
    if ! $JSON_MODE; then
        if [[ $error_count -eq 0 ]]; then
            echo -e "Errors:      ${GREEN}✓ None in recent logs${NC}"
        else
            echo -e "Errors:      ${YELLOW}⚠ ${error_count} errors in recent logs${NC}"
            
            if $VERBOSE_MODE; then
                echo -e "${CYAN}   Recent errors:${NC}"
                tail -500 "$LOG_FILE" 2>/dev/null | grep -i "error\|exception" | tail -3 | while read -r line; do
                    echo "     ${line:0:80}..."
                done
            fi
        fi
    fi
    
    return 0
}

#==============================================================================
# OVERALL STATUS
#==============================================================================

determine_overall_status() {
    local status="HEALTHY"
    local icon="🟢"
    
    # Check for critical issues
    if [[ "${STATUS_DATA[process_running]:-false}" != "true" ]]; then
        status="CRITICAL"
        icon="🔴"
    elif [[ "${STATUS_DATA[ws_status]:-OK}" == "UNREACHABLE" ]]; then
        status="CRITICAL"
        icon="🔴"
    elif [[ "${STATUS_DATA[process_status]:-OK}" == "WARNING" ]]; then
        status="WARNING"
        icon="🟡"
    elif [[ ${STATUS_DATA[errors_recent]:-0} -gt 10 ]]; then
        status="WARNING"
        icon="🟡"
    fi
    
    STATUS_DATA[overall_status]="$status"
    
    if ! $JSON_MODE; then
        echo ""
        echo -e "Status:      ${icon} ${BOLD}${status}${NC}"
        
        # Recommendations
        if [[ "$status" == "CRITICAL" ]]; then
            echo ""
            echo -e "${RED}Recommendations:${NC}"
            if [[ "${STATUS_DATA[process_running]:-false}" != "true" ]]; then
                echo "  → Start gateway: clawdbot gateway start"
            fi
            if [[ "${STATUS_DATA[ws_status]:-OK}" == "UNREACHABLE" ]]; then
                echo "  → Restart gateway: clawdbot gateway restart"
            fi
        elif [[ "$status" == "WARNING" ]]; then
            echo ""
            echo -e "${YELLOW}Recommendations:${NC}"
            if [[ "${STATUS_DATA[process_status]:-OK}" == "WARNING" ]]; then
                echo "  → High memory - consider restarting: clawdbot gateway restart"
            fi
            if [[ ${STATUS_DATA[errors_recent]:-0} -gt 10 ]]; then
                echo "  → Check logs: tail -100 ~/.clawdbot/gateway.log"
            fi
        fi
    fi
}

#==============================================================================
# OUTPUT: JSON
#==============================================================================

output_json() {
    cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "overall_status": "${STATUS_DATA[overall_status]:-UNKNOWN}",
  "process": {
    "running": ${STATUS_DATA[process_running]:-false},
    "pid": ${STATUS_DATA[process_pid]:-null},
    "uptime_seconds": ${STATUS_DATA[process_uptime_seconds]:-0},
    "memory_kb": ${STATUS_DATA[process_memory_kb]:-0},
    "cpu_percent": ${STATUS_DATA[process_cpu_percent]:-0},
    "status": "${STATUS_DATA[process_status]:-UNKNOWN}"
  },
  "websocket": {
    "checked": ${STATUS_DATA[ws_checked]:-false},
    "port_open": ${STATUS_DATA[ws_port_open]:-false},
    "latency_ms": ${STATUS_DATA[ws_latency_ms]:-null},
    "status": "${STATUS_DATA[ws_status]:-UNKNOWN}"
  },
  "cron": {
    "available": ${STATUS_DATA[cron_available]:-false},
    "total_jobs": ${STATUS_DATA[cron_total_jobs]:-0},
    "enabled_jobs": ${STATUS_DATA[cron_enabled_jobs]:-0},
    "runs_last_hour": ${STATUS_DATA[cron_runs_last_hour]:-0},
    "last_run_seconds_ago": ${STATUS_DATA[cron_last_run_seconds_ago]:-null}
  },
  "sessions": {
    "available": ${STATUS_DATA[sessions_available]:-false},
    "active_24h": ${STATUS_DATA[sessions_active_24h]:-0},
    "total": ${STATUS_DATA[sessions_total]:-0}
  },
  "errors": {
    "available": ${STATUS_DATA[errors_available]:-false},
    "recent_count": ${STATUS_DATA[errors_recent]:-0}
  }
}
EOF
}

#==============================================================================
# MAIN
#==============================================================================

run_checks() {
    # Reset status data for fresh run
    STATUS_DATA=()
    
    if ! $JSON_MODE; then
        echo ""
        echo -e "${BOLD}🔌 GATEWAY HEALTH${NC}"
        echo -e "${BOLD}═══════════════════════════════════════${NC}"
    fi
    
    check_gateway_process
    check_websocket
    check_cron_jobs
    check_sessions
    check_errors
    determine_overall_status
    
    if $JSON_MODE; then
        output_json
    else
        echo ""
    fi
}

watch_loop() {
    # Trap Ctrl+C to exit gracefully
    trap 'echo -e "\n${CYAN}Watch stopped.${NC}"; exit 0' INT
    
    while true; do
        # Clear screen if in a terminal, otherwise just print separator
        if [[ -t 1 ]]; then
            clear 2>/dev/null || printf '\033[2J\033[H'
        else
            echo "════════════════════════════════════════════════════════════════"
        fi
        echo -e "${CYAN}⟳ Watching (every ${WATCH_INTERVAL}s) | Press Ctrl+C to stop${NC}"
        echo -e "${CYAN}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
        run_checks
        sleep "$WATCH_INTERVAL"
    done
}

main() {
    if $WATCH_MODE; then
        watch_loop
    else
        run_checks
    fi
}

main
