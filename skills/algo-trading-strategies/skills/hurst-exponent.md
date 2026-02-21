---
description: >
  Measure of long-term memory in time series. H < 0.5 = mean reversion,
  H = 0.5 = random walk, H > 0.5 = trending/momentum. Use to classify
  whether to apply mean-reversion or momentum strategies.
source:
  chapters: [2]
  key-insight: "Hurst tells you the trading paradigm: reversion vs momentum vs noise"
---

# Hurst Exponent

The Hurst exponent H quantifies the long-term memory and trending behavior of a time series. It's a single number that tells you whether prices exhibit [[mean-reversion]] (H < 0.5), [[momentum-trading]] (H > 0.5), or are just random walks (H = 0.5).

## Interpretation

**H < 0.5**: [[mean-reversion|Mean-reverting]] series. Negative autocorrelation. Price tends to reverse after a move. Deploy [[mean-reversion-strategies-moc]].

**H = 0.5**: Geometric random walk. No memory. Past doesn't predict future. No edge.

**H > 0.5**: Trending/momentum. Positive autocorrelation. Price tends to continue in same direction. Deploy [[momentum-strategies-moc]].

**H = 0.7**: Strong momentum (stock indices in bull markets)
**H = 0.4**: Mean reversion (spreads, pairs)  
**H = 0.3**: Strong mean reversion (intraday reversals)

## When to Apply

Use Hurst to:
- **Screen instruments**: H < 0.5 → test for [[stationarity]], H > 0.5 → test momentum correlations
- **Classify strategies**: Does this pair mean-revert or trend?
- **Compare opportunities**: Lower H (further from 0.5) = stronger pattern
- **Detect [[regime-change]]**: H flipping from 0.3 to 0.7 = mean-reversion broke

## Practical Steps

1. **Collect sufficient data**: 250+ observations minimum, 500+ better  
2. **Calculate Hurst exponent**: Use R/S method or DFA
3. **Interpret**: H < 0.5 (mean reversion), H > 0.5 (momentum), near 0.5 (noise)
4. **Verify significance**: Run Monte Carlo to test if H significantly differs from 0.5
5. **Choose strategy paradigm**: Mean reversion or momentum based on H

## Hurst vs Other Tests

**[[augmented-dickey-fuller-test]]**: Tests mean reversion directly, gives p-value
**[[variance-ratio-test]]**: Tests variance scaling with time
**[[hurst-exponent]]**: Continuous measure, shows strength not just binary yes/no

All three test similar property ([[stationarity]]) from different angles. Hurst provides intuitive continuous measure; ADF provides statistical significance.

Use Hurst for screening and intuition. Use ADF for statistical validation before trading.

## Pitfalls

**Time scale dependence**: H changes with frequency. Daily H might be 0.6 (momentum), hourly H might be 0.4 (mean reversion). Test at your trading frequency.

**Unstable estimates**: H from 100 observations is noisy. Need 250+ for reliability.

**Structural breaks**: If regime changed mid-sample, H from full sample is meaningless. Split at suspected break and test each regime separately.

For classification and screening, Hurst is valuable. For trading decisions, combine with [[augmented-dickey-fuller-test]] for statistical rigor.
