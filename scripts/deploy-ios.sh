#!/bin/bash
# One-command TestFlight ship for the native iOS app.
# Pipeline mirrors Buffy's proven flow (7 uploads on this Mac/team):
#   bump build number -> SW-free web build + cap sync -> archive -> export
#   (automatic signing via ASC API key) -> entitlement sanity print -> upload.
#
# SIGNING MODEL (read before changing): the archive is intentionally UNSIGNED
# (CODE_SIGNING_ALLOWED=NO) and signing happens at export. That is safe ONLY
# while this app has zero entitlements — sign-at-export silently strips
# entitlements (the Buffy builds 2-6 bug). The moment any entitlement is added
# (App Groups, HealthKit, iCloud, BLE background modes), switch to the manual
# distribution-signing flow documented in DEPLOYMENT.md.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

KEY_ID="DUPV266J6S"
ISSUER_ID="b0021702-5324-4cc1-9ddd-66a5a1535fe6"
KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8"
PBX="ios/App/App.xcodeproj/project.pbxproj"
ARCHIVE_PATH="/tmp/brewlog-archive/BrewLog.xcarchive"
EXPORT_DIR="/tmp/brewlog-export"

[ -f "$KEY_PATH" ] || { echo "ERROR: ASC API key not found at $KEY_PATH"; exit 1; }

if [ -n "$(git status --porcelain)" ]; then
	echo "NOTE: git tree is dirty — the build-number bump will mix with other changes."
fi

# 1. Bump CURRENT_PROJECT_VERSION (single App target, Debug + Release in sync)
CUR=$(grep -m1 -oE 'CURRENT_PROJECT_VERSION = [0-9]+' "$PBX" | grep -oE '[0-9]+')
NEXT=$((CUR + 1))
sed -i '' "s/CURRENT_PROJECT_VERSION = ${CUR};/CURRENT_PROJECT_VERSION = ${NEXT};/g" "$PBX"
echo "==> Build number: ${CUR} -> ${NEXT}"

# 2. Native-flavor web build (no service worker) + sync into the Xcode project
npm run ios:sync

# 3. Archive (unsigned — see header)
rm -rf "$(dirname "$ARCHIVE_PATH")" "$EXPORT_DIR"
echo "==> Archiving…"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
	-destination 'generic/platform=iOS' \
	-archivePath "$ARCHIVE_PATH" \
	CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO archive -quiet

# 4. Export a signed .ipa (automatic signing; the API key lets xcodebuild
#    create/refresh the App ID, cert, and App Store profile on the portal)
echo "==> Exporting signed IPA…"
xcodebuild -exportArchive -archivePath "$ARCHIVE_PATH" \
	-exportPath "$EXPORT_DIR" -exportOptionsPlist ios/ExportOptions.plist \
	-allowProvisioningUpdates \
	-authenticationKeyPath "$KEY_PATH" \
	-authenticationKeyID "$KEY_ID" \
	-authenticationKeyIssuerID "$ISSUER_ID" -quiet

IPA=$(ls "$EXPORT_DIR"/*.ipa | head -1)

# 5. Entitlement sanity print (Buffy lesson: always eyeball before upload —
#    expect ONLY application-identifier / team / beta-reports; anything more
#    means an entitlement crept in and this flow is no longer safe)
echo "==> Entitlements in the signed app:"
ENT_TMP=$(mktemp -d)
unzip -q "$IPA" -d "$ENT_TMP"
codesign -d --entitlements :- "$ENT_TMP"/Payload/*.app 2>/dev/null || true
rm -rf "$ENT_TMP"

# 6. Upload to App Store Connect (altool auto-discovers the .p8 directory)
echo "==> Uploading to App Store Connect…"
xcrun altool --upload-app -f "$IPA" --type ios --apiKey "$KEY_ID" --apiIssuer "$ISSUER_ID"

echo ""
echo "DONE: build ${NEXT} uploaded. ASC processing takes ~5-10 min, then it appears in TestFlight."
echo "Commit the bump:  git add ${PBX} && git commit -m 'Bump iOS build to ${NEXT}'"
