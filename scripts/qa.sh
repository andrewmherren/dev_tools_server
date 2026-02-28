#!/usr/bin/env bash
# qa.sh - QA suite runner
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUITES_FILE="$PROJECT_ROOT/config/qa/suites.yaml"
GATES_FILE="$PROJECT_ROOT/config/qa/gates.yaml"

usage() {
  echo "Usage: qa.sh <command> [options]"
  echo ""
  echo "Commands:"
  echo "  run --suite fast|full    Run QA suite"
  echo "  gates                    Show gate requirements"
  echo ""
  exit 1
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
    echo "Running QA suite: $SUITE"
    echo "Suite config: $SUITES_FILE"
    echo ""
    echo "--- LINT ---"
    echo "Configure lint command in config/qa/suites.yaml for your project."
    echo ""
    if [[ "$SUITE" == "full" ]]; then
      echo "--- STATIC ANALYSIS ---"
      echo "Configure SonarQube project key and token in .env, then run sonar-scanner."
      echo ""
      echo "--- INTEGRATION TESTS ---"
      echo "Configure integration test command in config/qa/suites.yaml."
      echo ""
    fi
    echo "--- UNIT TESTS ---"
    echo "Configure unit test command in config/qa/suites.yaml for your project."
    echo ""
    echo "QA suite '$SUITE' complete. Update config/qa/suites.yaml with real commands."
    ;;
  gates)
    cat "$GATES_FILE"
    ;;
  *)
    usage
    ;;
esac
