# Building the desktop and Android apps

This guide covers everything you need to install on a fresh **CachyOS** (Arch-based)
machine to build the desktop (Electron) and Android (APK) wrappers, in addition to
the plain HTML game.

If you only want to *play* the game, you need nothing but a web browser. Open
`dist/amulets-of-anubis.html` and you are done.

---

## What the build produces

| Target     | Output                                          | Required tools                  |
| ---------- | ----------------------------------------------- | ------------------------------- |
| HTML       | `dist/amulets-of-anubis.html`                   | Python 3                        |
| Desktop    | `dist/desktop/amulets-of-anubis-<plat>.zip`     | Node.js (npx), zip              |
| Android    | `dist/android/amulets-of-anubis.apk`            | JDK 17 or newer, Android SDK (build-tools 35.0.0 + platform android-35), zip |

`./build.sh` runs all targets in sequence and skips any whose tools are missing.
You can also target a single step:

```sh
./build.sh html      # game only
./build.sh desktop   # game + desktop apps
./build.sh android   # game + Android APK
```

---

## Prerequisites (CachyOS / Arch, fish shell)

### 1. Python 3.9 or newer (for the HTML build)

```fish
sudo pacman -S python
```

### 2. Node.js and zip (for the desktop build)

```fish
sudo pacman -S nodejs zip
```

`electron-packager` downloads the Electron 44.4.3 binaries itself during the
build, so you do **not** install Electron system-wide. You just need network
access.

### 3. JDK (for the Android build)

Needed for `javac` (compiles the two small Java source files) and `keytool`
(generates the debug signing keystore on first run).

```fish
sudo pacman -S jdk-openjdk
```

Add the JVM bin directory to your fish PATH (path may vary by version):

```fish
fish_add_path /usr/lib/jvm/java-26-openjdk/bin
```

### 4. Android SDK command-line tools (for the Android build)

The `android-sdk` AUR package has a broken PGP signature and should be avoided.
Use `android-sdk-cmdline-tools-latest` instead:

```fish
# AUR helper (if you don't have one)
yay -S yay

# Command-line tools (installs sdkmanager under /opt/android-sdk)
yay -S android-sdk-cmdline-tools-latest
```

This gives you `sdkmanager` at:

```
/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager
```

Add it to your fish PATH:

```fish
fish_add_path /opt/android-sdk/cmdline-tools/latest/bin
```

### 5. Install the two SDK components the build calls

The build script invokes four binaries from `build-tools/35.0.0` (`aapt2`,
`d8`, `zipalign`, `apksigner`) and reads `android.jar` from
`platforms/android-35`. Install both:

```fish
# /opt/android-sdk is root-owned; make your user own it so sdkmanager can write
sudo chown -R $(whoami) /opt/android-sdk

sdkmanager "build-tools;35.0.0" "platforms;android-35"
yes | sdkmanager --licenses
```

### 6. Point the build at the SDK

`build.sh` looks for `ANDROID_SDK` (or `ANDROID_HOME` / `ANDROID_SDK_ROOT`)
first, then falls back to a list of common paths. Set the variable explicitly:

```fish
set -gx ANDROID_SDK /opt/android-sdk
echo 'set -gx ANDROID_SDK /opt/android-sdk' >> ~/.config/fish/config.fish
```

---

## Verifying the setup

Run these before building. Each line should print a path (not an error):

```fish
javac --version
zip --version
ls $ANDROID_SDK/build-tools/35.0.0/aapt2
ls $ANDROID_SDK/platforms/android-35/android.jar
```

---

## Building

```fish
cd ~/path/to/amulets-of-anubis

# Everything (HTML + desktop + Android + docs + website)
./build.sh

# Or target individual steps
./build.sh desktop
./build.sh android
```

### Desktop output

Five zipped apps land in `dist/desktop/`:

| File | Platform |
|---|---|
| `amulets-of-anubis-win32-x64.zip` | Windows, 64-bit |
| `amulets-of-anubis-linux-x64.zip` | Linux, 64-bit |
| `amulets-of-anubis-linux-arm64.zip` | Linux on ARM (a Raspberry Pi, for instance) |
| `amulets-of-anubis-darwin-arm64.zip` | macOS, Apple silicon |
| `amulets-of-anubis-darwin-x64.zip` | macOS, Intel |

### Android output

A single APK at `dist/android/amulets-of-anubis.apk`.

**Signing:** if `platforms/android/release.jks` does not exist, the build
auto-generates a debug keystore (`platforms/android/debug.keystore`) and signs
with that. The resulting APK is valid and installable. For Play Store
distribution or a stable update identity, create a release key first, with
its password in a file beside it so the build doesn't have to ask:

```fish
python3 -c "import secrets; print(secrets.token_urlsafe(24))" > platforms/android/release.pass
keytool -genkeypair -v \
  -keystore platforms/android/release.jks -storetype PKCS12 \
  -storepass:file platforms/android/release.pass \
  -alias release -keyalg RSA -keysize 4096 -validity 27000 \
  -dname "CN=Amulets of Anubis"
```

The name in `-dname` is written into every APK you sign, where anyone can
read it, so use the game's name or a pen name rather than your own. The
build picks up `release.jks` and `release.pass` automatically on the next
run and `.gitignore` keeps both out of git.
**Keep that file safe.** Losing it means you can no longer update existing
installs under the same identity.

