---
description: >
  Trading strategies that bet on trend continuation — prices moving in one direction keep moving that direction. Use this when information diffuses slowly, large orders execute incrementally, or herding behavior emerges.
source:
  chapters: [2, 7]
  key-insight: "Competition doesn't kill momentum strategies — it shortens their optimal holding period. What worked over 5 days in 2000 needs 5 hours in 2025."
---

# Momentum Strategies

Momentum strategies profit from trend continuation. When prices rise, bet they'll keep rising. When they fall, bet they'll keep falling. The opposite of [[mean-reversion]] — you're riding the wave, not fading it.

## Why Momentum Exists

The book identifies three drivers:

**1. Slow information diffusion:**
News doesn't instantly reach all investors. As more people learn about an earnings beat or new product, more buying pressure emerges, driving prices higher incrementally rather than instantly.

Example: **Post-earnings announcement drift (PEAD)** — After a company beats earnings expectations, its stock tends to drift higher for days/weeks as analysts revise targets and institutional funds reallocate.

The book notes: "This leads to a momentum strategy called post earnings announcement drift" and references research at quantlogic.blogspot.com for implementation details.

**2. Incremental large order execution:**
Institutional traders break multi-million dollar orders into small pieces to minimize market impact. While they're buying over hours/days, the price trends upward. You profit by detecting the buying pressure and front-running the remaining execution.

**3. Herding behavior:**
Book quotes Robert Schiller: "Nobody has all the information they need to make fully informed financial decisions. One has to rely on the judgment of others."

When investors see others buying, they interpret it as information: "Those buyers must know something I don't." This creates cascading demand uncorrelated with fundamentals. The first buyer might have been wrong, but the herd makes them temporarily right.

## When to Apply

Use momentum when:
- **News or events alter expectations:** Earnings surprises, FDA approvals, analyst upgrades
- **Technical breakouts occur:** Price crosses resistance, triggering algorithmic and technical trader buying
- **Volume surges without news:** Suggests large institutional accumulation
- **Trend is nascent:** Momentum is self-limiting; mature trends exhaust themselves

The book warns: Unlike [[mean-reversion]] which is "more prevalent," momentum windows are shorter and less predictable. But when they occur, they can be explosively profitable.

## Practical Examples

**Post-earnings announcement drift (PEAD):**
- Buy stocks that beat earnings estimates
- Short stocks that miss estimates
- Hold for days to weeks
- Book suggests this "leads to a trending period"

**Price breakouts:**
- Buy when price exceeds 20-day high
- Sell when price falls below 20-day low
- Adaptive holding period (exit when trend reverses)

**Sector rotation:**
- Identify sectors with positive momentum
- Overweight those sectors, underweight laggards
- Rebalance monthly or quarterly

## Key Differences from Mean Reversion

The book contrasts momentum vs. [[mean-reversion]] in Section 7.1:

**Impact of competition:**
- Mean reversion: Competition eliminates arbitrage opportunities → returns decline to zero
- Momentum: Competition shortens optimal holding period → strategies still work but faster

**Exit strategy:**
- Mean reversion: Exit at mean crossing or profit target
- Momentum: Exit when trend reverses (or fixed time period)

**Stop loss:**
- Mean reversion: Usually harmful (exiting at worst point)
- Momentum: **Often beneficial** — trend reversed means you're wrong, cut losses

The book emphasizes this stop-loss distinction in the "Is the Use of Stop Loss a Good Risk Management Practice?" sidebar. For momentum, stop loss = exiting when regime shifted back to mean-reversion.

## Challenges

**Optimal holding period:**
Book's warning: "How do you predict when the 'herd' is large enough to form a stampede? Where is the infamous tipping point?"

For PEAD, research suggests 20-60 days. For institutional order execution, hours to days. For herding, completely unpredictable.

Problem: With limited historical signals, estimating optimal holding period suffers from [[data-snooping-bias]]. You might have only 20-50 earnings events in backtest. Optimizing holding period on this small sample = overfitting.

**Regime uncertainty:**
Is current price move due to:
- **News** (momentum regime, trend will continue)?
- **Liquidity** (mean-reversion regime, will reverse)?

The book notes: "It is not easy to tell whether one is in a momentum regime or mean-reverting regime."

Rule of thumb: If you can identify fundamental reason for move (news, earnings, macro data), assume momentum. If move lacks apparent cause, assume liquidity-driven mean-reversion.

**Competition effect:**
The book observes: "As news disseminates at a faster rate and as more traders take advantage of this trend earlier on, the equilibrium price will be reached sooner. Any trade entered after this equilibrium is reached will be unprofitable."

What worked with 5-day hold in early 2000s might need 5-hour hold now. The profitable window shrinks as information technology improves and more algorithmic traders exploit the same patterns.

## Connected Strategies

**[[regime-switching]]:** Advanced momentum strategies attempt to detect when markets shift from mean-reversion to momentum regime. Book Example 7.1 uses machine learning (neural networks via Alphacet Discovery) to predict turning points in GS (Goldman Sachs stock).

Result: Sharpe 0.38 (buy-hold) improved to 0.48 (optimized regime-switching model) on 6-month backtest.

**[[seasonal-trading]]:** Some seasonal patterns are momentum-based:
- Gasoline futures rise into summer (demand increases)
- Natural gas rises into winter (heating demand)
- These are predictable momentum windows based on calendar

## Exit Strategies for Momentum

From the book's Section 7.6:

**1. Fixed holding period:**
Estimate from backtest. For PEAD, typically 20-60 days. For breakouts, might be 5-10 days.

Warning: Small sample size makes this prone to [[data-snooping-bias]].

**2. Reversal signal:**
Run strategy again on latest data. If signal flips (was buy, now sell), exit and potentially reverse.

This is the book's preferred approach for momentum: "Rather than imposing an arbitrary stop-loss price... exiting based on the most recent entry signal is clearly justified."

**3. Stop loss:**
Unlike [[mean-reversion]], stop loss is valid for momentum. If price moves against your position, the trend you bet on has failed. Exit.

But the book recommends using reversal signals over arbitrary price stops to avoid introducing extra parameters ([[data-snooping-bias]]).

## Related Skills

Strategy fundamentals:
- [[mean-reversion]] — The opposite regime
- [[regime-switching]] — Detecting transitions
- [[exit-strategies]] — When to close momentum positions

Backtesting challenges:
- [[data-snooping-bias]] — Limited signals make holding period optimization risky
- [[out-of-sample-testing]] — Critical given small sample sizes
- [[backtesting]] — Need careful validation

Specific applications:
- [[seasonal-trading]] — Calendar-driven momentum
- [[factor-models]] — Can capture momentum via prior-period return factors

Execution:
- [[transaction-costs]] — Momentum trades less frequently than mean-reversion
- [[kelly-formula]] — Momentum strategies often have lower Sharpe than mean-reversion

The book positions momentum as less prevalent than mean-reversion but still profitable. The key insight: **Competition doesn't destroy momentum, it accelerates it**. Strategies still work, just on faster timeframes. Adapt or become obsolete.

Your edge: Focus on momentum catalysts (earnings, news, technical breaks) that are still discoverable before the herd arrives. And be ready to shorten holding periods as edge decays over time.
