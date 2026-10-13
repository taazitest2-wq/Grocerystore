@echo off
title Saif Karyana Store - Portable POS & ERP Launcher
echo =========================================================
echo   Saif Karyana Store POS & ERP System (Portable Launcher)
echo =========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo Starting offline POS & ERP server...
node portable-server.cjs
pause
