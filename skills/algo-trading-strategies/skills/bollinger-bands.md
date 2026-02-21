---
description: >
  Practical mean-reversion entry/exit framework using standard deviation bands.
  Use when you've confirmed stationarity and want fixed-leverage entries.
  Superior to linear mean-reversion for capital management.
source:
  chapters: [3]
  key-insight: "Entry at 2σ limits max positions unlike linear scaling"
---

# Bollinger Bands

Bollinger bands provide a practical, capital-efficient way to trade [[mean-reversion]] by setting entry thresholds at standard deviation multiples rather than continuously scaling positions. This caps maximum leverage unlike [[linear-mean-reversion-strategy]].

## Core Mechanism

Construct three bands from price series:
- **Upper band** = MA(N) + k×σ(N)
- **Middle band** = MA(N) 
- **Lower band** = MA(N) – k×σ(N)

Where MA(N) is N-period moving average, σ(N) is N-period standard deviation, and k is typically 1-2.

**Trading rules**:
- Short when price > upper band (overextended)
- Long when price < lower band (oversold)
- Exit when price returns to middle band (mean)
- Or exit at opposite band (mean + profit)

## Why Better Than Linear Strategy

**[[linear-mean-reversion-strategy]]**: Positions scale continuously with z-score. At z = 5, you're massively leveraged. No natural limit to position size except account margin.

**[[bollinger-bands]]**: Only enter at specific thresholds (e.g., z = 2). Maximum one entry per threshold crossing. Capital requirements bounded and predictable.

Example: With linear strategy, extreme 10-sigma event forces 10× your typical position. With Bollinger bands, you simply don't enter beyond your threshold. Much safer.

## When to Apply

Use Bollinger bands when:
- [[stationarity]] confirmed via [[augmented-dickey-fuller-test]]
- You want predictable maximum position sizes
- Trading in account with margin constraints  
- Prefer discrete entries over continuous scaling
- [[half-life-mean-reversion]] guides your look-back N

## Practical Steps

1. **Confirm mean-reversion**: Run [[augmented-dickey-fuller-test]], require p < 0.05
2. **Calculate half-life**: Use [[half-life-mean-reversion]] from ADF regression
3. **Set look-back N**: Use half-life (e.g., 20 days if half-life = 20)
4. **Choose k**: Start with k = 1 for frequent entries, k = 2 for extreme entries only
5. **Backtest**: Optimize k and exit rules (middle band vs opposite band)
6. **Add scaling-in**: Scale additional positions at 2σ, 3σ for deeper value

## Scaling-In Enhancement

**[[scaling-in]]**: Instead of single entry at 2σ, add positions at 3σ, 4σ, etc. Each increment adds same capital. This is controlled version of linear strategy - still bounded but captures deeper value.

Benefits of scaling-in:
- Reduces risk by averaging better prices on deeper dips
- Maintains mean-reversion thesis (deeper = better value)
- Still has maximum position limit (e.g., stop at 5σ)

Drawbacks:
- Doesn't improve backtest returns (optimized for best single entry)
- Helps live trading by reducing timing risk from single entry
- Increases maximum position sizes, needs more capital

## Look-Back Period Selection

**Too short** (N < half-life): Bands too sensitive, whipsaw entries/exits, poor risk/reward.

**Too long** (N >> half-life): Bands too wide, miss entry opportunities, mean already reverted by time you exit.

**Optimal** (N ≈ half-life): Bands match natural reversion timescale. See [[half-life-mean-reversion]] for calculation from ADF test.

## Exit Strategies

**Exit at middle band**: Capture mean reversion only. Conservative, quick turnover, smaller profit per trade but higher win rate.

**Exit at opposite band**: Capture full round-trip from lower to upper band. Aggressive, longer hold, larger profit per trade but lower win rate (price may reverse at mean).

**Profit target hybrid**: Exit half at middle band, half at opposite band. Balances quick profits against maximizing winners.

## Pitfalls

**Regime change**: [[regime-change]] from mean-reversion to trending devastates Bollinger band strategies. What was 3-sigma oversold becomes new normal as prices trend. This is why [[stop-losses]] should be WIDER than backtest maximum, not AT band levels.

**Volatility spikes**: During panics, σ explodes, bands widen dramatically. Price might still be "outside bands" even though absolute distance from mean is small. Consider using [[kalman-filter]] for dynamic bands that adapt faster.

**Data errors**: Single bad tick inflates σ massively, shrinks bands, triggers false signal. [[data-errors-mean-reversion]] especially dangerous for Bollinger bands. Validate all outliers.

**Look-ahead bias**: Don't use today's close to calculate bands and then trade at today's close. Use yesterday's close to calculate bands, trade at today's close. Or use intraday MA/σ but accept [[signal-noise]].

## Variations

**Exponential MA**: Replace simple MA with EMA for faster response to recent data. Reduce lag at cost of stability.

**Dynamic σ multiplier k**: Start with k = 2, widen to k = 3 when volatility spikes to avoid overtrading in panicky markets.

**Multiple timeframes**: Daily bands for direction, hourly bands for entry timing. Enter only when both agree.

**Kalman bands**: Replace static MA/σ with [[kalman-filter]] estimates that adapt to changing mean and variance. Superior for non-stationary relationships.

## Code Implementation

```python
# Bollinger band calculation
lookback = calculate_half_life(prices)  # from ADF test
ma = moving_avg(prices, lookback)
sigma = moving_std(prices, lookback)

upper_band = ma + 2 * sigma
lower_band = ma - 2 * sigma

# Entry signals
long_signal = prices < lower_band
short_signal = prices > upper_band

# Exit signals  
exit_long = prices >= ma  # or prices >= upper_band
exit_short = prices <= ma  # or prices <= lower_band
```

## Integration with Other Concepts

Bollinger bands are practical implementation of [[mean-reversion]] validated by [[stationarity]]. The look-back period N should match [[half-life-mean-reversion]], not be arbitrarily optimized.

Combine with:
- [[fundamental-reasoning]]: Only trade Bollinger signals when fundamental story supports mean-reversion
- [[scaling-in]]: Add positions at 2σ, 3σ, 4σ for better average entry
- [[kalman-filter]]: Dynamic bands that adapt to [[regime-change]]
- [[stop-losses]]: Set wider than backtest maximum to survive regime shifts

For complete mean-reversion toolkit, see [[mean-reversion-strategies-moc]]. For dynamic alternative, explore [[kalman-filter]].
