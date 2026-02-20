---
description: >
  Classic mean-reversion strategy: long one security, short a related security, profit when their spread reverts to equilibrium. Use this when two assets share fundamental drivers but temporarily diverge.
source:
  chapters: [2, 3, 7]
  key-insight: "GLD/GDX cointegrated pair achieved Sharpe 2.3 (training), 1.5 (test) — excellent returns with market-neutral risk profile."
---

# Pair Trading

Pair trading is the archetypal statistical arbitrage strategy. You simultaneously buy one security and sell a related security, betting their price relationship will revert to its historical norm. When the spread is wide, it contracts. When narrow, it expands. You profit from the convergence.

## Core Concept

Pair trading exploits [[cointegration]]: two securities whose prices can't drift infinitely far apart due to shared fundamental drivers. Their spread forms a [[stationary]] series that oscillates around a mean.

Example from the book (GLD vs. GDX):
- GLD = gold ETF (tracks physical gold)
- GDX = gold miner ETF (companies that mine gold)
- Fundamental link: miners' value tied to gold price
- But prices don't move in lockstep — create trading opportunities

The spread: **GLD - hedgeRatio × GDX** reverts to its mean because both securities reflect the same underlying commodity (gold). Temporary dislocations from liquidity events, noise trading, or sector rotation create profit opportunities.

## Why It Works

