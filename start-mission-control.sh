#!/bin/bash
# Start Mission Control - Second Brain App
# Usage: ./start-mission-control.sh

cd /home/ehsanjso/clawd/mission-control

# Kill any existing instance
pkill -f "next dev -p 3456" 2>/dev/null

echo "🚀 Starting Mission Control..."
echo "   App: http://192.168.0.217:3456"
echo "   Tasks: http://192.168.0.217:3456/tasks"
echo ""

# Run in background with nohup
nohup npm run dev -- -p 3456 > /tmp/mission-control.log 2>&1 &

echo "✅ Mission Control is running (PID: $!)"
echo "   Logs: /tmp/mission-control.log"
