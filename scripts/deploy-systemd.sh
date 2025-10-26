#!/bin/bash
# Deploy SDR Cockpit as a systemd service on Alma Linux
# This script sets up the service, user, and dependencies

set -e

if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Deploying SDR Cockpit systemd service..."
echo ""

# Create service user if it doesn't exist
if ! id -u sdr &>/dev/null; then
    echo "📝 Creating sdr user..."
    useradd -r -s /bin/false -d /var/lib/sdr-cockpit sdr
fi

# Create data directory
echo "📁 Creating data directory..."
mkdir -p /var/lib/sdr-cockpit
chown sdr:sdr /var/lib/sdr-cockpit

# Install Redis if not already installed
if ! systemctl is-enabled redis &>/dev/null; then
    echo "📦 Installing Redis..."
    dnf install -y redis
    systemctl enable redis
    systemctl start redis
fi

# Install Podman if not already installed
if ! command -v podman &>/dev/null; then
    echo "📦 Installing Podman..."
    dnf install -y podman
fi

# Copy service file
echo "📋 Installing systemd service..."
cp "$SCRIPT_DIR/sdr-cockpit.service" /etc/systemd/system/
chmod 644 /etc/systemd/system/sdr-cockpit.service

# Reload systemd
echo "🔄 Reloading systemd..."
systemctl daemon-reload

# Enable and start service
echo "✅ Enabling SDR Cockpit service..."
systemctl enable sdr-cockpit

echo ""
echo "✅ Deployment complete!"
echo ""
echo "To start the service:"
echo "  sudo systemctl start sdr-cockpit"
echo ""
echo "To check status:"
echo "  sudo systemctl status sdr-cockpit"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u sdr-cockpit -f"
echo ""
echo "The application will be available at:"
echo "  http://localhost:8000"
