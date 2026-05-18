#!/usr/bin/env bash
# Download canonical Wikimedia Commons originals, downsize to 1024px on the
# long edge, and write into assets/paintings/. Run from repo root.
#
# Format below: <slug>|<wikimedia commons path under /wikipedia/commons/>
set -euo pipefail

UA='Brushstroke/1.0 (https://github.com/nikrich/brushstroke; jannik811@gmail.com)'
BASE='https://upload.wikimedia.org/wikipedia/commons'
OUT='assets/paintings'
MAX=1024

mkdir -p "$OUT"

PAINTINGS=$(cat <<'EOF'
starry-night|e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg
great-wave|0/0a/The_Great_Wave_off_Kanagawa.jpg
pearl-earring|0/0f/1665_Girl_with_a_Pearl_Earring.jpg
scream|c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg
american-gothic|c/cc/Grant_Wood_-_American_Gothic_-_Google_Art_Project.jpg
mona-lisa|e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg
birth-of-venus|0/0b/Sandro_Botticelli_-_La_nascita_di_Venere_-_Google_Art_Project_-_edited.jpg
the-kiss|4/40/The_Kiss_-_Gustav_Klimt_-_Google_Cultural_Institute.jpg
la-grande-jatte|7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg
cafe-terrace|3/33/Vincent_van_Gogh_-_Cafe_Terrace_at_Night_%281888%29.jpg
wanderer-sea-fog|b/b9/Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg
las-meninas|9/99/Las_Meninas_01.jpg
# Removed: Dalí's Persistence of Memory and Magritte's Son of Man — Wikimedia
# Commons has deleted both files because they are still under copyright
# (Dalí d. 1989, Magritte d. 1967). The brief's URLs no longer resolve.
EOF
)

while IFS='|' read -r slug path; do
  [ -z "$slug" ] && continue
  [[ "$slug" == \#* ]] && continue
  out="$OUT/$slug.jpg"
  if [ -f "$out" ]; then
    printf 'skip   %-25s (exists)\n' "$slug"
    continue
  fi
  tmp="$(mktemp -t brushstroke.XXXXXX).jpg"
  url="$BASE/$path"
  printf 'fetch  %-25s ' "$slug"
  if ! curl -sSL -A "$UA" -o "$tmp" "$url"; then
    printf 'FAIL (download)\n'
    rm -f "$tmp"
    exit 1
  fi
  bytes=$(stat -f%z "$tmp")
  if [ "$bytes" -lt 1000 ]; then
    printf 'FAIL (too small: %s bytes)\n' "$bytes"
    rm -f "$tmp"
    exit 1
  fi
  sips -Z $MAX -s format jpeg -s formatOptions 85 "$tmp" --out "$out" > /dev/null
  resized=$(stat -f%z "$out")
  printf '%4dKB → %4dKB\n' "$((bytes / 1024))" "$((resized / 1024))"
  rm -f "$tmp"
done <<< "$PAINTINGS"

echo
echo "Done. Total size:"
du -sh "$OUT"
