#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "=========================================================="
echo "  Saif Karyana Store POS & ERP (Portable macOS Launcher)"
echo "=========================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[!] Node.js was not detected on your Mac."
    echo "Please download the Node.js installer from: https://nodejs.org"
    read -p "Press Enter to exit..."
    exit 1
fi

echo "Starting offline POS & ERP server..."
node portable-server.cjs
