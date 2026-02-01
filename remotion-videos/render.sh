#!/bin/bash
# render.sh - Quick render script for Remotion videos
# Usage: ./render.sh <composition> [--props '{"key":"value"}'] [--out filename.mp4] [--pi-optimize]

set -e

COMP="${1:-TextTitle}"
PROPS=""
OUTPUT=""
PI_OPTIMIZE=false

shift || true

while [[ $# -gt 0 ]]; do
    case $1 in
        --props|-p) PROPS="$2"; shift 2 ;;
        --out|-o) OUTPUT="$2"; shift 2 ;;
        --pi-optimize|--pi) PI_OPTIMIZE=true; shift ;;
        *) shift ;;
    esac
done

if [[ -z "$OUTPUT" ]]; then
    OUTPUT="out/${COMP}_$(date +%Y%m%d_%H%M%S).mp4"
fi

mkdir -p out

# Pi-optimized flags: 30% faster, 25% smaller files
PI_FLAGS="--concurrency 2 --image-format jpeg --jpeg-quality 90 --crf 25"

echo "🎬 Rendering: $COMP"
echo "   Output: $OUTPUT"
[[ "$PI_OPTIMIZE" == true ]] && echo "   Mode: Pi-Optimized (30% faster)"

RENDER_CMD="npx remotion render $COMP $OUTPUT"

if [[ "$PI_OPTIMIZE" == true ]]; then
    RENDER_CMD="$RENDER_CMD $PI_FLAGS"
fi

if [[ -n "$PROPS" ]]; then
    echo "   Props: $PROPS"
    $RENDER_CMD --props "$PROPS"
else
    $RENDER_CMD
fi

echo ""
echo "✅ Video saved: $OUTPUT"
echo "   Size: $(du -h "$OUTPUT" | cut -f1)"
