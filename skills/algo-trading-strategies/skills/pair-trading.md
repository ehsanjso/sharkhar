---
description: >
  Trading strategy exploiting cointegration between two instruments. Long
  undervalued leg, short overvalued leg. Most robust with ETFs; treacherous
  with individual stocks due to fundamental divergence risk.
source:
  chapters: [3, 4, 5]
  key-insight: "ETF pairs stay cointegrated; stock pairs fall apart"
---

# Pair Trading

Pair trading creates market-neutral [[mean-reversion]] opportunities by exploiting [[cointegration]] between two related instruments. When their price ratio deviates from equilibrium, you simultaneously buy the cheap one and sell the expensive one, profiting when the relationship normalizes.

## Core Logic

Two instruments P1 and P2 [[cointegration|cointegrate]] if spread S = P2 – βP1 is [[stationarity|stationary]], where β is the [[hedge-ratio]]. When S deviates >2 standard deviations from its mean:

**Long P1, short P2** if S is too high (P2 overvalued relative to P1)
**Short P1, long P2** if S is too low (P1 overvalued relative to P2)

Exit when S returns to mean. This is [[mean-reversion]] applied to the synthetic instrument S rather than the individual prices.

## ETFs vs Stocks: A Critical Distinction

**[[etf-pairs]]** (EWA-EWC, GLD-GDX): Basket fundamentals change slowly. Once cointegrated, relationships persist for years. Out-of-sample success rate high.

**Stock pairs** (AAPL-MSFT, XOM-CVX): Individual company fundamentals change rapidly from management decisions, competition, news. Cointegration breaks down frequently out-of-sample. Out-of-sample success rate low.

The harsh reality: stock pairs that cointegrate in training period often decouple in test period. Portfolio of many stock pairs generates losses as "bad" pairs overwhelm "good" pairs. Unless you have fundamental insight into each company, avoid stock pairs.

## When to Apply

**Seek pairs from**:
- [[etf-pairs]]: Same sector (RTH-XLP retail/staples), same region (EWA-EWC Australia/Canada), commodity-producer (GLD-GDX gold/miners)
- [[currency-pairs]]: Similar fundamentals (AUD-CAD commodity currencies, EUR-GBP European economies)
- [[futures-calendar-spreads]]: Same underlying, different maturities (CL front vs back month)

**Avoid pairs of**:
- Individual stocks (fundamental divergence risk)
- Asynchronous closes (CL 2:30pm vs XLE 4pm creates false signals)
- Hard-to-borrow names ([[short-sale-constraints]] ruin hedge)

## Practical Steps

1. **Select candidates**: Common fundamentals (sector, economy, underlying commodity)
2. **Test cointegration**: [[cointegrated-adf-test]] for pairs or [[johansen-test]] for triplets+
3. **Extract hedge ratio β**: From CADF regression or Johansen eigenvector
4. **Calculate spread**: S = P2 – βP1 (or log prices for better behavior)
5. **Test spread stationarity**: Run [[augmented-dickey-fuller-test]] on S, require p < 0.05  
6. **Find half-life**: [[half-life-mean-reversion]] determines your holding period
7. **Deploy strategy**: [[bollinger-bands]] or [[linear-mean-reversion-strategy]] on spread S
8. **Monitor live**: Re-test cointegration monthly; exit if p-value > 0.05

## Hedge Ratio Methods

**Linear regression**: Regress P2 on P1, slope is β. Simple, fast. Used in [[cointegrated-adf-test]].

**[[johansen-test]]**: Finds optimal β via eigenvector. Accounts for both directions (P1→P2 and P2→P1). More powerful.

**[[kalman-filter]]**: Dynamic β that updates each period. Handles time-varying relationships. Best for [[currency-pairs]] and volatile markets.

**Equal dollar weights**: β = P1/P2 (unit hedge). Simpler than regression but suboptimal. Only use if empirical testing shows comparable performance.

