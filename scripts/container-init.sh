#!/usr/bin/env bash
set -euo pipefail

template="/opt/dev_environment/mcp.json"
workspace="/workspace"
vscode_dir="$workspace/.vscode"
vscode_mcp="$vscode_dir/mcp.json"

mkdir -p "$vscode_dir"

if [ ! -f "$vscode_mcp" ] && [ -f "$template" ]; then
  cp "$template" "$vscode_mcp"
  echo "Created /workspace/.vscode/mcp.json from template"
fi

exec "$@"
