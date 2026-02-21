---
description: >
  Pairs trading using ETFs instead of individual stocks. Superior to stock pairs
  due to slow-changing basket fundamentals. EWA-EWC, GLD-GDX, RTH-XLP are examples.
  Cointegration persists years out-of-sample unlike stock pairs.
source:
  chapters: [4]
  key-insight: "Baskets change slower than companies; ETF pairs stay cointegrated"
---

# ETF Pairs Trading

ETF pairs offer the most robust [[pair-trading]] opportunities because basket-level fundamentals change far slower than individual company fundamentals. While stock pairs frequently "fall apart" out-of-sample, ETF pairs cointegrate for years.

## Why ETFs Beat Stocks

**Stock pairs** (AAPL-MSFT, XOM-CVX):
- Company-specific news breaks [[cointegration]] (management change, product failure)
- High idiosyncratic risk not captured by sector correlation
- Fundamental divergence common  
- Out-of-sample failure rate: 60-80%

**ETF pairs** (EWA-EWC, GLD-GDX):
- Basket of 50-500 stocks smooths idiosyncratic shocks
- Fundamentals change only if entire economy/sector shifts  
- Cointegration more stable
- Out-of-sample success rate: 40-60% (still imperfect but far better)

## Classic ETF Pairs

**Country ETFs (same region):**
- EWA-EWC (Australia-Canada): Commodity economies, similar growth patterns
- EWG-EWU (Germany-UK): European economies
- EWJ-EWY (Japan-Korea): Asian exporters

**Sector ETFs (related industries):**
- RTH-XLP (Retail-Staples): Consumer spending overlap
- XLE-XLU (Energy-Utilities): Related to oil/gas prices  
- XLF-XLI (Financials-Industrials): Economic cycle correlation

**Commodity and Producers:**
- GLD-GDX (Gold-Gold Miners): Miners' value tied to gold reserves
- USO-XLE (Oil-Energy Stocks): Energy company revenues from oil

## GLD-GDX: Cautionary Tale

**2006-2008**: Strong [[cointegration]], profitable pairs trade
**July 2008**: Cointegration BROKE when oil spiked to $145/barrel
**Why**: Mining costs exploded, destroying relationship between gold price and miner profitability

**Solution**: Add USO (oil ETF) to create GLD-GDX-USO triplet. Use [[johansen-test]] for 3-instrument [[cointegration]]. Restored profitability 2006-2012.

**Lesson**: Always ask "what external factor might break this relationship?" Add that factor to your model.

## When to Apply

Test ETF pairs when:
- Countries/sectors have fundamental linkage (geography, commodity dependence, trade)
- Both ETFs liquid (volume >1M shares/day) for execution
- Clear economic story why they should move together
- You can identify variables that might break relationship (oil for GLD-GDX)

## Practical Steps

1. **Screen candidates**: Same sector, region, or related fundamentals
2. **Test [[cointegration]]**: [[cointegrated-adf-test]] for pairs, [[johansen-test]] for triplets  
3. **Check p-value**: Require p < 0.01 (stricter than 0.05) for pairs since you're testing many
4. **Extract [[hedge-ratio]]**: From regression or Johansen eigenvector
5. **Calculate [[half-life-mean-reversion]]**: Sets look-back for [[bollinger-bands]]
6. **Monitor ongoing**: Re-test [[cointegration]] monthly, exit if p > 0.10

## EWA-EWC Example

Australia and Canada both commodity exporters with similar economic structure. Should cointegrate.

**Test period**: Jan 2009 - Dec 2011  
**Hedge ratio**: Varies (use [[kalman-filter]] for dynamic or regression for static)
**Half-life**: ~20 days typically
**Entry**: [[bollinger-bands]] with 2σ threshold  
**Performance**: Consistent profitability across multiple studies

This pair exemplifies ideal ETF pair: clear fundamental story, persistent [[cointegration]], liquid instruments.

## Pitfalls

**Economic divergence**: Even countries in same region can diverge (Brexit → EWU-EWG cointegration weakened)

**Currency effects**: Country ETFs embed currency exposure. GBP/USD moves affect EWU returns independent of UK stocks. Can break [[cointegration]] when currencies diverge from trade fundamentals.

**Leverage/inverse ETFs**: Don't pair 2× or 3× leveraged ETFs with unlevered counterparts. [[leveraged-etf-rebalancing]] creates systematic drift destroying [[cointegration]].

**Synthetic ETFs**: Some ETFs use swaps not physical holdings. Different tracking error can affect [[cointegration]].

## Triple and Quad Portfolios

When pairs break, add third variable:
- GLD-GDX broken by oil → Add USO
- EWA-EWC might benefit from commodity index (DBC)  
- Currency pairs benefit from interest rate instruments

Use [[johansen-test]] to find optimal weights among 3-4 instruments. More degrees of freedom but also more ways to break.

## Comparison to Stock Pairs

**ETF pairs**:
- ✓ Stable relationships  
- ✓ Lower [[survivorship-bias]]
- ✓ Easier to short (ETFs rarely hard-to-borrow)
- ✓ Tight bid-ask spreads
- ✗ Lower returns (less volatility in spread)

**Stock pairs**:
- ✗ Frequent breakdowns
- ✗ High [[survivorship-bias]]  
- ✗ [[short-sale-constraints]]
- ✗ Wider spreads (especially small-caps)
- ✓ Higher returns when they work

For most traders, ETF pairs are superior risk-adjusted opportunity.

For complete [[pair-trading]] framework, see [[mean-reversion-strategies-moc]]. For testing, [[cointegrated-adf-test]] and [[johansen-test]]. For dynamic hedging, [[kalman-filter]].
