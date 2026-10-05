#!/usr/bin/env bash
# ==============================================================================
# 8WHIE Container Entrypoint
# Developer: Aryan Thakur (8WHIE)
# ==============================================================================

set -e

if [ "$1" = "start" ] || [ "$1" = "all" ] || [ "$1" = "status" ] || [ "$1" = "scan" ] || [ "$1" = "list" ]; then
    exec python3 -m src.cli "$@"
fi

exec "$@"
