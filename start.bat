@echo off
REM Automated Smart Waste Segregation System - Startup Script

echo.
echo ======================================
echo   Waste Segregation System Startup
echo ======================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
echo.

REM Navigate to backend directory
cd backend

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed
    echo.
)

REM Start the server
echo [INFO] Starting Waste Segregation System Backend...
echo [INFO] Server will run on http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start
