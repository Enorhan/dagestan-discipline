#!/usr/bin/env bash
# Build static web app, sync Capacitor, archive Release, export App Store IPA (TestFlight-ready).
# Upload separately: Xcode Organizer, Transporter, or xcrun altool with API key (see repo docs / AGENTS).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Production builds must never bake a live-reload server URL into capacitor.config.json.
unset CAPACITOR_LIVE_RELOAD_URL
export NODE_ENV=production

npm run build
npx cap sync ios

ARCHIVE="${ARCHIVE_PATH:-/tmp/MatFlow-Signed.xcarchive}"
EXPORT_DIR="${EXPORT_DIR:-/tmp/MatFlow-Export}"
PLIST="$ROOT/scripts/ios/ExportOptions-appstore.plist"

rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

(
  cd "$ROOT/ios/App"
  xcodebuild -scheme App -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE" \
    -allowProvisioningUpdates \
    archive
)

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$PLIST"

echo ""
echo "IPA: $EXPORT_DIR/App.ipa"
echo "Upload with the configured Xcode account:"
echo "  npm run ios:upload"
