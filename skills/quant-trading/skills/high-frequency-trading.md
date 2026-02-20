---
description: >
  Strategies holding positions for seconds to minutes, exploiting tiny inefficiencies thousands of times per day. Use this when you want maximum Sharpe ratio via law of large numbers — but requires significant technology investment.
source:
  chapters: [7]
  key-insight: "High Sharpe ratio via frequency: 3,000 small bets per day beats 3 large bets per year. Law of large numbers minimizes deviation from mean return."
---

# High-Frequency Trading

High-frequency trading (HFT) strategies hold positions for seconds to hours (not overnight). The book defines anything not holding overnight as high-frequency, though purists would limit it to sub-second holding periods.

## Why Frequency Matters

The book reveals the mathematical secret: **Sharpe ratio, not returns, determines long-term wealth** (via [[kelly-formula]]). And frequency is the path to higher Sharpe.

**Law of large numbers:** More independent bets → smaller percentage deviation from mean return.

Example:
- Strategy A: 3 trades/year, each with 50% win rate, ±10% return
- Strategy B: 3,000 trades/year, each with 50% win rate, ±0.01% return

Strategy B has far more predictable daily returns despite identical expected value. Lower volatility = higher Sharpe = higher maximum growth rate.

The book: "With high-frequency trading, one can potentially place hundreds if not thousands of bets all in one day. Therefore, provided the strategy is sound and generates positive mean return, you can expect the day-to-day deviation from this return to be minimal."

Result: **Sharpe ratios of 3.0+ are achievable** with high-frequency strategies. This enables extraordinary leverage via [[kelly-formula]] and stratospheric compounded growth rates.

## What HFT Strategies Do

The book notes: "There are as many such strategies as there are fund managers. Some of them are mean reverting, while others are trend following."

**Common approaches:**

1. **Market making:** Provide liquidity by posting bids and asks, profit from spread
2. **Statistical arbitrage:** Exploit tiny mispricings that exist for seconds
3. **Order book dynamics:** Trade based on patterns in the limit order book
4. **Latency arbitrage:** Exploit speed advantages to front-run slower participants
5. **News trading:** React to news releases faster than others

The unifying theme: **Exploit temporary inefficiencies or provide liquidity for a fee.** Unlike betting on macroeconomic trends or fundamentals (which takes months to play out), HFT captures micro-structure edge.

## Requirements

**Technology:**
- **Language:** C or C++ (not MATLAB, Python, or other interpreted languages)
- **Infrastructure:** Collocated servers next to exchange or major internet backbone
- **Latency:** Microsecond execution delays matter
- **Data:** Tick-level bid/ask/last quotes, potentially order book depth

The book emphasizes: "Professional high-frequency trading firms have been writing their strategies in C instead of other, more user-friendly languages, and locating their servers next to the exchange or a major Internet backbone to reduce the microsecond delays."

**Market access:**
- Direct market access (DMA) or FIX protocol connectivity
- Low-latency data feeds (not delayed web APIs)
- Co-location hosting at exchange data centers

**Capital:**
Surprisingly lower than you'd think for some HFT strategies. Book notes independent traders can start with $100K-$500K. But scaling requires infrastructure investment that can easily reach $50K-$500K in ongoing annual costs.

## Backtesting Challenges

The book warns: "It is not easy to backtest such strategies when the average holding period decreases to minutes or even seconds."

**Critical issues:**

1. **[[transaction-costs]] paramount:** Without modeling bid-ask spread, slippage, and exchange fees, "the simplest strategies may seem to work at high frequencies." But they're backtesting fiction.

2. **Execution assumptions:** Need bid, ask, AND last prices. Can't assume you buy at bid or sell at ask (you're taking liquidity). Modeling realistic fills requires order book data, not just trades.

3. **Microstructure effects:** Queue position, order cancellation rates, exchange latency — all matter at millisecond timescales.

4. **Look-ahead bias:** At microsecond granularity, [[look-ahead-bias]] is trivial to introduce. Timestamp alignment between quote data and trade data must be perfect.

