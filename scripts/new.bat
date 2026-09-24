@echo off
rem Double-click this file on Windows to start a new stop, relic, event or look.
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 (py scripts\new.py %*) else (python scripts\new.py %*)
pause
