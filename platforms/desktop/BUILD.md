# Desktop builds (Windows, macOS, Linux)

The desktop programs are the same single-file game in a window, bundled with
a frozen copy of the Chromium engine through Electron. Because the engine
travels with the game, a desktop build keeps working even when the browsers
installed on a computer change. `main.js` refuses every network request that
isn't to a local file, so the program never goes online.

## Building

You need Node.js and zip. From the project folder:

    ./build.sh desktop

It writes one zip per platform into `dist/desktop/`, and the website build
picks them up as download buttons. By hand, from this folder (copy the
results out afterwards, and delete `game.html`, which is a build copy):

    cp ../../dist/amulets-of-anubis.html game.html
    npm install --no-save @electron/packager@20
    npx electron-packager . "Amulets of the Nile" --platform=win32  --arch=x64   --electron-version=44.4.3 --icon=icons/icon.ico  --out=out --prune=false --ignore="^/node_modules" --ignore="^/out" --ignore="^/icons"
    npx electron-packager . "Amulets of the Nile" --platform=linux  --arch=x64   --electron-version=44.4.3 --icon=icons/icon.png  --out=out --prune=false --ignore="^/node_modules" --ignore="^/out" --ignore="^/icons"
    npx electron-packager . "Amulets of the Nile" --platform=darwin --arch=arm64 --electron-version=44.4.3 --icon=icons/icon.icns --out=out --prune=false --ignore="^/node_modules" --ignore="^/out" --ignore="^/icons"
    npx electron-packager . "Amulets of the Nile" --platform=darwin --arch=x64   --electron-version=44.4.3 --icon=icons/icon.icns --out=out --prune=false --ignore="^/node_modules" --ignore="^/out" --ignore="^/icons"

When zipping a macOS build, keep symbolic links (`zip -ry`); the app bundle
breaks without them.

Pin `--electron-version` and record it: for preservation, the exact engine
version is part of what you are keeping.

## Signing

The builds made here are **unsigned**. Windows shows a SmartScreen warning
("More info" → "Run anyway"). macOS refuses an unsigned app downloaded from
the internet with a message that it "is damaged"; clear the download flag
with, in Terminal:

    xattr -cr "/path/to/Amulets of the Nile.app"

Signed builds need an Apple Developer ID and a Windows code-signing
certificate, and must be made on a Mac for the macOS versions.

## Saved games

Each desktop program keeps its own save, separate from any browser. Use Menu →
Save and restore to move progress between the desktop, browser and Android
versions.
