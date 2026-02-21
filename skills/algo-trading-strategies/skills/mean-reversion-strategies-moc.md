---
description: >
  Map of Content for all mean-reversion trading strategies. Navigate by
  instrument type or technique. Organized from statistical validation
  through practical implementation to risk management.
source:
  chapters: [2, 3, 4, 5]
  key-insight: "Mean reversion requires stationarity validation before trading"
---

# Mean-Reversion Strategies - Map of Content

Mean reversion strategies bet on prices returning to equilibrium after deviating. This map organizes all mean-reversion techniques from validation through execution.

## Foundation: Statistical Validation

Before trading ANY mean-reversion pattern, validate it statistically:

**[[stationarity]]** - Core requirement for mean reversion
**[[augmented-dickey-fuller-test]]** - Test single series for mean reversion (p < 0.05 required)
**[[half-life-mean-reversion]]** - Calculate reversion speed, sets your look-back period
**[[hurst-exponent]]** - H < 0.5 confirms mean reversion vs momentum (H > 0.5)

For pairs and portfolios:
**[[cointegration]]** - Two+ non-stationary series create stationary portfolio
**[[cointegrated-adf-test]]** - Test pairs for cointegration  
**[[johansen-test]]** - Find optimal weights for 3+ cointegrating instruments

## Entry/Exit Frameworks

After confirming [[stationarity]], choose execution method:

**[[bollinger-bands]]**
Fixed-leverage entries at standard deviation bands (1-2σ). Caps maximum position size. Superior capital efficiency vs linear strategy. Set look-back = [[half-life-mean-reversion]].

**[[linear-mean-reversion-strategy]]**
Continuously scale positions with z-score. Position ∝ (mean - price) / σ. No natural position limit. Higher theoretical returns but dangerous leverage at extremes.

**[[kalman-filter]]**
Dynamic mean and variance estimation. Adapts to [[regime-change]]. Best for time-varying relationships in [[currency-pairs]] and volatile markets. More complex but handles non-stationarity better.

**[[scaling-in]]**
Add positions at 2σ, 3σ, 4σ etc. Reduces timing risk, improves average entry. Doesn't help backtest returns (optimized for best single entry) but reduces live trading variance.

## By Instrument Type

### Stocks and ETFs

**[[pair-trading]]** - Core framework: long undervalued, short overvalued leg
**[[etf-pairs]]** - EWA-EWC, GLD-GDX, RTH-XLP. Superior to stock pairs (stable fundamentals)
**[[buy-on-gap]]** - Intraday mean reversion: buy stocks gapping down >1σ, exit at close
**[[linear-long-short-stocks]]** - Cross-sectional mean reversion: relative returns mean-revert daily
**[[index-arbitrage]]** - SPY vs component stocks, capture deviations from fair value

**Avoiding stock pairs**: Individual stocks fall apart out-of-sample due to fundamental changes. Companies diverge quickly. Stick to [[etf-pairs]] or diversified portfolios (98+ stocks).

### Currencies

**[[currency-pairs]]** - AUD-CAD, EUR-GBP. Commodity currencies cointegrate best
**[[rollover-interest]]** - Account for overnight interest differentials in currency returns
**[[forex-quote-conventions]]** - Same quote currency (AUD.USD vs CAD.USD) for valid [[cointegration]] tests

### Futures

**[[futures-calendar-spreads]]** - Front vs back month. Trade mean-reverting [[roll-returns]]
**[[vx-es-spread]]** - Volatility future vs equity index. Unusual [[cointegration]] from negative correlation
**[[crack-spread]]** - 3 crude, -2 gasoline, -1 heating oil. Classic refinery spread (but broke 2007-2008)

**Why futures calendar spreads work**: [[roll-returns]] mean-revert even when futures prices don't. Test γ (roll return) for [[stationarity]], not total return.

## Special Techniques

**[[intraday-mean-reversion]]**
Seasonal patterns invisible in daily bars. [[buy-on-gap]] exploits panic selling at open. Liquidity-driven price moves revert intraday even when interday shows momentum.

