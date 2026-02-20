---
description: >
  Trading strategy based on prices returning to equilibrium after temporary dislocations. Use this when securities deviate from fair value due to liquidity needs, noise, or temporary shocks — not fundamental changes.
source:
  chapters: [2, 7]
  key-insight: "Mean reversion is more prevalent than trending, but beware: backtests inflate performance via survivorship bias and bad data."
---

# Mean Reversion

Mean reversion strategies bet that prices oscillating away from equilibrium will snap back. When a stock (or spread) trades below its historical mean, buy it. When above, sell or short it. The profit comes from the return to normal.

## Why It Works

Prices deviate from fair value for three main reasons, all temporary:

**1. Liquidity shocks:** A large institutional seller needs to unload quickly, pushing the price below fair value. Once the selling pressure ends, the price recovers. The seller paid for immediacy; you collect the premium for providing it.

**2. Noise trading:** Uninformed traders create random price movements uncorrelated with fundamentals. These cancel out over time, and prices revert to reflect actual value.

**3. Overreaction:** Markets temporarily overreact to news, then correct. Behavioral finance shows investors systematically misjudge probabilities and magnitudes of events.

Critical distinction: Mean reversion works when **fundamentals haven't changed**. If a company's earnings outlook deteriorates, the stock **should** trade lower. That's not mean reversion; that's repricing. This is why the book emphasizes: unless expected earnings changed, assume prices mean revert.

## When to Apply

Use mean reversion when:
- Securities have a stable fundamental relationship (like [[pair-trading]] in the same industry)
- Price moves lack accompanying news or fundamental catalysts
- Historical [[stationarity]] or [[cointegration]] is demonstrable
- You can identify a clear "fair value" reference (mean price, spread, or ratio)

The book highlights [[pair-trading]] as the archetypal mean-reversion strategy: GLD (gold ETF) vs. GDX (gold miner ETF) exhibit [[cointegration]] — their spread reliably reverts to a stable mean.

## Practical Steps

