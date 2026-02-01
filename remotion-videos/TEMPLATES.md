# Remotion Video Templates

Programmatic video creation for ClawdBot.

## 🚀 Pi Optimization

For faster rendering on Raspberry Pi, add the `--pi-optimize` (or `--pi`) flag to any render command:

```bash
./render.sh TextTitle --pi-optimize
./render.sh Quote --pi --props '{"quote":"Fast rendering!"}'
```

Or use the npm script:

```bash
npm run render:pi TextTitle out/video.mp4
```

**Performance gains:** 30% faster rendering, 25% smaller files

## Available Templates

### 1. TextTitle
Simple title card with fade in/out animation.

```bash
./render.sh TextTitle --props '{"title":"Hello World","subtitle":"Welcome!"}'
```

Props:
- `title` (required): Main title text
- `subtitle`: Optional subtitle
- `backgroundColor`: Background color (default: #0d1117)
- `textColor`: Text color (default: #e6edf3)

### 2. TextTitleVertical
Same as TextTitle but 9:16 aspect ratio for TikTok/Reels.

```bash
./render.sh TextTitleVertical --props '{"title":"Vertical Video"}'
```

### 3. StatsCounter
Animated counter for displaying metrics/stats.

```bash
./render.sh StatsCounter --props '{
  "title": "Monthly Stats",
  "stats": [
    {"label": "Users", "value": 1500, "suffix": "+"},
    {"label": "Revenue", "value": 25000, "prefix": "$"},
    {"label": "Growth", "value": 42, "suffix": "%"}
  ]
}'
```

Props:
- `title`: Header text
- `stats`: Array of { label, value, prefix?, suffix? }
- `accentColor`: Color for numbers (default: #1f6feb)

### 4. Announcement
Eye-catching announcement with emoji, headline, body, and CTA.

```bash
./render.sh Announcement --props '{
  "emoji": "🎉",
  "headline": "Big News!",
  "body": "We launched something amazing.",
  "cta": "Check it out →"
}'
```

Props:
- `emoji`: Large emoji at top
- `headline`: Main announcement text
- `body`: Supporting text
- `cta`: Call-to-action button text
- `accentColor`: CTA button color (default: #238636)

### 5. AnnouncementVertical
Same as Announcement but 9:16 for stories/reels.

### 6. Quote
Elegant quote display with large decorative quotation mark and author attribution.

```bash
./render.sh Quote --props '{
  "quote": "The best way to predict the future is to create it.",
  "author": "Peter Drucker"
}'
```

Props:
- `quote` (required): The quote text
- `author`: Attribution (prefixed with "—")
- `backgroundColor`: Background color (default: #0d1117)
- `textColor`: Quote text color (default: #e6edf3)
- `accentColor`: Quote mark and author color (default: #58a6ff)

### 7. QuoteVertical
Same as Quote but 9:16 for stories/reels.

## Quick Commands

```bash
# Preview in browser
npm run dev

# List all compositions
npx remotion compositions

# Render specific composition
npx remotion render TextTitle out/title.mp4

# Render with custom props
npx remotion render Announcement out/news.mp4 --props '{"headline":"New Feature!"}'

# Render vertical video
npx remotion render TextTitleVertical out/short.mp4
```

## Output Formats

Default is MP4 (H.264). Other options:
```bash
# WebM
npx remotion render TextTitle out/video.webm --codec=vp8

# GIF
npx remotion render TextTitle out/video.gif --codec=gif

# PNG sequence
npx remotion render TextTitle out/frames --image-format=png
```

## Custom Videos

Edit files in `src/compositions/` to create new templates or modify existing ones.

The compositions use:
- `useCurrentFrame()` - Current frame number
- `useVideoConfig()` - fps, duration, dimensions
- `interpolate()` - Animation timing
- `Sequence` - Time-based sections
