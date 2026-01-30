#!/bin/bash
# Install Mission Control as a systemd service
# Run with: sudo ./install-service.sh

set -e

SERVICE_FILE="mission-control.service"
SERVICE_NAME="mission-control"

echo "Installing Mission Control service..."

# Copy service file to systemd directory
sudo cp "$SERVICE_FILE" /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable "$SERVICE_NAME"

# Start the service
sudo systemctl start "$SERVICE_NAME"

echo "✅ Mission Control service installed and started!"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status mission-control  # Check status"
echo "  sudo systemctl restart mission-control # Restart"
echo "  sudo systemctl stop mission-control    # Stop"
echo "  sudo journalctl -u mission-control -f  # View logs"
echo ""
echo "Dashboard available at: http://localhost:3000"
