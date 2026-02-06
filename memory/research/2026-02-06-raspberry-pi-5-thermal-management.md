---
type: research
tags: [research, raspberry-pi, thermal, cooling, hardware]
---
# Research: Raspberry Pi 5 Thermal Management

## Summary

The Raspberry Pi 5 runs significantly hotter than its predecessors due to its 2.4GHz BCM2712 SoC, making cooling essential for sustained workloads. Yesterday's discovery of active thermal throttling at 84.2°C confirms this is a pressing issue for your Pi homelab. Proper cooling can drop temperatures by 30-40°C and eliminate throttling entirely.

## Background: Why This Matters Now

On Feb 5, `pi-health.sh` detected:
- **Temperature:** 84.2°C with active thermal throttling
- **Throttle flags:** `0xe0008` (soft temp limit + ARM freq capping + throttling occurred)
- **Impact:** Reduced performance across all services (ClawdBot, Uptime Kuma, Mission Control)

The Pi 5 throttles at:
- **80°C** — Soft throttle begins (frequency reduction)
- **85°C** — Hard throttle (significant frequency cuts)

## Key Findings

### Pi 5 Thermal Reality
- **Idle temp (no cooling):** 60-65°C
- **Under load (no cooling):** 80-85°C → throttling
- **Idle (with Active Cooler):** 35-45°C
- **Under load (with Active Cooler):** 50-60°C

### Cooling Solutions (Best to Good)

| Solution | Idle Temp | Load Temp | Cost | Notes |
|----------|-----------|-----------|------|-------|
| **ICE Tower (Pi 5)** | 28-35°C | 40-50°C | $15-20 | Best performance, tall profile |
| **Official Active Cooler** | 35-45°C | 50-60°C | $5 | Official, quiet, compact |
| **52Pi Ice Tower Low Profile** | 30-38°C | 45-55°C | $15 | Good balance of height/performance |
| **Argon One V3** | 38-45°C | 55-65°C | $30 | Full case, passive until hot |
| **Heatsink only (passive)** | 50-60°C | 70-80°C | $3-8 | Not enough for sustained load |
| **Aluminum case (passive)** | 45-55°C | 65-75°C | $15-25 | Marginal, still throttles under load |

### The Official Active Cooler (Recommended First Step)

**Why it's the smart first buy:**
1. **$5** — Cheapest effective solution
2. **PWM-controlled** — Fan speed adjusts to temperature (quiet when idle)
3. **Uses onboard fan header** — Proper thermal integration with firmware
4. **Low profile** — Only adds ~15mm height
5. **Designed by RPi Foundation** — Guaranteed compatibility

**Performance claims (from benchmarks):**
- Drops temp by 25-30°C under load
- Eliminates throttling completely at stock speeds
- Enables overclocking to 3.0GHz (with adequate cooling)

### Software Optimizations

**Check current thermal status:**
```bash
# Temperature
vcgencmd measure_temp

# Throttle status (decode flags)
vcgencmd get_throttled
# 0x0 = All good
# 0x50000 = Currently throttled (bits 0-3)
# 0xe0008 = Your current situation

# Clock speeds (reduced when throttling)
vcgencmd measure_clock arm
```

**Fan control (with Active Cooler):**
```bash
# /boot/firmware/config.txt
[all]
# Fan turns on at 50°C, off at 45°C (hysteresis)
dtparam=fan_temp0=45000
dtparam=fan_temp0_hyst=5000
dtparam=fan_temp0_speed=75  # 75% speed

# More aggressive (cooler but louder)
dtparam=fan_temp0=40000
dtparam=fan_temp0_speed=100
```

**Reduce CPU load:**
```bash
# Check what's running hot
htop

# Check for runaway processes
ps aux --sort=-%cpu | head -10

# Limit process CPU (if needed)
cpulimit -l 50 -p <PID>
```

### Environmental Factors

- **Orientation:** Vertical mounting improves convection by ~5°C
- **Airflow:** Enclosed cases need ventilation or a fan
- **Ambient temp:** Each +10°C ambient = ~+10°C Pi temp
- **Dust:** Clean heatsinks/fans periodically (every 3-6 months)

