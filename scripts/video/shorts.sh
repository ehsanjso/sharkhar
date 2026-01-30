#!/bin/bash
# shorts.sh - Generate social media shorts from a video
# Usage: ./shorts.sh input.mp4 --timestamps "00:01:30,00:05:00,00:10:15" --duration 60

set -e

INPUT=""
TIMESTAMPS=""
DURATION="60"
OUTPUT_DIR="./shorts"
SCALE="1080"
VERTICAL=false

usage() {
    echo "Usage: $0 <input> --timestamps \"HH:MM:SS,HH:MM:SS,...\" [options]"
    echo ""
    echo "Options:"
    echo "  --timestamps, -t  Comma-separated start times"
    echo "  --duration, -d    Duration per clip in seconds [default: 60]"
    echo "  --outdir, -o      Output directory [default: ./shorts]"
    echo "  --scale           Height in pixels [default: 1080]"
    echo "  --vertical, -v    Create 9:16 vertical clips (for TikTok/Reels)"
    echo ""
    echo "Examples:"
    echo "  $0 video.mp4 -t \"00:01:30,00:05:00\" -d 30"
    echo "  $0 video.mp4 -t \"90,300,600\" -d 60 --vertical"
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timestamps|-t) TIMESTAMPS="$2"; shift 2 ;;
        --duration|-d) DURATION="$2"; shift 2 ;;
        --outdir|-o) OUTPUT_DIR="$2"; shift 2 ;;
        --scale) SCALE="$2"; shift 2 ;;
        --vertical|-v) VERTICAL=true; shift ;;
        --help|-h) usage ;;
        -*) echo "Unknown option: $1"; usage ;;
        *) INPUT="$1"; shift ;;
    esac
done

if [[ -z "$INPUT" || -z "$TIMESTAMPS" ]]; then
    echo "Error: Input file and timestamps required"
    usage
fi

if [[ ! -f "$INPUT" ]]; then
    echo "Error: Input file not found: $INPUT"
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

BASENAME=$(basename "$INPUT" | sed 's/\.[^.]*$//')
IFS=',' read -ra TIMES <<< "$TIMESTAMPS"

echo "🎬 Generating ${#TIMES[@]} clips from: $INPUT"
echo ""

for i in "${!TIMES[@]}"; do
    START="${TIMES[$i]}"
    NUM=$((i + 1))
    OUTPUT="$OUTPUT_DIR/${BASENAME}_short_${NUM}.mp4"
    
    echo "📹 Clip $NUM: Start $START, Duration ${DURATION}s"
    
    # Build filter for vertical if needed
    if $VERTICAL; then
        # 9:16 aspect ratio, center crop
        FILTER="scale=-2:$SCALE,crop=ih*9/16:ih"
    else
        FILTER="scale=-2:$SCALE"
    fi
    
    ffmpeg -y -ss "$START" -i "$INPUT" -t "$DURATION" \
        -vf "$FILTER" \
        -c:v libx264 -crf 23 -preset fast \
        -c:a aac -b:a 128k \
        "$OUTPUT" 2>/dev/null
    
    echo "   ✅ Saved: $OUTPUT ($(du -h "$OUTPUT" | cut -f1))"
done

echo ""
echo "🎉 Generated ${#TIMES[@]} clips in: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"/*.mp4 2>/dev/null | awk '{print "   " $NF " (" $5 ")"}'
