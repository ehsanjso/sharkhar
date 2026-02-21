---
description: >
  Statistical property where price series diffuses slower than random walk.
  Use to validate mean-reversion opportunities before risking capital.
  Essential prerequisite for profitable mean-reversion trading.
source:
  chapters: [2]
  key-insight: "Stationarity means prices have a preferred level; random walks don't"
---

# Stationarity

A stationary price series is one whose statistical properties don't change over time - it has constant mean, variance, and autocorrelation. More crucially for traders, stationarity implies prices revert to their mean rather than wandering infinitely far away like a [[geometric-random-walk]].

## What It Means for Trading

In a stationary series, extreme deviations from the mean are temporary and will correct. This is the foundation of [[mean-reversion]] strategies. Without stationarity, buying dips could mean catching a falling knife that never bounces.

The mathematical distinction: in a random walk, variance grows linearly with time (Var(t) ∝ t). For a stationary series, variance reaches a ceiling. Use [[variance-ratio-test]] to detect this difference empirically. The [[hurst-exponent]] provides another lens: H = 0.5 indicates random walk, H < 0.5 indicates mean reversion (stationarity), H > 0.5 indicates trending (momentum).

## When to Apply This Test

Before deploying [[mean-reversion]] capital, verify stationarity using:
- [[augmented-dickey-fuller-test]] (tests mean reversion directly)
- [[variance-ratio-test]] (compares short vs long-horizon variance)
- [[hurst-exponent]] (distinguishes mean reversion from momentum from random walk)

Don't confuse [[stationarity]] with [[cointegration]]. Individual stock prices are almost never stationary, but a portfolio combining two non-stationary stocks CAN be stationary if the stocks [[cointegration|cointegrate]]. Test portfolios with [[johansen-test]] or [[cointegrated-adf-test]].

## Practical Steps

1. **Collect sufficient data**: Need 250+ bars minimum for statistical power
2. **Run [[augmented-dickey-fuller-test]]**: Null hypothesis is "has unit root" (non-stationary)
3. **Check p-value**: Reject null if p < 0.05, confirming stationarity
4. **Calculate [[half-life-mean-reversion]]**: Tells you reversion speed
5. **Verify [[hurst-exponent]] < 0.5**: Confirms mean-reversion not momentum

## Pitfalls

**Regime changes**: A series can be stationary in your backtest period but become trending in the future. Stationarity tests tell you about the PAST, not the future. Always monitor ongoing performance.

**Seasonal stationarity**: Series may only be stationary during specific periods (e.g., [[intraday-mean-reversion]] during market open but not overnight). Test on the time frame you'll actually trade.

**Cointegration breakdowns**: Two stocks can [[cointegration|cointegrate]] for years then suddenly decouple due to fundamental changes. Oil prices breaking the GLD-GDX [[cointegration]] in 2008 is a classic example. Watch for external factors that might destroy relationships.

## Interpreting Test Statistics

The [[augmented-dickey-fuller-test]] produces a test statistic and p-value. More negative statistics indicate stronger mean reversion. Compare against critical values:
- 10% level: –2.57 (weak evidence)
- 5% level: –2.86 (standard threshold)
- 1% level: –3.43 (strong evidence)

For [[johansen-test]] on portfolios, you get TWO statistics: Trace and Eigen. Both must exceed critical values to confirm [[cointegration]], meaning the portfolio is stationary even though components aren't.

## Stationarity vs. Cointegration

[[stationarity|Stationary]] series: Price itself has constant mean/variance (rare for financial assets)

[[cointegration|Cointegrating]] series: Linear combination of non-stationary prices creates stationary portfolio (common, exploitable)

Most profitable mean-reversion trades exploit [[cointegration]] since individual asset prices rarely exhibit [[stationarity]]. But the math is identical once you've formed the portfolio - you're just trading a stationary synthetic instrument.

Proceed to [[mean-reversion-strategies-moc]] to see how to trade stationary series profitably, or explore [[johansen-test]] to learn how to construct stationary portfolios from non-stationary components.
