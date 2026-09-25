#!/usr/bin/env bash
# 启动本地写作台
#
# 会顺带把 Hexo 预览服务（端口 4000）也拉起来，
# 这样编辑器里的「真实预览」按钮可以直接看到主题渲染后的效果。
#
# 用法：./tools/editor/start.sh
#       EDITOR_PORT=5000 ./tools/editor/start.sh   # 换端口

set -euo pipefail

EDITOR_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLOG_DIR="$(cd "$EDITOR_DIR/../.." && pwd)"
TOOLS_DIR="$(cd "$BLOG_DIR/.." && pwd)/.tools"

# 本机家目录只读，gh / git 的配置都放在工作区内
export BLOG_TOOLS_DIR="${BLOG_TOOLS_DIR:-$TOOLS_DIR}"
export GH_CONFIG_DIR="${GH_CONFIG_DIR:-$TOOLS_DIR/gh-config}"
export GIT_CONFIG_GLOBAL="${GIT_CONFIG_GLOBAL:-$TOOLS_DIR/gitconfig}"
export GH_NO_UPDATE_NOTIFIER=1
export npm_config_cache="${npm_config_cache:-$(cd "$BLOG_DIR/.." && pwd)/.npm-cache}"

PORT="${EDITOR_PORT:-4001}"
HEXO_PORT="${HEXO_PORT:-4000}"

# 顺带启动 Hexo 预览（已在跑就跳过）
if curl -s -o /dev/null --max-time 2 "http://localhost:$HEXO_PORT/"; then
  echo "Hexo 预览已在运行: http://localhost:$HEXO_PORT/"
else
  echo "启动 Hexo 预览 (端口 $HEXO_PORT)…"
  ( cd "$BLOG_DIR" && nohup npx hexo server -p "$HEXO_PORT" >/tmp/hexo-preview.log 2>&1 & )
fi

echo "正在启动写作台（具体访问地址由 server.js 打印）…"
exec node "$EDITOR_DIR/server.js"
