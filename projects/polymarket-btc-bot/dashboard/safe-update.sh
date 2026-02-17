#!/bin/bash
# Safe Update Script for Polymarket Bot
# Enters maintenance mode, waits for safe conditions, then restarts

API_BASE="http://localhost:8084/api/poly"
POLL_INTERVAL=10  # seconds

echo "🔧 Polymarket Bot Safe Update"
echo "=============================="

# Step 1: Enter maintenance mode
echo ""
echo "Step 1: Entering maintenance mode..."
RESPONSE=$(curl -s -X POST "$API_BASE/safe-restart")
echo "$RESPONSE" | jq .

SAFE_NOW=$(echo "$RESPONSE" | jq -r '.safeToRestart')

if [ "$SAFE_NOW" = "true" ]; then
    echo ""
    echo "✅ Already safe to restart!"
else
    echo ""
    echo "⏳ Waiting for safe conditions..."
    echo "   (Polling every ${POLL_INTERVAL}s - Ctrl+C to abort)"
    echo ""
    
    # Step 2: Poll until safe
    while true; do
        sleep $POLL_INTERVAL
        
        STATUS=$(curl -s "$API_BASE/maintenance/status")
        SAFE=$(echo "$STATUS" | jq -r '.safeToRestart')
        PENDING=$(echo "$STATUS" | jq -r '.pendingBets')
        LOCKED=$(echo "$STATUS" | jq -r '.lockedFunds')
        MARKETS=$(echo "$STATUS" | jq -r '.activeMarkets | length')
        
        echo "   📊 Pending: $PENDING | Locked: \$$LOCKED | Active Markets: $MARKETS"
        
        if [ "$SAFE" = "true" ]; then
            echo ""
            echo "✅ Safe conditions met!"
            break
        fi
    done
fi

# Step 3: Restart
echo ""
echo "Step 2: Restarting polymarket-multi..."
pm2 restart polymarket-multi

echo ""
echo "✅ Update complete!"
echo ""
echo "Check status: pm2 logs polymarket-multi --lines 20"
