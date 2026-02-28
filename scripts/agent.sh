#!/usr/bin/env bash
# agent.sh - Agent container management
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
CONFIG_FILE="$PROJECT_ROOT/config/agents/definitions.yaml"

usage() {
  echo "Usage: agent.sh <command> [options]"
  echo ""
  echo "Commands:"
  echo "  define --name <name> --role <role>   Register an agent"
  echo "  run --name <name> [--background]     Run an agent"
  echo "  list                                 List defined agents"
  echo "  status                               Show agent container status"
  echo "  logs --name <name>                   Show agent logs"
  echo "  stop --name <name>                   Stop agent container"
  echo ""
  exit 1
}

cmd="${1:-}"
shift || true

parse_args() {
  NAME=""
  ROLE=""
  BACKGROUND=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --name)       NAME="$2";  shift 2 ;;
      --role)       ROLE="$2";  shift 2 ;;
      --background) BACKGROUND=true; shift ;;
      *) echo "Unknown option: $1"; usage ;;
    esac
  done
}

get_profile() {
  local name="$1"
  grep -A6 "name: $name" "$CONFIG_FILE" 2>/dev/null \
    | grep "^    profile:" | head -1 | awk '{print $2}' \
    || echo "agent-dev"
}

case "$cmd" in
  define)
    parse_args "$@"
    [[ -z "$NAME" || -z "$ROLE" ]] && { echo "Error: --name and --role required"; usage; }
    echo "Agent definition (add to config/agents/definitions.yaml to persist):"
    echo "  - name: $NAME"
    echo "    role: $ROLE"
    echo "    profile: agent-dev"
    echo "    mcp_profile: standard"
    echo "    description: \"\""
    ;;
  run)
    parse_args "$@"
    [[ -z "$NAME" ]] && { echo "Error: --name required"; usage; }
    PROFILE="$(get_profile "$NAME")"
    export WORKTREE_NAME="${WORKTREE_NAME:-$(basename "$PROJECT_ROOT")}"
    if [[ "$BACKGROUND" == "true" ]]; then
      echo "Starting agent '$NAME' (profile: $PROFILE) in background..."
      docker compose -f "$COMPOSE_FILE" --profile "$PROFILE" up -d
    else
      echo "Starting agent '$NAME' (profile: $PROFILE) interactively..."
      docker compose -f "$COMPOSE_FILE" --profile "$PROFILE" run --rm "$PROFILE"
    fi
    ;;
  list)
    echo "Defined agents (from config/agents/definitions.yaml):"
    grep "^  - name:" "$CONFIG_FILE" | awk '{print "  -", $3}'
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  logs)
    parse_args "$@"
    [[ -z "$NAME" ]] && { echo "Error: --name required"; usage; }
    docker compose -f "$COMPOSE_FILE" logs -f "$NAME"
    ;;
  stop)
    parse_args "$@"
    [[ -z "$NAME" ]] && { echo "Error: --name required"; usage; }
    docker compose -f "$COMPOSE_FILE" stop "$NAME"
    ;;
  *)
    usage
    ;;
esac
