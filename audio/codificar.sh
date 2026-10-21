#!/usr/bin/env bash
# Converte os masters de audio/masters/ em OGG Vorbis (Chrome, Firefox, Edge) e MP3 (reserva para
# navegadores sem Ogg) em apps/client/public/audio/. Usa o ffmpeg do Alpine num container
# descartável, sem rede, sem root e só com a pasta do projeto montada.
#
#   bash audio/codificar.sh
set -euo pipefail

cd "$(dirname "$0")/.."
IMAGE=riscote-audio-ffmpeg:local

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  printf 'FROM alpine:3.22\nRUN apk add --no-cache ffmpeg\nUSER 1000:1000\nWORKDIR /w\nENTRYPOINT ["ffmpeg"]\n' | docker build -q -t "$IMAGE" -
fi

mkdir -p apps/client/public/audio/sfx apps/client/public/audio/musica
ROOT=$(pwd -W 2>/dev/null || pwd)

ff() {
  MSYS_NO_PATHCONV=1 docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
    -v "$ROOT:/w" "$IMAGE" -hide_banner -loglevel error -y "$@"
}

for f in audio/masters/sfx/*.wav; do
  name=$(basename "$f" .wav)
  ff -i "$f" -ac 1 -c:a libvorbis -q:a 4 "apps/client/public/audio/sfx/$name.ogg"
  ff -i "$f" -ac 1 -ar 44100 -c:a libmp3lame -b:a 96k "apps/client/public/audio/sfx/$name.mp3"
done

for f in audio/masters/musica/*.wav; do
  name=$(basename "$f" .wav)
  ff -i "$f" -c:a libvorbis -q:a 5 "apps/client/public/audio/musica/$name.ogg"
  ff -i "$f" -ar 44100 -c:a libmp3lame -b:a 160k "apps/client/public/audio/musica/$name.mp3"
done

du -ch apps/client/public/audio/sfx/*.ogg | tail -1 | sed 's/total/OGG dos efeitos/'
du -ch apps/client/public/audio/musica/*.ogg | tail -1 | sed 's/total/OGG das músicas/'
