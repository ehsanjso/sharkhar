# Quota Optimization Plan
Date: 2026-02-01

## Problem
- Proactive Coder hit rate limits last night after 10 min runtime
- Jobs clustered in certain windows
- Not using cheaper models for light tasks

## Max 5x Plan Limits (CONFIRMED)
- **Session limits:** Reset every 5 hours
- **5-hour windows:** 00:00, 05:00, 10:00, 15:00, 20:00
- **Weekly limits:** Sonnet (Sat 5 AM), All models (Thu 11 PM)
- **Extra usage:** Available but expensive (API rates)

Source: https://support.claude.com/en/articles/12429409-extra-usage-for-paid-claude-plans

## Quota Windows (5-hour blocks)
```
00:00-05:00 | Window 1 | 3 AM Backup
05:00-10:00 | Window 2 | 8 AM Morning Brief, 9 AM Investor/NFT, 9:30 AM Market
10:00-15:00 | Window 3 | 2 PM Research Report
15:00-20:00 | Window 4 | 7 PM Proactive Coder Session 1
20:00-00:00 | Window 5 | 11 PM Proactive Coder Session 2
```

## Optimized Schedule (5-Hour Windows)

### Window 1 (00:00-05:00) - Light
- **03:00** - Backup (Sonnet → switch to Haiku) ✅

### Window 2 (05:00-10:00) - HEAVY ⚠️
- **08:00** - Morning Brief (Sonnet → switch to Haiku)
- **09:00** - Investor Digest (Sonnet, Mon-Fri only)
- **09:00** - NFT Monitor (Sonnet → switch to Haiku)
- **09:30** - Market Brief (Sonnet, Mon-Fri only)
- ⚠️ **RISK:** 3-4 jobs in one window on weekdays!

### Window 3 (10:00-15:00) - Medium
- **14:00** - Research Report (Sonnet)

### Window 4 (15:00-20:00) - Heavy
- **19:00** - Proactive Coder Session 1 (Sonnet, 45 min limit)

### Window 5 (20:00-01:00) - Heavy  
- **23:00** - Proactive Coder Session 2 (Sonnet, 45 min limit)

## Model Strategy
- **Haiku** (cheap): Backups, monitoring, simple checks
- **Sonnet** (medium): Main work, research, trading, coding
- **Opus** (expensive): Reserved for complex problems only

## Proactive Coder Changes
1. **Focus**: Tools & optimization (NOT Remotion)
2. **Split**: Two 45-min sessions instead of one 3-hour marathon
3. **Strategy**: Session 1 = planning + setup, Session 2 = execution
4. **Commit**: Push work at end of each session

## Issues with Current Schedule

**Window 2 is OVERLOADED:**
- On weekdays: Morning Brief + Investor + NFT + Market = 4 jobs in 2 hours
- Risk of burning through entire 5-hour quota
- Last night's failure was likely from window congestion

**Recommended Fixes:**
1. Move NFT Monitor to Window 3 (11:00 AM instead of 9:00 AM)
2. Switch Morning Brief to Haiku (lighter)
3. Switch NFT Monitor to Haiku (it's just a script runner)
4. Keep Investor + Market on Sonnet (they need intelligence)

**Better Distribution:**
```
Window 1 (00:00-05:00): 1 light job (Backup-Haiku)
Window 2 (05:00-10:00): 3 jobs (Brief-Haiku, Investor-Sonnet, Market-Sonnet)
Window 3 (10:00-15:00): 2 jobs (NFT-Haiku at 11, Research-Sonnet at 14)
Window 4 (15:00-20:00): 1 heavy job (Coder1-Sonnet)
Window 5 (20:00-01:00): 1 heavy job (Coder2-Sonnet)
```

## Implementation Status

✅ **Completed:**
- Proactive Coder split into two 45-min sessions (7 PM + 11 PM)
- Market Brief set to Mon-Fri only
- NFT Monitor moved to 11 AM (better window distribution)
- Schedule aligned with 5-hour quota windows
- Proactive Coder focus updated (tools & optimization, not Remotion)
- **MODEL OPTIMIZATION COMPLETE (2026-02-01):**
  * Morning Brief → Haiku ✅
  * Clawdbot Backup → Haiku ✅
  * Session Pruning → Haiku ✅
  * NFT Monitor → Haiku ✅
  * Claude Quota Monitor → Haiku ✅
  * Created switch-cron-model.js for safe model updates
  * Automatic backups and dry-run mode included

**Current Distribution (Optimized):**
```
Window 1 (00:00-05:00): Backup-Haiku ✅
Window 2 (05:00-10:00): Brief-Haiku, Investor-Sonnet, Market-Sonnet ✅
Window 3 (10:00-15:00): NFT-Haiku, Research-Sonnet ✅
Window 4 (15:00-20:00): Coder1-Sonnet ✅
Window 5 (20:00-01:00): Coder2-Sonnet ✅
```

**Expected Impact:**
- ~60% reduction in quota usage for light jobs
- Window 2 congestion reduced significantly
- More quota available for intelligence-requiring tasks
- Should eliminate rate limit failures on monitoring jobs

🔮 **Future Monitoring:**
- Watch first runs with new models (Feb 2+)
- Track quota usage patterns for 1 week
- Fine-tune if needed
