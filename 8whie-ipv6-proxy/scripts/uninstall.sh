#!/usr/bin/env bash
# ==============================================================================
# 8WHIE IPv6 Proxy Manager - Safe Uninstaller
# Developer: Aryan Thakur
# Brand: 8WHIE
# License: Apache-2.0
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}Warning: This will uninstall 8WHIE IPv6 Proxy Manager and stop all proxy instances.${NC}"
read -p "Are you sure you want to proceed? [y/N]: " confirm
if [[ ! "$confirm" =~ ^[yY]([eE][sS])?$ ]]; then
    echo "Aborted."
    exit 0
fi

# Stop and disable systemd service
if systemctl is-active --quiet 8whie-proxy.service 2>/dev/null; then
    echo "Stopping 8whie-proxy service..."
    systemctl stop 8whie-proxy.service
fi

if systemctl is-enabled --quiet 8whie-proxy.service 2>/dev/null; then
    echo "Disabling 8whie-proxy service..."
    systemctl disable 8whie-proxy.service
fi

if [[ -f /etc/systemd/system/8whie-proxy.service ]]; then
    rm -f /etc/systemd/system/8whie-proxy.service
    systemctl daemon-reload
fi

# Remove binary symlink
rm -f /usr/local/bin/8whie-proxy

# Remove code directory
rm -rf /opt/8whie-proxy

# Ask about config/logs
read -p "Do you want to delete configuration and log files (/etc/8whie-proxy, /var/log/8whie-proxy)? [y/N]: " remove_data
if [[ "$remove_data" =~ ^[yY]([eE][sS])?$ ]]; then
    rm -rf /etc/8whie-proxy
    rm -rf /var/log/8whie-proxy
    echo "Removed configuration and logs."
fi

# Optionally remove system user
if id -u whieproxy &>/dev/null; then
    userdel whieproxy 2>/dev/null || true
fi

echo -e "${GREEN}✓ 8WHIE IPv6 Proxy Manager has been successfully uninstalled.${NC}"
