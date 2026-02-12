---
name: exa-plus
version: 1.0.0
description: Neural web search via Exa AI. Search people, companies, news, research, code. Supports deep search, domain filters, date ranges.
metadata: {"clawdbot":{"emoji":"🧠","requires":{"bins":["curl","jq"]}}}
---

# Exa - Neural Web Search

Powerful AI-powered search with LinkedIn, news, research papers, and more.

## When to Use
- **Finding people** (LinkedIn profiles, bios, contact info) → `CATEGORY=people`
- **Finding companies/startups** → `CATEGORY=company`
- **Research papers** (not ArXiv-specific) → `CATEGORY=research paper`
- **GitHub repos/code** → `CATEGORY=github`
- **Tweets/social media** → `CATEGORY=tweet`
- **Financial reports** → `CATEGORY=financial report`
- **PDF documents** → `CATEGORY=pdf`
- **Semantic/neural search** (finds conceptually similar results, not just keyword matches)
- **Date-range filtered searches** (e.g., "news from last month")

## When NOT to Use
- **General fact-finding with AI summary** → Use `tavily` (has AI answer generation)
- **Quick factual questions** ("What is X?") → Use `tavily`
- **ArXiv papers specifically** → Use `arxiv-watcher` skill
- **Stock prices, fundamentals, options** → Use `yahoo-finance` skill
- **Current weather** → Use `weather` skill
- **Movie/TV info** → Use `tmdb` skill

## Setup

Create `~/.clawdbot/credentials/exa/config.json`:
```json
{"apiKey": "your-exa-api-key"}
```

## Commands

### General Search
```bash
bash scripts/search.sh "query" [options]
```

Options (as env vars):
- `NUM=10` - Number of results (max 100)
- `TYPE=auto` - Search type: auto, neural, fast, deep
- `CATEGORY=` - Category: news, company, people, research paper, github, tweet, pdf, financial report
- `DOMAINS=` - Include domains (comma-separated)
- `EXCLUDE=` - Exclude domains (comma-separated)
- `SINCE=` - Published after (ISO date)
- `UNTIL=` - Published before (ISO date)
- `LOCATION=NL` - User location (country code)

### Examples

```bash
# Basic search
bash scripts/search.sh "AI agents 2024"

# LinkedIn people search
CATEGORY=people bash scripts/search.sh "software engineer Amsterdam"

# Company search
CATEGORY=company bash scripts/search.sh "fintech startup Netherlands"

# News from specific domain
CATEGORY=news DOMAINS="reuters.com,bbc.com" bash scripts/search.sh "Netherlands"

# Research papers
CATEGORY="research paper" bash scripts/search.sh "transformer architecture"

# Deep search (comprehensive)
TYPE=deep bash scripts/search.sh "climate change solutions"

# Date-filtered news
CATEGORY=news SINCE="2026-01-01" bash scripts/search.sh "tech layoffs"
```

### Get Content
Extract full text from URLs:
```bash
bash scripts/content.sh "url1" "url2"
```
