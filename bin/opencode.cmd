@echo off
REM 加载 .env 环境变量并启动 OpenCode
REM Windows 启动脚本

if not exist ".env" (
    echo [ERROR] .env 文件不存在，请先复制 .env.example 为 .env 并配置 OBSIDIAN_VAULT_PATH
    exit /b 1
)

REM 逐行读取 .env 文件（跳过注释和空行）
for /f "usebackq tokens=1,* delims==" %%i in (".env") do (
    set "%%i=%%j"
)

REM 启动 OpenCode
opencode %*
