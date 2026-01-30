#!/bin/bash
# Setup Mission Control as a systemd service
# Run with: sudo ./setup-service.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="$SCRIPT_DIR/mission-control.service"

echo "🚀 Setting up Mission Control service..."

# Build if needed
if [ ! -f "$SCRIPT_DIR/.next/standalone/server.js" ]; then
    echo "📦 Building production version..."
    cd "$SCRIPT_DIR"
    npm run build
    mkdir -p .next/standalone/.next
    cp -r .next/static .next/standalone/.next/
    cp -r public .next/standalone/ 2>/dev/null || true
fi

# Copy service file
echo "📋 Installing systemd service..."
sudo cp "$SERVICE_FILE" /etc/systemd/system/mission-control.service

# Reload and enable
echo "🔄 Enabling service..."
sudo systemctl daemon-reload
sudo systemctl enable mission-control
sudo systemctl start mission-control

echo ""
echo "✅ Mission Control service installed!"
echo ""
echo "Commands:"
echo "  sudo systemctl status mission-control  - Check status"
echo "  sudo systemctl restart mission-control - Restart"
echo "  sudo systemctl stop mission-control    - Stop"
echo "  journalctl -u mission-control -f       - View logs"
echo ""
echo "🌐 Access at: http://localhost:3000"
