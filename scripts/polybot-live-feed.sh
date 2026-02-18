#!/bin/bash
# Live feed polybot-v3 logs to Telegram group

CHAT_ID="-1003872425777"
LOG_FILE="/home/ehsanjso/.pm2/logs/polybot-v3-out.log"
LAST_LINE=""
BUFFER=""
LINE_COUNT=0

tail -F "$LOG_FILE" 2>/dev/null | while read -r line; do
    # Skip empty lines
    [[ -z "$line" ]] && continue
    
    # Accumulate lines
    BUFFER="${BUFFER}${line}\n"
    ((LINE_COUNT++))
    
    # Send batch every 5 lines or on important events
    if [[ $LINE_COUNT -ge 5 ]] || [[ "$line" == *"TRADE"* ]] || [[ "$line" == *"ORDER"* ]] || [[ "$line" == *"SESSION"* ]] || [[ "$line" == *"STOP LOSS"* ]]; then
        if [[ -n "$BUFFER" ]]; then
            # Use clawdbot to send message
            echo -e "$BUFFER" | head -c 4000
            BUFFER=""
            LINE_COUNT=0
        fi
    fi
done
