@echo off
rem Double-click this file on Windows to build the game.
cd /d "%~dp0"
py build.py
if errorlevel 1 python build.py
pause
