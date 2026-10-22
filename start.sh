#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/app"
echo "启动 AI 内容工作台：http://127.0.0.1:4173"
exec node server.mjs
