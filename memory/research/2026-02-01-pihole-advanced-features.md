---
type: research
tags: [research, pi-hole, networking, automation, dns]
---
# Research: Advanced Pi-hole Features & Automation

## Summary
Pi-hole goes far beyond basic ad-blocking. Its command-line interface, REST API, regex filtering, and automation capabilities turn it into a powerful network management tool. For a self-hosted, automation-focused setup like yours, Pi-hole can be orchestrated via scripts, integrated with Home Assistant, monitored by Uptime Kuma, and used for custom local DNS records.

## Key Findings

### 1. **Powerful CLI for Automation**
The `pihole` command provides complete control without the web interface:

```bash
# Query which list blocks a domain
pihole -q example.com

# Temporarily disable blocking (auto-re-enable after 5 minutes)
pihole disable 5m

# View live DNS queries in real-time
pihole tail

# Update block lists (gravity)
pihole -g

# Add/remove domains programmatically
pihole allow example.com
pihole deny ads.example.com

# Check Pi-hole status (for monitoring scripts)
pihole status
```

**Automation opportunities:**
- Create cron jobs to update gravity weekly with custom timing
- Script domain allowlisting/denylisting based on network events
- Build monitoring dashboards using `pihole status` output
- Integrate with Uptime Kuma for service health checks

### 2. **Regex Filtering: Block Thousands with One Rule**
Regular expressions allow you to block entire patterns rather than individual domains:

```bash
# Block all subdomains of a tracker
pihole --regex '^(.+\.)?doubleclick\.net$'

# Block TikTok across all domains
pihole --regex '((^)|(\.))tiktok\.'

# Block specific advertising patterns
pihole --regex '^ad[sxv]?[0-9]*\..*'
```

**Community regex lists:**
- **mmotti/pihole-regex** - Comprehensive regex collection that blocks thousands of domains
  - Auto-install: `curl -sSl https://raw.githubusercontent.com/mmotti/pihole-regex/master/install.py | sudo python3`
  - Keep updated via cron (runs every Monday at 2:30am):
    ```bash
    sudo crontab -u root -e
    # Add:
    30 2 * * 1 /usr/bin/curl -sSl https://raw.githubusercontent.com/mmotti/pihole-regex/master/install.py | /usr/bin/python3
    ```

**Debugging regex:**
```bash
# Enable regex debugging mode
pihole-FTL --config debug.regex true

# Watch logs to see matches
tail -f /var/log/pihole/FTL.log
```

### 3. **REST API for Integration**
Pi-hole v6 includes a modern REST API for programmatic access:

**API Endpoints:**
```bash
# Get summary stats
curl -ks "http://pi.hole/api/stats/summary" -H "Accept: application/json"

# Via command line
pihole api stats/summary
pihole api config/webserver/port
```

**Access API docs:**
- Browser: http://pi.hole/api/docs
- Interactive OpenAPI documentation

**Integration ideas:**
- Pull stats into Mission Control dashboard
- Create ClawdBot skill to query/control Pi-hole
- Build Grafana dashboards for historical trends
- Trigger alerts when ad blocking percentage drops

### 4. **Local DNS Records (Custom Domain Mapping)**
Pi-hole can serve as your local DNS server for custom domains:

**Use cases:**
- `mission-control.local` → 192.168.0.217:3001
- `uptime.local` → 192.168.0.217:3001
- `pi.local` → 192.168.0.217

**How to set:**
1. Via Web UI: Local DNS → DNS Records
2. Via CLI: Edit `/etc/pihole/custom.list` and run `pihole reloaddns`
3. Via API: Use the new Pi-hole v6 API endpoints

**Benefits:**
- No need to remember IP addresses
- Professional internal URLs for your services
- Easier mobile access to your self-hosted apps

### 5. **DHCP Server Mode (Advanced)**
Pi-hole can replace your router's DHCP server:

**Advantages:**
- Automatic Pi-hole DNS assignment to all devices
- Better device identification in Pi-hole logs
- Custom static IP assignments per device
- Faster deployment of network changes

**Setup:**
1. Disable DHCP on your router
2. Enable DHCP in Pi-hole Web UI (Settings → DHCP)
3. Configure IP range and lease time
4. Set static leases for important devices (Pi, servers)

**Your setup consideration:**
If you enable this, all devices automatically use Pi-hole for DNS without router configuration.

### 6. **Query Logging & Long-Term Statistics**
Pi-hole stores every DNS query for analysis:

```bash
# View real-time queries
pihole tail

# Flush logs (e.g., for privacy or performance)
pihole flush

# Query the log
pihole -q example.com --adlist  # Which list blocked it?
```

**Privacy tip:** If you want Pi-hole blocking without logging every query:
```bash
pihole logging off
```

### 7. **Automated Updates & Maintenance**
Keep Pi-hole current with automation:

```bash
# Update Pi-hole core, web interface, and FTL
pihole -up

# Update block lists
pihole -g

# Repair broken installation
pihole repair
```

**Cron automation ideas:**
- Weekly gravity updates (already runs automatically)
- Monthly Pi-hole core updates (with testing)
- Daily log flushes (if you want to limit log size)

### 8. **Network Monitoring Integration**
Since you have **Uptime Kuma** running:

