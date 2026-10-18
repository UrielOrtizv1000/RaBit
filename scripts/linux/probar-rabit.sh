#!/usr/bin/env bash
# Equivalente Linux de scripts/windows/probar-rabit.bat: abre RaBit ya compilada o, si no existe, en modo desarrollo.
set -euo pipefail
cd "$(dirname "$0")/../.."
EXE="src-tauri/target/release/rabit"
if [ -x "$EXE" ]; then
  exec "$EXE"
fi
[ -d node_modules ] || npm install
exec npm run tauri dev
