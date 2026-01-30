#!/bin/bash
# market-brief.sh - Fetch S&P 500 market data
# Uses Yahoo Finance (no API key needed)

set -e

# Symbols to track
SYMBOLS="^GSPC ^DJI ^IXIC SPY QQQ"

echo "📊 Market Brief - $(date '+%Y-%m-%d %H:%M %Z')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for SYMBOL in $SYMBOLS; do
    # Fetch data from Yahoo Finance
    DATA=$(curl -s "https://query1.finance.yahoo.com/v8/finance/chart/${SYMBOL}?interval=1d&range=2d" 2>/dev/null)
    
    if [ -z "$DATA" ]; then
        echo "⚠️  $SYMBOL: Unable to fetch data"
        continue
    fi
    
    # Parse with jq
    NAME=$(echo "$DATA" | jq -r '.chart.result[0].meta.shortName // .chart.result[0].meta.symbol' 2>/dev/null)
    PRICE=$(echo "$DATA" | jq -r '.chart.result[0].meta.regularMarketPrice // "N/A"' 2>/dev/null)
    PREV_CLOSE=$(echo "$DATA" | jq -r '.chart.result[0].meta.previousClose // "N/A"' 2>/dev/null)
    
    if [ "$PRICE" != "N/A" ] && [ "$PREV_CLOSE" != "N/A" ]; then
        # Calculate change
        CHANGE=$(echo "scale=2; $PRICE - $PREV_CLOSE" | bc 2>/dev/null || echo "0")
        PCT=$(echo "scale=2; ($CHANGE / $PREV_CLOSE) * 100" | bc 2>/dev/null || echo "0")
        
        # Emoji based on direction
        if (( $(echo "$CHANGE > 0" | bc -l) )); then
            EMOJI="🟢"
            SIGN="+"
        elif (( $(echo "$CHANGE < 0" | bc -l) )); then
            EMOJI="🔴"
            SIGN=""
        else
            EMOJI="⚪"
            SIGN=""
        fi
        
        printf "%s %-20s %10.2f  %s%.2f (%s%.2f%%)\n" "$EMOJI" "$NAME" "$PRICE" "$SIGN" "$CHANGE" "$SIGN" "$PCT"
    else
        echo "⚠️  $SYMBOL: Data unavailable"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
