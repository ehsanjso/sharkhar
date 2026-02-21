---
description: >
  Map of Content for all statistical tests used to validate trading hypotheses.
  Navigate this to find the right test for your strategy type. Tests fall into
  three categories: stationarity, momentum, and cointegration.
source:
  chapters: [2]
  key-insight: "Test before trading; mathematics beats intuition"
---

# Statistical Tests - Map of Content

Before deploying capital, validate your hypothesis with proper statistical tests. This map organizes all tests by what they detect and when to use them.

## Tests for Mean Reversion (Stationarity)

These tests answer: "Does this price series revert to its mean?"

**[[augmented-dickey-fuller-test]]** (ADF)
Primary test for [[stationarity]]. Null hypothesis is unit root (random walk). Rejection with p < 0.05 confirms mean-reversion. Use for single instruments or spreads. Most widely used test.

**[[variance-ratio-test]]**  
Compares short-horizon vs long-horizon variance. Stationary series: long variance less than proportional to time. Complements ADF by testing from variance perspective instead of autocorrelation.

**[[hurst-exponent]]**
H < 0.5 indicates [[mean-reversion]], H = 0.5 is random walk, H > 0.5 indicates [[momentum-trading]]. Provides continuous measure of mean-reversion strength, not just binary reject/accept. Useful for ranking candidates.

## Tests for Pairs and Portfolios

These extend stationarity tests to multiple instruments:

**[[cointegrated-adf-test]]** (CADF)
Two-step ADF for pairs. First regress Y on X to get [[hedge-ratio]], then run ADF on residuals. More powerful than testing spread naively. Use for pairs trading validation.

**[[johansen-test]]**
Ultimate test for 2+ instruments. Finds optimal portfolio weights to create [[stationarity]]. Returns eigenvectors (hedge ratios) and eigenvalues (strength of relationships). Use when you need optimal weights for 3+ instruments.

## Tests for Momentum

These answer: "Do past returns predict future returns in the same direction?"

**Autocorrelation of returns**
Positive correlation between lagged and future returns indicates [[time-series-momentum]]. Test multiple lag/hold period combinations to find optimal time horizons.

**[[hurst-exponent]] > 0.5**
Indicates trending behavior (momentum). Same test as for mean-reversion, different threshold. Value of 0.7+ suggests strong trends.

## Half-Life and Timing

**[[half-life-mean-reversion]]**
After confirming [[stationarity]], half-life tells you speed of reversion. Dictates your look-back period for moving average and expected holding time. Critical for [[mean-reversion]] strategy tuning.

## Statistical Significance

**[[hypothesis-testing]]**
Framework for determining if backtest results are statistically significant or luck. Uses null hypothesis (strategy has zero returns), test statistic, and p-value. Requires understanding [[sharpe-ratio]] and return distributions.

**[[monte-carlo-testing]]**
Generate random trades with same return distribution but shuffled order. If strategy beats 95% of random permutations, it has skill not luck. More reliable than analytic p-values for non-Gaussian returns.

## How to Choose the Right Test

**For single instrument mean-reversion**: Start with [[augmented-dickey-fuller-test]]. If passes, calculate [[half-life-mean-reversion]]. Confirm with [[hurst-exponent]] < 0.5.

**For pairs (2 instruments)**: Use [[cointegrated-adf-test]] for simplicity or [[johansen-test]] for optimal hedge ratio. Verify [[half-life-mean-reversion]] of spread.

**For portfolios (3+ instruments)**: [[johansen-test]] only. Creates optimal stationary portfolio from multiple cointegrating relationships. Extract hedge ratios from eigenvector.

**For momentum detection**: Test return autocorrelation at multiple lags. Calculate [[hurst-exponent]]. Look for H > 0.5 or positive correlation coefficients with low p-values.

**For statistical validation**: Use [[hypothesis-testing]] on backtest Sharpe ratio, or run [[monte-carlo-testing]] by shuffling trade order. Require p < 0.05 (or < 0.01 if testing many strategies).

## Common Mistakes

**Testing only in-sample**: Run tests on training data, then VERIFY on hold-out test data. Cointegration found in-sample often disappears out-of-sample.

**Wrong test for question**: Don't use ADF to test momentum, or correlation to test pairs. Match test to hypothesis.

**Ignoring p-values**: Test statistic alone insufficient. Must check p-value to quantify statistical significance. Standard threshold is p < 0.05.

**Testing too many combinations**: [[data-snooping-bias]]. If you test 100 pairs, 5 will appear cointegrated by chance (p < 0.05). Require much lower p-value (< 0.01) or use hold-out validation.

## Integration with Strategies

After tests confirm your hypothesis:
- [[mean-reversion]] detected → Deploy [[mean-reversion-strategies-moc]]
- [[cointegration]] detected → Trade pairs using [[etf-pairs]] or [[currency-pairs]]
- Momentum detected → Deploy [[momentum-strategies-moc]]
- No pattern detected → Move to next candidate, don't force-fit strategy

Tests are gatekeepers, not guarantees. They tell you about PAST behavior. [[regime-change]] can make stationary series trend or trending series revert. Combine statistical tests with [[fundamental-reasoning]] about why the pattern should persist.

For mean-reversion strategy implementation after passing tests, see [[mean-reversion-strategies-moc]]. For momentum strategies, see [[momentum-strategies-moc]]. For understanding what tests cannot predict, explore [[regime-change]] and [[backtesting-pitfalls]].
