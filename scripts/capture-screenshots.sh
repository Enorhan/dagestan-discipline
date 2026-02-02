#!/usr/bin/env bash
set -euo pipefail

OUTPUT_DIR=${1:-"screenshots/auto-$(date +%Y%m%d-%H%M%S)"}
INTERVAL_MS=${2:-1400}
DELAY_MS=${3:-2000}

SCREENS=(
  auth-login
  auth-signup
  loading
  onboarding-sport
  onboarding-schedule
  onboarding-equipment
  home
  week-view
  exercise-list
  workout-session
  rest-timer
  post-workout-reflection
  session-complete
  missed-session-accountability
  round-timer
  log-activity
  training-stats
  training-hub
  category-list
  drill-detail
  routine-player
  learning-path
  body-part-selector
  community-feed
  search-discover
  workout-detail
  saved-workouts
  workout-builder
  user-profile
  edit-profile
  user-profile-other
  settings
)

mkdir -p "$OUTPUT_DIR"

if ! xcrun simctl list devices booted | rg -q "Booted"; then
  echo "No booted iOS simulator found. Boot one and try again." >&2
  exit 1
fi

sleep "$(awk "BEGIN {print ${DELAY_MS}/1000}")"

index=0
for screen in "${SCREENS[@]}"; do
  filename=$(printf "%02d-%s.png" "$index" "$screen")
  xcrun simctl io booted screenshot "$OUTPUT_DIR/$filename"
  index=$((index + 1))
  sleep "$(awk "BEGIN {print ${INTERVAL_MS}/1000}")"
done

echo "Saved screenshots to $OUTPUT_DIR"
