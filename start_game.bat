@echo off
title Shadow Jutsu Camera - Live Tracking & Video Clones
echo ========================================================
echo   SHADOW JUTSU CAMERA - ACTUAL FOOTAGE & LIVE TRACKING
echo ========================================================
echo.

start "" "http://localhost:8080"
python camera_server.py
pause
