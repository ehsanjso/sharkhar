---
type: research
tags: [research, prometheus, grafana, monitoring, raspberry-pi, homelab]
---
# Research: Prometheus + Grafana for Pi Monitoring

## Summary

Prometheus + Grafana is the gold standard for time-series monitoring and visualization. This stack would give Ehsan historical visibility into his Pi 5's health — crucial for catching throttling patterns, correlating temperature with workloads, and setting up proactive alerts. Unlike Uptime Kuma (which only does up/down checks), this provides *continuous metrics over time*.

## Why This Topic Now

- **Discovered 84°C throttling** via pi-health.sh, but only point-in-time
- No way to see *when* throttling happens, *how often*, or *what triggers it*
- Uptime Kuma checks if services are up — not *how well* they're running
- This completes the observability stack: Uptime Kuma (availability) + Prometheus/Grafana (performance)

## Key Findings

### Architecture
```
┌─────────────────┐     scrape      ┌──────────────┐     query      ┌─────────────┐
│  node_exporter  │ ───────────────▶│  Prometheus  │◀──────────────│   Grafana   │
│   (port 9100)   │    every 15s    │  (port 9090) │   PromQL      │ (port 3001) │
└─────────────────┘                 └──────────────┘               └─────────────┘
     │                                    │
     ▼                                    ▼
  Exposes metrics:                  Stores time-series
  - CPU, memory, disk               - 15-day retention
  - Temperature (hwmon)             - ~1GB storage typical
  - Network, filesystem             - Single static binary
```

### Memory & Resource Usage on Pi 5
| Component | RAM Usage | Disk |
|-----------|-----------|------|
| node_exporter | ~15MB | 10MB binary |
| Prometheus | ~100-200MB | ~1GB/2 weeks data |
| Grafana | ~50-100MB | ~300MB |
| **Total** | **~200-400MB** | **~1.5GB** |

✅ Pi 5 with 8GB has plenty of headroom

### What node_exporter Exposes
- **CPU:** Usage per core, frequency, throttling flags
- **Memory:** Used, available, cached, buffers
- **Disk:** I/O ops, read/write bytes, space used
- **Temperature:** Via `hwmon` collector (Pi thermal sensor!)
- **Network:** Bytes in/out per interface
- **Filesystem:** Space, inodes, mount points
- **Systemd:** Service states (optional)

### Pi 5 Temperature Metrics
The hwmon collector exposes:
```promql
# Current CPU temperature
node_hwmon_temp_celsius{chip="thermal_thermal_zone0"}

# Query: Temp over last hour
node_hwmon_temp_celsius{job="node"}[1h]
```

This means you can see temperature *trends* — not just current value!

### Throttling Correlation
```promql
# CPU frequency (shows when throttled)
node_cpu_frequency_hertz

# Combined query: temp vs frequency over time
# Reveals: "Every day at 2pm, temp spikes to 85°C and freq drops to 1.5GHz"
```

## Quick Setup Guide (~30 min)

### 1. Install node_exporter
```bash
# Download ARM64 binary (Pi 5)
cd /tmp
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-arm64.tar.gz
tar xvfz node_exporter-*.tar.gz
sudo mv node_exporter-*/node_exporter /usr/local/bin/

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service << 'EOF'
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/node_exporter
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter

# Verify: http://localhost:9100/metrics
```

### 2. Install Prometheus
```bash
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v2.48.0/prometheus-2.48.0.linux-arm64.tar.gz
tar xvfz prometheus-*.tar.gz
sudo mv prometheus-*/prometheus /usr/local/bin/
sudo mv prometheus-*/promtool /usr/local/bin/

# Create config
sudo mkdir -p /etc/prometheus
sudo tee /etc/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
EOF

# Create data directory
sudo mkdir -p /var/lib/prometheus

# Create systemd service
sudo tee /etc/systemd/system/prometheus.service << 'EOF'
[Unit]
Description=Prometheus
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now prometheus

# Verify: http://localhost:9090
```

### 3. Install Grafana
```bash
# Add Grafana APT repo
sudo mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list

sudo apt update
sudo apt install -y grafana

sudo systemctl enable --now grafana-server

# Access: http://localhost:3000 (admin/admin)
```

### 4. Connect Grafana to Prometheus
1. Open Grafana → Configuration → Data Sources
2. Add data source → Prometheus
3. URL: `http://localhost:9090`
4. Save & Test

### 5. Import "Node Exporter Full" Dashboard
1. Dashboards → Import
2. Enter ID: `1860`
3. Select Prometheus data source
4. Import

**Result:** Beautiful, comprehensive dashboard showing all system metrics!

## Practical Applications for Ehsan

1. **Thermal Pattern Discovery**
   - When does Pi throttle? (time of day, which workloads)
   - Does temperature correlate with specific cron jobs?
   - Verify if cooling solutions actually help

2. **Capacity Planning**
   - Memory trends over days/weeks
   - Disk usage growth rate
   - Network traffic patterns

3. **Alert on Issues Before They Happen**
   ```yaml
   # Alert when temp > 80°C for 5 minutes
   - alert: HighTemperature
     expr: node_hwmon_temp_celsius > 80
     for: 5m
     labels:
       severity: warning
     annotations:
       summary: "Pi running hot ({{ $value }}°C)"
   ```

4. **Correlate Events**
   - "Did memory spike when that cron job ran?"
   - "What was CPU doing when Mission Control got slow?"

5. **Dashboard for Mission Control**
   - Embed Grafana panels in Mission Control
   - Or link to Grafana dashboard from `/agent` page

## Integration with Existing Stack

| Current | With Prometheus/Grafana |
|---------|------------------------|
| pi-health.sh | Still useful for quick checks; Prometheus for trends |
| Uptime Kuma | Keep for availability; Prometheus for performance |
| Caddy (if setup) | Add `grafana.home` reverse proxy |
| Tailscale (if setup) | Access dashboards remotely |

## Alternative: Lighter Options

If full Prometheus feels heavy:
- **Netdata** — Zero-config monitoring agent, nice UI, ~100MB RAM
- **Beszel** — Lightweight agent-based monitoring for homelabs
- **Glances** — Quick CLI-based monitoring

But Prometheus + Grafana is the industry standard with massive ecosystem.

## Resources

- **Official docs:** https://prometheus.io/docs/introduction/overview/
- **node_exporter:** https://github.com/prometheus/node_exporter
- **Grafana on Pi:** https://grafana.com/tutorials/install-grafana-on-raspberry-pi/
- **Dashboard 1860:** https://grafana.com/grafana/dashboards/1860-node-exporter-full/
- **Pi tutorial:** https://pimylifeup.com/raspberry-pi-prometheus/
- **Alert examples:** https://awesome-prometheus-alerts.grep.to/

## Next Steps

1. **Quick win:** Install node_exporter first (~5 min) — immediately see metrics at `:9100/metrics`
2. **Add Prometheus** (~10 min) — now you're storing history
3. **Add Grafana** (~10 min) — beautiful dashboards
4. **Import Dashboard 1860** — instant comprehensive view
5. **Optional:** Add Caddy reverse proxy for `grafana.home`
6. **Optional:** Configure Alertmanager for Telegram notifications

## Why This Matters

You discovered the Pi was throttling at 84°C *by accident* — what else might be happening that you don't see? With Prometheus + Grafana, you'd have a timeline showing exactly when throttling started, what triggered it, and whether your eventual cooling solution actually fixed it.

This is the difference between "something seems slow" and "at 2pm daily, during the research cron, CPU hits 85°C and throttles to 1.5GHz for 3 minutes."

**Visibility → Understanding → Action**
