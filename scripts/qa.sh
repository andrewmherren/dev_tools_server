#!/usr/bin/env bash
# qa.sh - QA suite runner
# Reads suite config from PROJECT_PATH/config/qa/suites.yaml
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "Usage: qa.sh <command> [options]"
  echo ""
  echo "Commands:"
  echo "  run --suite fast|full    Run QA suite"
  echo "  gates                    Show gate requirements"
  echo ""
  echo "Environment:"
  echo "  PROJECT_PATH   Path to project containing config/qa/"
  echo ""
  exit 1
}

get_project_path() {
  [[ -z "${PROJECT_PATH:-}" ]] && { echo "Error: PROJECT_PATH not set. Run: export PROJECT_PATH=/path/to/your/project" >&2; exit 1; }
  echo "$PROJECT_PATH"
}

cmd="${1:-}"
shift || true

case "$cmd" in
  run)
    SUITE="fast"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --suite) SUITE="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; usage ;;
      esac
    done
    PROJECT="$(get_project_path)"
    SUITES_FILE="$PROJECT/config/qa/suites.yaml"
    echo "Running QA suite: $SUITE"
    echo "Suite config: $SUITES_FILE"
    echo ""
    echo "--- LINT ---"
    echo "Configure lint command in $PROJECT/config/qa/suites.yaml"
    echo ""
    if [[ "$SUITE" == "full" ]]; then
      echo "--- STATIC ANALYSIS ---"
      echo "Configure SonarQube project key and token in .env, then run sonar-scanner."
      echo ""
      echo "--- INTEGRATION TESTS ---"
      echo "Configure integration test command in $PROJECT/config/qa/suites.yaml"
      echo ""
    fi
    echo "--- UNIT TESTS ---"
    echo "Configure unit test command in $PROJECT/config/qa/suites.yaml"
    echo ""
    echo "QA suite '$SUITE' complete. Update config/qa/suites.yaml with real commands."
    ;;
  gates)
    PROJECT="$(get_project_path)"
    cat "$PROJECT/config/qa/gates.yaml"
    ;;
  *)
    usage
    ;;
esac
