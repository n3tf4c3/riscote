#!/usr/bin/env bash
# Converte os masters de audio/masters/ em OGG Vorbis (Chrome, Firefox, Edge) e MP3 (reserva para
# navegadores sem Ogg) em apps/client/public/audio/. Usa o ffmpeg do Alpine num container
# descartável, sem rede, sem root e só com a pasta do projeto montada.
#
#   bash audio/codificar.sh              todos os masters que existem
#   bash audio/codificar.sh floresta     só os masters cujo nome começa por um dos indicados
set -euo pipefail
# Sem masters de um tipo (eles ficam fora do Git), o laço não roda em vez de falhar.
shopt -s nullglob

cd "$(dirname "$0")/.."
IMAGE=riscote-audio-ffmpeg:local

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  printf 'FROM alpine:3.22\nRUN apk add --no-cache ffmpeg\nUSER 1000:1000\nWORKDIR /w\nENTRYPOINT ["ffmpeg"]\n' | docker build -q -t "$IMAGE" -
fi

mkdir -p apps/client/public/audio/sfx apps/client/public/audio/musica
ROOT=$(pwd -W 2>/dev/null || pwd)

# Com nomes, só os masters que começam por algum deles (refazer tudo muda os OGG sem necessidade).
pick() {
  local name=$1
  shift
  [ $# -eq 0 ] && return 0
  for w in "$@"; do case "$name" in "$w"|"$w"-*) return 0 ;; esac; done
  return 1
}

ff() {
  MSYS_NO_PATHCONV=1 docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
    -v "$ROOT:/w" "$IMAGE" -hide_banner -loglevel error -y "$@"
}

for f in audio/masters/sfx/*.wav; do
  name=$(basename "$f" .wav)
  pick "$name" "$@" || continue
  ff -i "$f" -ac 1 -c:a libvorbis -q:a 4 "apps/client/public/audio/sfx/$name.ogg"
  ff -i "$f" -ac 1 -ar 44100 -c:a libmp3lame -b:a 96k "apps/client/public/audio/sfx/$name.mp3"
done

for f in audio/masters/musica/*.wav; do
  name=$(basename "$f" .wav)
  pick "$name" "$@" || continue
  ff -i "$f" -c:a libvorbis -q:a 5 "apps/client/public/audio/musica/$name.ogg"
  ff -i "$f" -ar 44100 -c:a libmp3lame -b:a 160k "apps/client/public/audio/musica/$name.mp3"
done

du -ch apps/client/public/audio/sfx/*.ogg | tail -1 | sed 's/total/OGG dos efeitos/'
du -ch apps/client/public/audio/musica/*.ogg | tail -1 | sed 's/total/OGG das músicas/'
