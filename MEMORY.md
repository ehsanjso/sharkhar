# 🧠 Long-term Memory

*Last updated: 2026-01-31*

## About Ehsan

- **Name:** Ehsan Jso
- **Telegram:** @EhsanJso
- **Timezone:** America/Toronto (EST)
- **Platform:** Raspberry Pi 5

## Our Projects

### Uptime Kuma (Service Monitoring)

Monitoring all services on the Raspberry Pi via Docker.

**Access:**
- URL: http://192.168.0.217:3001
- Username: admin
- Password: clawd2026!

**Running in Docker:**
- Container: `uptime-kuma`
- Auto-restart: enabled
- Data: persisted in Docker volume
- Stable version (no SQL bugs)

**Monitors (9 total, all UP):**
1. Pi-hole Web Interface (HTTP)
2. Pi-hole DNS Port (53)
3. ClawdBot Web (port 3000)
4. SSH Service (port 22)
5. Raspberry Pi 5 (ping)
6. Uptime Kuma (self-monitoring)
7. Router/Gateway (192.168.0.1)
8. Internet Connectivity (8.8.8.8)
9. External Web Access (google.com)

**Docker commands:**
```bash
sudo docker ps                    # Check status
sudo docker logs uptime-kuma      # View logs
sudo docker restart uptime-kuma   # Restart
sudo docker stop uptime-kuma      # Stop
sudo docker start uptime-kuma     # Start
```

**API management:**
```bash
# Using the kuma.py skill script
export UPTIME_KUMA_URL="http://localhost:3001"
export UPTIME_KUMA_USERNAME="admin"
export UPTIME_KUMA_PASSWORD="clawd2026!"
python /home/ehsanjso/clawd/skills/uptime-kuma/scripts/kuma.py list
```

---

### Mission Control (Second Brain)

My second brain app for viewing and organizing memories, journals, and documents.

**What it does:**
- Shows all documents from `memory/` folder
- Daily journal entries tracking our conversations
- Filter by type: Journal, Content, Newsletters, Other
- Markdown viewer with nice formatting
- Input bar for sending messages (UI ready)

**Access:**
- App: http://192.168.0.217:3000
- Tasks: http://192.168.0.217:3000/tasks

**How I use it:**
1. Create daily journal entries in `memory/YYYY-MM-DD.md`
2. Flesh out important concepts in separate docs
3. Review past conversations to maintain context
4. Track tasks and progress visually

---

## ClawdBot Setup (from Alex Finn's video)

### Use Cases to Implement

1. **Morning Brief (8am)** — Daily summary with:
   - Weather
   - Trending videos
   - Today's tasks
   - What I worked on overnight
   - Suggested priorities

2. **Proactive Coder (11pm)** — Nightly builds:
   - Build tools/features while Ehsan sleeps
   - Create PRs for review
   - Don't push live, just prepare for testing

3. **Daily Research Report (afternoon)** — Deep dives on:
   - Concepts Ehsan is interested in
   - Workflow improvements
   - Business ideas

4. **Last30Days Skill** — Trend research from X/Reddit
   - GitHub: github.com/mvanhorn/last30days-skill

---

## Preferences & Patterns

- Prefers dark mode UIs
- Interested in AI tooling and automation
- Uses Telegram for communication
- Values proactive help over waiting to be asked

### 🐛 Ralph Wiggum Approach (ALWAYS use for coding!)

Work in small, iterative loops. "I'm helping!" one tiny step at a time.

1. **Pick ONE small task** — Not a whole feature
2. **Smallest possible piece** — What's the tiniest next step?
3. **Verify it works** — Test before moving on
4. **Commit frequently** — Each commit = one small thing
5. **Loop** — Back to step 1

**Rules:**
- NO big rewrites in one go
- If stuck, make the step SMALLER
- "I'm helping!" > "I'll fix everything"
- Compound small wins into big progress

---

## Lessons Learned

- **Mission Control is MY tool** — Use it actively, not just build it
- **Memory = continuity** — Write everything down, mental notes don't survive sessions
- **Match the reference** — When building from a video, get actual screenshots
- **Task board = visibility** — Helps both of us track progress
