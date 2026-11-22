@echo off
title ZaiqaBox Karachi - Server Launcher
cd /d "%~dp0"
echo ===================================================
echo     Starting ZaiqaBox Karachi Unified Server...
echo ===================================================
echo.
echo Website URL:  http://localhost:8000
echo Admin Portal: http://localhost:8000/admin
echo Admin Login:  Username: admin  ^|  Password: zaiqabox2026
echo.
echo Press CTRL+C to stop the server anytime.
echo.
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
