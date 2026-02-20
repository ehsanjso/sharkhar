# Quantitative Trading Skill Graph - Summary

This skill graph extracts the essential actionable knowledge from **"Quantitative Trading: How to Build Your Own Algorithmic Trading Business"** by Ernie Chan into an interconnected network of 29 skill files.

## Structure

The graph follows a flat-file structure where **wikilinks are the structure**. No subdirectories — navigation happens through meaningful links woven into prose.

### Entry Point
- **`index.md`** — Start here for the big picture and navigation to main topic clusters

### Maps of Content (MOCs)
Four major topic clusters organize the knowledge:

1. **`strategy-research.md`** — Finding and evaluating trading ideas (9 linked skills)
2. **`backtesting.md`** — Testing strategies without self-deception (11 linked skills)
3. **`execution-systems.md`** — Building automated trading infrastructure (8 linked skills)
4. **`risk-management.md`** — Optimal leverage and capital protection (11 linked skills)

### Core Frameworks (Mathematical/Foundational)
- **`kelly-formula.md`** — Optimal position sizing for single strategies
- **`optimal-leverage.md`** — Multi-strategy capital allocation
- **`sharpe-ratio.md`** — Universal risk-adjusted return metric
- **`maximum-drawdown.md`** — Pain tolerance and leverage constraint
- **`cointegration.md`** — Mathematical foundation for pair trading
- **`stationarity.md`** — What makes series mean-reverting

### Strategy Types
- **`mean-reversion.md`** — Betting on prices returning to equilibrium
- **`momentum-strategies.md`** — Betting on trend continuation
- **`pair-trading.md`** — Classic market-neutral arbitrage
- **`high-frequency-trading.md`** — Sub-second to intraday strategies
- **`seasonal-trading.md`** — Calendar-driven commodity trades
- **`regime-switching.md`** — Detecting and adapting to market shifts
- **`factor-models.md`** — Fundamental-driven strategies

### Critical Biases (Backtest Pitfalls)
- **`look-ahead-bias.md`** — Using tomorrow's data for today's decisions
- **`data-snooping-bias.md`** — Overfitting parameters to noise
- **`survivorship-bias.md`** — Missing bankrupt stocks in databases

### Execution & Costs
- **`transaction-costs.md`** — Five components that kill strategies
- **`exit-strategies.md`** — When to close positions
- **`capacity.md`** — Maximum capital a strategy supports

### Validation Methods
- **`out-of-sample-testing.md`** — Validating on unseen data
- **`paper-trading.md`** — Real-time testing without risk

### Infrastructure & Data
- **`brokerage-selection.md`** — Choosing execution platform
- **`historical-data-sourcing.md`** — Where to get price data
- **`split-dividend-adjustment.md`** — Handling corporate actions

## Key Insights Extracted

### 1. Capacity is Your Competitive Advantage
While billion-dollar funds chase scalable strategies with 0.8 Sharpe, independent traders can exploit low-capacity opportunities with 2.0+ Sharpe. The math (Kelly formula) proves higher Sharpe beats higher capital for wealth building.

### 2. Transaction Costs Matter More Than Models
Book Example 3.7: Strategy with 4.43 Sharpe before costs delivered 0.78 after adding realistic execution costs. Always model costs conservatively or backtest fiction.

### 3. Three Deadly Biases
- **Look-ahead bias:** Paper trading exposes instantly (trades won't match backtest)
- **Data-snooping bias:** 252 days data per parameter minimum; validate out-of-sample
- **Survivorship bias:** Devastates mean-reversion backtests on broad universes

### 4. Mean Reversion vs. Momentum
Two fundamental strategy types:
- **Mean reversion:** More common, higher Sharpe, but vulnerable to survivorship bias and regime shifts
- **Momentum:** Competition shortens optimal holding period (5 days → 5 hours), but doesn't eliminate edge

### 5. Risk Management is Position Sizing
Kelly formula + continuous rebalancing = maximize long-term growth. But constrain by:
- Half-Kelly (fat tails)
- Historical worst-case loss (Black Monday: 20.47% drop → max 1.0x leverage)
- Psychological tolerance (can you endure the drawdown?)

### 6. Validation Hierarchy
1. In-sample backtest (weakest)
2. Out-of-sample backtest (stronger)
3. Paper trading (strongest pre-deployment)
4. Live trading with small capital (truth)

Never skip paper trading — it catches bugs and look-ahead bias no backtest can reveal.

## Graph Statistics

- **Total files:** 29 (1 index + 4 MOCs + 24 concept files)
- **Wikilinks:** ~250+ interconnections
- **Source chapters:** Covers all 8 chapters of the book
- **Excluded content:** TOC, acknowledgments, index, about the author, pure bibliography

## How to Use This Graph

### For Learning
1. Start at `index.md` to understand the landscape
2. Pick a MOC based on your current focus
3. Follow wikilinks to dive deeper into concepts
4. Each skill file is self-contained but gains depth through links

### For Building Strategies
1. Begin with `strategy-research.md` to find ideas
2. Master the three biases (look-ahead, data-snooping, survivorship)
3. Study `backtesting.md` thoroughly before writing code
4. Learn `kelly-formula.md` and `sharpe-ratio.md` before sizing positions
5. Validate via `out-of-sample-testing.md` then `paper-trading.md`

### For Agents/AI
Each file's YAML frontmatter `description` field answers: "What is this skill and when should an agent use it?" 

The wikilinks create decision trees: "If trading mean-reversion, understand [[cointegration]] and [[stationarity]]. Watch for [[survivorship-bias]] in backtests. Calculate [[exit-strategies]] via half-life formula."

## What This Graph Captures

✅ **Actionable techniques:** How to calculate Kelly leverage, detect cointegration, avoid look-ahead bias  
✅ **Decision frameworks:** When to use mean reversion vs. momentum, stop loss vs. no stop loss  
✅ **Risk management:** Position sizing, leverage constraints, psychological preparedness  
✅ **Practical advice:** Broker selection, data sourcing, paper trading workflow  
✅ **Common pitfalls:** The three biases, transaction cost modeling, regime shifts  

## What It Doesn't Capture

❌ Specific code (MATLAB snippets are noted but not fully reproduced)  
❌ Detailed formulas (summarized, not PhD-thesis-level rigor)  
❌ Anecdotes and war stories (distilled to core lessons)  
❌ Historical context (focused on timeless principles)  

## The Philosophy

This graph embodies the book's core philosophy:

> **"It is far, far easier to generate a high Sharpe ratio trading a $100,000 account than a $100 million account."**

Independent traders succeed where institutions fail by:
1. Trading low-capacity strategies with high Sharpe
2. Acting as liquidity providers (not demanders)
3. Operating without institutional constraints
4. Maintaining emotional discipline via Kelly position sizing

The math is straightforward. The execution requires discipline. This skill graph provides both the formulas and the guardrails.

## Attribution

**Source:** *Quantitative Trading: How to Build Your Own Algorithmic Trading Business* by Ernie Chan (2008)

**Skill Graph Created:** 2026-02-20

**Purpose:** Transform linear book content into navigable, interconnected knowledge network for human traders and AI agents.

---

*Navigate to `index.md` to begin exploring.*