**Fundamental linkage:** Companies in same industry face common drivers (oil price for energy stocks, interest rates for banks, consumer spending for retailers). Stock prices can diverge temporarily due to:
- Idiosyncratic news (one company's earnings, not sector-wide)
- Liquidity shocks (forced seller of one stock)
- Index rebalancing (mechanical buying/selling)
- Sentiment shifts (momentum traders favor one stock)

But fundamentals eventually reassert themselves. The temporarily cheap stock rises, expensive one falls, spread reverts.

**Market-neutral structure:** By being long and short, you eliminate market beta. If S&P 500 crashes 10%, both your long and short positions drop ~10%, net effect = near zero. You profit from **relative** performance, not absolute direction.

This is attractive because:
- Lower risk (no directional exposure to market crashes)
- Regulatory advantages (higher leverage allowed for hedged positions)
- Lower correlation to market (diversification benefit)

## Practical Steps

### 1. Find Cointegrated Pairs

Test for [[cointegration]] using the augmented Dickey-Fuller test (book Example 7.2):

```matlab
% Test GLD vs GDX
res = cadf(GLD_prices, GDX_prices, 0, 1);

% Output: t-statistic = -3.36
% 5% critical value = -3.343
% Conclusion: >95% probability of cointegration
```

Book's guidance: **Same industry group** is starting point (gold producers, regional banks, retailers). But not all industry peers cointegrate:
- GLD vs GDX: cointegrate (both track gold)
- KO vs PEP: do NOT cointegrate (different growth rates, markets, strategies)

Cointegration ≠ correlation (covered later).

### 2. Calculate Hedge Ratio

Determine how many shares of stock 2 to trade vs. stock 1:

```matlab
% Linear regression: GLD = hedgeRatio * GDX + spread
results = ols(GLD_prices, GDX_prices);
hedgeRatio = results.beta;  % 1.6766 for GLD/GDX

% The spread is then:
spread = GLD_prices - hedgeRatio * GDX_prices;
```

This spread should be [[stationary]] (mean-reverting). Plot it to verify (book Figure 7.4 shows GLD/GDX spread oscillating around constant mean).

### 3. Define Entry/Exit Rules

Standard approach from book Example 3.6:

**Entry:**
- When spread < mean - 2σ: Buy the spread (long GLD, short 1.6766 × GDX)
- When spread > mean + 2σ: Sell the spread (short GLD, long 1.6766 × GDX)

**Exit:**
- When spread crosses the mean (spread ≈ mean ± 1σ)
- Or hold for estimated half-life from [[exit-strategies]]

**Optimization:** Book Example 3.6 achieved Sharpe 2.3 with 2σ entry. After optimization, using 1σ entry improved to Sharpe 2.9 (training), 2.1 (test). But beware [[data-snooping-bias]] — validate via [[out-of-sample-testing]].

### 4. Calculate Position Sizes

Use [[kelly-formula]] based on backtest Sharpe:

With Sharpe 1.5 (test set), mean excess return 0.10 (10%), std dev 0.067:
- f = 0.10 / 0.067² = 22.3 (way too high)
- Half-Kelly: f = 11.15
- Constrained by leverage limits (retail = 2x): use f = 2

With $100K account, $200K in combined positions (long + short).

### 5. Manage Correlation Risk

Key assumption: pairs remain cointegrated into the future. But [[regime-switching]] can break cointegration:
- Merger/acquisition of one stock
- Fundamental business change (gold miner diversifies into copper)
- Regulatory changes affecting one company differently

Monitor the rolling cointegration t-statistic. If it weakens (t-stat moving toward zero), consider closing positions.

## Common Variations

**Index arbitrage:** S&P 500 future vs. basket of underlying stocks. Exploits temporary dislocations between derivative and underlying.

**ETF pairs:** Book Example 6.3 uses sector ETFs (OIH energy, RKH banks, RTH retail). ETFs generally more liquid than individual stocks, reducing [[transaction-costs]].

**Cross-asset pairs:** CAD/AUD currency pair (both commodity currencies, book mentions this cointegrates). Or gold futures vs. silver futures (both precious metals).

**Statistical pairs:** Not fundamental relationship, but empirical: two stocks historically cointegrated. More dangerous (relationship can break without warning).

## Cointegration vs. Correlation

Critical distinction from book Section 7.4:

**Correlation:** Measures whether daily returns move together. Two stocks can be highly correlated (returns move in same direction most days) but **not** cointegrated (prices drift apart over time).

**Cointegration:** Measures whether price levels stay within a bounded range. Two stocks can be cointegrated but show low daily correlation.

Book's artificial example (Figure 7.6):
- Stock A trends upward
- Stock B stays flat most days, occasionally jumps to keep spread near $1
- Daily correlation: low (B often doesn't move when A does)
- Cointegration: perfect (spread always returns to $1)

Real example: KO vs PEP
- Correlation: 0.48 (statistically significant)
- Cointegration: t-stat = -2.14 (< 10% critical value, probably NOT cointegrated)

You want cointegration for pair trading, not correlation. Correlated stocks might drift apart; cointegrated stocks are bound together.

## Pitfalls

**Survivorship bias:** Major risk from the book. If your historical database excludes bankrupt/acquired stocks:
- You'll backtest buying stocks that crashed (then delisted)
- And shorting stocks that soared (then got acquired)
- Both missing from data = artificially inflated profits

Solution: Use [[survivorship-bias]]-free databases or test on recent periods.

**Bad data:** [[mean-reversion]] strategies (including pairs) are vulnerable to spurious quotes. A single bad low price triggers entry; next correct price shows apparent profit. The book emphasizes: scrub data for outliers.

**Transaction costs:** Pair trading has **double** the [[transaction-costs]] (buy one stock, sell another). With frequent rebalancing, costs compound. Book Example: always model 5-10 bp one-way on both legs.

**Correlation breakdown:** During crises, correlations spike to 1.0 as everything crashes together. Your "market-neutral" pair suddenly has beta = 1. August 2007 quant meltdown illustrated this: gold and gold miners should be cointegrated, but both got hammered simultaneously by forced institutional selling.

**Stop loss trap:** The book explicitly warns against stop loss for [[mean-reversion]]. If you enter when spread is at -3σ and stop loss at -4σ, you're exiting at the worst possible moment (maximum deviation). Only exit on fundamental regime change (news indicates cointegration broken).

## Performance Metrics

Book Example 3.6 (GLD/GDX):
- Training set (2006-2007): Sharpe 2.3, Calmar 2.3
- Test set (remaining): Sharpe 1.5

This is **excellent**. Most institutional pairs achieve Sharpe 0.8-1.2. The book notes GLD/GDX may have higher Sharpe because:
- Strong fundamental linkage (gold price)
- Less institutional competition (most funds focus on stocks, not commodity ETFs)
- Recent pair (GLD launched 2004, GDX 2006 — less time for edge to decay)

## Example: Currency Pair

Book mentions CAD/AUD (Canadian dollar / Australian dollar) as stationary cross-currency rate. Both are commodity currencies (Canada = oil, Australia = metals/agriculture). When one weakens relative to other, it tends to revert because commodities are global markets.

Implementation identical to equity pairs:
- Test for cointegration: Yes (both track global commodity cycle)
- Calculate hedge ratio: For currencies, usually 1:1 (trade equal notional amounts)
- Entry: When CAD/AUD > mean + 2σ, sell CAD/AUD
- Exit: When CAD/AUD crosses mean

## Related Skills

Foundation:
- [[cointegration]] — Statistical test for pair validity
- [[stationarity]] — Property that enables mean reversion
- [[mean-reversion]] — General strategy class

Backtesting:
- [[backtesting]] — How to test pairs without self-deception
- [[out-of-sample-testing]] — Validating hedge ratio and thresholds
- [[survivorship-bias]] — Major threat to pair trading backtests
- [[data-snooping-bias]] — From optimizing entry/exit thresholds

Execution:
- [[transaction-costs]] — Pairs have 2x the costs (both legs)
- [[kelly-formula]] — Sizing the pair position optimally
- [[exit-strategies]] — When to close mean-reverting positions

Advanced topics:
- [[regime-switching]] — Detecting when cointegration breaks
- [[factor-models]] — Alternative approach to finding related securities

Pair trading is "one of the most popular statistical arbitrage strategies" per the book. Why? It combines:
- Clear theoretical foundation ([[cointegration]])
- Market-neutral risk profile (lower volatility)
- High Sharpe ratios (1.5-2.5 achievable)
- Scalable (can trade hundreds of pairs simultaneously)

Start with the book's GLD/GDX example. Once that works, expand to other commodity pairs, sector ETFs, or individual stock pairs in same industries. Just always test for [[cointegration]] first — correlation alone is not enough.
