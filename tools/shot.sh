#!/usr/bin/env bash
# Chụp ảnh kiểm tra một trang mockup bằng Edge headless (chạy trong Git Bash).
# Cách dùng:  bash tools/shot.sh orders.html "?id=j2" ten_anh [rong] [cao]
# Ảnh lưu vào %TEMP%/antgo-shot/<ten_anh>.png (đường dẫn dự án có dấu tiếng Việt nên không ghi thẳng vào dự án).
set -e
PAGE="$1"; QS="$2"; NAME="${3:-shot}"; W="${4:-1440}"; H="${5:-1500}"
ROOT="$(cd "$(dirname "$0")/../design/mockups" && pwd -W)"
OUT="$TEMP/antgo-shot"; mkdir -p "$OUT"
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --window-size=$W,$H --virtual-time-budget=4000 \
  --screenshot="$(cygpath -w "$OUT")\\$NAME.png" "file:///$ROOT/$PAGE$QS" 2>/dev/null
echo "$OUT/$NAME.png"
