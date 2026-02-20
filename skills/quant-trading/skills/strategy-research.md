---
description: >
  MOC for discovering, evaluating, and selecting profitable trading strategies. Use this when you need to find new trading ideas or assess whether a strategy matches your constraints (capital, time, skill level).
source:
  chapters: [2]
  key-insight: "The best strategies for independent traders exploit low-capacity inefficiencies that institutions can't touch."
---

# Strategy Research

Finding profitable trading strategies is both an art and a science. This Map of Content guides you through sourcing ideas, evaluating their fit, and avoiding strategies that look good on paper but fail in practice.

## Where Trading Ideas Come From

Trading strategies don't materialize from thin air. Start by systematically mining [[strategy-sources]] — academic papers, trader forums, financial blogs, and published research. The key is knowing how to **adapt** published strategies rather than blindly copying them.

Academic research often contains gems, but remember: by the time a strategy is published, its alpha may have decayed. That's why [[strategy-refinement]] matters — taking a known concept and finding the variation that still works.

## Evaluating Strategy Fit

Before committing to backtest a strategy, filter it through your personal constraints. Consider three dimensions:

**Capital requirements** determine whether you need a retail account with 2x leverage or proprietary access with 20x. [[brokerage-selection]] explains the tradeoffs. Low-capital traders should favor strategies with modest position sizes and high turnover rather than buy-and-hold.

**Time commitment** varies dramatically. [[high-frequency-trading]] demands constant monitoring and sub-second execution. [[seasonal-trading]] might require action only once per month. Match the strategy's frequency to your available hours.

**Technical skill** affects both development and maintenance. [[mean-reversion]] strategies are generally simpler to implement than complex [[factor-models]]. Start simple; complexity comes later.

## The Capacity Trap

Here's the paradox institutional traders face: strategies that generate the highest [[sharpe-ratio]] often have the lowest capacity. A mean-reversion strategy on small-cap stocks might deliver a 3.0 Sharpe but only support $500K in capital. A pension fund can't touch it; you can.

Understanding [[capacity]] is your competitive edge. While hedge funds hunt for strategies that scale to billions, you profit from the vast universe of low-capacity opportunities they must ignore.

## Strategy Categories

The book identifies two fundamental types: [[mean-reversion]] and [[momentum-strategies]]. Every profitable strategy exploits one of these regimes (or switches between them via [[regime-switching]]).

Mean-reversion strategies bet on prices returning to equilibrium. They work when market structure or fundamental relationships create temporary dislocations. Think [[pair-trading]] or statistical arbitrage.

Momentum strategies bet on trend continuation. They work when information diffuses slowly or large institutional orders execute incrementally. The challenge: competition constantly shrinks the optimal holding period.

Some strategies blend both: [[seasonal-trading]] can be mean-reverting (January effect) or momentum-based (gasoline futures). The key is understanding **why** the pattern exists.

## Avoiding Strategy Pitfalls

Before backtesting, screen for red flags:

Does the strategy depend on **news** or **earnings**? Momentum is likely at play, but information diffuses faster every year. What worked with a 5-day hold in 2000 might need 5 hours in 2025.

Does it trade **illiquid securities**? Check if [[transaction-costs]] will devour your returns. A backtest showing 50% annual return means nothing if bid-ask spreads eliminate the edge.

Does it require **hard-to-borrow stocks**? Short selling faces constraints the backtest won't capture. [[brokerage-selection]] matters — some brokers have deep lending networks, others don't.

## Connected Skills

- [[strategy-sources]] — Where to find trading ideas
- [[strategy-refinement]] — Adapting published strategies  
- [[capacity]] — Understanding strategy scalability
- [[sharpe-ratio]] — Evaluating risk-adjusted returns
- [[mean-reversion]] — One fundamental strategy type
- [[momentum-strategies]] — The other fundamental type
- [[backtesting]] — Validating your strategy (next MOC)

The search for profitable strategies never ends. Markets evolve, edges decay, and new opportunities emerge. Build a systematic process for strategy research, and you'll always have a pipeline of ideas to test.
