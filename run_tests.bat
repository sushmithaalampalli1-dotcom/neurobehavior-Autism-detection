@echo off
echo =======================================================
echo Executing Automated Test Suite (26 Integration & Security Tests)...
echo =======================================================
cd /d "%~dp0"
py -3.11 -m pytest tests/
pause
