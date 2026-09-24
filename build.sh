#!/bin/sh
# Build Amulets of Anubis. Everything it makes goes into dist/:
#
#   dist/amulets-of-anubis.html   the game, one file (and dist/try-it.html)
#   dist/desktop/                 Windows, macOS and Linux apps, zipped
#   dist/android/                 the Android app (.apk)
#   docs/images/                  the screenshots in the README and guides,
#                                 retaken from the game just built
#   dist/docs/                    all the documentation, as web pages
#   dist/website/                 the public website, with download buttons
#                                 for whichever apps above were built
# Usage:
#   ./build.sh              everything
#   ./build.sh html         the game only
#   ./build.sh desktop      the game + desktop apps
#   ./build.sh android      the game + the Android app
#   ./build.sh screenshots  the game + the screenshots in docs/images/
#   ./build.sh docs         the documentation pages
#   ./build.sh website      the game + the website (uses apps already in dist/)
#
# Desktop apps need Node.js (npx) and zip. Screenshots need Node.js; the first
# time, they fetch Playwright and a browser to take them with (or set CHROME to
# a browser's path). The Android app needs the Android SDK (set ANDROID_SDK or
# ANDROID_HOME) and a JDK. Missing tools are skipped.
#
# GAME_VERSION (default 0.9.0) is the version the apps show. Android also
# needs a version code that rises with every release; it is made from the
# version (1.2.3 becomes 10203) unless ANDROID_VERSION_CODE says otherwise.
# Android settings: ANDROID_BUILD_TOOLS (default 34.0.0), ANDROID_PLATFORM
# (android-34). The app is signed with platforms/android/release.jks and the
# password in release.pass beside it (both kept out of git), or with
# ANDROID_KEYSTORE and ANDROID_KEYSTORE_PASS_FILE if they are set.

set -e
cd "$(dirname "$0")"

ELECTRON_VERSION="44.4.3"
APP_NAME="Amulets of Anubis"
GAME_VERSION="${GAME_VERSION:-0.9.0}"
GAME="dist/amulets-of-anubis.html"

info() { printf '\033[1m==> %s\033[0m\n' "$*"; }
skip() { printf '\033[33m    [skip] %s\033[0m\n' "$*"; }
ok()   { printf '    %s\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

TARGET="${1:-all}"
case "$TARGET" in
		all|html|desktop|android|screenshots|docs|website) ;;
		*) echo "Usage: $0 [all|html|desktop|android|screenshots|docs|website]"; exit 1 ;;
esac
want() { [ "$TARGET" = all ] || [ "$TARGET" = "$1" ]; }

# --- the game -----------------------------------------------------------------
if [ "$TARGET" != docs ]; then
		info "Building the game..."
		python3 build.py
fi

# --- desktop (Electron) ---------------------------------------------------------
if want desktop; then
		if ! have npx || ! have zip; then
				skip "Node.js (npx) or zip not found: no desktop apps."
		else
				info "Building desktop apps (Electron $ELECTRON_VERSION)..."
				SRC="$PWD/platforms/desktop"
				OUT="$PWD/dist/desktop"
				APP="$OUT/app"                       # a scratch copy, removed afterwards
				rm -rf "$OUT"; mkdir -p "$APP"
				cp "$SRC/main.js" "$SRC/package.json" "$APP/"
				cp "$GAME" "$APP/game.html"
				(cd "$APP" && npm install --no-save "@electron/packager@20" >/dev/null 2>&1)
				pack() {   # platform, arch, icon file
						ok "$1 $2"
						(cd "$APP" && npx electron-packager . "$APP_NAME" \
								--platform="$1" --arch="$2" --electron-version="$ELECTRON_VERSION" --app-version="$GAME_VERSION" \
								--icon="$SRC/icons/$3" --out="$OUT" --overwrite --prune=false \
								--ignore="^/node_modules" >/dev/null)
						(cd "$OUT" && zip -qryX "amulets-of-anubis-$1-$2.zip" "$APP_NAME-$1-$2" && rm -rf "$APP_NAME-$1-$2")
				}
				pack win32  x64   icon.ico
				pack linux  x64   icon.png
				pack linux  arm64 icon.png
				pack darwin arm64 icon.icns
				pack darwin x64   icon.icns
				rm -rf "$APP"
				ok "Desktop apps in dist/desktop/"
		fi
fi

