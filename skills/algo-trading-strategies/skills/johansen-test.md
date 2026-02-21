---
description: >
  Multivariate cointegration test for 2+ instruments. Use to find optimal
  portfolio weights that create stationarity from non-stationary components.
  Superior to CADF for triplets; provides eigenvector hedge ratios.
source:
  chapters: [2, 3]
  key-insight: "Johansen finds the hidden stationary portfolio in your asset universe"
---

# Johansen Test

The Johansen test answers: "What portfolio weights create a [[stationarity|stationary]] combination from these trending price series?" It's the multivariate extension of [[cointegrated-adf-test]], capable of handling 2-12 instruments simultaneously and finding optimal [[hedge-ratio|hedge ratios]].

## How It Works

Given N price series (stocks, ETFs, futures), Johansen finds eigenvectors representing portfolios that are stationary even though individual components aren't. The test returns:

**Trace statistic** & **Eigen statistic**: Test if K cointegrating relationships exist
**Eigenvectors**: Portfolio weights for each cointegrating relationship
**Eigenvalues**: Strength of each relationship (larger = stronger [[cointegration]])

You typically use the eigenvector with largest eigenvalue - it represents the most stable [[mean-reversion|mean-reverting]] portfolio.

## When to Apply

Use Johansen when:
- Testing 3+ instruments for [[cointegration]] (CADF only handles pairs)
- Want optimal weights, not just any cointegrating combination
- Building diversified [[pair-trading]] portfolio with multiple legs
- [[etf-pairs]] or [[currency-pairs]] where you suspect triplets cointegrate better than pairs

Don't use when:
- Only 2 instruments: [[cointegrated-adf-test]] simpler and equivalent
- >12 instruments: Computational issues, use dimensional reduction first
- Insufficient data: Need 250+ bars minimum, preferably 500+

## Practical Steps

1. **Select instruments**: 2-12 candidates with fundamental linkage
2. **Collect data**: Log prices, minimum 250 days, aligned dates
3. **Run Johansen test**: Specify deterministic terms (constant vs trend)
4. **Check statistics**: Both Trace and Eigen must exceed critical values
5. **Count relationships**: r=0 means none, r=1 means one cointegrating portfolio exists, etc.
6. **Extract eigenvector**: First column (largest eigenvalue) gives optimal weights
7. **Interpret weights**: These are CAPITAL allocations if using log prices
8. **Form spread**: S = w₁×log(P₁) + w₂×log(P₂) + ...
9. **Verify stationarity**: Run [[augmented-dickey-fuller-test]] on spread S
10. **Calculate [[half-life-mean-reversion]]**: Determines your holding period

## Interpreting Results

```
Trace Statistic: 15.87 vs Critical Value 13.43 (95%) ✓
Eigen Statistic: 9.67 vs Critical Value 14.26 (95%) ✗
```

Result: ONE cointegrating relationship exists (r=1). Trace exceeded critical value but second-largest Eigen didn't, confirming only one stable portfolio.

**Eigenvector**: [1.09, -105.56]
Interpretation: Form portfolio S = 1.09×log(stockPortfolio) - 105.56×log(SPY). These are dollar allocations, not share counts. Long $1.09 of stocks for every $105.56 short SPY.

##Deterministic Terms

**No constant, no trend**: Rare. Implies spread has mean=0 and no drift.
**Constant, no trend**: Most common. Spread has non-zero mean but doesn't drift.
**Constant and trend**: Spread has linear trend. Unusual and problematic for trading.

Default to "constant, no trend" unless you have specific reason otherwise.

## GLD-GDX-USO Example

**Problem**: GLD (gold) and GDX (miners) cointegrated 2006-2008, broke in July 2008 when oil spiked.

**Hypothesis**: Adding USO (oil) restores [[cointegration]] by capturing the missing variable (energy costs).

