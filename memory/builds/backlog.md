# Proactive Coder Backlog

Priority queue of tasks for automated sessions. Pick from top.

---

## 🔴 High Priority

### 1. Skill Description Audit (OpenAI Best Practices)
**Source:** https://developers.openai.com/blog/skills-shell-tips
**Goal:** Improve skill routing by adding "When to use / When NOT to use" blocks

**Skills to audit:**
- [x] tavily vs exa-plus (both are "search" - need differentiation) ✅
- [x] github vs linear (both are "project management") ✅
- [x] yahoo-finance vs financial-market-analysis ✅
- [x] task-tracker vs todoist ✅
- [x] arxiv-watcher (vs exa-plus research paper) ✅
- [x] pollinations (image generation) ✅
- [x] youtube-summarizer ✅
- [x] google-calendar ✅
- [x] homeassistant ✅ (Feb 13)
- [x] jq ✅ (Feb 13)
- [x] process-watch ✅ (Feb 13)
- [x] pi-admin, pm2, tmdb, plan-my-day, bambu-cli, simple-backup ✅ (already had sections)
- [x] cloudflare-deploy ✅ (Feb 15)
- [x] playwright-cli ✅ (Feb 15)
- [x] tldr ✅ (Feb 15)
- [x] gifgrep ✅ (already had sections)
- **SKILL AUDIT COMPLETE** 🎉

**Template to add to each SKILL.md:**
```markdown
## When to Use
- [specific trigger scenarios]

## When NOT to Use
- [negative examples - what should trigger a DIFFERENT skill]
- [edge cases that look similar but aren't]
```

**Why:** OpenAI found that adding negative examples improved skill triggering accuracy by ~20%

---

### 2. ~~Create Artifacts Directory Convention~~ ✅ (Feb 15)
**COMPLETED** - Session 1, Feb 15, 2026
- Created ~/clawd/artifacts/ with README
- Added .gitignore rules
- Created prune-artifacts.sh cleanup script
- Moved stray zip files to artifacts/

---

### 3. Add Templates to Key Skills
**Goal:** Move recurring templates into skills (lazy-loaded)
**Skills to enhance:**
- [ ] task-tracker: weekly report template
- [ ] frontend-design: component checklist template
- [ ] conventional-commits: expanded examples

---

## 🟡 Medium Priority

### 4. Auto-Compaction Cron Job — IN PROGRESS
**Goal:** Automatically summarize old daily memory files
**Status:** Scaffolding complete (Feb 16 Session 1)
**Next:** Session 2 - Implement Haiku summarization

**Spec:**
- Run weekly (Sunday night)
- Summarize memory/*.md files older than 7 days
- Append key learnings to MEMORY.md
- Archive or delete summarized files

**Session 1 done:**
- [x] Created `scripts/memory-compact.sh` with structure
- [x] Created `memory/archive/` directory
- [x] Dry-run works (10 files would be processed)

**Session 2 TODO:**
- [ ] Implement Haiku summarization via clawdbot
- [ ] Append summaries to MEMORY.md
- [ ] Add cron job
- [ ] Test on real files

---

### 5. Security Audit of Network Skills
**Goal:** Document which skills have network access
**Action:**
- List all skills with external API calls
- Add security notes to AGENTS.md
- Flag any that need confirmation before use

### 6. Cron Job Cost Optimization — NEW
**Source:** cron-audit.sh findings (Feb 17)
**Goal:** Switch appropriate cron jobs from default→Haiku for cost savings

**Jobs to review:**
- [ ] Pill Reminder → Haiku (simple notification)
- [ ] Spare Capacity Work → Review complexity
- [ ] Polymarket Reports (3 jobs) → Review if Haiku sufficient
- [ ] Daily Market Brief → Review complexity

**Script created:** `./scripts/cron-audit.sh --suggest`

---

## 🟢 Low Priority / Ideas

### 6. Skill Usage Analytics
- Track which skills get invoked most
- Identify underused skills
- Consider consolidation

### 7. Skill Test Suite
- Add test cases to skills
- Validate routing logic
- Catch regressions

---

## Completed
<!-- Move items here when done -->

