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
| Android    | `dist/android/AmuletsOfTheNile.apk`             | JDK, Android SDK (build-tools 34.0.0 + platform android-34) |

`./build.sh` runs all targets in sequence and skips any whose tools are missing.
You can also target a single step:

```sh
./build.sh html      # game only
./build.sh desktop   # game + desktop apps
./build.sh android   # game + Android APK
```

---

## Prerequisites (CachyOS / Arch, fish shell)

### 1. Python 3 (for the HTML build)

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

The build script invokes four binaries from `build-tools/34.0.0` (`aapt2`,
`d8`, `zipalign`, `apksigner`) and reads `android.jar` from
`platforms/android-34`. Install both:

```fish
# /opt/android-sdk is root-owned; make your user own it so sdkmanager can write
sudo chown -R $(whoami) /opt/android-sdk

sdkmanager "build-tools;34.0.0" "platforms;android-34"
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
ls $ANDROID_SDK/build-tools/34.0.0/aapt2
ls $ANDROID_SDK/platforms/android-34/android.jar
```

---

## Building

```fish
cd ~/path/to/amulets-of-the-nile

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
run, and `.gitignore` keeps both out of git.
**Keep that file safe.** Losing it means you can no longer update existing
installs under the same identity.

---

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `[skip] Node.js (npx) or zip not found` | `zip` not installed | `sudo pacman -S zip` |
| `[skip] Android SDK not found` | `ANDROID_SDK` unset or wrong path | `set -gx ANDROID_SDK /opt/android-sdk` |
| `[skip] javac not found` | JDK not on PATH | `fish_add_path /usr/lib/jvm/java-26-openjdk/bin` |
| `AccessDeniedException: /opt/android-sdk/.sdk` | SDK dir is root-owned | `sudo chown -R $(whoami) /opt/android-sdk` |
| `Skipping non-existent path` from `fish_add_path` | Path doesn't exist yet (e.g. build-tools before sdkmanager runs) | Run `sdkmanager` first, then add the path |