### Case Considerations

**Good thermal cases:**
- **Argon One V3 M.2** — Full aluminum, passive with optional fan
- **GeeekPi Acrylic (open)** — Maximum airflow, minimal protection
- **Flirc Pi 5** — All-aluminum passive, acts as giant heatsink
- **Official Pi 5 Case (with fan)** — Basic but adequate with Active Cooler

**Avoid for thermal:**
- Fully enclosed plastic cases without fans
- Any case that doesn't accommodate a heatsink/fan

### Overclocking (After Cooling)

With the Active Cooler or better, you can overclock:

```bash
# /boot/firmware/config.txt
[all]
arm_freq=2800  # 2.8GHz (conservative OC)
# or
arm_freq=3000  # 3.0GHz (aggressive, needs good cooling)

# GPU overclock (optional)
gpu_freq=1000  # up from 910MHz default
```

**Monitor after overclocking:**
- Watch temps during sustained workloads
- If throttling returns, back off frequency or improve cooling

## Practical Applications for Ehsan

### Immediate Action (Today)

1. **Check if Active Cooler is installed:**
   ```bash
   ls /sys/class/thermal/cooling_device*/type | xargs -I{} cat {}
   ```
   If no "rpifan" device, you may need hardware cooling.

2. **Quick temp check script** (add to heartbeat):
   ```bash
   temp=$(vcgencmd measure_temp | grep -oP '\d+\.\d+')
   if (( $(echo "$temp > 75" | bc -l) )); then
     echo "⚠️ High temp: ${temp}°C"
   fi
   ```

3. **If no cooler installed:** Order the Official Active Cooler ($5) immediately.

### Short-Term (This Week)

1. **Optimize case airflow:**
   - Remove case lid temporarily if possible
   - Position Pi for better air circulation (vertical or elevated)

2. **Reduce background load:**
   - Check if any processes are spinning unnecessarily
   - Consider moving heavy tasks (video processing) to cron during cooler times

3. **Add cooling to `pi-health.sh`:**
   - Include ambient temp monitoring
   - Add fan speed reporting (if Active Cooler)

### Long-Term

1. **Consider ICE Tower** if overclocking for Ollama/video work
2. **Add temperature alerts** to Uptime Kuma monitoring
3. **Automate heavy workloads** for cooler times (4-8 AM)

## Resources

### Where to Buy

| Product | Price | Where |
|---------|-------|-------|
| Official Active Cooler | $5 | PiShop.ca, Adafruit, Pi Hut |
| ICE Tower (Pi 5) | $15-20 | Amazon, AliExpress, 52Pi |
| Argon One V3 | $30 | Argon40.com, Amazon |
| Flirc Case | $20 | Flirc.tv, Amazon |

### Documentation

- RPi Thermal Docs: `vcgencmd` commands in Pi docs
- Pi 5 cooling design: Raspberry Pi blog (Oct 2023)
- Benchmark comparisons: Tom's Hardware, Jeff Geerling (YouTube)

### Commands Reference

```bash
# Temperature
vcgencmd measure_temp

# All voltage/clock info
for src in arm core h264 isp v3d uart pwm emmc pixel vec hdmi dpi; do
  echo "$src: $(vcgencmd measure_clock $src)"
done

# Throttle status
vcgencmd get_throttled

# Fan status (with Active Cooler)
cat /sys/class/thermal/cooling_device0/cur_state

# System thermal zones
cat /sys/class/thermal/thermal_zone0/temp  # Divide by 1000 for °C
```

## Next Steps

1. **Immediate:** Check if cooling hardware is installed
2. **This week:** Order Official Active Cooler if not present ($5)
3. **Optional upgrade:** ICE Tower if you plan to run Ollama or overclock
4. **Monitor:** Add thermal alerts to heartbeat or Uptime Kuma
5. **Document:** Add cooling setup to TOOLS.md after installation

---

*Research conducted Feb 6, 2026. Triggered by throttling detection (84.2°C, flags 0xe0008) on Feb 5.*
