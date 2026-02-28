#!/usr/bin/env bash
# flow.sh - Multi-agent feature lifecycle orchestration
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LIFECYCLE_FILE="$PROJECT_ROOT/config/workflows/lifecycle.yaml"
FEATURES_DIR="$PROJECT_ROOT/docs/features"

usage() {
  echo "Usage: flow.sh <command> [options]"
  echo ""
  echo "Commands:"
  echo "  run --feature <id> [--max-fix-loops <n>]   Run full feature lifecycle"
  echo "  status --feature <id>                       Show lifecycle artifact status"
  echo ""
  exit 1
}

cmd="${1:-}"
shift || true

case "$cmd" in
  run)
    FEATURE=""
    MAX_FIX_LOOPS=3
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --feature)       FEATURE="$2";       shift 2 ;;
        --max-fix-loops) MAX_FIX_LOOPS="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; usage ;;
      esac
    done
    [[ -z "$FEATURE" ]] && { echo "Error: --feature required"; usage; }

    FEATURE_FILE="$FEATURES_DIR/$FEATURE.yaml"
    [[ ! -f "$FEATURE_FILE" ]] && { echo "Error: Feature file not found: $FEATURE_FILE"; exit 1; }

    echo "========================================"
    echo "  FEATURE LIFECYCLE: $FEATURE"
    echo "  Max fix loops:     $MAX_FIX_LOOPS"
    echo "========================================"
    echo ""
    echo "Lifecycle config:  $LIFECYCLE_FILE"
    echo "Feature brief:     $FEATURE_FILE"
    echo ""

    for stage in planner architect developer; do
      echo "--- Stage: $stage ---"
      "$SCRIPT_DIR/agent.sh" run --name "$stage" --background
      echo ""
    done

    fix_loop=0
    qa_passed=false
    while [[ "$qa_passed" == "false" && $fix_loop -le $MAX_FIX_LOOPS ]]; do
      echo "--- Stage: qa (attempt $((fix_loop + 1)) of $((MAX_FIX_LOOPS + 1))) ---"
      "$SCRIPT_DIR/qa.sh" run --suite fast
      echo ""

      if [[ $fix_loop -lt $MAX_FIX_LOOPS ]]; then
        echo "--- Stage: bugfix (loop $((fix_loop + 1))) ---"
        "$SCRIPT_DIR/agent.sh" run --name bugfix --background
        echo ""
      fi
      fix_loop=$((fix_loop + 1))
    done

    echo "========================================"
    echo "  HUMAN REVIEW GATE"
    echo "========================================"
    echo "  Review artifacts in: docs/features/$FEATURE/"
    echo "    - plan.md"
    echo "    - architecture.md"
    echo "    - qa_report.md"
    echo ""
    echo "  Approve or reject before merging."
    echo "========================================"
    ;;
  status)
    FEATURE=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --feature) FEATURE="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; usage ;;
      esac
    done
    [[ -z "$FEATURE" ]] && { echo "Error: --feature required"; usage; }
    echo "Feature: $FEATURE"
    echo "Artifacts:"
    for f in plan.md architecture.md qa_report.md; do
      path="$FEATURES_DIR/$FEATURE/$f"
      if [[ -f "$path" ]]; then
        echo "  [x] $f"
      else
        echo "  [ ] $f (not yet produced)"
      fi
    done
    ;;
  *)
    usage
    ;;
esac
