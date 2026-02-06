#!/bin/bash
# Pi Health Check - Quick system status report
# Usage: ./pi-health.sh [--json] [--help]

JSON_OUTPUT=false

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
            echo "Quick health check for Raspberry Pi running ClawdBot."
            echo ""
            echo "Options:"
            echo "  -j, --json     Output as JSON (for scripts/cron)"
            echo "  -h, --help     Show this help message"
            echo ""
            echo "Checks: CPU temp/freq, throttling, load, memory, disk, uptime, ClawdBot status"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Gather metrics
CPU_TEMP=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
CPU_TEMP_C=""
if [ -n "$CPU_TEMP" ]; then
    CPU_TEMP_C=$(echo "scale=1; $CPU_TEMP/1000" | bc)
fi

LOAD_1=$(cat /proc/loadavg | awk '{print $1}')
LOAD_5=$(cat /proc/loadavg | awk '{print $2}')
LOAD_15=$(cat /proc/loadavg | awk '{print $3}')

MEM_TOTAL=$(free -b | awk '/^Mem:/{print $2}')
MEM_USED=$(free -b | awk '/^Mem:/{print $3}')
MEM_AVAIL=$(free -b | awk '/^Mem:/{print $7}')
MEM_PCT=$(echo "scale=1; $MEM_USED*100/$MEM_TOTAL" | bc)

SWAP_TOTAL=$(free -b | awk '/^Swap:/{print $2}')
SWAP_USED=$(free -b | awk '/^Swap:/{print $3}')

DISK_TOTAL=$(df -B1 / | awk 'NR==2{print $2}')
DISK_USED=$(df -B1 / | awk 'NR==2{print $3}')
DISK_AVAIL=$(df -B1 / | awk 'NR==2{print $4}')
DISK_PCT=$(df / | awk 'NR==2{gsub(/%/,""); print $5}')

UPTIME_SECS=$(cat /proc/uptime | awk '{print int($1)}')
UPTIME_DAYS=$((UPTIME_SECS / 86400))
UPTIME_HOURS=$(( (UPTIME_SECS % 86400) / 3600 ))

# ClawdBot process check
CLAWD_PID=$(pgrep -f "clawdbot" | head -1)
CLAWD_STATUS="stopped"
CLAWD_MEM=""
if [ -n "$CLAWD_PID" ]; then
    CLAWD_STATUS="running (PID: $CLAWD_PID)"
    CLAWD_MEM=$(ps -o rss= -p "$CLAWD_PID" 2>/dev/null | awk '{printf "%.0f", $1/1024}')
fi

# Node.js processes
NODE_COUNT=$(pgrep -c node 2>/dev/null || echo 0)
NODE_MEM=$(ps -C node -o rss= 2>/dev/null | awk '{sum+=$1} END{printf "%.0f", sum/1024}')
[ -z "$NODE_MEM" ] && NODE_MEM=0

# CPU frequency monitoring
CPU_FREQ_HZ=$(vcgencmd measure_clock arm 2>/dev/null | cut -d= -f2)
CPU_FREQ_MHZ=""
CPU_FREQ_MAX_MHZ=""
CPU_FREQ_PCT=""
if [ -n "$CPU_FREQ_HZ" ] && [ "$CPU_FREQ_HZ" != "0" ]; then
    CPU_FREQ_MHZ=$((CPU_FREQ_HZ / 1000000))
    # Get max freq from cpufreq (in kHz) or default to 2400 MHz for Pi 5
    CPU_FREQ_MAX_KHZ=$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_max_freq 2>/dev/null)
    if [ -n "$CPU_FREQ_MAX_KHZ" ]; then
        CPU_FREQ_MAX_MHZ=$((CPU_FREQ_MAX_KHZ / 1000))
    else
        CPU_FREQ_MAX_MHZ=2400  # Pi 5 default
    fi
    CPU_FREQ_PCT=$(echo "scale=1; $CPU_FREQ_MHZ * 100 / $CPU_FREQ_MAX_MHZ" | bc)
fi

