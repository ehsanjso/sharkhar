## Claude Quota Monitor - Setup Instructions

This skill monitors your Claude Max 5x plan quota by scraping console.anthropic.com.

### Current Status: Phase 1 (Manual Browser Check)

The browser scraping automation is not yet fully implemented. For now, use this workflow:

### Quick Check (Manual)

1. The agent can use the browser tool to navigate to console.anthropic.com/settings/usage
2. Take a screenshot or extract the quota percentages
3. Manually update the quota data

### Future: Automated Scraping (Phase 2)

Will implement:
- Automated browser login to console.anthropic.com
- Periodic quota scraping (every 30-60 minutes)
- Alert system when quota > threshold
- Historical tracking and trend analysis
- Integration with cron jobs

### Implementation Plan

**Phase 1** ✅ (Current):
- Skill structure created
- check-quota.js script with mock data
- Manual browser checking workflow

**Phase 2** (Next):
- Browser automation via Clawdbot browser tool
- Actual DOM parsing of usage page
- Persistent login session management

**Phase 3** (Future):
- Cron job integration for automatic monitoring
- Telegram alerts when quota >80%
- Usage trend analysis and predictions

### Usage Right Now

#### Option A: Test with Mock Data
```bash
cd ~/clawd/skills/claude-quota-monitor
node check-quota.js
```

This will show the quota format with placeholder data based on your earlier screenshot (99% session usage, 5% Sonnet, 14% all models).

#### Option B: Manual Browser Check
1. Open https://console.anthropic.com/settings/usage in your browser
2. Check the usage percentages manually
3. The skill provides a structured format for tracking

#### Option C: Send Screenshot for Parsing
Send me a screenshot of the usage page and I'll extract the data and update the skill's quota file.

### Next Steps

Would you like me to:
1. Implement the browser scraping right now using the browser tool?
2. Set up a cron job to check quota hourly?
3. Create alerts when quota exceeds 80%?

All of the above require the browser tool which I have access to.
