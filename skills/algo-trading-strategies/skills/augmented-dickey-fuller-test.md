---
description: >
  Statistical test for mean reversion in price series. Use to validate
  stationarity before deploying mean-reversion strategies. Null hypothesis
  is non-stationarity (unit root); rejection confirms mean-reversion potential.
source:
  chapters: [2]
  key-insight: "ADF test tells you if yesterday's price predicts today's return"
---

# Augmented Dickey-Fuller Test

The ADF test answers one question: Does this price series revert to its mean, or does it wander randomly forever? It's the statistical gatekeeper for [[mean-reversion]] strategies - pass this test before risking capital.

## How It Works

The ADF test runs a regression: ΔP(t) = λP(t-1) + β + α(t) + lags + noise

Where the coefficient λ tells the story:
- λ = 0: Pure random walk (no mean reversion)
- λ < 0: Mean reversion (more negative = faster reversion)
- λ > 0: Explosive process (run away!)

The test statistic measures how significantly negative λ is. The null hypothesis is λ = 0 (unit root, i.e., non-[[stationarity|stationary]]). You WANT to reject this null with p-value < 0.05.

## When to Apply

Run ADF before trading:
- Single instruments you believe mean-revert
- Spreads from [[pair-trading]] (stock pairs, [[etf-pairs]], [[currency-pairs]])
- [[futures-calendar-spreads]] between different contract months
- Any [[mean-reversion]] candidate from [[cointegration]] construction

Don't waste time on:
- Individual stock prices (almost always random walks)
- Indices over long periods (trending, not mean-reverting)
- Instruments where you're trading [[momentum-trading]] not mean-reversion

## Practical Steps

1. **Gather data**: 250+ daily bars minimum for statistical power
2. **Run ADF test**: Most software packages provide this (statsmodels in Python, adftest in MATLAB)
3. **Check test statistic**: More negative = stronger mean reversion. Compare against critical values:
   - –2.57 (10% significance)
   - –2.86 (5% significance, standard threshold)
   - –3.43 (1% significance, strong evidence)
4. **Examine p-value**: Reject null if p < 0.05, confirming [[stationarity]]
5. **Calculate [[half-life-mean-reversion]]**: λ from the regression gives half-life = –log(2)/λ
6. **Set look-back period**: Use half-life to choose moving average period for trading

## Interpreting Results

**Test statistic = –3.2, p = 0.02**: Strong mean reversion. Half-life around 20 days if λ ≈ –0.035. Use [[bollinger-bands]] with 20-day look-back.

**Test statistic = –2.1, p = 0.25**: Fails to reject random walk. Do NOT trade mean-reversion on this series.

**Test statistic = –1.5, p = 0.55**: Possibly [[momentum-trading]] candidate. Check [[hurst-exponent]] > 0.5.

## Pitfalls

**Data-snooping**: Testing hundreds of pairs and trading only those that pass ADF invites [[data-snooping-bias]]. The few that pass by chance won't perform out-of-sample. Use training/test split or require CADF p-value << 0.05.

**Lag selection**: ADF test includes lagged returns to capture autocorrelation. Too few lags miss dynamics; too many lags reduce statistical power. Use AIC/BIC criteria or default to √(T) lags where T is sample size.

**Structural breaks**: If the series experienced a [[regime-change]] mid-sample, ADF test is unreliable. Split your data at suspected break points and test each regime separately.

**Frequency matters**: Daily bars might show mean reversion while monthly bars show trending, or vice versa. Test on the time frame you plan to trade.

## ADF vs. Other Tests

[[augmented-dickey-fuller-test|ADF]] tests mean reversion directly. [[variance-ratio-test]] and [[hurst-exponent]] test [[stationarity]] from different angles. For pairs/portfolios, use [[cointegrated-adf-test]] (CADF) or [[johansen-test]] instead of raw ADF.

All these tests assume the relationship was stable in your sample period. None can predict future [[regime-change]]. Complement statistical tests with [[fundamental-reasoning]] about why the mean reversion SHOULD persist.

## Pairs and Portfolios

For two cointegrating series, don't run ADF on each separately - they're both non-stationary. Instead:
1. Regress Y on X to get hedge ratio β
2. Form spread S = Y - βX  
3. Run ADF on spread S
4. Or use [[cointegrated-adf-test]] which does this in one step

For 3+ instruments, [[johansen-test]] is superior since it finds optimal portfolio weights to create [[stationarity]].

Once ADF confirms mean-reversion, proceed to [[mean-reversion-strategies-moc]] for execution tactics, or examine [[half-life-mean-reversion]] to optimize your look-back period and expected holding time.
