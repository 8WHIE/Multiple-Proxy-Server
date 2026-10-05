#!/usr/bin/env bash
# ==============================================================================
# 8WHIE IPv6 Proxy Manager - Linux Production Installer
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

echo -e "${CYAN}"
echo "=================================================================="
echo "         8WHIE IPv6 Proxy Manager - Automated Linux Installer     "
echo "                   Developer: Aryan Thakur (8WHIE)                "
echo "=================================================================="
echo -e "${NC}"

# 1. Require root or sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root (or with sudo).${NC}"
   exit 1
fi

INSTALL_DIR="/opt/8whie-proxy"
CONFIG_DIR="/etc/8whie-proxy"
LOG_DIR="/var/log/8whie-proxy"
SERVICE_USER="whieproxy"
SERVICE_GROUP="whieproxy"

echo -e "${YELLOW}[1/7] Detecting Linux Distribution and Package Manager...${NC}"
if command -v apt-get &>/dev/null; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq python3 python3-pip python3-venv iproute2 curl
elif command -v dnf &>/dev/null; then
    dnf install -y -q python3 python3-pip iproute curl
elif command -v pacman &>/dev/null; then
    pacman -Sy --noconfirm python python-pip iproute2 curl
else
    echo -e "${YELLOW}Warning: Unknown package manager. Ensuring python3 is available...${NC}"
    if ! command -v python3 &>/dev/null; then
        echo -e "${RED}Python3 is required but not installed.${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}[2/7] Provisioning dedicated service user '${SERVICE_USER}'...${NC}"
if ! id -u "$SERVICE_USER" &>/dev/null; then
    useradd --system --shell /usr/sbin/nologin --comment "8WHIE Proxy Service Account" "$SERVICE_USER"
    echo -e "${GREEN}✓ Created system user '${SERVICE_USER}'${NC}"
else
    echo -e "${GREEN}✓ User '${SERVICE_USER}' already exists.${NC}"
fi

echo -e "${YELLOW}[3/7] Setting up directories and permissions...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "/run/8whie-proxy"

# 4. Copy repository payload
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo -e "${YELLOW}[4/7] Deploying application codebase to ${INSTALL_DIR}...${NC}"
cp -rf "$SOURCE_DIR/src" "$INSTALL_DIR/"
cp -rf "$SOURCE_DIR/config" "$INSTALL_DIR/"
cp -rf "$SOURCE_DIR/requirements.txt" "$INSTALL_DIR/"
cp -rf "$SOURCE_DIR/setup.py" "$INSTALL_DIR/"
cp -rf "$SOURCE_DIR/README.md" "$INSTALL_DIR/"
cp -rf "$SOURCE_DIR/LICENSE" "$INSTALL_DIR/"

# Create initial config if absent
if [[ ! -f "$CONFIG_DIR/config.json" ]]; then
    cp "$SOURCE_DIR/config/proxy_config.example.json" "$CONFIG_DIR/config.json"
    chmod 600 "$CONFIG_DIR/config.json"
    chown "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_DIR/config.json"
    echo -e "${GREEN}✓ Created default configuration at ${CONFIG_DIR}/config.json${NC}"
fi

echo -e "${YELLOW}[5/7] Preparing Python isolated virtualenv...${NC}"
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip --quiet
"$INSTALL_DIR/venv/bin/pip" install -r "$INSTALL_DIR/requirements.txt" --quiet
"$INSTALL_DIR/venv/bin/pip" install -e "$INSTALL_DIR" --quiet

# Link CLI executable
ln -sf "$INSTALL_DIR/venv/bin/8whie-proxy" /usr/local/bin/8whie-proxy
chmod +x /usr/local/bin/8whie-proxy

# Adjust ownership
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$CONFIG_DIR"
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$LOG_DIR"
chown -R "$SERVICE_USER:$SERVICE_GROUP" "/run/8whie-proxy"
chmod 700 "$CONFIG_DIR"
chmod 750 "$LOG_DIR"

echo -e "${YELLOW}[6/7] Installing and configuring systemd service...${NC}"
if [[ -f "$SOURCE_DIR/systemd/8whie-proxy.service" ]]; then
    cp "$SOURCE_DIR/systemd/8whie-proxy.service" /etc/systemd/system/8whie-proxy.service
    systemctl daemon-reload
    systemctl enable 8whie-proxy.service
    echo -e "${GREEN}✓ systemd service '8whie-proxy' enabled.${NC}"
fi

echo -e "${YELLOW}[7/7] Verifying installation...${NC}"
/usr/local/bin/8whie-proxy --version

echo -e "\n${GREEN}=================================================================="
echo "    8WHIE IPv6 Proxy Manager installed successfully!              "
echo "=================================================================="
echo -e "${CYAN}Commands to get started:${NC}"
echo "  8whie-proxy scan                # Scan host for global IPv6 addresses"
echo "  8whie-proxy list                # View all configured proxies"
echo "  8whie-proxy add --help          # Add a new HTTP or SOCKS5 proxy"
echo "  systemctl start 8whie-proxy     # Start daemon service"
echo "  systemctl status 8whie-proxy    # Check service status"
echo -e "${NC}"
