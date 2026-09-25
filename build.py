#!/usr/bin/env python3
"""
Builds the game into one file, dist/amulets-of-anubis.html.

	python3 build.py            (on Windows you may need:  py build.py)
	python3 build.py --check    only check the content files; write nothing
	python3 build.py --watch    build again whenever you save a file

The build itself is the engine's, engine/build.py (see its notes). This
file runs it for this game: edition.jsonc, content/ and images/ here.
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.exit(subprocess.call([sys.executable, os.path.join(HERE, 'engine', 'build.py'), '--game', HERE] + sys.argv[1:]))
