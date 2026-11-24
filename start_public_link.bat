@echo off
title ZaiqaBox Karachi - Public Online Link
cd /d "%~dp0"
echo ========================================================
echo       ZaiqaBox Karachi - Live Public Online Link
echo ========================================================
echo.
echo Make sure run.bat is already open and running!
echo.
echo Your Public Link is:
echo https://womb-passable-language.ngrok-free.dev
echo.
echo Starting Ngrok Tunnel on Port 8000...
echo.
"%~dp0ngrok.exe" http 8000 --url https://womb-passable-language.ngrok-free.dev
pause