**1. Identify mean-reverting securities:**
- Test for [[stationarity]] (price doesn't drift infinitely away)
- Or test for [[cointegration]] (combination of two non-stationary prices is stationary)
- Book Example 7.2: GLD/GDX pass cointegration test with >95% confidence

**2. Define the spread or ratio:**
- For pairs: spread = price₁ - hedgeRatio × price₂
- Book determines hedgeRatio via regression (GLD = 1.6766 × GDX + spread)
- Or use ratio = price₁ / price₂

**3. Calculate entry thresholds:**
- Standard approach: enter when spread is ±2 standard deviations from mean
- Book Example 3.6: Sharpe 2.3 (training), 1.5 (test) with 2σ thresholds
- Optimization: try 1σ entry → improved to Sharpe 2.9 (training), 2.1 (test)

**4. Set exit conditions:**
- Mean reversion to historical mean (spread crosses mean)
- Or use ±0.5σ as tighter exit
- Or hold for estimated half-life (see [[exit-strategies]])

**5. Size positions:**
- Use [[kelly-formula]] based on backtested Sharpe
- Account for [[transaction-costs]] (mean reversion trades more frequently than momentum)

## Calculating Half-Life

The book introduces the Ornstein-Uhlenbeck formula to estimate optimal holding period:

**dz(t) = -θ(z(t) - μ)dt + dW**

where z(t) is the spread, μ is its mean, and dW is noise.

Estimate θ via linear regression:
```matlab
dz = spread(2:end) - spread(1:end-1);
prevSpread = spread(1:end-1) - mean(spread);
theta = regress(dz, prevSpread);
halfLife = -log(2) / theta;
```

Book Example 7.5 (GLD/GDX): **half-life ≈ 10 days**. This is how long to expect the spread to revert halfway to its mean. Use this as your expected holding period.

## Pitfalls

**Survivorship bias (critical):** Databases missing bankrupt or acquired stocks artificially inflate mean-reversion backtests. Why? You'd backtest buying stocks that crashed (then went bankrupt, missing from data) and shorting stocks that spiked (then got acquired, missing from data). Both would show fake profits.

Solution: Pay for [[survivorship-bias]]-free data, or backtest on recent periods where delisting is less common.

**Bad data:** Price errors are more dangerous for mean reversion than [[momentum-strategies]]. A spurious low quote triggers a buy signal; the next correct quote creates apparent profit. Always scrub historical data for outliers (check any returns >4 standard deviations for news confirmation).

**Regime change:** If fundamentals **do** shift, prices won't revert. The book's warning: when a company announces earnings that change expectations, you're no longer in a mean-reverting regime. You're in a [[momentum-strategies]] regime. Exit immediately.

**Transaction costs:** The book's Example 3.7 shows mean-reversion destroyed by costs. Strategy had Sharpe 0.25 before costs, -3.19 after 5bp one-way costs. Mean reversion trades frequently; costs compound quickly. Always model realistic [[transaction-costs]].

**Stop loss harmful:** The book emphasizes: **don't use stop loss for mean reversion**. By definition, you're entering when price is far from mean. A stop loss exits at maximum deviation — the worst possible time. Exception: news-driven fundamental change (exit immediately regardless of loss).

## Mean Reversion vs. Momentum

Key differences per the book:

**Competition impact:**
- Mean reversion: Competition gradually eliminates arbitrage opportunities → diminishing returns to zero
- [[momentum-strategies]]: Competition shortens time horizon → strategies still work but on faster timeframes

**Exit strategy:**
- Mean reversion: Exit at mean crossing or profit target via [[exit-strategies]]
- Momentum: Exit when trend reverses (often fixed holding period)

**Stop loss:**
- Mean reversion: Usually harmful (exiting at worst point)
- Momentum: Often beneficial (trend reversed, cut losses)

## Example Strategies

**Simple contrarian (Book Example 3.7):**
- Buy stocks with lowest previous-day return in S&P 500
- Short stocks with highest previous-day return
- Results: Works on small/mid-caps, fails on large-caps after costs
- Sharpe before costs: 4.43 (opening execution)
- Sharpe after costs: 0.78 (still profitable)

**Pair trading (Book Example 3.6):**
- Long GLD, short 1.6766 × GDX when spread <-2σ
- Short GLD, long 1.6766 × GDX when spread >+2σ
- Exit when spread within 1σ
- Sharpe: 2.3 (training), 1.5 (test) — excellent even with modest [[capacity]]

**Sector rotation:**
- Mean reversion among sector ETFs (energy, financials, retail)
- Book Example 6.3: Optimize allocation via [[kelly-formula]] across OIH, RKH, RTH
- Portfolio Sharpe: 0.48

## Related Skills

Core concepts:
- [[stationarity]] — Mathematical property enabling mean reversion
- [[cointegration]] — Finding stationary combinations of non-stationary prices
- [[pair-trading]] — Classic mean-reversion application

Validation:
- [[backtesting]] — Testing mean reversion without self-deception
- [[survivorship-bias]] — Biggest threat to mean-reversion backtests
- [[out-of-sample-testing]] — Avoiding [[data-snooping-bias]]

Execution:
- [[exit-strategies]] — When to close mean-reverting positions
- [[transaction-costs]] — Can destroy mean-reversion profits
- [[kelly-formula]] — Optimal sizing for mean-reverting strategies

Related strategies:
- [[momentum-strategies]] — The opposite regime
- [[regime-switching]] — Detecting transitions between mean reversion and momentum
- [[seasonal-trading]] — Can be mean-reverting or momentum

The book's bottom line: Mean reversion is more common than trending, **but** backtesting it requires extreme care. Use clean data, account for survivorship bias, model realistic costs, and validate via [[out-of-sample-testing]]. Done right, mean-reversion strategies can achieve Sharpe ratios of 2.0+ with manageable drawdowns.
