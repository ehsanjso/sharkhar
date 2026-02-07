---
type: research
tags: [research, social-media, trends, last30days, reddit, x-twitter, sentiment]
---
# Research: Social Media Trend Monitoring & Last30Days Skill

## Summary

Social media trend monitoring lets you tap into what communities are actually discussing, upvoting, and sharing right now. The **Last30Days skill** is a Claude Code/ClawdBot skill that automates this research across Reddit, X (Twitter), and the web, synthesizing findings into actionable prompts or recommendations. This connects directly to Ehsan's investor tracking work and the "Daily Research Report" automation.

## Key Findings

### The Last30Days Skill

- **GitHub**: [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill)
- **What it does**: Researches any topic across Reddit + X + web from the last 30 days
- **Output**: Synthesized insights with engagement metrics (upvotes, likes) OR copy-paste-ready prompts

**Installation for ClawdBot:**
```bash
# Clone to skills folder
git clone https://github.com/mvanhorn/last30days-skill.git ~/clawd/skills/last30days

# Create config with API keys
mkdir -p ~/.config/last30days
cat > ~/.config/last30days/.env << 'EOF'
# For Reddit research (uses OpenAI's web_search tool)
OPENAI_API_KEY=sk-...

# For X/Twitter research (uses xAI's x_search tool)
XAI_API_KEY=xai-...
EOF
chmod 600 ~/.config/last30days/.env
```

**API Keys Required:**
| Key | Purpose | Get it from |
|-----|---------|-------------|
| `OPENAI_API_KEY` | Reddit search via OpenAI's web_search | platform.openai.com |
| `XAI_API_KEY` | X/Twitter search via xAI's x_search | x.ai/api |

**Note**: Skill works without keys (web-only mode), but engagement metrics require both APIs.

### Query Types Supported

1. **RECOMMENDATIONS** — "best X", "top X" → Returns specific product/tool lists with mention counts
2. **PROMPTING** — "X prompts for Y" → Learns techniques, generates copy-paste prompts
3. **NEWS** — "what's happening with X" → Current events and updates
4. **GENERAL** — anything else → Broad community understanding

### How It Weights Sources

The skill uses a "Judge Agent" pattern:
- **Reddit/X sources** → Weighted HIGHER (have engagement signals: upvotes, likes, reposts)
- **Web sources** → Weighted LOWER (no engagement data)
- **Cross-source patterns** → Strongest signals when same insight appears in all three

### Alternative Approaches

**If you don't want to use OpenAI/xAI APIs:**

| Tool | Reddit | X/Twitter | Notes |
|------|--------|-----------|-------|
| **PRAW** | ✅ Free | ❌ | Python Reddit API Wrapper, needs Reddit app credentials |
| **Pushshift** | ✅ Historical | ❌ | Reddit archive, can be rate-limited |
| **Nitter** | ❌ | ⚠️ Spotty | Twitter frontend scraping, unstable |
| **RSS feeds** | ⚠️ Limited | ⚠️ Limited | Works for specific subreddits/accounts |
| **Tavily/Exa** | ✅ Web | ✅ Web | AI-optimized search, includes Reddit/X in web results |

**For Pi 5 self-hosting:**
- PRAW is lightweight and works great
- Consider caching results to reduce API calls
- Can run sentiment analysis locally with Ollama + small model

### Reddit API Reality (2024+)

Reddit's API changes in 2023 affected many tools:
- **Free tier**: 100 queries/minute (enough for personal use)
- **Requires OAuth**: Create app at reddit.com/prefs/apps
- **PRAW still works**: `pip install praw`

**Quick PRAW setup:**
```python
import praw

reddit = praw.Reddit(
    client_id="YOUR_CLIENT_ID",
    client_secret="YOUR_CLIENT_SECRET",
    user_agent="ClawdBot/1.0"
)

# Search last 30 days in a subreddit
for post in reddit.subreddit("LocalLLaMA").search("ClawdBot", time_filter="month"):
    print(f"{post.score}⬆️ {post.title}")
```

### X/Twitter API Reality

Twitter/X API access has become expensive, but alternatives exist:
- **xAI API** ($5 free credits): Includes `x_search` tool that searches X
- **Basic tier**: $100/month for 10k posts/month
- **Nitter instances**: Free but unreliable, many shut down

**Recommendation**: Use xAI API for X access (affordable, reliable)

## Practical Applications

### 1. Investor Sentiment Tracking
Connect this to the existing `investor-tracker` project:
- Monitor r/wallstreetbets, r/stocks, r/options for ticker mentions
- Track X for #earnings, $TICKER discussions
- Feed into polymarket-bot for market sentiment signals

### 2. AI/Tech Trend Monitoring
For staying current on tools and techniques:
- `/last30days best Claude Code skills`
- `/last30days AI agents 2026`
- `/last30days MCP servers ecosystem`

### 3. Product Research
Before building features or choosing tools:
- `/last30days Home Assistant voice control 2026`
- `/last30days self-hosted alternatives to X`

### 4. Proactive Research Cron
Integrate with Daily Research Report:
```
# Example: Daily trend check for specific topics
/last30days AI infrastructure trends
/last30days Raspberry Pi projects 2026
```

## Resources

### Last30Days Skill
- **Repo**: https://github.com/mvanhorn/last30days-skill
- **ClawdHub**: Search for "last30days" (may be published there)

### API Documentation
- **Reddit (PRAW)**: https://praw.readthedocs.io
- **xAI Grok API**: https://docs.x.ai
- **OpenAI API**: https://platform.openai.com/docs

### Alternative Search Tools
- **Tavily**: https://tavily.com (AI-optimized, $0.01/search)
- **Exa AI**: https://exa.ai (neural search, domain filtering)
- **Perplexity API**: https://perplexity.ai/api (answer + sources)

### Python Libraries
```bash
pip install praw          # Reddit API
pip install openai        # For web_search tool
pip install tavily-python # Tavily search
```

## Next Steps

1. **Install Last30Days skill**
   ```bash
   git clone https://github.com/mvanhorn/last30days-skill.git ~/clawd/skills/last30days
   ```

2. **Get API keys** (in priority order):
   - [ ] xAI API key (free $5 credits) — for X search
   - [ ] OpenAI API key (if not already set) — for Reddit search
   - [ ] Or use Tavily/Exa as alternatives

3. **Create ClawdBot integration**
   - Add skill to ClawdBot skills folder
   - Test with: `/last30days AI tools for Raspberry Pi`

4. **Connect to investor tracking**
   - Explore adding social sentiment signals to polymarket-bot
   - Monitor specific tickers/markets in daily research

5. **Configure search APIs** (current gaps)
   - Brave Search, Tavily, or Exa not configured
   - Consider adding one for general web research capability

---

*Research conducted: February 7, 2026*
*Time spent: ~15 minutes*
*Sources: GitHub, xAI docs, Reddit API docs, PRAW docs*
