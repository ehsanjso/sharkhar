# Claude Quota Check Task

Check Ehsan's Claude.ai quota and calculate pacing to reach 80% usage at each reset window.

## Steps:
1. Open claude.ai/settings/usage in the clawd browser profile
2. Extract current usage percentages and reset times
3. Calculate optimal pacing for each limit type
4. Report status with pacing advice

## Pacing Logic:
- **Session limit**: Target 80% before reset (~5h windows)
- **Weekly All Models**: Target 80% by Thursday 10:59 PM
- **Weekly Sonnet**: Target 80% by Saturday 4:59 PM

## Alert Conditions:
- Under-pacing: Usage significantly below target pace (leaving value on table)
- Over-pacing: On track to hit limit before reset (slow down)
- On-track: Within acceptable range

Report findings to Ehsan via Telegram.