**[[cross-sectional-mean-reversion]]**
Relative stock returns mean-revert daily even when absolute returns don't. [[linear-long-short-stocks]] captures this. Requires no [[stationarity]] tests on individual stocks.

**[[kalman-filter]] dynamic hedging**
When [[hedge-ratio]] evolves over time (most real markets), static regression fails. Kalman filter updates β daily based on recent deviations. Critical for [[currency-pairs]] and breakable [[cointegration]].

**GLD-GDX-USO triplet**
Classic example of adding missing variable. GLD-GDX cointegrated until oil spiked 2008. Adding USO restored [[cointegration]] 2006-2012. Always ask: what external factor might break this relationship?

## Risk Management for Mean Reversion

**[[stop-losses]]** - Must be WIDER than backtest maximum, not at signal reversal
Set stops at 1.5-2× backtest max DD to survive [[regime-change]]
Mean-reversion stops contradict the model (deeper = better value) so only use for catastrophe protection

**Position sizing** - [[kelly-formula]] or [[bollinger-bands]] max positions
Avoid [[linear-mean-reversion-strategy]] unlimited scaling at extremes
Use [[constant-proportion-portfolio-insurance]] if max drawdown constraint exists

**Monitoring** - Re-test [[cointegration]] monthly on rolling window  
Exit pairs if [[augmented-dickey-fuller-test]] p-value > 0.10 (cointegration breaking down)
Watch [[half-life-mean-reversion]] - sudden doubling indicates weakening

## Common Pitfalls

**[[data-errors-mean-reversion]]**
Single bad quote creates fake extreme reversion signal. Mean-reversion strategies especially vulnerable because they BUY extremes. Scrutinize all outlier returns >5σ.

**[[survivorship-bias]]**
Your backtest only includes pairs that stayed cointegrated. Pairs that fell apart disappeared from your results. This is why [[etf-pairs]] beat stock pairs - survivor bias is smaller.

**[[regime-change]]**
Mean-reverting series can start trending. [[cointegration]] can break permanently. No statistical test predicts future; they only describe past. Must monitor and exit when relationships fail.

**Look-ahead bias**
Using close price to generate signal for that close. Use previous close to calculate [[bollinger-bands]], trade at current close. Or use intraday MA/σ but accept [[signal-noise]].

**Overnight gaps**
[[stop-losses]] useless during market closures. Prices gap through stop level. Either close all positions before market close or buy protective options.

## Strategy Selection Guide

**Start with ETFs**: [[etf-pairs]] most robust due to slow-changing basket fundamentals. Test EWA-EWC, GLD-GDX, RTH-XLP, sector pairs.

**Add currencies if experienced**: [[currency-pairs]] more complex (quote conventions, [[rollover-interest]]) but good diversification from equities.

**Futures last**: [[futures-calendar-spreads]] require understanding [[roll-returns]] and back-adjustment methods. VX-ES requires special model since VX ≠ standard commodity future.

**Avoid individual stocks**: Unless you have fundamental insight into BOTH companies, stock pairs fail out-of-sample. Use [[cross-sectional-mean-reversion]] on large universe instead.

## Implementation Checklist

1. **Validate [[stationarity]]**: [[augmented-dickey-fuller-test]] p < 0.05 required
2. **Calculate [[half-life-mean-reversion]]**: Sets look-back period  
3. **Choose execution**: [[bollinger-bands]] for capital efficiency
4. **Size positions**: [[kelly-formula]] with half-Kelly safety factor
5. **Set stops**: 1.5-2× backtest max DD (catastrophe protection only)
6. **Monitor**: Re-test [[cointegration]] monthly, exit if breaking
7. **Fundamental overlay**: Why should this relationship persist? External factors that might break it?

For statistical tests, see [[statistical-tests-moc]]. For risk management, [[risk-management-moc]]. For comparison with momentum, [[momentum-trading]] and [[momentum-strategies-moc]].
