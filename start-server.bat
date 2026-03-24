@echo off
cd /d %~dp0
echo Starting permit-system server...
node server.js
pause