# --- Android --------------------------------------------------------------------
if want android; then
		SDK="${ANDROID_SDK:-${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}}"
		if [ -z "$SDK" ]; then
				for d in "$HOME/Android/Sdk" "$HOME/Library/Android/sdk" "$HOME/android-sdk" \
								 "/opt/homebrew/share/android-commandlinetools" "/opt/android-sdk" "/usr/local/android-sdk"; do
						if [ -d "$d/build-tools" ]; then SDK="$d"; break; fi
				done
		fi
		B="$SDK/build-tools/${ANDROID_BUILD_TOOLS:-34.0.0}"
		J="$SDK/platforms/${ANDROID_PLATFORM:-android-34}/android.jar"
		if [ -z "$SDK" ] || [ ! -f "$B/aapt2" ] || [ ! -f "$J" ]; then
				skip "Android SDK not found: no Android app. Set ANDROID_SDK to its folder."
		elif ! have javac; then
				skip "javac not found: no Android app (a JDK is needed)."
		else
				info "Building the Android app..."
				SRC="platforms/android"
				OUT="dist/android"
				WORK="$OUT/work"                     # scratch, removed afterwards
				rm -rf "$OUT"; mkdir -p "$WORK/dex" "$WORK/assets"
				cp "$GAME" "$WORK/assets/index.html"
				"$B/aapt2" compile --dir "$SRC/res" -o "$WORK/res.zip"
				"$B/aapt2" link -o "$WORK/base.apk" -I "$J" --manifest "$SRC/AndroidManifest.xml" \
						-A "$WORK/assets" --java "$WORK/gen" --min-sdk-version 24 --target-sdk-version 34 \
						--version-code "${ANDROID_VERSION_CODE:-$(echo "$GAME_VERSION" | awk -F. '{print $1*10000 + $2*100 + $3}')}" \
						--version-name "$GAME_VERSION" "$WORK/res.zip"
				javac --release 8 -cp "$J" -d "$WORK/classes" \
						"$WORK/gen/com/amulets/nile/R.java" "$SRC/MainActivity.java" "$SRC/Vibration.java"
				"$B/d8" --min-api 24 --lib "$J" --output "$WORK/dex" $(find "$WORK/classes" -name '*.class')
				cp "$WORK/base.apk" "$WORK/unsigned.apk"
				(cd "$WORK/dex" && zip -q ../unsigned.apk classes.dex)
				"$B/zipalign" -f -p 4 "$WORK/unsigned.apk" "$WORK/aligned.apk"
				# Sign with the release key if there is one (its password from a file,
				# so nothing is asked). Otherwise a debug key, kept beside it so every
				# build can update the last one.
				KEY="${ANDROID_KEYSTORE:-$SRC/release.jks}"; PASS=""
				PASSFILE="${ANDROID_KEYSTORE_PASS_FILE:-$SRC/release.pass}"
				[ -f "$KEY" ] && [ -f "$PASSFILE" ] && PASS="--ks-pass file:$PASSFILE"
				if [ ! -f "$KEY" ]; then
						KEY="$SRC/debug.keystore"; PASS="--ks-pass pass:android"
						[ -f "$KEY" ] || keytool -genkeypair -keystore "$KEY" -storepass android -keypass android \
								-alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 \
								-dname "CN=Android Debug,O=Android,C=US" 2>/dev/null
						ok "No release.jks: signed with the debug key"
				fi
				"$B/apksigner" sign --v1-signing-enabled true --v2-signing-enabled true \
						--ks "$KEY" $PASS --out "$OUT/amulets-of-anubis.apk" "$WORK/aligned.apk"
				rm -rf "$WORK"
				ok "Android app: dist/android/amulets-of-anubis.apk"
		fi
fi

# --- screenshots (before the docs, so they show the game just built) -------------
# tools/screenshots/take.mjs plays the game in a headless browser and retakes
# docs/images/; a picture is only replaced when it looks different.
if want screenshots; then
		if ! have node || ! have npx; then
				skip "Node.js not found: the screenshots in docs/images/ were not retaken."
		else
				info "Taking the screenshots (docs/images/)..."
				SHOTS="tools/screenshots"
				if [ ! -d "$SHOTS/node_modules/playwright" ]; then
						ok "First time: fetching Playwright"
						(cd "$SHOTS" && npm install --no-audit --no-fund >/dev/null 2>&1) || true
				fi
				# its browser (quick when it is already there); CHROME=<path> uses your own
				[ -n "$CHROME" ] || (cd "$SHOTS" && npx playwright install chromium >/dev/null 2>&1) || true
				if ! (cd "$SHOTS" && node take.mjs); then
						skip "The screenshots could not be taken (see above); the old ones are kept."
				fi
		fi
fi

# --- documentation and website (last, so the website finds the apps) -------------
if want docs; then
		if [ -f scripts/build-docs.py ]; then
				info "Building the documentation (dist/docs/)..."
				python3 scripts/build-docs.py
		else
				skip "No documentation builder in this copy: the guides are the Markdown files in docs/."
		fi
fi
if want website; then
		if [ -f scripts/build-website.py ]; then
				info "Building the website (dist/website/)..."
				python3 scripts/build-website.py
		else
				skip "No website builder in this copy."
		fi
fi

info "Done. Everything is in dist/."