**Test**: Run Johansen on [GLD, GDX, USO] from 2006-2012:
- Trace stat = 15.87 > 13.43 critical (95%) ✓
- r=1: One cointegrating relationship exists

**Eigenvector**: [gold_weight, miners_weight, oil_weight]

**Strategy**: Trade the spread S = eigenvector · [log(GLD), log(GDX), log(USO)]. Use [[bollinger-bands]] or [[linear-mean-reversion-strategy]] on S.

Result: Profitable 2006-2012 despite breakdown of simple GLD-GDX pair.

## Capital Weights vs Share Ratios

Johansen eigenvectors represent CAPITAL allocation, not number of shares, when using log prices:

**Eigenvector [1.0, -1.5]** means:
- Allocate $1 long to instrument 1
- Allocate $1.50 short to instrument 2

NOT 1 share of instrument 1 vs 1.5 shares of instrument 2.

To convert to shares: Weight[i] / Price[i] gives share count for instrument i.

## Pitfalls

**Eigenvector signs**: Johansen can flip eigenvector signs arbitrarily (multiply by -1). Always check if your portfolio makes economic sense. GLD positive, GDX negative makes sense (long gold, short miners). Opposite doesn't.

**Multiple relationships**: If r>1, you have multiple cointegrating portfolios. Usually trade only the first (largest eigenvalue). Others may be noisier or less interpretable.

**Non-stationary results**: Just because Johansen says "cointegrated" doesn't guarantee tradability. Always verify the spread S passes [[augmented-dickey-fuller-test]] with p<0.05. Rarely, Johansen gives false positives.

**Out-of-sample breakdown**: [[cointegration]] found in-sample often disappears out-of-sample. Use walk-forward testing. Monitor Johansen test on rolling window; stop trading if p-value exceeds 0.10.

**Data alignment**: Asynchronous closes (CL futures 2:30pm vs XLE stocks 4pm) create false cointegration signals. Ensure contemporaneous data.

**Lag selection**: Johansen requires specifying number of lags (like ADF). Default to √T lags where T is sample size, or use AIC/BIC criteria. Too few lags miss dynamics; too many lose power.

## Johansen vs CADF

**For 2 instruments**:
- [[cointegrated-adf-test|CADF]]: Simpler, faster, gives same answer
- [[johansen-test|Johansen]]: More complex, handles both directions of causality

**For 3+ instruments**:
- CADF: Can't handle triplets directly (need to pair-wise test, suboptimal)
- Johansen: Finds optimal weights among all instruments simultaneously

For pairs, use CADF unless you need bidirectional causality testing. For triplets+, Johansen is necessary.

## Constrained Optimization Alternative

If you want long-only portfolio (all weights positive), Johansen won't help since it allows shorts. Instead:
1. Use Johansen or CADF to identify cointegrating instruments
2. Use constrained optimization (genetic algorithm, simulated annealing) to minimize ∑|Portfolio - SPY| subject to all weights ≥ 0

This finds long-only portfolio that most closely tracks (cointegrates with) your target.

## Dynamic Weights

Johansen gives static weights from your training period. If relationships evolve, use [[kalman-filter]] to dynamically update eigenvector:
- Run Johansen on training data for initial weights
- Each period, use Kalman filter to update weights based on recent deviations
- Adapt to slowly changing relationships without full retraining

## Integration with Trading

Johansen is discovery tool, not trading system. After finding [[cointegration]]:
1. Extract eigenvector as [[hedge-ratio]] weights
2. Form spread S using those weights  
3. Verify S is [[stationarity|stationary]] via [[augmented-dickey-fuller-test]]
4. Calculate [[half-life-mean-reversion]] to set look-back
5. Deploy [[mean-reversion]] tactics: [[bollinger-bands]] or [[linear-mean-reversion-strategy]]

For pairs, see [[pair-trading]]. For ETF specifics, [[etf-pairs]]. For complete mean-reversion toolkit, [[mean-reversion-strategies-moc]].
