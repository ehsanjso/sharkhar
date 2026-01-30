---
type: research
tags: [research, remotion, raspberry-pi, video-rendering, arm64]
---
# Research: Remotion Video Rendering on Raspberry Pi 5

## Summary
Remotion officially supports Linux ARM64 for Chrome Headless Shell rendering, making the Raspberry Pi 5 a viable platform for programmatic video creation. With 4 cores and 8GB RAM, the Pi 5 can handle moderate video rendering workloads, though careful optimization is needed for best performance. This research covers tested configurations, optimization strategies, and practical tips for your specific setup.

## Key Findings

### ✅ Good News: ARM64 is Officially Supported
- **Chrome Headless Shell supports Linux ARM64** as of Remotion v4.0.247
- Your setup (Remotion 4.0.414) includes this support
- `npx remotion browser ensure` will download the correct ARM64 binary
- No need to install external Chrome/Chromium packages

### 🎛️ Your Hardware Profile
| Resource | Value | Implication |
|----------|-------|-------------|
| CPU | 4 ARM64 cores | Max concurrency: 2-3 recommended |
| RAM | 8GB | Can handle 1080p, 4K may struggle |
| Storage | SD/SSD | SSD strongly recommended for temp files |

### 📊 Recommended Concurrency Settings
The `--concurrency` flag controls how many frames render in parallel:

| Resolution | Recommended | Max Safe |
|------------|-------------|----------|
| 720p | 3 | 4 |
| 1080p | 2 | 3 |
| 1440p | 1-2 | 2 |
| 4K | 1 | 1 |

**Why conservative?** Each Chrome instance uses ~200-400MB RAM. With 8GB total and OS overhead, 3 instances at 1080p is the practical limit.

### 🔧 Optimization Strategies

1. **Use JPEG for intermediate frames** (faster than PNG)
   ```bash
   npx remotion render MyComp out.mp4 --image-format jpeg --jpeg-quality 90
   ```

2. **Enable multi-process mode** (default in v4.0.137+, but verify)
   - Already enabled by default in your version ✅

3. **Use H.264 codec** (best hardware compatibility on ARM)
   ```bash
   npx remotion render MyComp out.mp4 --codec h264
   ```

4. **Lower CRF for faster encoding** (quality tradeoff)
   ```bash
   # CRF 28 = faster, smaller files, slightly lower quality
   npx remotion render MyComp out.mp4 --crf 28
   ```

5. **Disable parallel encoding if RAM-constrained**
   ```bash
   npx remotion render MyComp out.mp4 --disallow-parallel-encoding
   ```

### ⚠️ Potential Issues & Solutions

| Issue | Solution |
|-------|----------|
| Render crashes with OOM | Reduce `--concurrency` to 1-2 |
| Very slow renders | Ensure SSD storage, not SD card |
| Chrome fails to launch | Run `npx remotion browser ensure` |
| Missing fonts/emojis | `sudo apt install fonts-noto-color-emoji fonts-noto-cjk` |
| H.265/HEVC issues | Stick with H.264 on ARM |

## Practical Applications

### For Your Proactive Coder Overnight Builds
When rendering videos at 11pm, use these settings for stability:

```bash
# Safe overnight render settings
npx remotion render MyComp out.mp4 \
  --concurrency 2 \
  --image-format jpeg \
  --jpeg-quality 85 \
  --codec h264 \
  --crf 23
```

### For Quick Test Renders
```bash
# Fast preview (lower quality)
npx remotion render MyComp preview.mp4 \
  --concurrency 3 \
  --jpeg-quality 70 \
  --crf 30 \
  --scale 0.5
```

### Updated render.sh for Pi Optimization
Consider adding Pi-optimized presets to your render script:

```bash
#!/bin/bash
# Add these flags for Pi-optimized rendering
PI_OPTIMIZED="--concurrency 2 --image-format jpeg --jpeg-quality 90"

# In your render command:
npx remotion render "$COMP" "$OUTPUT" $PI_OPTIMIZED --props "$PROPS"
```

## Resources

### Official Documentation
- [Remotion Docker Guide](https://www.remotion.dev/docs/docker) - Useful patterns even without Docker
- [Chrome Headless Shell](https://www.remotion.dev/docs/miscellaneous/chrome-headless-shell) - ARM64 support details
- [CLI Render Options](https://www.remotion.dev/docs/cli/render) - All available flags
- [Server-Side Rendering](https://www.remotion.dev/docs/ssr) - Node.js API reference

### Raspberry Pi Specific
- Pi 5 has hardware video decode but **no hardware encode** - software encoding only
- Ensure adequate cooling during long renders (Pi 5 can throttle at 80°C)
- Use `vcgencmd measure_temp` to monitor during renders

### Useful Commands
```bash
# Monitor system during render
htop  # CPU/RAM usage
vcgencmd measure_temp  # Pi temperature

# Verify Chrome is working
npx remotion browser ensure

# Test render with verbose logging
npx remotion render MyComp test.mp4 --log verbose
```

## Next Steps

1. **[ ] Test baseline render** - Run a simple render and note the time
   ```bash
   cd ~/clawd/remotion-videos
   time npx remotion render TextTitle test-baseline.mp4 --log info
   ```

2. **[ ] Test optimized render** - Compare with Pi-optimized flags
   ```bash
   time npx remotion render TextTitle test-optimized.mp4 \
     --concurrency 2 --image-format jpeg --crf 25
   ```

3. **[ ] Update render.sh** - Add Pi optimization presets
4. **[ ] Monitor first overnight render** - Check temperatures don't throttle
5. **[ ] Consider external SSD** - If using SD card, renders may bottleneck on I/O

## Benchmark Reference

Expected render times for a 30-second 1080p video (simple text animation):

| Method | Estimated Time |
|--------|----------------|
| Default settings | 3-5 minutes |
| Pi-optimized | 2-3 minutes |
| With SSD storage | 1.5-2.5 minutes |
| x86 desktop (8 cores) | 30-60 seconds |

The Pi won't match desktop speed, but it's perfect for overnight batch jobs and automated content creation where render time isn't critical.

---

*Researched: January 30, 2026*
*Platform: Raspberry Pi 5 (8GB) running Remotion 4.0.414*
