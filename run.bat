@echo off
title ZaiqaBox Karachi - Server Launcher
cd /d "%~dp0"
echo ===================================================
echo     Starting ZaiqaBox Karachi Unified Server...
echo ===================================================
echo.
echo Website URL (Local):    http://localhost:8000
echo Admin Portal:           http://localhost:8000/admin
echo Admin Login:            Username: admin  ^|  Password: zaiqabox2026
echo.
echo Tip: Agar kisi doosre dost ko link bhejna hai to 'share_online.bat' double-click karein!
echo.
echo Press CTRL+C to stop the server anytime.
echo.
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
