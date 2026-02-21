---
description: >
  Statistical test comparing short vs long-horizon variance. For random walks,
  variance scales linearly with time. For stationary series, long-horizon variance
  is less than proportional. Complements ADF test for mean reversion validation.
source:
  chapters: [2]
  key-insight: "Stationary series have variance ceiling; random walks don't"
---

# Variance Ratio Test

The variance ratio test detects [[mean-reversion]] by comparing variance across different time scales. Random walks have Var(k-period return) = k × Var(1-period return). [[stationarity|Stationary]] series violate this: long-horizon variance grows slower than linearly.

## How It Works

Calculate:
VR(k) = Var(k-period return) / (k × Var(1-period return))

**VR(k) = 1**: Random walk (variance scales linearly)
**VR(k) < 1**: Mean reversion (long-horizon variance suppressed)
**VR(k) > 1**: Momentum (long-horizon variance amplified)

For mean reversion, expect VR(10) ≈ 0.7-0.9, VR(20) ≈ 0.5-0.8.

## When to Apply

Use variance ratio test when:
- You want alternative to [[augmented-dickey-fuller-test]]
- Testing [[stationarity]] from variance perspective
- ADF results are borderline and you want confirmation
- You suspect [[hurst-exponent]] < 0.5 and want validation

## Integration with Other Tests

Variance ratio test addresses same question as [[augmented-dickey-fuller-test]] but from different angle. Use both:

1. **ADF**: Tests autocorrelation structure
2. **Variance Ratio**: Tests variance scaling
3. **[[hurst-exponent]]**: Continuous measure of memory

All three should agree. If ADF says stationary but VR says random walk, investigate further before trading.

For complete [[stationarity]] validation, see [[statistical-tests-moc]].
