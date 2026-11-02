#!/bin/sh
# Needs ffmpeg 7 on PATH, the Lemo-Opuscar library at $LIB and a Chromium (PLAYWRIGHT_CHROME). Software GL: ~30 min for 336 frames.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-/root/lemo-opuscar}; export LIB; cd "$LIB"
[ -f "$HERE/voices/n1.wav" ] || .venv/bin/python core/tts/tts.py "$HERE/lines.json" "$HERE/voices"
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 2 --out "$HERE/out/video.mp4"
(cd "$HERE" && "$LIB/.venv/bin/python" mix.py)
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/cookie-dday.mp4" 24 3
