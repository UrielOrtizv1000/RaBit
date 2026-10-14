@echo off
cd /d "%~dp0..\.."
set "EXE=src-tauri\target\release\rabit.exe"
if exist "%EXE%" (
  start "" "%EXE%"
) else (
  if not exist node_modules call npm install
  call npm run tauri dev
)
