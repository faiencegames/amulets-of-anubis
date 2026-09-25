#!/bin/sh
# Keeps the code (src/) and the stylesheet (web/css/) in one style, with
# Prettier and the settings in .prettierrc: tabs, lines up to 110 characters,
# one CSS property per line. Development only: the game never needs it.
#
#   tools/format.sh           check, and list the files that are out of style
#   tools/format.sh --write   put them in style
#
# Prettier changes only spacing and line breaks, never what the code does.
# An editor with a Prettier plugin reads the same .prettierrc, so format on
# save gives the same result.

set -e
cd "$(dirname "$0")/.."
P=tools/screenshots/node_modules/.bin/prettier
if [ ! -x "$P" ]; then
	echo "Fetching Prettier (once)..."
	(cd tools/screenshots && npm install --no-audit --no-fund >/dev/null)
fi
if [ "$1" = "--write" ]; then
	"$P" --write --log-level warn 'src/**/*.js' 'web/css/*.css' web/fonts.css
	echo "Done."
else
	"$P" --check 'src/**/*.js' 'web/css/*.css' web/fonts.css
fi
