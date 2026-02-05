---
type: research
tags: [research, reverse-proxy, homelab, caddy, nginx-proxy-manager, self-hosted]
---
# Research: Reverse Proxy for Your Homelab

## Summary

A reverse proxy sits in front of all your self-hosted services and routes requests by hostname instead of port number. Instead of remembering `192.168.0.217:3000` (Mission Control), `192.168.0.217:3001` (Uptime Kuma), etc., you'd access `mission.local`, `uptime.local`, `pihole.local` — clean, memorable URLs. Combined with the Pi-hole local DNS you already have, this transforms your homelab from "a bunch of ports" into a proper infrastructure.

## Why This Topic

This is the natural next step after your Feb 1 Pi-hole research (which covered local DNS records) and connects to every service you run. You currently access 6+ services by IP:port — a reverse proxy unifies them all under one clean entry point.

## Your Current Services (Port Map)

| Service | Current Access | Proposed URL |
|---------|---------------|--------------|
| Pi-hole Admin | `192.168.0.217:80/admin` | `pihole.home` |
| Mission Control | `192.168.0.217:3000` | `mission.home` |
| Uptime Kuma | `192.168.0.217:3001` | `uptime.home` |
| ClawdBot Web | `192.168.0.217:3000` | `clawd.home` |
| SSH | `192.168.0.217:22` | (SSH stays on port 22) |

## Key Findings

### The Big Three Options

#### 1. Caddy (⭐ Recommended for You)

**What it is:** A modern, Go-based web server with automatic HTTPS and dead-simple config.

