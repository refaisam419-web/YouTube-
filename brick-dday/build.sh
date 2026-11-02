#!/bin/sh
# Needs ffmpeg 7 on PATH, the Lemo-Opuscar library at $LIB, and a Chromium (PLAYWRIGHT_CHROME). Software GL: ~30 min for 240 frames.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-/root/lemo-opuscar}; export LIB; cd "$LIB"
.venv/bin/python core/tts/tts.py "$HERE/lines.json" "$HERE/voices"
node core/render/events.mjs "$HERE" --q ssaa=1
node core/render/video.mjs "$HERE" --fps 24 --workers 2 --q ssaa=1 --out "$HERE/out/video.mp4"
.venv/bin/python "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/brick-dday.mp4" 24 0
