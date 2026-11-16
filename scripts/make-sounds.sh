#!/usr/bin/env bash
# Placeholder UI sounds (decision 20): synthesised, all under 0.8 s, no
# leading silence. Replace with the licensed or commissioned set later; the
# file names are what src/components/interaction/sound/sound.ts loads.
set -euo pipefail
out="$(dirname "$0")/../public/sounds"
mkdir -p "$out"
enc() {
  local st dd
  st=$(awk "BEGIN{print $2*0.7}")
  dd=$(awk "BEGIN{print $2*0.3}")
  ffmpeg -v error -y -f lavfi -i "aevalsrc=$1:s=44100:d=$2" -af "afade=t=out:st=$st:d=$dd,volume=$3" -ac 1 -c:a libmp3lame -b:a 96k "$out/$4.mp3"
}

# Hover ticks: four tuned variants (rotated without immediate repeats).
i=1
for f in 1760 1975 2217 2489; do
  enc "0.55*sin(2*PI*$f*t)*exp(-t*55)+0.25*sin(2*PI*$f*2.01*t)*exp(-t*90)+0.08*(random(0)*2-1)*exp(-t*400)" 0.12 0.9 "hover-$i"
  i=$((i + 1))
done
# Click: a soft wooden knock with a falling pitch.
enc "0.7*sin(2*PI*(420-900*t)*t)*exp(-t*28)+0.2*(random(0)*2-1)*exp(-t*260)" 0.22 1 "click"
# Transition whoosh: band-limited noise swelling then falling away.
ffmpeg -v error -y -f lavfi -i "anoisesrc=d=0.72:c=pink:a=0.5:s=44100" -af "bandpass=f=900:w=1.6,afade=t=in:d=0.28:curve=qsin,afade=t=out:st=0.3:d=0.42:curve=qsin,volume=1.6" -ac 1 -c:a libmp3lame -b:a 96k "$out/whoosh.mp3"
# Scramble tick: a dry grain.
enc "0.5*sin(2*PI*3100*t)*exp(-t*160)+0.3*(random(0)*2-1)*exp(-t*300)" 0.06 0.8 "scramble"
# Steps: six tones rising from about 67 Hz to 240 Hz (Auge's carousel steps), with an overtone so small speakers hear them.
i=1
for f in 67 86 110 141 186 240; do
  enc "0.6*sin(2*PI*$f*t)*exp(-t*14)+0.35*sin(2*PI*$f*4*t)*exp(-t*30)" 0.21 1 "step-$i"
  i=$((i + 1))
done
# Toggle on: two quick notes.
enc "0.5*sin(2*PI*1318*t)*exp(-t*18)*lt(t\,0.09)+0.5*sin(2*PI*1975*(t-0.09))*exp(-(t-0.09)*14)*gte(t\,0.09)" 0.36 0.9 "toggle"
echo "wrote $(ls "$out" | wc -l) files to $out"
