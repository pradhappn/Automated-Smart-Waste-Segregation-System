# Setup Guide - Automated Smart Waste Segregation System

## Overview
This guide will help you set up and run the Automated Smart Waste Segregation System on your local machine.

## System Requirements

- **Operating System**: Windows, macOS, or Linux
- **Node.js**: Version 14.0 or higher
- **npm**: Version 6.0 or higher (comes with Node.js)
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)
- **Disk Space**: ~500MB
- **RAM**: 512MB minimum

## Step-by-Step Installation

### 1. Verify Node.js Installation

**Windows:**
```bash
node --version
npm --version
```

**macOS/Linux:**
```bash
node --version
npm --version
```

If you get "command not found", download and install Node.js from [nodejs.org](https://nodejs.org/)

### 2. Navigate to Project Directory

```bash
cd "Automated Smart Waste Segregation System"
```

### 3. Quick Start (Recommended)

**Windows:**
```bash
start.bat
```

**macOS/Linux:**
```bash
chmod +x start.sh
./start.sh
```

### 4. Manual Setup (Alternative)

**Step 1: Install Dependencies**
```bash
cd backend
npm install
```

**Step 2: Start Backend Server**
```bash
npm start
```

You should see:
```
Server running on http://localhost:3000
```

**Step 3: Open in Browser**
- Open your web browser
- Navigate to `http://localhost:3000`
- The Waste Segregation System dashboard should load

## Configuration

### Changing the Port

If port 3000 is already in use, you can change it:

1. Open `backend/server.js`
2. Find the line: `const PORT = process.env.PORT || 3000;`
3. Change `3000` to your desired port
4. Restart the server

### Environment Setup

Create a `.env` file in the `backend` directory:

```
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
```

## Usage

### Initial Setup
1. System loads with empty bins
2. Sensor values are set to default (Metal: 30%, Moisture: 50%, Temp: 25°C)

### Testing the System

**Method 1: Manual Processing**
1. Adjust sensor sliders to desired values
2. Click "Process Waste" button
3. Watch waste get classified and routed to correct bin

**Method 2: Automated Simulation**
1. Click "Start Simulation" button
2. System generates random sensor data every 5 seconds
3. Watch automatic waste segregation in real-time
4. Click "Stop Simulation" to stop

### Monitoring Waste

1. **Dashboard**: View all bin levels and statuses
2. **Monitoring**: See activity feed and current sensor readings
3. **Statistics**: View performance metrics and charts
4. **Logs**: Check system events and operations

### Emptying Bins

1. Go to Dashboard
2. Find the bin you want to empty
3. Click "Empty Bin" button
4. Bin capacity resets to 0%

## Troubleshooting

### Issue: Port 3000 Already in Use

**Windows:**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**macOS/Linux:**
```bash
lsof -i :3000
kill -9 <PID>
```

### Issue: "Module not found" Error

**Solution:**
```bash
cd backend
npm install --legacy-peer-deps
```

### Issue: WebSocket Connection Failed

**Check:**
1. Is backend server running?
2. Is browser on same network?
3. Check browser console for errors (F12)

**Solution:**
Restart backend server:
```bash
npm start
```

### Issue: Frontend Not Loading

**Check:**
1. Is backend server running on port 3000?
2. Try http://localhost:3000 in browser
3. Check if firewall is blocking port 3000

**Solution:**
1. Kill any process on port 3000
2. Restart server with `npm start`

### Issue: Styles Not Loading

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Open Developer Tools (F12) and check Network tab

## Development Mode

For development with auto-reload, install nodemon:

```bash
cd backend
npm install --save-dev nodemon
npm run dev
```

## Performance Tips

1. **Clear Activity Feed**: Large feeds slow down the UI (happens automatically after 20 items)
2. **Stop Simulation**: When not testing, stop simulation to reduce CPU usage
3. **Browser Tab**: Keep the application in a separate browser tab
4. **Clear Logs**: Logs are limited to 100 entries (auto cleanup)

## Features Quick Reference

| Feature | Location | Purpose |
|---------|----------|---------|
| Sensor Control | Dashboard | Simulate sensor inputs |
| Process Waste | Dashboard | Manually classify waste |
| Live Simulation | Dashboard | Auto-generate test data |
| Bin Monitoring | Dashboard | View bin capacities |
| Empty Bins | Dashboard | Clear bin contents |
| Statistics | Statistics Tab | View performance metrics |
| Activity Log | Monitoring Tab | See all events |
| System Logs | Logs Tab | Audit trail |

## Stopping the Application

1. **In Terminal**: Press `Ctrl+C`
2. **Browser**: Close the tab or window
3. **System**: No cleanup required

## Next Steps

- Explore the Dashboard features
- Try the simulation mode
- Check statistics and logs
- Read the main README.md for detailed documentation

## Getting Help

1. Check the main README.md
2. Look at browser console (F12) for errors
3. Verify Node.js is installed correctly
4. Ensure port 3000 is available

## System Architecture

```
┌─────────────────────────────────────┐
│         Web Browser                  │
│  ┌──────────────────────────────┐   │
│  │   Frontend (HTML/CSS/JS)     │   │
│  │  • Dashboard                 │   │
│  │  • Monitoring                │   │
│  │  • Statistics                │   │
│  └──────────────────────────────┘   │
└─────────┬───────────────────────────┘
          │ HTTP + WebSocket
          │
┌─────────▼───────────────────────────┐
│     Backend (Node.js + Express)     │
│  ┌──────────────────────────────┐   │
│  │  REST API                    │   │
│  │  • Waste Processing          │   │
│  │  • Bin Management            │   │
│  │  • Statistics                │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │  WebSocket Server            │   │
│  │  • Real-time Updates         │   │
│  │  • Simulation                │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Estimated Startup Time

- First run (with npm install): 2-3 minutes
- Subsequent runs: 10-15 seconds

---

**System Version**: 1.0.0  
**Last Updated**: March 1, 2026

Enjoy managing your waste segregation system! ♻️
