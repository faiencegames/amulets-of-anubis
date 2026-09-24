@echo off
rem Double-click this file on Windows: the game rebuilds itself every time you save a file.
rem Leave the window open while you work; close it to stop.
cd /d "%~dp0.."
where py >nul 2>nul
if %errorlevel%==0 (py build.py --watch) else (python build.py --watch)
pause
