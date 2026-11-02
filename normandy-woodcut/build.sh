#!/bin/sh
# One-command build. Needs ffmpeg 7 on PATH and the Lemo-Opuscar library (LIB).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/root/lemo-opuscar}; export LIB
cd "$LIB"
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
(cd "$HERE" && "$LIB/.venv/bin/python" mix.py)
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/normandy-woodcut.mp4" 24 4
