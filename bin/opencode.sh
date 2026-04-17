#!/bin/bash
# 加载 .env 环境变量并启动 OpenCode
# macOS/Linux 启动脚本

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR" || exit 1

if [ ! -f ".env" ]; then
    echo "[ERROR] .env 文件不存在，请先复制 .env.example 为 .env 并配置 OBSIDIAN_VAULT_PATH"
    exit 1
fi

# 加载 .env（跳过注释和空行）
set -a
source .env
set +a

# 启动 OpenCode
opencode "$@"
