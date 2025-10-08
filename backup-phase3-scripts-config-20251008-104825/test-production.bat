@echo off
echo Testing production build with forced production API...
set VITE_FORCE_PRODUCTION_MODE=true
start "" "C:\Users\roand\OneDrive\Documents\Attrition\packages\releases\win-unpacked\Attrition.exe"
