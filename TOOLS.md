# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:
- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras
- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH
- home-server → 192.168.1.100, user: admin

### TTS
- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## Whisper (Voice Transcription)
- **Model:** tiny (larger models OOM on Pi 5)
- **Command:** `whisper <file> --model tiny --output_format txt --output_dir /tmp`
- **Note:** CPU-only (FP32), takes ~30-60s for short clips

---

## Pi-hole
- **URL:** http://localhost/admin or http://192.168.0.217/admin
- **API URL:** http://localhost/api
- **Password:** clawd2026!
- **Version:** v6.3

---

Add whatever helps you do your job. This is your cheat sheet.
