---
type: research
tags: [research, tailscale, homelab, remote-access, vpn, networking]
---
# Research: Tailscale for Secure Remote Homelab Access

## Summary

Tailscale is a zero-config mesh VPN built on WireGuard that enables secure remote access to your homelab from anywhere. It solves the problem of accessing Pi services (Mission Control, Uptime Kuma, Pi-hole) remotely without exposing ports to the internet. With Tailscale, your Pi gets a stable 100.x.y.z IP accessible from any device on your tailnet.

## Why This Topic

- **Natural progression** from homelab research (Caddy, Pi-hole, Ollama)
- **Remote access gap** — Currently can only access Pi services from home network
- **Security-first** — No open ports, WireGuard encryption, no dynamic DNS hassles
- **Integrates perfectly** with existing stack:
  - Pi-hole → Tailscale respects Pi-hole as DNS
  - Caddy → Can use Tailscale for HTTPS certs instead of `tls internal`
  - Mission Control → Accessible from phone while traveling

## Key Findings

### Core Benefits
- **Zero-config NAT traversal** — Works through firewalls, CG-NAT, hotel WiFi
- **WireGuard-based** — Modern, fast, audited crypto protocol
- **Peer-to-peer when possible** — Direct connections minimize latency
- **MagicDNS** — Access devices by name: `raspberrypi.tailnet.ts.net`
- **Stable IPs** — Each device gets a consistent 100.x.y.z address

### Pricing (Personal Plan)
- **Free tier:** 3 users, 100 devices, all core features
- **Includes:** Exit nodes, subnet routers, MagicDNS, Tailscale Serve
- **No limits on** data transfer or bandwidth
- **Perfect for:** Single-person homelabs

### Installation on Pi 5 (Debian Bookworm)
```bash
# Add Tailscale repository
curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.noarmor.gpg | \
  sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.tailscale-keyring.list | \
  sudo tee /etc/apt/sources.list.d/tailscale.list

# Install and connect
sudo apt-get update
sudo apt-get install tailscale
sudo tailscale up

# Get your Tailscale IP
tailscale ip -4
```

### Key Features for Homelab

#### 1. Tailscale Serve (Private Access)
Expose Pi services to your tailnet with auto-HTTPS:
```bash
# Mission Control on https://raspberrypi.tailnet.ts.net
tailscale serve --https=443 localhost:3000

# Uptime Kuma on a different path
tailscale serve --https=443 --set-path=/uptime localhost:3001

# Check status
tailscale serve status
```

#### 2. Subnet Router (Access Entire LAN)
Make your Pi a gateway to your home network:
```bash
# Advertise your home subnet
tailscale up --advertise-routes=192.168.0.0/24

# Enable IP forwarding
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Then approve in admin console
```
Now any Tailscale device can reach 192.168.0.x devices!

#### 3. Exit Node (Route All Traffic)
Use Pi as a VPN server when traveling:
```bash
tailscale up --advertise-exit-node
# Approve in admin console, then connect from phone/laptop
```

#### 4. Disable Key Expiry
For servers, prevent periodic reauthentication:
- Go to [admin console](https://login.tailscale.com/admin/machines)
- Click ⋮ on your Pi → Disable key expiry

### Pi-hole Integration
Tailscale + Pi-hole = DNS filtering everywhere:
```bash
# Tell Tailscale to use Pi-hole for DNS
tailscale up --accept-dns=false

# In Tailscale admin → DNS → Add nameserver
# Use your Pi's Tailscale IP (100.x.y.z)
```

### vs. Alternatives

| Feature | Tailscale | ZeroTier | WireGuard (manual) |
|---------|-----------|----------|-------------------|
| Setup complexity | Trivial | Easy | Complex |
| NAT traversal | Excellent | Good | DIY |
| Admin UI | Great | Good | None |
| MagicDNS | Yes | No | No |
| Free tier devices | 100 | 25 | Unlimited |
| Open source | Client only | Fully | Fully |

**Winner for homelab:** Tailscale — the convenience is worth the tradeoff of server being proprietary.

### Security Considerations
- **Tailscale servers see metadata** (who connects when) but NOT traffic content
- **WireGuard encryption is end-to-end** — Tailscale can't read your data
- **Coordination server** handles key exchange — single point of trust
- **Headscale** exists as self-hosted control server alternative (more complex)

## Practical Applications for Ehsan

1. **Access Mission Control from anywhere**
   - Check memories, tasks, agent dashboard while traveling
   - No need to expose port 3000 to internet

2. **Monitor Uptime Kuma remotely**
   - Get alerts and check service status on phone
   - Responds to outages faster

3. **Pi-hole DNS everywhere**
   - Ad-blocking on phone even on cellular
   - Same filtering rules at home and away

4. **SSH from anywhere**
   - No need for port forwarding or dynamic DNS
   - Just `ssh raspberrypi` from any device on tailnet

5. **Secure access to ClawdBot**
   - Remote into your agent setup
   - Debug/configure while traveling

## Resources

- **Main docs:** https://tailscale.com/docs
- **Pi install:** https://tailscale.com/download/linux/debian-bookworm
- **Subnet routers:** https://tailscale.com/docs/features/subnet-routers
- **Tailscale Serve:** https://tailscale.com/docs/reference/tailscale-cli/serve
- **Exit nodes:** https://tailscale.com/docs/features/exit-nodes
- **Headscale (self-hosted):** https://github.com/juanfont/headscale

## Next Steps

1. **Install Tailscale on Pi 5** (~5 min)
   ```bash
   curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.noarmor.gpg | \
     sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
   curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.tailscale-keyring.list | \
     sudo tee /etc/apt/sources.list.d/tailscale.list
   sudo apt update && sudo apt install tailscale
   sudo tailscale up
   ```

2. **Install on phone** — iOS/Android app available

3. **Set up Tailscale Serve for Mission Control**
   ```bash
   tailscale serve --https=443 localhost:3000
   ```

4. **Configure as subnet router** (optional, for whole-LAN access)

5. **Disable key expiry** on Pi in admin console

6. **Consider Pi-hole integration** for DNS filtering everywhere

## Synergy with Existing Stack

- **Caddy:** Could replace `tls internal` with Tailscale's auto-certs, or use both (Caddy for local, Tailscale for remote)
- **Pi-hole:** Becomes your DNS server everywhere via Tailscale
- **Mission Control:** Accessible at `raspberrypi.tailnet.ts.net:3000`
- **Uptime Kuma:** Monitor from anywhere
- **SSH:** Just `ssh raspberrypi` from any device

**Total setup time:** ~15 minutes to have full remote access to homelab
