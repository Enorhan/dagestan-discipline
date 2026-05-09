#!/usr/bin/env bash
# Upload the signed Xcode archive to App Store Connect (TestFlight) using
# the Apple account already configured in Xcode. This mirrors Xcode Organizer
# upload behavior and avoids requiring App Store Connect API-key env vars.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ARCHIVE="${1:-${ARCHIVE_PATH:-/tmp/MatFlow-Signed.xcarchive}}"
EXPORT_DIR="${UPLOAD_EXPORT_DIR:-/tmp/MatFlow-Upload}"
BASE_PLIST="$ROOT/scripts/ios/ExportOptions-appstore.plist"
UPLOAD_PLIST="$(mktemp /tmp/MatFlow-UploadOptions.XXXXXX.plist)"

cleanup() {
  rm -f "$UPLOAD_PLIST"
}
trap cleanup EXIT

if [[ ! -d "$ARCHIVE" ]]; then
  echo "Archive not found: $ARCHIVE"
  echo "Build one first: npm run ios:ipa"
  exit 1
fi

cp "$BASE_PLIST" "$UPLOAD_PLIST"
/usr/libexec/PlistBuddy -c 'Delete :destination' "$UPLOAD_PLIST" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c 'Add :destination string upload' "$UPLOAD_PLIST"
/usr/libexec/PlistBuddy -c 'Delete :manageAppVersionAndBuildNumber' "$UPLOAD_PLIST" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy -c 'Add :manageAppVersionAndBuildNumber bool false' "$UPLOAD_PLIST"

rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

echo "Uploading archive to TestFlight with the Xcode account: $ARCHIVE"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$UPLOAD_PLIST" \
  -allowProvisioningUpdates

echo ""
echo "Upload finished. In App Store Connect → TestFlight, wait for processing, then enable the build for testing."
