#!/usr/bin/env bash
# dev.sh - Development environment management
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"

usage() {
  echo "Usage: dev.sh <command> [options]"
  echo ""
  echo "Commands:"
  echo "  up [--profile human|agent-dev|agent-qa]  Start services"
  echo "  down                                      Stop services"
  echo "  status                                    Show running services"
  echo "  logs [service]                            Show logs"
  echo ""
  exit 1
}

cmd="${1:-}"
shift || true

case "$cmd" in
  up)
    profile="human"
    if [[ "${1:-}" == "--profile" ]]; then
      profile="${2:-human}"
      shift 2
    fi
    echo "Starting services with profile: $profile"
    docker compose -f "$COMPOSE_FILE" --profile "$profile" up -d "$@"
    ;;
  down)
    docker compose -f "$COMPOSE_FILE" down "$@"
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f "$@"
    ;;
  *)
    usage
    ;;
esac
