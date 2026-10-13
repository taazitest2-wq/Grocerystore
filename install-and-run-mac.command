#!/usr/bin/env bash
# BusinessDesk Grocery - Double-Clickable macOS Desktop Launcher
cd "$(dirname "$0")"

echo "=========================================================="
echo "  BusinessDesk Grocery — macOS Desktop App Launcher"
echo "=========================================================="
echo ""

if ! command -v node &> /dev/null; then
    echo "[!] Node.js was not detected on your Mac."
    echo "Please download the Node.js LTS installer from: https://nodejs.org"
    echo "After installation, double-click this file again."
    read -p "Press Enter to exit..."
    exit 1
fi

echo "[1/3] Verifying dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing packages..."
    npm install
fi

echo "[2/3] Compiling BusinessDesk Grocery engine..."
npm run build

echo "[3/3] Launching BusinessDesk Grocery Desktop Application..."
if command -v electron &> /dev/null; then
    electron .
else
    npx electron . || (
        echo "Launching standalone browser desktop mode..."
        open "http://localhost:3000"
        npm run dev
    )
fi