# CPU throttling check (vcgencmd get_throttled)
# Bit meanings:
# 0: Under-voltage detected (now)    16: Under-voltage has occurred
# 1: Freq capped (now)               17: Freq capped has occurred
# 2: Currently throttled             18: Throttling has occurred
# 3: Soft temp limit (now)           19: Soft temp limit has occurred
THROTTLE_RAW=$(vcgencmd get_throttled 2>/dev/null | cut -d= -f2)
THROTTLE_HEX="${THROTTLE_RAW:-0x0}"
THROTTLE_DEC=$((THROTTLE_HEX))

# Current state (bits 0-3)
THROTTLE_UNDERVOLT=$((THROTTLE_DEC & 1))
THROTTLE_FREQCAP=$(((THROTTLE_DEC >> 1) & 1))
THROTTLE_THROTTLED=$(((THROTTLE_DEC >> 2) & 1))
THROTTLE_SOFTLIMIT=$(((THROTTLE_DEC >> 3) & 1))

# Historical state (bits 16-19)
THROTTLE_UNDERVOLT_HIST=$(((THROTTLE_DEC >> 16) & 1))
THROTTLE_FREQCAP_HIST=$(((THROTTLE_DEC >> 17) & 1))
THROTTLE_THROTTLED_HIST=$(((THROTTLE_DEC >> 18) & 1))
THROTTLE_SOFTLIMIT_HIST=$(((THROTTLE_DEC >> 19) & 1))

# Summary flags
THROTTLE_NOW=$((THROTTLE_UNDERVOLT + THROTTLE_FREQCAP + THROTTLE_THROTTLED + THROTTLE_SOFTLIMIT))
THROTTLE_HIST=$((THROTTLE_UNDERVOLT_HIST + THROTTLE_FREQCAP_HIST + THROTTLE_THROTTLED_HIST + THROTTLE_SOFTLIMIT_HIST))

# Human-readable size
human_size() {
    local bytes=$1
    if [ "$bytes" -ge 1073741824 ]; then
        echo "$(echo "scale=1; $bytes/1073741824" | bc)G"
    elif [ "$bytes" -ge 1048576 ]; then
        echo "$(echo "scale=1; $bytes/1048576" | bc)M"
    elif [ "$bytes" -ge 1024 ]; then
        echo "$(echo "scale=1; $bytes/1024" | bc)K"
    else
        echo "${bytes}B"
    fi
}

# JSON output
if $JSON_OUTPUT; then
    cat <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "cpu": {
    "temp_c": ${CPU_TEMP_C:-null},
    "freq_mhz": ${CPU_FREQ_MHZ:-null},
    "freq_max_mhz": ${CPU_FREQ_MAX_MHZ:-null},
    "freq_pct": ${CPU_FREQ_PCT:-null},
    "load_1m": $LOAD_1,
    "load_5m": $LOAD_5,
    "load_15m": $LOAD_15
  },
  "memory": {
    "total_bytes": $MEM_TOTAL,
    "used_bytes": $MEM_USED,
    "available_bytes": $MEM_AVAIL,
    "used_pct": $MEM_PCT
  },
  "swap": {
    "total_bytes": $SWAP_TOTAL,
    "used_bytes": $SWAP_USED
  },
  "disk": {
    "total_bytes": $DISK_TOTAL,
    "used_bytes": $DISK_USED,
    "available_bytes": $DISK_AVAIL,
    "used_pct": $DISK_PCT
  },
  "uptime_seconds": $UPTIME_SECS,
  "clawdbot": {
    "status": "$([ -n "$CLAWD_PID" ] && echo "running" || echo "stopped")",
    "pid": $([ -n "$CLAWD_PID" ] && echo "$CLAWD_PID" || echo "null"),
    "memory_mb": $([ -n "$CLAWD_MEM" ] && echo "$CLAWD_MEM" || echo "null")
  },
  "node_processes": $NODE_COUNT,
  "node_memory_mb": $NODE_MEM,
  "throttling": {
    "raw": "$THROTTLE_HEX",
    "current": {
      "under_voltage": $([[ $THROTTLE_UNDERVOLT -eq 1 ]] && echo "true" || echo "false"),
      "freq_capped": $([[ $THROTTLE_FREQCAP -eq 1 ]] && echo "true" || echo "false"),
      "throttled": $([[ $THROTTLE_THROTTLED -eq 1 ]] && echo "true" || echo "false"),
      "soft_temp_limit": $([[ $THROTTLE_SOFTLIMIT -eq 1 ]] && echo "true" || echo "false")
    },
    "occurred": {
      "under_voltage": $([[ $THROTTLE_UNDERVOLT_HIST -eq 1 ]] && echo "true" || echo "false"),
      "freq_capped": $([[ $THROTTLE_FREQCAP_HIST -eq 1 ]] && echo "true" || echo "false"),
      "throttled": $([[ $THROTTLE_THROTTLED_HIST -eq 1 ]] && echo "true" || echo "false"),
      "soft_temp_limit": $([[ $THROTTLE_SOFTLIMIT_HIST -eq 1 ]] && echo "true" || echo "false")
    },
    "issues_now": $THROTTLE_NOW,
    "issues_since_boot": $THROTTLE_HIST
  }
}
EOF
    exit 0
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Status indicators
temp_status() {
    local temp=$1
    if (( $(echo "$temp < 60" | bc -l) )); then
        echo -e "${GREEN}✓${NC}"
    elif (( $(echo "$temp < 75" | bc -l) )); then
        echo -e "${YELLOW}⚠${NC}"
    else
        echo -e "${RED}🔥${NC}"
    fi
}

