@echo off
title BusinessDesk Grocery - Desktop Setup and Launcher
echo =========================================================
echo   BusinessDesk Grocery - Desktop Setup and Launcher
echo =========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (LTS version) from https://nodejs.org
    echo Then run this batch file again.
    pause
    exit /b 1
)

echo [1/3] Checking dependencies...
if not exist "node_modules" (
    echo Installing npm dependencies...
    call npm install
)

echo [2/3] Building application bundle...
call npm run build

echo [3/3] Starting BusinessDesk Grocery Desktop Application...
call npx electron .
if %errorlevel% neq 0 (
    echo Launching in Native Windows App Mode...
    start "" msedge --app=http://localhost:3000 2>nul || start "" chrome --app=http://localhost:3000 2>nul || start http://localhost:3000
    call npm run dev
)

pause
