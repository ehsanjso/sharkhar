---
description: >
  Trading front vs back month futures contracts. Exploits mean-reversion in
  roll returns, not spot prices. Works because roll return sign persists
  then reverts. CL 12-month spread: APR 8.3%, Sharpe 1.3.
source:
  chapters: [5]
  key-insight: "Calendar spreads trade roll returns; VX doesn't follow standard model"
---

# Futures Calendar Spreads

Calendar spreads pair futures contracts with same underlying but different expiration months. Unlike spot-based pairs, calendar spreads directly trade [[roll-returns]] (γ), exploiting mean reversion in the futures curve slope rather than prices.

## Core Principle

**Total futures return** = Spot return (α) + Roll return (γ)

Spot returns are noisy and non-stationary. But roll returns γ often mean-revert: periods of backwardation alternate with contango. By trading front vs back month spread, you isolate the [[roll-returns]] component.

**Mathematical model**: F(t,T) = S(t) exp(γ(T-t))

Calendar spread S = log(F_back) - log(F_front) = γ(T_back - T_front)

If γ mean-reverts (testable with [[augmented-dickey-fuller-test]]), then S mean-reverts, creating trading opportunity.

## When to Apply

Calendar spreads work when:
- [[roll-returns]] γ mean-reverts (test with ADF on γ time series)
- Commodity has storage costs and supply/demand seasonality
- You can identify natural time scale for γ reversion (half-life)

Don't work when:
- Futures don't follow standard model (VX, interest rate futures)  
- Insufficient history to test γ mean-reversion
- Transaction costs exceed expected reversion profit

## CL (Crude Oil) Example

**Contract pair**: Front month vs 12-month back  
**Strategy**: [[linear-mean-reversion-strategy]] on spread with half-life-derived look-back
**Test period**: Jan 2008 - Aug 2012
**Performance**: APR 8.3%, Sharpe 1.3, max DD –5.6%

Why it works: Oil demand seasonality and storage constraints cause γ to oscillate between backwardation (supply shortage) and contango (supply glut). These regimes persist for months then reverse.

## Practical Steps

1. **Select contracts**: Choose back month X months from front (3, 6, 12 common)
2. **Estimate γ**: Regress log futures prices on time-to-maturity for slope
3. **Test γ stationarity**: Run [[augmented-dickey-fuller-test]] on γ time series
4. **Calculate [[half-life-mean-reversion]]**: From γ ADF test
5. **Form spread**: S(t) = log(F_back(t)) - log(F_front(t))
6. **Deploy mean-reversion**: [[bollinger-bands]] or [[linear-mean-reversion-strategy]] on S
7. **Roll contracts**: Every month, shift to new front/back pair maintaining X-month gap

## Advantages Over Spot Pairs

**Lower noise**: γ changes slowly compared to spot price volatility
**Directional neutrality**: Insensitive to whether commodity rises or falls, only cares about curve shape  
**Leverage-friendly**: Margins on spreads often lower than outright positions
**No external hedging**: Don't need to pair with ETF or stocks; both legs are futures

## VX Calendar Spread Exception

VX (volatility futures) doesn't follow standard commodity model. Scatter plot of log(VX) vs time-to-maturity does NOT fall on straight line.

Yet VX calendar spread (front vs back) DOES mean-revert! Test empirically:
- Form ratio R = VX_back / VX_front  
- Test R for [[stationarity]] (passes ADF with 99% confidence)
- Trade when R deviates from mean

**Strategy**: Linear mean-reversion with 15-day look-back  
**Performance**: APR 17.7%, Sharpe 1.5 (Oct 2008 - Apr 2012)

But pre-Oct 2008 performance was poor. [[regime-change]] in VIX behavior around financial crisis may have created this opportunity.

## Seasonality

Some commodities have strong seasonal patterns in γ:
- **Agriculture** (corn, wheat): Harvest season creates contango, pre-harvest backwardation
- **Natural gas**: Winter heating demand creates backwardation
- **Gasoline**: Summer driving season affects curve

Instead of trading all months equally, focus on months where seasonal pattern strongest. This is advanced optimization requiring deep commodity knowledge.

## Pitfalls

**Model breakdown**: Not all futures follow F(t,T) = S exp(γ(T-t)). Test empirically by scatter-plotting log prices vs maturity. If not linear, standard model invalid.

**Rolling mechanics**: Must roll front contract 10 days before expiration to avoid delivery. Back contract rolls less frequently. Ensure code handles asynchronous rolling.

**Back-adjustment**: Use Panama method (add/subtract roll amount to history) for calendar spreads. Ratio method (multiply) creates false breakouts at roll dates.

**Liquidity**: Back month contracts often less liquid. Wide bid-ask can eliminate edge. Stick to highly liquid contracts (CL, GC, ES, etc.).

**Margin requirements**: Exchange margins for spreads usually lower than outright, but verify. Some exotic spreads charge full margin on each leg.

## VX Anomaly Analysis

Why does VX calendar spread mean-revert despite VX future itself NOT mean-reverting (due to –50% roll return)?

**Hypothesis**: Mean reversion in VIX spot creates temporary mean reversion in term structure slope. When VIX spikes (front month up), backwardation emerges. When VIX crashes (front month down), contango emerges. These term structure changes partially revert as VIX stabilizes.

This is speculation. Empirical observation: it works post-2008, failed pre-2008. [[regime-change]] makes relying on it risky.

## Integration

Calendar spreads are specialized application of [[mean-reversion]] to [[roll-returns]]. After confirming γ mean-reverts via [[augmented-dickey-fuller-test]], apply standard [[mean-reversion-strategies-moc]] toolkit.

The key insight: γ is often more stationary than spot prices, even when futures prices themselves aren't stationary. This creates opportunity invisible to those trading outrights.

For extracting roll returns via future-ETF arbitrage, see [[roll-returns]]. For complete mean-reversion tactics, [[mean-reversion-strategies-moc]].
