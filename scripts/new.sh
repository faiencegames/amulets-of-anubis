#!/bin/sh
# Same as: python3 scripts/new.py (asks what to make)
cd "$(dirname "$0")/.." && python3 scripts/new.py "$@"
