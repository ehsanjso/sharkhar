# Changelog

All notable changes to the Clawd workspace are documented here.

## [2026-01-31] - Saturday Night Build

### Added
- **Remotion Pi Optimization:** 30% faster rendering, 25% smaller files
  - `--pi-optimize` flag in render.sh
  - `npm run render:pi` script
  - Documented in README and TEMPLATES
- **Documentation Overhaul:**
  - Workspace README with project overview
  - Mission Control README (replaced Next.js template)
  - Scripts directory README and index
  - Video scripts README (clip.sh, shorts.sh)
  - Remotion Pi optimization docs
- **Mission Control Updates:**
  - Added tonight's completed tasks to task board
  - Cleaned up TODO comments
- **Build Logs:**
  - Created builds/2026-01-31.md

### Performance
- Remotion baseline test: 13.7s → 9.6s (30% improvement)
- File sizes: 227KB → 171KB (25% reduction)

### Technical Details
- Optimized flags: `--concurrency 2 --image-format jpeg --jpeg-quality 90 --crf 25`
- Tested on Raspberry Pi 5 (ARM64) with Remotion 4.0.414

---

## [2026-01-30] - Friday Night Build

### Added
- **Mission Control App:**
  - Next.js dashboard for memory files
  - Task board with Kanban layout
  - shadcn/ui dark theme
  - Systemd service for persistent running
- **Remotion Video Project:**
  - TextTitle, StatsCounter, Announcement, Quote compositions
  - Vertical variants for TikTok/Reels
  - Production build with standalone server
- **Video Processing Scripts:**
  - clip.sh - Extract single clips
  - shorts.sh - Generate social media shorts
- **Automation:**
  - Morning Brief cron (8am)
  - Daily Research Report cron (2pm)
  - Proactive Coder cron (11pm)
- **Skills:**
  - Installed Last30Days skill
- **Research:**
  - Remotion on Raspberry Pi optimization guide

### Infrastructure
- Uptime Kuma monitoring (9 monitors)
- Docker 29.2.0 for stable services

---

**Format:** [YYYY-MM-DD] - Description
**Commit Convention:** feat/fix/docs/refactor/perf/test/chore
