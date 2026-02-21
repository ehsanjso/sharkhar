---
description: >
  Two-step test for pair cointegration. Regress Y on X, then run ADF on residuals.
  More powerful than naive ADF on spread. Use for validating pairs before trading.
  Johansen test superior for 3+ instruments.
source:
  chapters: [2]
  key-insight: "CADF accounts for estimation error in hedge ratio; naive ADF doesn't"
---

# Cointegrated Augmented Dickey-Fuller Test

The CADF test properly validates [[cointegration]] between two price series by accounting for hedge ratio estimation error. It's the correct way to test pairs; naive ADF on raw spread is statistically invalid.

## Two-Step Procedure

**Step 1**: Regress Y(t) on X(t) to estimate [[hedge-ratio]] β
Y(t) = α + β×X(t) + error

**Step 2**: Run [[augmented-dickey-fuller-test]] on residuals
ADF test on error series from step 1

Critical values for CADF are MORE NEGATIVE than standard ADF because β was estimated from data. At 5% significance: CADF critical ≈ –3.37 vs ADF critical ≈ –2.86.

## When to Apply

Use CADF for:
- Two instruments only ([[pair-trading]])
- Testing if [[cointegration]] exists before deploying capital  
- Extracting both [[hedge-ratio]] and stationarity test in one procedure

Use [[johansen-test]] instead for 3+ instruments.

## Practical Steps

1. **Regress Y on X**: Store slope β and residuals e(t)
2. **Run ADF on e(t)**: Use CADF critical values (more stringent than normal ADF)
3. **Check p-value**: Reject null if p < 0.05, confirming [[cointegration]]
4. **Extract β**: Use regression slope as hedge ratio for trading
5. **Calculate [[half-life-mean-reversion]]**: From ADF coefficient

## CADF vs Naive ADF

**Wrong**: Form spread S = Y - X, run ADF on S (assumes β=1, often wrong)
**Wrong**: Form spread S = Y - β×X with arbitrary β, run ADF on S
**Right**: CADF - regress to find β, then ADF on residuals with correct critical values

The difference matters. Naive ADF has inflated Type I error (false positives). You'll think pairs cointegrate when they don't.

For complete [[pair-trading]] workflow, see [[mean-reversion-strategies-moc]].
