# Building the Android app

The easy way, from the project folder:

    ANDROID_SDK=/path/to/android-sdk ./build.sh android

It writes `dist/android/AmuletsOfTheNile.apk`, signed with `release.jks` in
this folder if there is one, otherwise with a debug key it keeps here as
`debug.keystore`. Keep both out of git (`.gitignore` does). The steps below
are what it does, if you want to run them by hand from this folder.

The app is a single WebView activity that loads the built game from
`assets/index.html`. No Gradle project is needed; the SDK command line tools
are enough.

    SDK=/path/to/android-sdk
    B=$SDK/build-tools/34.0.0
    J=$SDK/platforms/android-34/android.jar

    # 1. put the built game (fonts embedded, no service worker) in assets/
    mkdir -p assets && cp ../../dist/amulets-of-anubis.html assets/index.html

    # 2. resources and manifest
    $B/aapt2 compile --dir res -o res.zip
    $B/aapt2 link -o base.apk -I $J --manifest AndroidManifest.xml -A assets \
        --java gen res.zip --min-sdk-version 24 --target-sdk-version 34 \
        --version-code 5 --version-name 1.4

    # 3. java -> dex   (--release 8 keeps d8 happy)
    rm -rf classes
    javac --release 8 -cp $J -d classes gen/com/amulets/nile/R.java MainActivity.java Vibration.java
    $B/d8 --min-api 24 --lib $J --output dex $(find classes -name '*.class')

    # 4. pack, align, sign
    cp base.apk unsigned.apk && (cd dex && zip -q ../unsigned.apk classes.dex)
    $B/zipalign -f -p 4 unsigned.apk aligned.apk
    $B/apksigner sign --ks release.jks --out AmuletsOfTheNile.apk aligned.apk

The manifest requests `android.permission.VIBRATE` (required on API 33+).
No user prompt; it is a normal permission.

Raise `--version-code` on every release or Android will refuse to install the
update over an older copy.

`res/mipmap-*/ic_launcher.png` holds the launcher icon at 48, 72, 96, 144 and
192 pixels.
