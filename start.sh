#!/bin/bash

# Automated Smart Waste Segregation System - Startup Script

echo ""
echo "======================================"
echo "  Waste Segregation System Startup"
echo "======================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "[OK] Node.js found"
echo ""

# Navigate to backend directory
cd backend || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies"
        exit 1
    fi
    echo "[OK] Dependencies installed"
    echo ""
fi

# Start the server
echo "[INFO] Starting Waste Segregation System Backend..."
echo "[INFO] Server will run on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
