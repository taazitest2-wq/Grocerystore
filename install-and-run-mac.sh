#!/usr/bin/env bash
# BusinessDesk Grocery - macOS Launcher

echo "==================================================="
echo "  BusinessDesk Grocery - Desktop Setup (macOS)"
echo "==================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please download and install Node.js (LTS) from https://nodejs.org"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing npm dependencies..."
    npm install
fi

echo "[2/3] Building production bundle..."
npm run build

echo "[3/3] Launching BusinessDesk Grocery Desktop App..."
npx electron .