## GLD-GDX Example: When Pairs Break

GLD (gold ETF) and GDX (gold miners) cointegrated strongly 2006-2008. Thesis: miners' primary asset is gold, so prices should move together.

July 2008: Cointegration BROKE. Oil prices spiked to $145/barrel. Mining costs exploded, GDX underperformed GLD despite gold prices rising.

Solution: Form triplet with USO (oil ETF). GLD-GDX-USO cointegrates 2006-2012. Oil price is the missing variable that broke the pair.

Lesson: Monitor external factors that might destroy relationships. When pair breaks, investigate WHY using [[fundamental-reasoning]], add missing variable to restore cointegration.

## Trading the Spread

**Log-price spread** (recommended): S = log(P2) – β×log(P1). Better statistical properties, symmetric up/down moves.

**Price spread**: S = P2 – β×P1. Simpler interpretation, but large-price stocks dominate.

**Ratio**: R = P2/P1. Only works for β = 1 (equal dollar weights). Fragile to outliers.

For most pairs, use log-price spread tested with [[cointegrated-adf-test]]. See [[hedge-ratio]] for sizing calculations.

## Pitfalls

**Divergence risk**: Fundamental changes destroy cointegration. Stock pairs especially vulnerable. Solution: Diversify across many pairs OR stick to [[etf-pairs]] with stable fundamentals.

**Short-sale constraints**: Can't short one leg → can't maintain hedge → catastrophic losses. Solution: Test if both legs readily borrowable, or use portfolio of 50+ stocks to dilute impact.

**Asynchronous data**: Futures close 2:30pm, ETF closes 4pm. Generates false signals. Solution: Use simultaneous data sources or trade only instruments with aligned hours.

**Intraday execution**: Pair trading stocks intraday faces tiny NBBO quote sizes (AAPL often 100 shares). Limit orders required, partial fills create unhedged exposure. Solution: Use small position sizes or trade ETFs with larger quotes.

**Overnight gaps**: Holding pairs overnight risks gap in one leg with no gap in other. Hedge breaks, loss exceeds stop-loss. Solution: Close all pairs before market close or buy protective options.

## Scaling and Extensions

**Equal capital pairs**: Start with P1 = P2 = $X. Adjust positions to maintain P1 = P2 after price changes. Simpler than hedge ratio approach.

**Triplets**: When pair breaks, add third instrument (GLD-GDX-USO). Use [[johansen-test]] to find optimal weights among three.

**Multiple timeframes**: Daily [[cointegration]] for direction, hourly spread for entry timing. Only enter when both timeframes agree.

**Dynamic hedging**: Use [[kalman-filter]] to update β daily instead of keeping constant. Handles evolving relationships.

## Currency Pairs Nuances

[[currency-pairs]] require careful calculation of returns since one unit of B.Q is worth different dollars than one unit of C.D.

**Same quote currency**: AUD.USD and CAD.USD - simpler, points have same dollar value.

**Different quote/base**: AUD.CAD is actually AUD.USD / USD.CAD. Must convert returns properly.

**Rollover interest**: Holding overnight accrues interest differential. Add to return calculation. See [[rollover-interest]].

For detailed currency mechanics, see [[currency-pairs]]. For futures specifics, see [[futures-calendar-spreads]].

## Integration with Concepts

Pair trading is practical application of [[cointegration]] to create [[mean-reversion]] opportunities in otherwise trending instruments. Success requires:
- Statistical validation: [[cointegrated-adf-test]] or [[johansen-test]]
- Execution tactics: [[bollinger-bands]] or [[linear-mean-reversion-strategy]]
- Risk management: [[stop-losses]] wider than backtest max, position sizing via [[optimal-leverage]]
- Fundamental overlay: [[fundamental-reasoning]] about why relationship should persist

For complete toolkit, see [[mean-reversion-strategies-moc]]. For ETF specifics, explore [[etf-pairs]]. For dynamic hedging, see [[kalman-filter]].
