---
description: >
  Statistical property where non-stationary price series combine to form a stationary spread. Use this to identify valid pairs for mean-reversion trading — the mathematical foundation of statistical arbitrage.
source:
  chapters: [7]
  key-insight: "Cointegration ≠ correlation. Correlated stocks might drift apart; cointegrated stocks are bound together by fundamentals."
---

# Cointegration

Cointegration is the mathematical property that makes [[pair-trading]] possible. Two securities whose individual prices wander randomly (non-stationary) can combine in a way that creates a bounded, mean-reverting spread (stationary). This spread is your trading signal.

## Definition

Two price series P₁ and P₂ are cointegrated if there exists a hedge ratio β such that:

**spread = P₁ - β × P₂**

is [[stationary]] (integrated of order zero, or I(0)).

Individual prices might be I(1) (random walk, non-stationary), but their linear combination is I(0) (mean-reverting). This is the key: you can't predict where GLD or GDX will be next month, but you **can** predict their spread will stay within a bounded range.

## Testing for Cointegration

The book uses the **augmented Dickey-Fuller (ADF) test** via MATLAB's `cadf` function (from James LeSage's Econometrics toolbox).

Example from book (GLD vs GDX, Example 7.2):

```matlab
% Run cointegration test
res = cadf(GLD_prices, GDX_prices, 0, 1);

% Output:
% t-statistic: -3.36
% 5% critical value: -3.343
% Interpretation: t-stat < critical value → cointegrated with >95% confidence
```

The test's null hypothesis: "Series are NOT cointegrated." Rejection (t-stat more negative than critical value) means they likely cointegrate.

**Critical values:**
- 1% level: -3.819 (99% confidence)
- 5% level: -3.343 (95% confidence)
- 10% level: -3.042 (90% confidence)

Book's GLD/GDX pair has t-stat between 1% and 5% critical values → >95% confidence but <99%.

## Finding the Hedge Ratio

Once cointegration is confirmed, determine β via ordinary least squares (OLS) regression:

```matlab
results = ols(GLD_prices, GDX_prices);
hedgeRatio = results.beta;  % β = 1.6766
```

This says: **GLD = 1.6766 × GDX + spread**

The spread is then:
```matlab
spread = GLD_prices - 1.6766 * GDX_prices;
```

Plot this spread (book Figure 7.4) — it oscillates around a constant mean, confirming [[stationarity]]. This is your tradable signal.

## Cointegration vs. Correlation

The book dedicates Section 7.4 to this critical distinction because traders often confuse them:

**Correlation** measures whether **returns** move together over short horizons (daily, weekly):
- High correlation: When stock A rises 2%, stock B tends to rise ~2%
- Says nothing about long-term price relationship

**Cointegration** measures whether **price levels** stay within bounded range over long horizons:
- Cointegration: If spread widens to +3σ, it will eventually revert to mean
- Says nothing about short-term return correlation

### Example: Cointegrated but Uncorrelated

