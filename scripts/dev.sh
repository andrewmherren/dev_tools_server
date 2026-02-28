#!/usr/bin/env bash
# dev.sh - Development environment management
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
TEMPLATES_DIR="$PROJECT_ROOT/templates"

usage() {
  echo "Usage: dev.sh <command> [options]"
  echo ""
  echo "Commands:"
  echo "  init <project-path>                          Scaffold config/docs into a project"
  echo "  up [--profile human|agent-dev|agent-qa]     Start shared services"
  echo "  down                                         Stop shared services"
  echo "  status                                       Show running services"
  echo "  logs [service]                               Show logs"
  echo ""
  exit 1
}

cmd="${1:-}"
shift || true

case "$cmd" in
  init)
    target="${1:-}"
    [[ -z "$target" ]] && { echo "Error: project path required"; usage; }
    [[ ! -d "$target" ]] && { echo "Error: directory not found: $target"; exit 1; }
    echo "Scaffolding dev environment config into: $target"
    cp -rn "$TEMPLATES_DIR/config" "$target/config"
    cp -rn "$TEMPLATES_DIR/docs"   "$target/docs"
    echo "Done. Edit $target/config/qa/suites.yaml to configure your project's test commands."
    ;;
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

