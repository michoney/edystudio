@echo off
chcp 65001 >nul
cd /d E:\edystudio-vr-test
title EdyStudio VR Test - 8898
python -m http.server 8898 --bind 127.0.0.1
pause
