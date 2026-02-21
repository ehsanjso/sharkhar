---
description: >
  Trading paradigm where price continuation is expected. Use when trends
  persist or autocorrelation is positive. Opposite of mean-reversion -
  buy strength, sell weakness. Natural stop-losses align with model.
source:
  chapters: [6, 7]
  key-insight: "Momentum crashes after crises, but benefits from black swans during normal times"
---

# Momentum Trading

Momentum trading bets that winners keep winning and losers keep losing. Unlike [[mean-reversion]] which fades extremes, momentum trades WITH the trend. This creates fundamentally different risk/reward profiles and requires different statistical validation.

## Core Principle

Momentum exists when returns exhibit positive serial correlation: past returns predict future returns in the SAME direction. Test using correlation coefficients between lagged and future returns, or [[hurst-exponent]] > 0.5 which indicates persistence rather than reversion.

The mathematical opposite of [[ornstein-uhlenbeck-process]] (mean-reversion), momentum price paths show drift plus noise: P(t) = P(0) + μt + ε. The drift term μ creates the trend that momentum traders exploit.

## When to Apply

**Time-series momentum** exists when:
- [[hurst-exponent]] > 0.5 (trending, not mean-reverting)
- Correlation between t-lag and t+hold returns is significantly positive
- [[roll-returns]] in futures have persistent sign (backwardation vs contango)
- News catalysts create sustained directional moves

**Cross-sectional momentum** exists when:
- Past relative outperformers continue outperforming peer group
- News sentiment scores predict continued positive/negative alpha
- Forced buying/selling by funds creates multi-day trends

## Types of Momentum

[[time-series-momentum]]: Each instrument trades against its own history. Buy if price > N-day moving average, sell if below. Commonly N = 250 days (12 months) for futures.

[[cross-sectional-momentum]]: Rank instruments, long top decile, short bottom decile. Rebalance monthly. Works across futures, currencies, stocks, indices.

[[intraday-momentum]]: Exploits sub-daily persistence from news, earnings, leveraged ETF rebalancing, or order flow imbalances. Holding periods measured in minutes to hours.

## Practical Steps

1. **Identify momentum regime**: Test [[hurst-exponent]] or return autocorrelation
2. **Choose time horizon**: Find correlation between t-lag and t+hold returns
3. **Select entry signal**: Moving average crossover, new N-day high, sign of lagged return
4. **Implement stop-loss**: Aligns with model - exit when momentum reverses
5. **Size positions**: Use [[kelly-formula]] or [[risk-parity]]
6. **Monitor for crashes**: Momentum strategies suffer after financial crises

## Momentum vs Mean-Reversion

**Risk profile**: Momentum has unlimited upside, limited downside (stop-loss). Mean-reversion has limited upside (profit target), unlimited downside (averaging into losses).

**Black swans**: Momentum BENEFITS from tail events during normal markets. [[mean-reversion]] SUFFERS from tail events. But momentum CRASHES after crisis when shorts rebound violently.

**Holding periods**: Momentum typically requires longer holds (weeks to months) for signal independence, reducing Sharpe ratio. [[intraday-mean-reversion]] can have higher Sharpe from frequent independent signals.

**Stop-losses**: Natural for momentum (reversal = exit signal). Contradictory for mean-reversion (deepest dip = best entry).

## Pitfalls

**Momentum crashes**: After financial crises, short positions rebound violently while longs collapse. 2007-2008 credit crisis caused momentum strategies to lose 30+ years of gains in months. This is why [[mean-reversion]] often outperforms momentum post-crisis.

**Shortening duration**: As more traders discover momentum patterns, duration shrinks. Post-earnings announcement drift lasted days in 1990s, now lasts hours. Constant adaptation required.

**False breakouts**: Breakout strategies suffer [[stop-hunting]] by high-frequency traders who trigger stops to create fake momentum. Use broader breakouts or fundamental confirmation.

**Curve-fitting look-back**: Optimizing lag period and holding period invites [[data-snooping-bias]]. Use correlation analysis to find natural time scales rather than brute-force optimization.

## Sources of Momentum

**Futures roll returns**: Persistent backwardation/contango creates exploitable [[time-series-momentum]]. See [[roll-returns]] and [[futures-calendar-spreads]].

**News diffusion**: Information spreads slowly, creating days-long momentum in stocks. Test with [[news-sentiment-momentum]].

**Forced flows**: Index rebalancing, leveraged ETF rebalancing, mutual fund redemptions force buying/selling that creates momentum. See [[leveraged-etf-rebalancing]].

**Stop cascades**: Stop orders cluster at support/resistance levels. Breaching these levels triggers avalanche of momentum. See [[stop-hunting]].

## Implementation Variants

**Simple trend-following**: Buy if 12-month return > 0, sell if < 0. Hold 1 month. Rebalance daily. This simple rule works across futures asset classes with Sharpe ~1.0-1.3.

**Cross-sectional ranking**: Rank 500 stocks by 12-month return. Long top 50, short bottom 50. Rebalance monthly. APR ~16% historically but crashed 2008-2009.

**News-driven**: Enter on earnings surprise, sentiment score change, or analyst upgrade. Exit same day. Benefits from [[post-earnings-announcement-drift]].

**Breakout strategies**: Buy new N-day high, sell new N-day low. Include [[opening-gap]] momentum after overnight moves.

## Risk Management Nuances

Momentum strategies should use stop-losses since they align with the model - reversal indicates you're wrong. But avoid stops too tight to entry which get triggered by noise.

Size positions using [[kelly-formula]] but be prepared to quickly delever entire strategy if you detect signs of momentum crash (e.g., market crisis, sharp short rebound).

Use [[optimal-leverage]] to balance growth and drawdowns, but remember momentum can experience 50%+ drawdowns during crashes even with optimal sizing.

## Cross-Asset Patterns

Momentum is nearly universal: works in stocks, indices, commodities, currencies, bonds. This universality enables true diversification across asset classes.

Combining momentum and [[mean-reversion]] strategies creates more robust portfolio than either alone. Momentum thrives in normal markets with black swans, mean-reversion thrives post-crisis when prices overshoot.

For complete toolkit, see [[momentum-strategies-moc]]. For futures-specific momentum, examine [[roll-returns]] and [[time-series-momentum]]. For stock momentum, explore [[cross-sectional-momentum]] and [[news-sentiment-momentum]].
