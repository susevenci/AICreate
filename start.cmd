@echo off
chcp 65001 >nul
cd /d "%~dp0app"
echo 启动 AI 内容工作台：http://127.0.0.1:4173
node server.mjs
pause
