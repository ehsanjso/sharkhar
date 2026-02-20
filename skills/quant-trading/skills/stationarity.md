---
description: >
  Mathematical property where a time series doesn't drift infinitely away from its starting value — the foundation for mean-reversion trading. Use this to identify tradable spreads and validate pair-trading opportunities.
source:
  chapters: [7]
  key-insight: "Stationary series are I(0) — bounded and mean-reverting. Most stock prices are I(1) — non-stationary. But combinations of I(1) series can be I(0) via cointegration."
---

# Stationarity

A stationary time series never drifts infinitely far from its initial value. It's "integrated of order zero" or I(0). This property is the mathematical foundation that makes [[mean-reversion]] strategies possible.

## Definition

Technically, a time series is stationary if its statistical properties (mean, variance, autocorrelation) don't change over time.

Practically for trading: **A stationary price series oscillates around a constant mean** rather than trending up/down indefinitely.

Book's visual test: Plot the series (Figure 7.4 for GLD/GDX spread). If it looks bounded — oscillating around a center line — it's likely stationary.

## Why It Matters

**Stationary = tradable via mean reversion.**

If a price (or spread) is stationary:
- When it's above mean → sell (it will revert down)
- When it's below mean → buy (it will revert up)
- Profit is **guaranteed eventually** (assuming stationarity persists)

If a price is non-stationary (random walk):
- No predictable reversion
- Mean-reversion strategies fail
- Only [[momentum-strategies]] or buy-and-hold viable

## Stock Prices Are Not Stationary

Book emphasizes: "Most stock price series are not stationary — they exhibit geometric random walk that gets them farther and farther away from their starting values."

Individual stocks like AAPL, MSFT, JPM are I(1) — non-stationary. They drift upward (or downward) over decades. No fixed mean to revert to.

This is why you can't profitably trade "buy AAPL when below its all-time average price." The "average" keeps rising; reversion never comes.

## But Spreads Can Be Stationary

**Key insight:** "You can often find a pair of stocks such that if you long one and short the other, the market value of the pair is stationary."

This is [[cointegration]]. Two non-stationary (I(1)) prices combine to form stationary (I(0)) spread.

Example from book: GLD and GDX individually non-stationary, but spread = GLD - 1.6766×GDX is stationary (Figure 7.4).

## Testing for Stationarity

Use augmented Dickey-Fuller (ADF) test (same as [[cointegration]] test, but on single series).

```matlab
% Test if spread is stationary
res = adf(spread);

% If t-statistic < critical value → reject null hypothesis of non-stationarity
% Conclusion: series is stationary
```

Critical values same as cointegration test:
- 1% level: -3.819
- 5% level: -3.343
- 10% level: -3.042

More negative t-stat = stronger evidence of stationarity.

## Stationarity vs. Mean Reversion

Subtle distinction:

**Stationarity:** Mathematical property. Series has fixed mean and bounded variance.

**Mean reversion:** Trading behavior. Prices return to mean after deviations.

All stationary series are mean-reverting (by definition). But you can profitably trade mean-reversion on **non-stationary** series too (short-term reversals around moving mean).

Book: "You don't necessarily need a stationary price series in order to have successful mean-reverting strategy. Even non-stationary price series can have many short-term reversal opportunities."

Stationarity is **sufficient** for mean-reversion but not **necessary**.

## Practical Application

**1. Test candidates:**
```matlab
spread = price1 - hedgeRatio * price2;
res = adf(spread);
if res.tstat < -3.343
    % Stationary with >95% confidence
    % Proceed to backtest pair trading
end
```

**2. Visual inspection:**
Plot the spread. Should oscillate around constant mean without trending.

**3. [[pair-trading]] entry/exit:**
- Mean μ = average of spread
- Std dev σ = standard deviation
- Enter when spread > μ + 2σ or < μ - 2σ
- Exit when spread crosses μ

## Beyond Pairs

Stationarity applies to:

**Currency crosses:** CAD/AUD often stationary (both commodity currencies)

**Futures spreads:** Calendar spreads naturally stationary (same commodity, different months)

**Fixed income:** Yield spreads often stationary (bonds from same issuer)

## Ornstein-Uhlenbeck Process

Book introduces mathematical model of stationary mean-reversion:

**dz(t) = -θ(z(t) - μ)dt + dW**

Where:
- z(t) = stationary series (spread)
- μ = mean
- θ = mean-reversion speed
- dW = noise

This formula used in [[exit-strategies]] to calculate half-life: time for spread to revert halfway to mean.

**Half-life = -ln(2) / θ**

Estimate θ via regression, use half-life as optimal holding period.

## Related Skills

Foundation for:
- [[mean-reversion]] — Requires (or benefits from) stationarity
- [[pair-trading]] — Seeks stationary spreads
- [[cointegration]] — Method to create stationarity from non-stationary prices

Testing:
- [[backtesting]] — Verify stationarity persists out-of-sample
- [[out-of-sample-testing]] — Stationarity can break (regime change)

Practical:
- [[exit-strategies]] — Use half-life from O-U process
- [[regime-switching]] — Stationarity can shift to non-stationary

The book positions stationarity as the ideal condition for mean-reversion, but not mandatory. Prioritize finding stationary spreads (via [[cointegration]]) for highest-confidence [[pair-trading]], but don't ignore short-term mean-reversion opportunities in non-stationary series.
