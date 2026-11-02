#!/bin/sh
# Needs ffmpeg 7 on PATH, the Lemo-Opuscar library at $LIB, and a Chromium (PLAYWRIGHT_CHROME). ~2 min on 3 workers.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-/root/lemo-opuscar}; export LIB; cd "$LIB"
.venv/bin/python core/tts/tts.py "$HERE/lines.json" "$HERE/voices"
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
(cd "$HERE" && "$LIB/.venv/bin/python" mix.py)
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/cheese-please.mp4" 24 3