**Monitors to add:**
1. Pi-hole DNS Service (port 53 TCP/UDP check)
2. Pi-hole API Health (`http://pi.hole/api/stats/summary`)
3. Blocking Percentage Threshold Alert (if blocking drops below 20%, something's wrong)

**ClawdBot integration:**
- Create a skill to query Pi-hole stats
- Add Pi-hole status to your Agent Dashboard
- Automate blocklist updates based on trending ads
- Alert via Telegram when Pi-hole goes down

### 9. **Advanced Blocklist Management**
Beyond default lists, you can add specialized blocklists:

**Popular community lists:**
- **The Big Blocklist Collection** - https://firebog.net/
- **StevenBlack's unified hosts** - Multi-category blocking
- **OISD** - Optimized, frequently updated
- **Hagezi's DNS Blocklists** - Gaming, streaming, IoT-safe lists

**Auto-update blocklists:**
Pi-hole's gravity runs weekly by default, but you can trigger manually:
```bash
pihole -g
```

**View blocklist sources:**
```bash
pihole -q example.com --adlist
```

### 10. **Debugging & Troubleshooting**
When something isn't working:

```bash
# Run full diagnostic
pihole debug
# Generates a debug log you can analyze

# Check FTL (DNS engine) logs
tail -f /var/log/pihole/FTL.log

# Check gravity database
sqlite3 /etc/pihole/gravity.db "SELECT * FROM adlist;"

# Test DNS resolution
dig @127.0.0.1 example.com

# Restart DNS service
pihole reloaddns
```

## Practical Applications

### For Your Setup (Raspberry Pi 5 + ClawdBot)

**1. Mission Control Integration**
- Add a "Network" page to Mission Control showing:
  - Top blocked domains today
  - Blocking percentage
  - Total queries
  - Client activity
- Pull data from `http://localhost/api/stats/summary`

**2. Automated Network Hygiene**
Create a cron job (or ClawdBot task) that:
- Checks if blocking percentage drops below threshold → alert
- Monitors query load → alert if Pi is overloaded
- Tracks top blocked advertisers → send weekly report

**3. Custom Local Domains**
Set up `.local` domains for all your services:
```
mission-control.local → 192.168.0.217:3001
uptime.local → 192.168.0.217:3001
pi.local → 192.168.0.217
router.local → 192.168.0.1
```

**4. Home Assistant Integration**
If you expand to Home Automation:
- Enable/disable Pi-hole blocking based on presence detection
- Block gaming/social media domains during "focus time"
- Whitelist specific domains when certain automations run

**5. ClawdBot Pi-hole Skill**
Create a skill that allows you to:
```
"Block facebook.com"
"Whitelist example.com"
"Show me top blocked domains"
"What's blocking example.com?"
"Disable Pi-hole for 10 minutes"
```

## Resources

### Official Documentation
- **Pi-hole Docs**: https://docs.pi-hole.net/
- **GitHub Repository**: https://github.com/pi-hole/pi-hole
- **API Documentation**: http://pi.hole/api/docs (when Pi-hole is running)
- **Command Reference**: https://docs.pi-hole.net/main/pihole-command/

### Community Resources
- **Pi-hole Discourse Forum**: https://discourse.pi-hole.net/
- **Regex Filters (mmotti)**: https://github.com/mmotti/pihole-regex
- **Blocklist Collection (Firebog)**: https://firebog.net/
- **Reddit Community**: https://reddit.com/r/pihole

### Integration Tools
- **Pi-hole API Python Client**: `pip install pihole-api`
- **Uptime Kuma Pi-hole Monitor**: Use HTTP(S) check on `/admin` or API endpoint
- **Grafana Dashboard**: Community dashboards available for Pi-hole metrics

### Advanced Guides
- **Local DNS Setup**: https://discourse.pi-hole.net/t/how-do-i-configure-my-devices-to-use-pi-hole-as-their-dns-server/245
- **DHCP Server Guide**: https://discourse.pi-hole.net/t/how-do-i-use-pi-holes-built-in-dhcp-server-and-why-would-i-want-to/3026
- **Regex Tutorial**: https://docs.pi-hole.net/regex/

## Next Steps

### Immediate Actions
1. **Add mmotti regex filters** for broader blocking coverage:
   ```bash
   curl -sSl https://raw.githubusercontent.com/mmotti/pihole-regex/master/install.py | sudo python3
   ```

2. **Set up local DNS records** for your services:
   - mission-control.local
   - uptime.local
   - pi.local

3. **Test the API** to prepare for Mission Control integration:
   ```bash
   curl -ks "http://localhost/api/stats/summary" | jq
   ```

### Medium-Term Goals
4. **Create Pi-hole monitoring dashboard** in Mission Control
   - Show real-time stats on the /agent page
   - Pull from API every 30 seconds

5. **Build a ClawdBot Pi-hole skill** for voice/chat control:
   - "Block this domain"
   - "Show me what's being blocked"
   - "Disable blocking for 5 minutes"

6. **Set up enhanced Uptime Kuma monitoring**:
   - DNS port 53 check
   - API health check
   - Blocking percentage threshold alert

### Long-Term Exploration
7. **Consider DHCP takeover** if you want full network automation
   - Automatic DNS assignment
   - Better device tracking
   - Simpler network management

8. **Integrate with Home Assistant** (if you expand IoT):
   - Presence-based blocking rules
   - Time-based content filtering
   - Automated whitelist management

9. **Advanced analytics**:
   - Export Pi-hole logs to time-series database
   - Build historical trend dashboards
   - Track blocking effectiveness over time

---

**Research completed:** Sunday, February 1st, 2026 at 2:01 PM
**Time invested:** Deep research session
**Confidence:** High — based on official docs and community best practices