**Why it wins for your setup:**
- **Zero-config HTTPS** — Automatic TLS for local domains (self-signed) and public domains (Let's Encrypt)
- **Tiny footprint** — Single binary, ~40MB RAM, perfect for Pi 5
- **Caddyfile is beautiful** — Entire config for 5 services fits in ~20 lines
- **Native Raspbian packages** — `apt install caddy` on Pi
- **No Docker required** — Runs as systemd service (one less moving part)
- **Auto-reloads** — `caddy reload` applies changes without downtime

**Install on Raspberry Pi:**
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

**Example Caddyfile for your services:**
```caddyfile
# /etc/caddy/Caddyfile

# Mission Control
mission.home {
    reverse_proxy localhost:3000
    tls internal
}

# Uptime Kuma
uptime.home {
    reverse_proxy localhost:3001
    tls internal
}

# Pi-hole Admin
pihole.home {
    reverse_proxy localhost:80
    tls internal
}
```

The `tls internal` directive generates self-signed certs automatically — no Let's Encrypt needed for LAN-only services.

#### 2. Nginx Proxy Manager (NPM)

**What it is:** A Docker-based GUI for managing Nginx reverse proxy configs.

**Pros:**
- Beautiful web UI for managing proxy hosts
- Click-to-add SSL certificates
- Access lists and basic auth built-in
- 22k+ GitHub stars, very popular

**Cons for your setup:**
- Requires Docker Compose setup
- Heavier resource usage (~150MB RAM)
- Another Docker container to manage
- Port 80 conflict with Pi-hole

**Quick setup:**
```yaml
# docker-compose.yml
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80'    # Conflicts with Pi-hole!
      - '81:81'    # Admin UI
      - '443:443'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

**Verdict:** Great if you prefer GUIs, but the port 80 conflict with Pi-hole makes it messy.

#### 3. Traefik

**What it is:** Cloud-native reverse proxy with Docker auto-discovery.

**Pros:**
- Automatic service discovery via Docker labels
- Excellent dashboard
- Kubernetes-ready (overkill for homelab)
- Middleware system for auth, rate limiting, etc.

**Cons for your setup:**
- Steepest learning curve of the three
- Configuration is complex (YAML/TOML + labels)
- Overkill for 5-6 services
- Higher memory usage

**Verdict:** Better for larger setups with many Docker containers. Too complex for your current needs.

### Comparison Matrix

| Feature | Caddy | NPM | Traefik |
|---------|-------|-----|---------|
| Config complexity | ⭐ Simple | ⭐ GUI | 😤 Complex |
| RAM usage | ~40MB | ~150MB | ~100MB |
| Auto HTTPS | ✅ Built-in | ✅ Let's Encrypt | ✅ Let's Encrypt |
| Local TLS | ✅ `tls internal` | ❌ Manual | ⚠️ Possible |
| Docker required | ❌ No | ✅ Yes | ✅ Yes |
| Pi-hole friendly | ✅ Easy | ⚠️ Port conflict | ⚠️ Port conflict |
| Learning curve | Low | Very Low | High |
| Pi 5 fit | ⭐ Perfect | Good | Overkill |

### Pi-hole + Reverse Proxy Integration

This is the magic combo. You already have Pi-hole running — here's how it all connects:

1. **Pi-hole creates DNS records** — Point `*.home` to `192.168.0.217`
2. **Caddy routes by hostname** — Receives requests and proxies to the right port
3. **Result:** Type `mission.home` in browser → Pi-hole resolves to Pi → Caddy routes to port 3000

**Pi-hole DNS setup (via API or GUI):**
```
mission.home  → 192.168.0.217
uptime.home   → 192.168.0.217
pihole.home   → 192.168.0.217
clawd.home    → 192.168.0.217
```

All domains point to the same IP — Caddy differentiates by the `Host` header.

### Port 80 Conflict Resolution

Pi-hole currently uses port 80. Two solutions:

**Option A: Move Pi-hole to a different port**
```bash
# In Pi-hole v6 (your version), edit lighttpd config
sudo nano /etc/lighttpd/external.conf
# Add: server.port = 8080
sudo systemctl restart lighttpd
```
Then Caddy takes port 80/443, Pi-hole admin moves to `pihole.home` via Caddy.

**Option B: Caddy uses non-standard ports**
```caddyfile
{
    http_port 8080
    https_port 8443
}
```
Less ideal — you'd need to type ports in URLs.

**Recommendation:** Option A is cleaner. Pi-hole DNS still works on port 53 regardless.

## Practical Applications

### Immediate wins:
1. **Clean URLs** — `mission.home` instead of `192.168.0.217:3000`
2. **HTTPS everywhere** — Even local services get TLS (browsers stop showing warnings)
3. **Single entry point** — One port (443) instead of memorizing 5+ ports
4. **Basic auth** — Add password protection to any service with 2 lines of Caddyfile
5. **Access logging** — Centralized logs of who accessed what

### Future possibilities:
- **Remote access** — Add Cloudflare Tunnel or Tailscale Funnel for external access
- **Authelia/Authentik** — Single sign-on for all services
- **Rate limiting** — Protect services from abuse
- **WebSocket support** — Caddy handles this natively (good for Mission Control)
- **Load balancing** — If you ever add a second Pi

### Mission Control integration:
Could add a "Services" page to Mission Control that links to all `*.home` URLs — a proper homelab dashboard.

## Step-by-Step Setup Plan

### Phase 1: Install & Basic Config (15 min)
```bash
# 1. Install Caddy
sudo apt install caddy

# 2. Stop Caddy's default (it ships with a welcome page)
sudo systemctl stop caddy

# 3. Move Pi-hole off port 80
echo 'server.port = 8080' | sudo tee /etc/lighttpd/external.conf
sudo systemctl restart lighttpd

# 4. Verify Pi-hole moved
curl -s http://localhost:8080/admin/ | head -5
```

### Phase 2: Configure Caddyfile (10 min)
```bash
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
# Global options
{
    # Use internal CA for .home domains
    local_certs
}

# Mission Control
mission.home {
    reverse_proxy localhost:3000
    tls internal
}

# Uptime Kuma  
uptime.home {
    reverse_proxy localhost:3001
    tls internal
}

# Pi-hole Admin
pihole.home {
    reverse_proxy localhost:8080
    tls internal
}
```

### Phase 3: Pi-hole DNS Records (5 min)
Add local DNS entries in Pi-hole (GUI or API):
```
mission.home  → 192.168.0.217
uptime.home   → 192.168.0.217
pihole.home   → 192.168.0.217
```

### Phase 4: Start & Test (5 min)
```bash
# Validate config
sudo caddy validate --config /etc/caddy/Caddyfile

# Start Caddy
sudo systemctl enable --now caddy

# Test
curl -k https://mission.home
curl -k https://uptime.home
```

**Total time: ~35 minutes** for a clean, professional homelab setup.

## Resources

- **Caddy Docs:** https://caddyserver.com/docs
- **Caddy Install (Raspbian):** https://caddyserver.com/docs/install#debian-ubuntu-raspbian
- **Caddyfile Quick Start:** https://caddyserver.com/docs/quick-starts/reverse-proxy
- **Pi-hole Local DNS:** Settings → Local DNS → DNS Records
- **Nginx Proxy Manager:** https://nginxproxymanager.com (if you prefer GUI)
- **Traefik Docs:** https://doc.traefik.io/traefik/ (for reference)
- **Caddy + Pi-hole combo guide:** Search "caddy pihole reverse proxy homelab" for community tutorials

## Next Steps

1. **Quick win:** Install Caddy and set up reverse proxy for Mission Control and Uptime Kuma
2. **Pi-hole DNS:** Create `*.home` local DNS records pointing to Pi IP
3. **Trust the CA:** Import Caddy's root CA into your devices for no-warning HTTPS
4. **Add to Uptime Kuma:** Monitor the reverse proxy itself (HTTP check on `mission.home`)
5. **Mission Control dashboard:** Add a services page linking to all `*.home` URLs
6. **Consider Authelia:** Single sign-on if you want to expose services externally later
