---
description: >
  Maximum capital a strategy can deploy while maintaining performance. Use this to understand your competitive edge — low-capacity strategies with high Sharpe ratios are the independent trader's domain.
source:
  chapters: [2, 8]
  key-insight: "Billion-dollar funds can't exploit $500K capacity strategies. This is where independent traders thrive and institutions fail."
---

# Capacity

Capacity is the amount of equity a strategy can manage without performance degradation. It's the invisible constraint that separates viable institutional strategies from independent trader goldmines.

## Why It Matters

The book reveals a counter-intuitive truth: **low capacity is your competitive advantage**. While hedge funds desperately hunt for strategies that scale to billions, you profit from the vast universe they must ignore.

Example: A [[mean-reversion]] strategy on small-cap stocks delivers 3.0 [[sharpe-ratio]] but supports only $500K. Renaissance Technologies manages $50B — they can't touch it. You can build your entire trading business around it.

## The Capacity-Sharpe Tradeoff

Book's observation: Strategies with highest Sharpe ratios often have lowest capacity.

**Why:** High Sharpe comes from exploiting short-term inefficiencies (liquidity provision, noise trading, temporary dislocations). But these opportunities are small — a few thousand dollars to tens of thousands per occurrence.

Low Sharpe strategies like trend-following or value investing can scale to billions because they:
- Hold positions for months/years (don't need instant liquidity)
- Trade large-cap stocks (deep liquidity)
- Move slowly (minimal market impact)

But they deliver Sharpe 0.3-0.8 vs. 2.0-3.0 for low-capacity strategies.

## What Determines Capacity

**1. Market impact from [[transaction-costs]]:**
Book's rule: Order size ≤ 1% of average daily volume (ADV).

Example (IRN from S&P 600 SmallCap):
- ADV: 51,000 shares
- Price: $4.45
- 1% of ADV: 510 shares = $2,269
- If holding 100 stocks: max portfolio = $227K

Trade above this threshold and you become a forced buyer/seller, moving prices against yourself.

**2. Number of opportunities:**
[[high-frequency-trading]]: Thousands of signals per day × small profit each = high capacity (can deploy millions)

[[seasonal-trading]]: One signal per year × large profit = low capacity (can't scale beyond one position)

**3. Holding period:**
Shorter holding → more turnover → more chances to deploy capital.

Annual rebalancing strategy: Deploy capital once per year.
Daily mean-reversion: Deploy capital 252 times per year → 252x capacity.

**4. Universe size:**
S&P 500 large-caps: Highly liquid, but only 500 stocks.
Russell 2000 small-caps: 2,000 stocks, but less liquid individually.

Broader universe = more opportunities = higher capacity (if liquidity permits).

## Estimating Your Strategy's Capacity

**Method from the book:**

1. Identify average position size per stock:
   - Constrained by 1% ADV rule
   - Example: If avg stock has 500K ADV, position = 5,000 shares

2. Calculate max portfolio size:
   - Positions per portfolio × average position size
   - Example: 100 stocks × $50K each = $5M

3. Account for turnover:
   - Daily trading: Can cycle through positions 252x/year (but watch costs)
   - Monthly: 12x/year

4. Validate via [[backtesting]]:
   - Run backtest with increasing capital
   - Watch for [[sharpe-ratio]] degradation
   - Capacity = capital level where Sharpe drops significantly

## Examples from the Book

**GLD/GDX [[pair-trading]]:**
- Only two positions (long GLD, short GDX)
- But large-cap ETFs (deep liquidity)
- Estimated capacity: $10-50M (book doesn't specify, but ETFs support this)

**Small-cap mean-reversion:**
- Book Example 3.7: S&P 500 stocks
- Capacity unclear, but small-cap version would be much lower
- Probably $1-10M given liquidity constraints

**Seasonal gasoline futures:**
- One contract once per year
- Capacity: ~$50-100K (limited by position sizing, not liquidity)
- Can't scale without changing risk profile

**High-frequency statistical arbitrage:**
- Institutions running hundreds of millions
- But require collocated servers, direct market access
- Individual traders: capacity $100K-$5M (infrastructure-limited)

## The Independent Trader's Edge

Book's conclusion (Chapter 8): "It is far, far easier to generate a high Sharpe ratio trading a $100,000 account than a $100 million account."

**Why institutions struggle:**

1. **Forced to act as liquidity demanders** — They need to execute large orders, paying for immediacy.

2. **Long holding periods** — To minimize market impact, must hold positions weeks/months. This exposes them to [[regime-switching]] and macro risks.

3. **Constraints** — Sector neutrality, no futures, no OTC, etc. Every constraint reduces optimal objective value.

4. **Competition** — All chasing the same $100M+ capacity strategies. Edge decays faster.

**Why you can succeed:**

1. **Act as liquidity provider** — You provide short-term liquidity when needed, collect the premium.

2. **Short holding periods** — Can enter and exit in minutes/hours/days. Less exposure to macro regime shifts.

3. **Freedom** — Trade what works, unconstrained by institutional politics.

4. **Less competition** — Most traders don't have the skills or discipline for high-Sharpe, low-capacity strategies.

## Growing Beyond Capacity

What happens when you max out a strategy's capacity via [[kelly-formula]]?

**Options:**

1. **Find new strategies** — Diversify into different markets (futures, currencies) or frequencies ([[high-frequency-trading]] or longer-term).

2. **Hire infrastructure** — For [[high-frequency-trading]], invest in faster systems to increase capacity.

3. **Take outside capital** — Once you've proven track record, raise funds. But this dilutes your edge (larger AUM = lower returns).

4. **Accept lower leverage** — Instead of running at Kelly optimal, run at 50% Kelly with 2x the capital. Same dollar returns, lower percentage returns.

The book's guidance: Focus on **Sharpe ratio**, not absolute returns. A $100K strategy with 3.0 Sharpe beats a $10M strategy with 0.8 Sharpe for long-term wealth building ([[kelly-formula]] proves this mathematically).

## Related Skills

- [[sharpe-ratio]] — High Sharpe correlates with low capacity
- [[transaction-costs]] — Market impact determines capacity ceiling
- [[high-frequency-trading]] — Can have higher capacity than seasonal
- [[seasonal-trading]] — Inherently low capacity (few signals)
- [[mean-reversion]] — Often low capacity (small-cap opportunities)
- [[kelly-formula]] — Helps determine when you've hit capacity
- [[regime-switching]] — Low capacity strategies less exposed to regime shifts

Embrace low capacity. It's not a bug; it's your competitive moat. While billion-dollar funds chase marginal improvements on commodity strategies, you compound at 30-50% annually on strategies they can't touch. That's the independent trader's advantage.
