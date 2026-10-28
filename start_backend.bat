@echo off
echo =======================================================
echo Starting NeuroBehavior-ASD Flask Backend Server (Port 5000)...
echo =======================================================
cd /d "%~dp0"
py -3.11 -m backend.app
pause
