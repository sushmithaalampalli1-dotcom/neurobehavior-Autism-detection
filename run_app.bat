@echo off
title NeuroBehavior-ASD Launcher
echo =====================================================================
echo           Starting NeuroBehavior-ASD Application
echo =====================================================================
echo.
echo [1/2] Launching Flask Backend API on http://127.0.0.1:5000 ...
start "NeuroBehavior Backend" cmd /k "cd /d C:\Users\ankit\.gemini\antigravity\scratch\neurobehavior-asd && py -3.11 -m backend.app"

timeout /t 3 /nobreak >nul

echo [2/2] Launching Vite React Frontend on http://localhost:5173 ...
start "NeuroBehavior Frontend" cmd /k "cd /d C:\Users\ankit\.gemini\antigravity\scratch\neurobehavior-asd\frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo =====================================================================
echo  Application is running!
echo  - Frontend Web UI: http://localhost:5173
echo  - Backend API:     http://127.0.0.1:5000
echo =====================================================================
echo.
timeout /t 5
