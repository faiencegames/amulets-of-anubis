# Building the Android app

The easy way, from the project folder:

    ANDROID_SDK=/path/to/android-sdk ./build.sh android

It writes `dist/android/amulets-of-anubis.apk`, signed with `release.jks` in
this folder if there is one (its password in `release.pass`), otherwise with a debug key it keeps here as
`debug.keystore`. Keep both out of git (`.gitignore` does).
`ANDROID_UNSIGNED=1 ./build.sh android` leaves it unsigned instead
(`dist/android/amulets-of-anubis-unsigned.apk`), for F-Droid, which signs
with its own key; two unsigned builds of one commit are identical. The steps below
are what it does, if you want to run them by hand from this folder.

The app is a single WebView activity that loads the built game from
`assets/index.html`. No Gradle project is needed; the SDK command line tools
are enough.

    SDK=/path/to/android-sdk
    B=$SDK/build-tools/35.0.0
    J=$SDK/platforms/android-35/android.jar

    # 1. put the built game (fonts embedded, no service worker) in assets/
    mkdir -p assets && cp ../../dist/amulets-of-anubis.html assets/index.html

    # 2. resources and manifest
    $B/aapt2 compile --dir res -o res.zip
    $B/aapt2 link -o base.apk -I $J --manifest AndroidManifest.xml -A assets \
        --java gen res.zip --min-sdk-version 24 --target-sdk-version 35 \
        --version-code 902 --version-name 0.9.2 --replace-version

    # 3. java -> dex   (--release 8 keeps d8 happy)
    rm -rf classes
    javac --release 8 -cp $J -d classes gen/com/amulets/nile/R.java MainActivity.java Vibration.java
    $B/d8 --min-api 24 --lib $J --output dex $(find classes -name '*.class')

    # 4. pack, align, sign
    touch -t 198001010000 dex/classes.dex    # a fixed date: the same source, the same APK
    cp base.apk unsigned.apk && (cd dex && zip -qX ../unsigned.apk classes.dex)
    $B/zipalign -f -p 4 unsigned.apk aligned.apk
    $B/apksigner sign --ks release.jks --ks-pass file:release.pass --out amulets-of-anubis.apk aligned.apk
    # (for F-Droid, stop before signing: aligned.apk is the unsigned APK)

The manifest requests `android.permission.VIBRATE` (required on API 33+).
No user prompt; it is a normal permission.

Raise `--version-code` on every release or Android will refuse to install the
update over an older copy. It is major × 10000 + minor × 100 + patch (0.9.2 is
902). It and the version name are also written in `AndroidManifest.xml`,
where F-Droid reads them; a release sets both (the build guide,
`docs/build-guide.md`, "Version numbers and tags").

`res/mipmap-*/ic_launcher.png` holds the launcher icon at 48, 72, 96, 144 and
192 pixels.
