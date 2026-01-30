#!/bin/bash
# clip.sh - Extract video clips using ffmpeg
# Usage: ./clip.sh input.mp4 --start 00:01:30 --duration 30 --out clip.mp4

set -e

INPUT=""
START="00:00:00"
DURATION="30"
OUTPUT=""
SCALE=""
FPS=""
QUALITY="23"  # CRF value (lower = better quality, 18-28 typical)

usage() {
    echo "Usage: $0 <input> [options]"
    echo ""
    echo "Options:"
    echo "  --start, -s     Start time (HH:MM:SS or seconds) [default: 00:00:00]"
    echo "  --duration, -d  Duration in seconds [default: 30]"
    echo "  --end, -e       End time (alternative to duration)"
    echo "  --out, -o       Output file [default: input_clip.mp4]"
    echo "  --scale         Scale (e.g., 1080, 720, 480)"
    echo "  --fps           Frame rate (e.g., 30, 24)"
    echo "  --quality, -q   Quality 0-51, lower=better [default: 23]"
    echo ""
    echo "Examples:"
    echo "  $0 video.mp4 --start 00:01:30 --duration 60 --out highlight.mp4"
    echo "  $0 video.mp4 -s 90 -d 30 --scale 720 --out short.mp4"
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --start|-s) START="$2"; shift 2 ;;
        --duration|-d) DURATION="$2"; shift 2 ;;
        --end|-e) END="$2"; shift 2 ;;
        --out|-o) OUTPUT="$2"; shift 2 ;;
        --scale) SCALE="$2"; shift 2 ;;
        --fps) FPS="$2"; shift 2 ;;
        --quality|-q) QUALITY="$2"; shift 2 ;;
        --help|-h) usage ;;
        -*) echo "Unknown option: $1"; usage ;;
        *) INPUT="$1"; shift ;;
    esac
done

if [[ -z "$INPUT" ]]; then
    echo "Error: No input file specified"
    usage
fi

if [[ ! -f "$INPUT" ]]; then
    echo "Error: Input file not found: $INPUT"
    exit 1
fi

# Default output name
if [[ -z "$OUTPUT" ]]; then
    BASENAME=$(basename "$INPUT" | sed 's/\.[^.]*$//')
    OUTPUT="${BASENAME}_clip.mp4"
fi

# Build ffmpeg command
FFMPEG_CMD="ffmpeg -y -ss $START -i \"$INPUT\""

# Duration or end time
if [[ -n "$END" ]]; then
    FFMPEG_CMD="$FFMPEG_CMD -to $END"
else
    FFMPEG_CMD="$FFMPEG_CMD -t $DURATION"
fi

# Video filters
FILTERS=""
if [[ -n "$SCALE" ]]; then
    FILTERS="scale=-2:$SCALE"
fi
if [[ -n "$FPS" ]]; then
    if [[ -n "$FILTERS" ]]; then
        FILTERS="$FILTERS,fps=$FPS"
    else
        FILTERS="fps=$FPS"
    fi
fi

if [[ -n "$FILTERS" ]]; then
    FFMPEG_CMD="$FFMPEG_CMD -vf \"$FILTERS\""
fi

# Output settings
FFMPEG_CMD="$FFMPEG_CMD -c:v libx264 -crf $QUALITY -preset fast -c:a aac -b:a 128k \"$OUTPUT\""

echo "🎬 Extracting clip..."
echo "   Input: $INPUT"
echo "   Start: $START"
echo "   Duration: ${DURATION}s"
echo "   Output: $OUTPUT"
echo ""

eval $FFMPEG_CMD

echo ""
echo "✅ Clip saved: $OUTPUT"
echo "   Size: $(du -h "$OUTPUT" | cut -f1)"
