#!/bin/bash
# render.sh - Quick render script for Remotion videos
# Usage: ./render.sh <composition> [--props '{"key":"value"}'] [--out filename.mp4]

set -e

COMP="${1:-TextTitle}"
PROPS=""
OUTPUT=""

shift || true

while [[ $# -gt 0 ]]; do
    case $1 in
        --props|-p) PROPS="$2"; shift 2 ;;
        --out|-o) OUTPUT="$2"; shift 2 ;;
        *) shift ;;
    esac
done

if [[ -z "$OUTPUT" ]]; then
    OUTPUT="out/${COMP}_$(date +%Y%m%d_%H%M%S).mp4"
fi

mkdir -p out

echo "🎬 Rendering: $COMP"
echo "   Output: $OUTPUT"

if [[ -n "$PROPS" ]]; then
    echo "   Props: $PROPS"
    npx remotion render "$COMP" "$OUTPUT" --props "$PROPS"
else
    npx remotion render "$COMP" "$OUTPUT"
fi

echo ""
echo "✅ Video saved: $OUTPUT"
echo "   Size: $(du -h "$OUTPUT" | cut -f1)"
