#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

INTERVAL_MINUTES="${PIPELINE_DAEMON_INTERVAL_MINUTES:-1440}" # default: daily

# Defaults tuned to keep costs bounded while still growing the library.
# Override with PIPELINE_DAEMON_ARGS if you want to widen/narrow scope.
PIPELINE_DAEMON_ARGS="${PIPELINE_DAEMON_ARGS:---onlySourceTypes youtube_search,social_feed --perSource 3 --sourceLimit 15 --extractLimit 30 --queueLimit 200 --reviewLimit 400 --publishLimit 400 --videoOnly false --maxVideoSeconds 600 --maxFrames 10 --frameIntervalSeconds 12}"

mkdir -p .pipeline_artifacts/logs

is_pipeline_running() {
  if command -v pgrep >/dev/null 2>&1; then
    pgrep -f "scripts/athlete-data-pipeline.ts" >/dev/null 2>&1
    return $?
  fi

  ps aux | rg -q "scripts/athlete-data-pipeline.ts"
}

echo "[pipeline-daemon] interval=${INTERVAL_MINUTES}min"
echo "[pipeline-daemon] args=${PIPELINE_DAEMON_ARGS}"

while true; do
  while is_pipeline_running; do
    echo "[pipeline-daemon] pipeline already running, waiting 60s..."
    sleep 60
  done

  TS="$(date +%Y%m%d-%H%M%S)"
  LOG_FILE=".pipeline_artifacts/logs/pipeline-daemon-${TS}.log"
  echo "[pipeline-daemon] starting run at $(date)" | tee -a "$LOG_FILE"

  # Keep sources updated (cheap) so new videos are discovered over time.
  npm run pipeline:sources >>"$LOG_FILE" 2>&1 || true

  npm run pipeline:run -- $PIPELINE_DAEMON_ARGS >>"$LOG_FILE" 2>&1
  echo "[pipeline-daemon] finished run at $(date)" | tee -a "$LOG_FILE"

  echo "[pipeline-daemon] sleeping ${INTERVAL_MINUTES} minutes..." | tee -a "$LOG_FILE"
  sleep "$((INTERVAL_MINUTES * 60))"
done

