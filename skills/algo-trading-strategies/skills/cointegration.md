---
description: >
  Statistical relationship where linear combination of non-stationary series
  creates stationary portfolio. Use to construct mean-reverting pairs/baskets
  from individual trending instruments. Foundation of pairs trading.
source:
  chapters: [2, 3]
  key-insight: "Individual stocks trend; cointegrated portfolios mean-revert"
---

# Cointegration

Cointegration is the mathematical magic that transforms two or more trending price series into a stationary, mean-reverting portfolio. While individual assets follow random walks, their weighted combination exhibits [[mean-reversion]] - the basis of profitable pairs trading.

## How It Works

Two price series P1 and P2 [[cointegration|cointegrate]] if there exists a hedge ratio β such that:

Spread = P2 - βP1 is [[stationarity|stationary]]

Neither P1 nor P2 is stationary alone (they're random walks), but their spread reverts to a mean. Test spread with [[augmented-dickey-fuller-test]]. For 2+ series simultaneously, use [[johansen-test]] which finds optimal weights.

## When to Apply

Seek cointegration between:
- [[etf-pairs]] tracking similar economies (EWA-EWC for Australia-Canada)
- [[currency-pairs]] with similar fundamentals (commodity currencies)
- Commodity future vs producer stocks (GLD vs GDX, CL vs XLE)
- [[futures-calendar-spreads]] (same underlying, different maturities)
- Stocks in same sector with common factor exposure

## Practical Steps

1. **Select candidates**: Same sector, related economies, fundamental linkage
2. **Run [[cointegrated-adf-test]]**: Tests spread stationarity in one step
3. **Or use [[johansen-test]]**: Finds optimal portfolio weights for 2+ series
4. **Extract hedge ratio**: From regression (CADF) or eigenvector (Johansen)
5. **Calculate [[half-life-mean-reversion]]**: Determines holding period
6. **Deploy [[mean-reversion-strategies-moc]]**: Trade the stationary spread

## Why ETFs Over Stocks

[[etf-pairs]] are superior to stock pairs because basket fundamentals change slower than individual company fundamentals. EWA-EWC cointegration persisted 2009-2012+. Stock pairs frequently "fall apart" out-of-sample as company fortunes diverge.

GLD-GDX broke cointegration July 2008 when oil prices spiked, increasing mining costs and destroying the relationship. Adding USO (oil ETF) to form cointegrating triplet restored profitability.

## Pitfalls

**Out-of-sample breakdown**: Most painful pitfall. Pairs that cointegrate in training period often decouple in test period. Stocks are especially vulnerable. Always use walk-forward validation and monitor cointegration tests live.

**Fundamental shifts**: External factors can destroy relationships. Monitor news and macro variables that might break cointegration (oil prices for GLD-GDX, economic divergence for country ETFs).

**Short-sale constraints**: If you can't short one leg (hard-to-borrow stock, circuit breakers), you can't maintain hedge ratio. Diversified portfolio of 98 stocks (like SPY arbitrage) mitigates this.

**Synchronization issues**: Futures closing at 1:30 PM vs ETF at 4:00 PM creates false signals. Ensure contemporaneous data or trade instruments with aligned hours.

## Johansen vs CADF

[[cointegrated-adf-test|CADF]]: Two series only. Simple regression for hedge ratio. Fast computation.

[[johansen-test]]: 2-12 series. Finds optimal weights among multiple cointegrating relationships. More powerful but complex.

For pairs: CADF sufficient. For triplets+: Johansen necessary.

## Dynamic Relationships

Static hedge ratios from regression assume constant relationship. When relationships evolve, use [[kalman-filter]] to dynamically update hedge ratio and mean. Critical for [[currency-pairs]] and volatile markets.

## Cross-Asset Cointegration

**Futures vs ETF**: Extract [[roll-returns]] by pairing future with spot-tracking ETF (CL vs XLE). Future has roll return component; ETF has only spot return.

**Volatility vs index**: VX cointegrates with ES (equity index). VIX is mean-reverting but VX future isn't due to roll returns. Yet VX-ES spread mean-reverts.

For complete pairs trading strategies, see [[mean-reversion-strategies-moc]]. For statistical validation, explore [[johansen-test]] and [[cointegrated-adf-test]].
