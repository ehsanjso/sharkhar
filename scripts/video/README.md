# Video Processing Scripts

Simple ffmpeg wrappers for extracting clips and creating social media shorts.

## clip.sh - Extract Single Clips

Extract a specific segment from a video.

```bash
./clip.sh video.mp4 --start 00:01:30 --duration 60 --out highlight.mp4
```

**Options:**
- `--start, -s` - Start time (HH:MM:SS or seconds) [default: 00:00:00]
- `--duration, -d` - Duration in seconds [default: 30]
- `--end, -e` - End time (alternative to duration)
- `--out, -o` - Output filename [default: input_clip.mp4]
- `--scale` - Resize height (e.g., 1080, 720, 480)
- `--fps` - Frame rate (e.g., 30, 24)
- `--quality, -q` - CRF quality 0-51, lower=better [default: 23]

**Examples:**
```bash
# 60-second clip starting at 1:30
./clip.sh podcast.mp4 -s 00:01:30 -d 60

# 720p clip with lower quality for smaller file
./clip.sh video.mp4 -s 90 -d 30 --scale 720 --quality 28
```

## shorts.sh - Generate Social Media Shorts

Create multiple short clips from timestamps (perfect for highlights, teasers, TikTok/Reels).

```bash
./shorts.sh video.mp4 --timestamps "00:01:30,00:05:00,00:10:15" --duration 60
```

**Options:**
- `--timestamps, -t` - Comma-separated start times (required)
- `--duration, -d` - Duration per clip [default: 60]
- `--outdir, -o` - Output directory [default: ./shorts]
- `--scale` - Height in pixels [default: 1080]
- `--vertical, -v` - Create 9:16 vertical clips (TikTok/Reels)

**Examples:**
```bash
# Generate 3x 30-second clips
./shorts.sh podcast.mp4 -t "00:01:30,00:05:00,00:10:15" -d 30

# Vertical clips for TikTok/Reels
./shorts.sh video.mp4 -t "90,300,600" --vertical

# Save to custom directory
./shorts.sh video.mp4 -t "00:01:00,00:05:00" --outdir ~/Videos/clips
```

## Tips

- **Timestamps:** Use HH:MM:SS format or raw seconds (90 = 1:30)
- **Quality:** CRF 23 is good default, 18-28 typical range
- **Vertical video:** shorts.sh crops center 9:16 for social media
- **Fast renders:** Both use `-preset fast` for speed

## Requirements

- ffmpeg (install: `sudo apt install ffmpeg`)
