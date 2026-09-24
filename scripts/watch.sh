#!/bin/sh
# Same as: python3 build.py --watch (rebuilds whenever you save a file; Ctrl+C to stop)
cd "$(dirname "$0")/.." && python3 build.py --watch