### An unsigned APK (F-Droid)

F-Droid builds the app from this source and signs it with its own key, so it
needs the APK unsigned:

```sh
ANDROID_UNSIGNED=1 ./build.sh android
```

That writes `dist/android/amulets-of-anubis-unsigned.apk` and makes no key.
Everything else is the same as the signed build.

The Android build asks nothing and needs no network: Python builds the game,
then the SDK's own tools (`aapt2`, `javac`, `d8`, `zipalign`) pack it. It
uses these versions and nothing else:

| Tool | Version |
|---|---|
| Android build-tools | 35.0.0 (`ANDROID_BUILD_TOOLS`) |
| Android platform | android-35 (`ANDROID_PLATFORM`); minimum Android 7 (API 24) |
| JDK | 17 or newer (the Java is compiled for Java 8, `--release 8`) |
| Python | 3.9 or newer |
| zip | any (Info-ZIP) |

**The same source makes the same APK.** Two unsigned builds of one commit
are identical, byte for byte, so anyone can check that an APK was built
from this source: build it and compare the checksums
(`shasum -a 256 dist/android/*.apk`). The build keeps it so by giving the one
file it adds to the APK, `classes.dex`, a fixed date.

### Version numbers and tags

A release has one version, like `0.9.2`. The source of that release is
the tag `v0.9.2`. Android also needs a *version code*, a whole number that
must rise with every release, or phones refuse the update. It is made from
the version: major × 10000 + minor × 100 + patch, so `0.9.2` is `902`,
`0.9.3` is `903` and `1.0.0` is `10000`. (So the minor and patch numbers stay
below 100.) Both numbers are written in `platforms/android/AndroidManifest.xml`,
where F-Droid looks for them and `build.sh` gives the same ones to `aapt2`.

Each version also has a line for app stores on what changed:
`fastlane/metadata/android/en-US/changelogs/<version code>.txt`, in plain
words, at most 500 characters. The rest of the store listing (the title,
the descriptions, the icon and the phone screenshots) is beside it in
`fastlane/metadata/android/en-US/`; `node tools/screenshots/take.mjs store`
retakes the screenshots from the built game.

### Downloads on GitHub (and Obtainium)

Every release on GitHub has the game and the apps attached, with the version
in their names:

| File | What |
|---|---|
| `amulets-of-anubis.html` | the game, one file |
| `amulets-of-anubis-<version>-android.apk` | the Android app, signed |
| `amulets-of-anubis-<version>-windows-x64.zip` | Windows |
| `amulets-of-anubis-<version>-macos-apple-silicon.zip`, `-macos-intel.zip` | macOS |
| `amulets-of-anubis-<version>-linux-x64.zip`, `-linux-arm64.zip` | Linux |

The APK is the only `.apk` in a release, so an app such as Obtainium, given
the repository's address, finds and updates it without any settings. The
APK attached on GitHub and the one F-Droid makes are signed with different
keys, so a phone can't update one with the other: pick one source and keep
to it.

### A clean build in a container

To check that the Android app builds from a fresh copy with nothing but the
tools above, in a throwaway Debian container (Docker or Podman). The first
command fetches the tools; the build itself runs with no network. On a Mac
with Apple silicon keep `--platform linux/amd64`, because the SDK's Linux
tools are only made for x86-64.

```sh
git clone https://github.com/faiencegames/amulets-of-anubis.git
cd amulets-of-anubis
docker build --platform linux/amd64 -t amulets-android - <<'EOF'
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
	openjdk-17-jdk-headless python3 zip unzip curl ca-certificates
RUN curl -fsSLo /tmp/tools.zip \
	https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
	&& mkdir -p /opt/android-sdk/cmdline-tools \
	&& unzip -q /tmp/tools.zip -d /opt/android-sdk/cmdline-tools \
	&& mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest \
	&& yes | /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null \
	&& /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager "build-tools;35.0.0" "platforms;android-35"
ENV ANDROID_SDK=/opt/android-sdk
EOF
docker run --rm --platform linux/amd64 --network none -v "$PWD":/src -w /src \
	-e ANDROID_UNSIGNED=1 amulets-android ./build.sh android
docker run --rm --platform linux/amd64 --network none -v "$PWD":/src -w /src \
	amulets-android /opt/android-sdk/build-tools/35.0.0/aapt2 dump badging \
	dist/android/amulets-of-anubis-unsigned.apk
```

The last command should begin `package: name='com.amulets.nile'`, with the
version code and name of the copy you built.

---

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `[skip] Node.js (npx) or zip not found` | `zip` not installed | `sudo pacman -S zip` |
| `[skip] Android SDK not found` | `ANDROID_SDK` unset or wrong path | `set -gx ANDROID_SDK /opt/android-sdk` |
| `[skip] javac not found` | JDK not on PATH | `fish_add_path /usr/lib/jvm/java-26-openjdk/bin` |
| `AccessDeniedException: /opt/android-sdk/.sdk` | SDK dir is root-owned | `sudo chown -R $(whoami) /opt/android-sdk` |
| `Skipping non-existent path` from `fish_add_path` | Path doesn't exist yet (e.g. build-tools before sdkmanager runs) | Run `sdkmanager` first, then add the path |
