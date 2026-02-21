---
description: >
  Time required for price deviation to decay halfway to mean. Use to set
  look-back period for moving averages and predict holding period. Calculated
  from ADF test regression coefficient. Essential for mean-reversion timing.
source:
  chapters: [2]
  key-insight: "Half-life = your optimal look-back period, not arbitrary optimization"
---

# Half-Life of Mean Reversion

Half-life measures how quickly price deviations decay toward the mean in a stationary series. It provides a principled, non-optimized answer to "What look-back period should I use?" and predicts your expected holding time.

## Mathematical Definition

From [[augmented-dickey-fuller-test]] regression:
ΔP(t) = λP(t-1) + ...

The coefficient λ captures mean-reversion speed. Half-life is:

**τ = –log(2) / λ**

If λ = –0.035, then τ = –log(2) / (–0.035) ≈ 20 days.

Interpretation: After 20 days, a deviation from equilibrium will decay to 50% of its original magnitude. After 40 days (2×τ), it decays to 25%. After 60 days (3×τ), to 12.5%.

## When to Apply

Calculate half-life AFTER confirming [[stationarity]] via [[augmented-dickey-fuller-test]]. Use half-life to:
- Set moving average look-back period N for [[bollinger-bands]]
- Predict typical holding time before profit target hit
- Compare mean-reversion speed across different pairs
- Detect [[regime-change]] (sudden jumps in half-life indicate breakdown)

## Practical Steps

1. **Run ADF test**: On price series or spread from [[cointegration]]
2. **Extract λ coefficient**: From the regression (most software reports this)
3. **Calculate half-life**: τ = –log(2) / λ (in units of your data frequency)
4. **Set look-back**: Use N = round(τ) for moving average period
5. **Predict holding**: Expect positions to revert in 1-2× half-life
6. **Validate**: Backtest with N = τ should show best Sharpe ratio

## Interpreting Half-Life Values

**τ < 10 days**: Very fast mean reversion. High-frequency or intraday strategy feasible. Large sample size available, high Sharpe ratio potential.

**τ = 10-50 days**: Typical for [[etf-pairs]], [[currency-pairs]], some [[futures-calendar-spreads]]. Daily rebalancing strategies work well.

**τ = 50-100 days**: Slow mean reversion. Lower Sharpe ratio due to fewer independent samples. Need large capital to make worth trading.

**τ > 100 days**: Very slow. May be statistical artifact, not tradable. Verify [[stationarity]] is real. Consider if apparent mean-reversion is just noise in trending series.

## Setting Look-Back Period

**Why τ works**: [[mean-reversion]] pulls prices toward MA(N). If N matches natural time scale of reversion (τ), bands capture meaningful deviations. Too short and you're chasing noise; too long and you miss the reversion.

**Don't optimize N**: Maximizing Sharpe by trying N = 5, 10, 15, 20, ... invites [[data-snooping-bias]]. Half-life gives you N from first principles, independent of optimization.

**Rounding**: If τ = 23.7 days, use N = 24. Don't over-precision. The half-life is itself an estimate.

## Holding Period Expectation

If half-life is 20 days, how long before your position profits?

**Optimistic**: 1× half-life (20 days). Deviation decayed 50%. May reach profit target.
**Realistic**: 2× half-life (40 days). Deviation decayed 75%. Likely reached target.
**Conservative**: 3× half-life (60 days). Deviation decayed 87.5%. Almost certain reversion.

Use these multiples to estimate turnover, calculate expected number of trades per year, and predict Sharpe ratio before trading.

## Half-Life and Sharpe Ratio

Faster mean-reversion (shorter τ) → More independent trades per year → Higher Sharpe ratio

Slower mean-reversion (longer τ) → Fewer independent trades per year → Lower Sharpe ratio

This is why [[intraday-mean-reversion]] can have Sharpe 4+ while interday strategies have Sharpe 1-2. The time scale of mean-reversion directly impacts profitability.

## Detecting Regime Change

Monitor half-life on rolling windows (e.g., trailing 250 days). Sudden doubling of τ indicates mean-reversion is weakening - possibly [[regime-change]] to trending. Example:

- Jan-Jun: τ = 20 days (stable [[cointegration]])
- July: τ = 45 days (warning!)  
- Aug: τ = 90 days (breakdown, exit strategy)

This early warning can save you from catastrophic drawdowns when [[cointegration]] fails.

## Pitfalls

**Unstable estimates**: With limited data (< 250 bars), λ estimate is noisy, so τ is noisy. Don't trust half-life from 50-day sample.

**Time-varying λ**: Real markets have evolving mean-reversion speed. Static τ from ADF assumes constant λ. Use [[kalman-filter]] for time-varying estimates.

**Non-exponential decay**: ADF assumes exponential decay (constant percentage reversion). Real price series may have nonlinear dynamics. Half-life is approximation.

**Units matter**: If your data is daily, τ is in days. If hourly, τ is in hours. Always verify units match your trading frequency.

## Relationship to Autocorrelation

Half-life τ and first-order autocorrelation ρ₁ are related:

λ = log(1 + ρ₁) ≈ ρ₁ (for small ρ₁)

So τ ≈ –log(2) / ρ₁

High negative autocorrelation (ρ₁ ≈ –0.5) → Short half-life (fast reversion)
Low autocorrelation (ρ₁ ≈ –0.05) → Long half-life (slow reversion)

##Integration with Mean-Reversion Workflow

1. [[augmented-dickey-fuller-test]]: Confirm [[stationarity]], extract λ
2. [[half-life-mean-reversion]]: Calculate τ = –log(2)/λ  
3. [[bollinger-bands]] or [[linear-mean-reversion-strategy]]: Use N = τ as look-back
4. [[optimal-leverage]]: Account for expected holding ~2τ days when sizing

Half-life connects statistical validation to practical implementation. It's the bridge from "this series is mean-reverting" to "here's exactly how to trade it."

For complete mean-reversion workflow, see [[mean-reversion-strategies-moc]]. For dynamic adaptation, explore [[kalman-filter]].
