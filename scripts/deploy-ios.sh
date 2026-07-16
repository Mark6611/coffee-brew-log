#!/bin/bash
# One-command TestFlight ship for the native iOS app.
#
# SIGNING MODEL (changed 2026-07-16, the day the iCloud entitlement landed):
# the archive is SIGNED — automatic signing with -allowProvisioningUpdates and
# the ASC API key, so xcodebuild can register the App ID capability, (re)create
# the App Store profile, and sign in one pass. The previous unsigned-archive →
# sign-at-export flow silently STRIPS entitlements (Buffy builds 2-6 bug) and
# died the moment App.entitlements (iCloud/CloudKit) appeared.
#
# The entitlement check below is a HARD GATE, not a print: if the signed binary
# lacks the iCloud container entitlement, the build must not ship — it would
# reach users with cloud sync dead (CKContainer aborts or reports unavailable).

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

# 3. SIGNED archive (automatic signing; the API key lets xcodebuild register
#    the App ID's iCloud capability and mint the profile headlessly)
rm -rf "$(dirname "$ARCHIVE_PATH")" "$EXPORT_DIR"
echo "==> Archiving (signed)…"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
	-destination 'generic/platform=iOS' \
	-archivePath "$ARCHIVE_PATH" \
	-allowProvisioningUpdates \
	-authenticationKeyPath "$KEY_PATH" \
	-authenticationKeyID "$KEY_ID" \
	-authenticationKeyIssuerID "$ISSUER_ID" \
	archive -quiet

# 4. Export the .ipa for App Store Connect
echo "==> Exporting IPA…"
xcodebuild -exportArchive -archivePath "$ARCHIVE_PATH" \
	-exportPath "$EXPORT_DIR" -exportOptionsPlist ios/ExportOptions.plist \
	-allowProvisioningUpdates \
	-authenticationKeyPath "$KEY_PATH" \
	-authenticationKeyID "$KEY_ID" \
	-authenticationKeyIssuerID "$ISSUER_ID" -quiet

IPA=$(ls "$EXPORT_DIR"/*.ipa | head -1)

# 5. Entitlement gate (Buffy build-5 lesson: verify INSIDE the signed binary)
echo "==> Verifying entitlements in the signed app…"
ENT_TMP=$(mktemp -d)
unzip -q "$IPA" -d "$ENT_TMP"
ENT=$(codesign -d --entitlements :- "$ENT_TMP"/Payload/*.app 2>/dev/null || true)
echo "$ENT"
for needle in icloud-container-identifiers icloud-services; do
	echo "$ENT" | grep -q "$needle" || {
		echo "FATAL: entitlement '$needle' missing from the signed binary — DO NOT ship."
		echo "       (iCloud sync would be dead in production. Check App.entitlements,"
		echo "        CODE_SIGN_ENTITLEMENTS, and that the profile carries the capability.)"
		rm -rf "$ENT_TMP"
		exit 1
	}
done
VERS=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$ENT_TMP"/Payload/*.app/Info.plist)
[ "$VERS" = "$NEXT" ] || { echo "FATAL: IPA says build $VERS, expected $NEXT"; rm -rf "$ENT_TMP"; exit 1; }
rm -rf "$ENT_TMP"
echo "    entitlements + version OK"

# 6. Upload to App Store Connect
echo "==> Uploading to App Store Connect…"
xcrun altool --upload-app -f "$IPA" --type ios --apiKey "$KEY_ID" --apiIssuer "$ISSUER_ID"

echo ""
echo "DONE: build ${NEXT} uploaded. ASC processing takes ~5-10 min, then it appears in TestFlight."
echo "Commit the bump:  git add ${PBX} && git commit -m 'Bump iOS build to ${NEXT}'"