disk_status() {
    local pct=$1
    if [ "$pct" -lt 70 ]; then
        echo -e "${GREEN}✓${NC}"
    elif [ "$pct" -lt 85 ]; then
        echo -e "${YELLOW}⚠${NC}"
    else
        echo -e "${RED}⚠${NC}"
    fi
}

mem_status() {
    local pct=$1
    if (( $(echo "$pct < 70" | bc -l) )); then
        echo -e "${GREEN}✓${NC}"
    elif (( $(echo "$pct < 85" | bc -l) )); then
        echo -e "${YELLOW}⚠${NC}"
    else
        echo -e "${RED}⚠${NC}"
    fi
}

echo ""
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}         🍓 Pi Health Report           ${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Helper for frequency status
freq_status() {
    local pct=$1
    if (( $(echo "$pct >= 95" | bc -l) )); then
        echo -e "${GREEN}✓${NC}"
    elif (( $(echo "$pct >= 80" | bc -l) )); then
        echo -e "${YELLOW}⚠${NC}"
    else
        echo -e "${RED}↓${NC}"
    fi
}

# CPU & Temp
echo -e "${GREEN}🌡️  CPU${NC}"
if [ -n "$CPU_TEMP_C" ]; then
    echo -e "   Temperature: ${CPU_TEMP_C}°C $(temp_status $CPU_TEMP_C)"
fi
if [ -n "$CPU_FREQ_MHZ" ]; then
    echo -e "   Frequency: ${CPU_FREQ_MHZ}MHz / ${CPU_FREQ_MAX_MHZ}MHz (${CPU_FREQ_PCT}%) $(freq_status $CPU_FREQ_PCT)"
fi
echo "   Load (1/5/15m): $LOAD_1 / $LOAD_5 / $LOAD_15"
echo ""

# Throttling
if [ "$THROTTLE_HEX" != "0x0" ]; then
    echo -e "${YELLOW}⚡ Throttling${NC} ($THROTTLE_HEX)"
    
    # Current issues (happening right now)
    if [ $THROTTLE_NOW -gt 0 ]; then
        echo -e "   ${RED}Active now:${NC}"
        [ $THROTTLE_UNDERVOLT -eq 1 ] && echo -e "   ${RED}⚠ Under-voltage detected${NC}"
        [ $THROTTLE_FREQCAP -eq 1 ] && echo -e "   ${RED}⚠ ARM frequency capped${NC}"
        [ $THROTTLE_THROTTLED -eq 1 ] && echo -e "   ${RED}⚠ Currently throttled${NC}"
        [ $THROTTLE_SOFTLIMIT -eq 1 ] && echo -e "   ${RED}⚠ Soft temp limit active${NC}"
    fi
    
    # Historical issues (since boot)
    if [ $THROTTLE_HIST -gt 0 ] && [ $THROTTLE_NOW -eq 0 ]; then
        echo -e "   ${YELLOW}Since boot:${NC}"
    elif [ $THROTTLE_HIST -gt 0 ]; then
        echo ""
        echo -e "   ${YELLOW}Also occurred since boot:${NC}"
    fi
    
    if [ $THROTTLE_HIST -gt 0 ]; then
        [ $THROTTLE_UNDERVOLT_HIST -eq 1 ] && [ $THROTTLE_UNDERVOLT -eq 0 ] && echo "   • Under-voltage"
        [ $THROTTLE_FREQCAP_HIST -eq 1 ] && [ $THROTTLE_FREQCAP -eq 0 ] && echo "   • ARM freq capping"
        [ $THROTTLE_THROTTLED_HIST -eq 1 ] && [ $THROTTLE_THROTTLED -eq 0 ] && echo "   • Throttling"
        [ $THROTTLE_SOFTLIMIT_HIST -eq 1 ] && [ $THROTTLE_SOFTLIMIT -eq 0 ] && echo "   • Soft temp limit"
    fi
    echo ""
fi

# Memory
echo -e "${GREEN}🧠 Memory${NC}"
echo -e "   Used: $(human_size $MEM_USED) / $(human_size $MEM_TOTAL) (${MEM_PCT}%) $(mem_status $MEM_PCT)"
echo "   Available: $(human_size $MEM_AVAIL)"
if [ "$SWAP_USED" -gt 0 ]; then
    echo -e "   ${YELLOW}Swap: $(human_size $SWAP_USED) / $(human_size $SWAP_TOTAL)${NC}"
fi
echo ""

# Disk
echo -e "${GREEN}💾 Disk${NC}"
echo -e "   Used: $(human_size $DISK_USED) / $(human_size $DISK_TOTAL) (${DISK_PCT}%) $(disk_status $DISK_PCT)"
echo "   Free: $(human_size $DISK_AVAIL)"
echo ""

# ClawdBot & Services
echo -e "${GREEN}🤖 ClawdBot${NC}"
if [ -n "$CLAWD_PID" ]; then
    echo -e "   Status: ${GREEN}$CLAWD_STATUS${NC}"
    [ -n "$CLAWD_MEM" ] && echo "   Memory: ${CLAWD_MEM}MB"
else
    echo -e "   Status: ${RED}$CLAWD_STATUS${NC}"
fi
echo "   Node processes: $NODE_COUNT (${NODE_MEM}MB total)"
echo ""

# Uptime
echo -e "${GREEN}⏱️  Uptime${NC}"
echo "   ${UPTIME_DAYS}d ${UPTIME_HOURS}h"
echo ""

# Overall assessment
ISSUES=0
[ -n "$CPU_TEMP_C" ] && (( $(echo "$CPU_TEMP_C >= 75" | bc -l) )) && ISSUES=$((ISSUES+1))
(( $(echo "$MEM_PCT >= 85" | bc -l) )) && ISSUES=$((ISSUES+1))
[ "$DISK_PCT" -ge 85 ] && ISSUES=$((ISSUES+1))
[ -z "$CLAWD_PID" ] && ISSUES=$((ISSUES+1))
[ $THROTTLE_NOW -gt 0 ] && ISSUES=$((ISSUES+THROTTLE_NOW))

echo -e "${BLUE}═══════════════════════════════════════${NC}"
if [ $ISSUES -eq 0 ]; then
    echo -e "   ${GREEN}✅ All systems healthy${NC}"
else
    echo -e "   ${YELLOW}⚠️  $ISSUES issue(s) detected${NC}"
fi
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""