Book's artificial example (Figure 7.6):
- Stock A trends from $65 to $72
- Stock B stays flat at ~$64, occasionally jumps to keep spread ~$1
- Daily correlation: **low** (B doesn't move most days when A does)
- Cointegration: **perfect** (spread always returns to $1)

### Example: Correlated but Not Cointegrated

Book's real example (KO vs PEP, Example 7.3):

**Correlation test:**
```matlab
[R, P] = corrcoef(daily_returns_KO, daily_returns_PEP);
% R = 0.4849, P = 0 (highly significant correlation)
```

**Cointegration test:**
```matlab
res = cadf(KO_prices, PEP_prices, 0, 1);
% t-statistic = -2.14
% 10% critical value = -3.038
% Conclusion: NOT cointegrated (<90% confidence)
```

KO and PEP returns are correlated (move together daily), but prices can drift apart over time (not cointegrated). Using them for [[pair-trading]] would be dangerous — the spread might never revert.

### What You Need for Pair Trading

**Answer:** **Cointegration**, not correlation.

Correlation helps with hedging (reduces daily P&L volatility) but doesn't guarantee mean reversion. Cointegration means the spread is fundamentally bounded — it **must** revert eventually (assuming cointegration persists).

## Why Cointegration Exists

Cointegration arises from **shared fundamental drivers:**

**GLD vs GDX:**
- Both reflect gold price
- GLD tracks physical gold directly
- GDX tracks gold mining companies (value depends on gold price)
- Temporary divergence from relative sector performance, but fundamentals link them

**Sector pairs:**
- Two oil producers: both driven by crude oil price
- Two regional banks: both driven by interest rates and regional economy
- Two retailers: both driven by consumer spending

**Calendar spreads:**
- Oil futures contracts with different expirations
- Both reflect same underlying commodity
- Price difference = storage costs + convenience yield (bounded)

**Currency crosses:**
- Book mentions CAD/AUD (both commodity currencies)
- Canada = oil-driven, Australia = metals/agriculture-driven
- Global commodity cycle links them

## Common Pitfalls

**Not same industry ≠ not cointegrated:** Some traders assume any two stocks in same sector cointegrate. Wrong. KO and PEP are both beverages but DON'T cointegrate (different growth trajectories, market strategies).

Test **every** pair empirically. Never assume cointegration based on industry classification alone.

**Historical cointegration ≠ future cointegration:** The book emphasizes [[regime-switching]] risk. Cointegration can break due to:
- Merger/acquisition
- Fundamental business change
- Regulatory changes
- Sector rotation (new factors driving prices)

Monitor rolling cointegration tests. If t-statistic weakens (moves toward zero), relationship may be breaking.

**Correlation as proxy:** Many traders use correlation because it's easier to calculate. Dangerous. Book shows KO/PEP have 0.48 correlation but aren't cointegrated. You'd build a [[pair-trading]] strategy thinking they're related, then watch the spread drift indefinitely.

**Sufficient data:** Cointegration tests require long time series (book suggests 2+ years minimum). With insufficient data, test lacks statistical power → false negatives (missing genuine cointegration) or false positives (finding spurious cointegration).

## Practical Application

**Step 1: Generate candidate pairs**
- Same industry (energy stocks, banks, retailers)
- Same geography (regional banks in California)
- Related commodities (gold vs silver, oil vs natural gas)
- ETFs tracking similar indices

**Step 2: Test cointegration**
```matlab
% Test every candidate pair
for i = 1:length(candidates)
    res = cadf(price1, price2, 0, 1);
    if res.tstat < -3.343:  % 5% critical value
        % Cointegrated with >95% confidence
        store_pair(price1, price2, res.tstat);
    end
end
```

**Step 3: Calculate hedge ratio and spread**
```matlab
results = ols(price1, price2);
hedgeRatio = results.beta;
spread = price1 - hedgeRatio * price2;
```

**Step 4: Verify stationarity visually**
Plot the spread. It should oscillate around a constant mean, not trend up/down. Book Figure 7.4 (GLD/GDX) shows good example.

**Step 5: Backtest [[pair-trading]] strategy**
- Enter when spread > ±2σ
- Exit when spread crosses mean
- Validate via [[out-of-sample-testing]]

## Advanced Topics

**Multiple cointegration:** More than two securities can cointegrate. Example: basket of energy stocks vs. oil futures. Create portfolio of stocks with weights determined by cointegration regression.

**Ornstein-Uhlenbeck process:** Mathematical model of mean reversion. The book introduces this in [[exit-strategies]] to estimate half-life of mean reversion:

**dz(t) = -θ(z(t) - μ)dt + dW**

Parameter θ determines mean-reversion speed. Higher θ = faster reversion = shorter optimal holding period.

**Time-varying cointegration:** Hedge ratio β might shift over time. Advanced strategies re-estimate β using rolling windows. Tradeoff: more adaptive vs. more [[data-snooping-bias]].

## Beyond Equities

**Futures:** Calendar spreads naturally cointegrate (same underlying commodity). The book notes trading commodity futures offers higher [[capacity]] than stock pairs.

**Fixed income:** Bonds from same issuer with different maturities typically cointegrate (both reflect issuer's credit risk + term structure).

**Currencies:** Cross-currency rates can cointegrate if both currencies have similar drivers (commodity currencies, or currencies pegged to same basket).

**ETFs vs. Components:** ETF should perfectly cointegrate with basket of underlying stocks (by construction). Temporary deviations create arbitrage opportunities (exploited by authorized participants).

## Related Skills

Foundation:
- [[stationarity]] — What you're looking for in the spread
- [[mean-reversion]] — Why cointegration enables trading
- [[pair-trading]] — Primary application

Testing:
- [[backtesting]] — Validating cointegration-based strategies
- [[out-of-sample-testing]] — Ensuring cointegration isn't spurious

Execution:
- [[exit-strategies]] — Using half-life to determine holding period
- [[transaction-costs]] — Pairs have 2x costs (both legs)
- [[kelly-formula]] — Sizing cointegrated positions

Advanced:
- [[regime-switching]] — Detecting when cointegration breaks
- [[factor-models]] — Alternative framework for finding relationships

The book positions cointegration as the **mathematical foundation** of statistical arbitrage. Without cointegration, you're speculating that prices will converge. With cointegration, you have statistical evidence they **must** converge (assuming the fundamental relationship persists).

Learn to test for cointegration, understand the difference from correlation, and apply it rigorously. This single skill unlocks an entire category of low-risk, high-Sharpe [[pair-trading]] strategies that institutions have profited from for decades.