The book concludes: "Quite often, the only true test for such strategies is to run it in real-time unless one has an extremely sophisticated simulator."

## Capacity Considerations

Paradoxically, HFT can have higher [[capacity]] than low-frequency strategies despite operating on tiny inefficiencies.

**Why:** Thousands of opportunities per day × small profit each = ability to deploy millions of dollars.

Example:
- Seasonal strategy: 1 signal/year × $10K profit = can deploy ~$100K max
- HFT market making: 5,000 trades/day × $5 profit = deploy $1M+ (if liquidity permits)

But the book notes capacity is often limited by infrastructure, not opportunities. Your execution speed determines how many of those 5,000 daily opportunities you can actually capture.

## Advantages

1. **High Sharpe ratio:** 2.0-4.0+ achievable via law of large numbers

2. **Easy risk management:** Book notes "deleveraging can be done very quickly in face of losses, and certainly one can stop trading and be completely in cash when going gets truly rough."

No overnight positions = no gap risk from overnight news. Can shut down instantly if strategy starts losing.

3. **Minimal regime risk:** Unlike holding for months ([[regime-switching]] risk), HFT exploits market microstructure that's fairly stable day-to-day.

4. **Predictable returns:** High frequency + law of large numbers = daily P&L is very stable around mean.

## Disadvantages

1. **Technology barrier:** Requires programming expertise beyond MATLAB, significant infrastructure investment, and ongoing maintenance.

2. **Regulatory scrutiny:** HFT attracts negative attention. Some jurisdictions restrict it.

3. **Arms race:** Speed advantages decay as competitors upgrade. What worked with 10ms latency might need 1ms latency next year.

4. **Difficult backtesting:** Book emphasizes you can't truly validate without running it live.

5. **Operational complexity:** 24/7 monitoring, server maintenance, exchange connectivity issues.

## Path for Independent Traders

The book's realistic assessment: "Truly high-frequency trading is not by any means easy for an independent trader to achieve in the beginning. But there is no reason not to work toward this goal gradually as expertise and resources accrue."

**Progression:**

1. **Start:** Daily mean-reversion or momentum strategies (hold minutes to hours, not overnight)
2. **Intermediate:** Optimize execution systems for sub-second order placement
3. **Advanced:** Rebuild in C/C++, collocate servers, target microsecond latency

Even semi-HFT (holding hours, not days) delivers Sharpe improvements over overnight positions. You don't need nanosecond optimization to benefit from frequency.

## Related Skills

Foundation:
- [[sharpe-ratio]] — Why HFT enables 3.0+ Sharpes
- [[kelly-formula]] — High Sharpe = massive leverage = extraordinary growth
- [[capacity]] — HFT can have higher capacity than low-frequency

Strategy types:
- [[mean-reversion]] — Can be high-frequency (intraday reversals)
- [[momentum-strategies]] — Can be high-frequency (breakout scalping)
- [[pair-trading]] — Often high-frequency (exploit temporary spread dislocations)

Backtesting:
- [[backtesting]] — Why HFT is hard to backtest accurately
- [[transaction-costs]] — Make-or-break for HFT viability
- [[look-ahead-bias]] — Easy to introduce at microsecond timescales
- [[paper-trading]] — Even more critical for HFT validation

Infrastructure:
- [[execution-systems]] — Need fully automated, ultra-low latency
- [[brokerage-selection]] — DMA and co-location access critical

The book positions HFT as the ultimate expression of quantitative trading: pure mathematical edge, minimal fundamental risk, maximal Sharpe ratio. But it demands technical sophistication and ongoing arms race investment. For independent traders, semi-HFT (intraday, not overnight) offers most of the benefits with fraction of the complexity.

Your decision: Start with daily strategies (much easier to backtest and execute). As capital and expertise grow, migrate toward higher frequencies. The Sharpe improvements compound dramatically via [[kelly-formula]].
