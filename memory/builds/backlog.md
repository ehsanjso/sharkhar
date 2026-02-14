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
- [ ] Remaining skills in ~/clawd/skills/ (lower priority): pi-admin, pm2, tldr, tmdb, plan-my-day, bambu-cli, gifgrep, playwright-cli, simple-backup

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

### 2. Create Artifacts Directory Convention
**Goal:** Standardize output location for generated files
**Action:**
- Create ~/clawd/artifacts/ directory
- Add README explaining the convention
- Update skills that generate files to use this location

---

### 3. Add Templates to Key Skills
**Goal:** Move recurring templates into skills (lazy-loaded)
**Skills to enhance:**
- [ ] task-tracker: weekly report template
- [ ] frontend-design: component checklist template
- [ ] conventional-commits: expanded examples

---

## 🟡 Medium Priority

### 4. Auto-Compaction Cron Job
**Goal:** Automatically summarize old daily memory files
**Spec:**
- Run weekly (Sunday night)
- Summarize memory/*.md files older than 7 days
- Append key learnings to MEMORY.md
- Archive or delete summarized files

---

### 5. Security Audit of Network Skills
**Goal:** Document which skills have network access
**Action:**
- List all skills with external API calls
- Add security notes to AGENTS.md
- Flag any that need confirmation before use

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

