---
description: >
  Momentum strategy where each instrument trades against its own history.
  Use when past returns positively correlate with future returns.
  Foundation: persistence of futures roll returns sign. Simple yet robust.
source:
  chapters: [6]
  key-insight: "12-month lagged return predicts 1-month forward return across all asset classes"
---

# Time Series Momentum

Time series momentum is the simplest profitable strategy in algorithmic trading: Buy if 12-month return > 0, sell if < 0, hold 1 month. This rule works across futures, currencies, stocks, and bonds despite its embarrassing simplicity.

## Core Principle

Unlike [[cross-sectional-momentum]] which compares instruments, time series momentum compares each instrument to its OWN past. Positive past return → Continue buying. Negative past return → Continue selling.

The strategy exploits positive autocorrelation at monthly/annual time scales. Past winners keep winning (trending up), past losers keep losing (trending down). This is [[momentum-trading]] in its purest form.

## Why It Works

**For futures**: Persistence of [[roll-returns]] sign. Futures in backwardation (positive roll) stay in backwardation for months. Same for contango (negative roll). Since roll return often dominates spot return, total return is autocorrelated.

**For stocks**: Slow diffusion of information. News takes weeks to fully incorporate into prices. [[post-earnings-announcement-drift]] is one manifestation.

**For currencies**: Serial correlation in economic growth or interest rate differentials across countries.

**Universal**: Underreaction to information creates trends that persist across all asset classes.

## When to Apply

Use time series momentum when:
- [[hurst-exponent]] > 0.5 (trending, not mean-reverting)
- Positive correlation between past and future returns (test multiple lag/hold periods)
- Asset class is futures, currencies, or broad stock indices
- [[roll-returns]] sign persists (for futures specifically)

Don't use when:
- [[hurst-exponent]] < 0.5 (use [[mean-reversion]] instead)
- Asset exhibits [[stationarity]] (pairs, spreads)
- Individual stocks (too noisy, use [[cross-sectional-momentum]])

## Practical Steps

1. **Test autocorrelation**: Calculate correlation between past N-day return and future M-day return
2. **Find optimal periods**: Test (look-back, holding) pairs like (60,10), (250,25)
3. **Check statistical significance**: Require correlation p-value < 0.05
4. **Simple rule**: Sign(return[t-lookback:t]) determines position for next 'hold' days
5. **Daily rebalancing**: Each day, allocate capital/holdDays to new position, maintain old ones
6. **Size positions**: Use [[kelly-formula]] or equal capital across instruments

## Classic Implementation

**Look-back = 252 days (12 months)**
**Holding = 21 days (1 month)**

```python
lookback = 252
holddays = 21

# Generate signals
longs = price[t] > price[t-lookback]
shorts = price[t] < price[t-lookback]

# Stagger positions to create daily rebalancing
positions = np.zeros(len(price))
for h in range(holddays):
    positions[longs shifted by h] += 1/holddays
    positions[shorts shifted by h] -= 1/holddays

returns = positions[t-1] * (price[t] - price[t-1]) / price[t-1]
```

This creates overlapping monthly holds rebalanced daily, smoothing turnover and margin requirements.

## Performance Across Assets

**TU (2-year Treasury)**: Sharpe 1.0, driven by persistence of interest rate trends
**BR (Brazilian Real)**: Sharpe 1.09, from economic growth autocorrelation  
**HG (Copper)**: Sharpe 1.05, industrial cycle trends
**Crude oil (CL)**: Works when combined with mean-reversion filter

The strategy is nearly universal. Moskowitz, Yao, and Pedersen (2012) found it profitable across 58 liquid instruments from 1985-2009.

## Relationship to Roll Returns

For futures, time series momentum primarily captures [[roll-returns]] persistence. Test confirms:

**TU with lagged roll return as signal** (not total return): Sharpe improves from 1.0 to 2.1, max DD drops from –2.5% to –1.1%.

Use lagged roll return γ as signal instead of lagged total return:
- Long if annualized γ[t-lookback] > 3%
- Short if γ < –3%
- Flat otherwise

This is PURER momentum signal since it strips out noisy spot returns, focusing on persistent roll component.

## Adding Mean-Reversion Filter

Some instruments benefit from hybrid approach:

**CL (crude oil)**: Long if price < 30-day low AND price > 40-day low

This combines momentum (30-40 day channel breakout) with mean-reversion filter (not too extended). Improves both Sharpe and maximum drawdown vs pure momentum.

##Diversification

The beauty of time series momentum is true cross-asset diversification. Strategies using [[cointegration]] are stuck within correlated instruments (same sector, same economy). Time series momentum works on EVERYTHING, so you can combine:
- Commodities (energy, metals, agriculture)  
- Currencies (G10, EM)
- Rates (Treasuries, Eurodollar)
- Equities (index futures)

Low correlation across asset classes plus positive expected return in each creates portfolio Sharpe ratio exceeding individual strategies.

## Pitfalls

**Momentum crashes**: After financial crises (1929, 2008), momentum strategies lose decades of profits in months. Short positions rebound violently while longs collapse. See [[momentum-crashes]].

**Shortening duration**: As traders discover patterns, duration shrinks. What worked for 12-month lag in 1980s now works for 6-month lag. Must adapt.

**Curve-fitting look-back**: Optimizing look-back period invites [[data-snooping-bias]]. Use correlation analysis to find natural time scales rather than grid search.

**Transaction costs**: Daily rebalancing small positions creates costs. For retail traders, trade weekly or monthly instead, accepting lower Sharpe for lower costs.

## Comparison to Cross-Sectional

**Time series momentum**: Each instrument vs its own past. Simpler, works with single instrument. Driven by autocorrelation.

**[[cross-sectional-momentum]]**: Instruments ranked against each other. Requires universe of assets. Long top decile, short bottom decile. Driven by relative performance persistence.

Both work, but time series is simpler to implement (no ranking, no relative calculations). Cross-sectional typically has higher returns but also higher max drawdown.

## S&P DTI Index

Ready-made implementation: S&P Diversified Trends Indicator tracks 24 futures using time series momentum with exponential moving average entry. Available as ETF (WDTI) and mutual fund (RYMFX).

Historical Sharpe: 1.3 from 1988-2010. But suffered severe drawdown 2008-2012 due to [[momentum-crashes]] after credit crisis. As of 2012, down 25.9% from Dec 2008 high.

This publicly available performance confirms both the strategy's effectiveness AND its vulnerability post-crisis.

## Integration with Risk Management

Time series momentum REQUIRES stop-losses since they align with the model. Momentum reversal = your hypothesis failed = exit. Unlike [[mean-reversion]] where stops contradict the model, momentum stops are natural.

Use [[kelly-formula]] for leverage but be prepared to quickly delever during crisis. Momentum strategies have unlimited upside but crash risk. [[constant-proportion-portfolio-insurance]] can help limit drawdown while maintaining growth.

For complete momentum toolkit, see [[momentum-strategies-moc]]. For futures-specific implementation, explore [[roll-returns]]. For combining with mean-reversion, see hybrid strategies in [[mean-reversion-strategies-moc]].
