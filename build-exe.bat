@echo off
cd /d "%~dp0"
call npm install
call npm run dist
echo.
echo Done. Your app is in the "dist" folder (Sneezy Note ... .exe)
pause
