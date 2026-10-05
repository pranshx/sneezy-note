@echo off
cd /d "%~dp0"
if not exist node_modules\electron (
  echo First run: installing, this takes a minute...
  call npm install
)
start "" /b cmd /c "npm start"
