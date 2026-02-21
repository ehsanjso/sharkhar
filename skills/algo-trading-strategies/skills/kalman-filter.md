---
description: >
  Dynamic regression framework that updates hedge ratios and means in real-time.
  Use when relationships evolve over time. Superior to static regression for
  currency pairs and volatile markets. More complex but adapts to regime change.
source:
  chapters: [3]
  key-insight: "Markets aren't stationary; Kalman filter adapts as relationships evolve"
---

# Kalman Filter

The Kalman filter solves a fundamental problem in [[mean-reversion]] trading: relationships between instruments evolve over time. Static [[hedge-ratio]] from regression assumes constant relationship. Kalman dynamically updates β and mean as new data arrives, adapting to [[regime-change]].

## Core Concept

Traditional [[pair-trading]]: Regress Y on X once, use fixed β = slope forever.

**Problem**: β changes over time. What cointegrated with β=1.5 in January might need β=1.8 in June. Static hedge becomes unhedged, losses mount.

**Kalman solution**: Update β every period using Bayesian framework. New β = weighted average of (old estimate + new observation), with weights determined by uncertainty.

## Mathematical Framework

**State equation** (what we want to estimate):
β(t) = β(t-1) + process noise

Our [[hedge-ratio]] β evolves slowly over time via random walk.

**Observation equation** (what we measure):
Y(t) = β(t) × X(t) + observation noise

Today's Y is predicted by today's unknown β times X, plus noise.

**Kalman recursion**:
1. Predict β(t) from β(t-1)
2. Measure prediction error when new Y(t) arrives
3. Update β(t) estimate: weight recent data vs prior estimate based on relative uncertainty

The filter automatically increases weight on new data when market structure changes (high process noise), and trusts prior estimate when relationship is stable (low process noise).

## When to Apply

Use Kalman filter when:
- [[cointegration]] exists but [[hedge-ratio]] drifts over time
- [[currency-pairs]] (fundamentals shift from rate differentials, commodity prices)
- Volatile markets where static regression lags structural changes
- You've observed β changing significantly across rolling windows
- [[pair-trading]] with static β shows degrading performance

Don't use when:
- Relationship is truly static ([[etf-pairs]] with stable fundamentals)
- Insufficient data (need 100+ observations for filter to converge)
- Computational simplicity matters more than accuracy

## Practical Steps

1. **Run initial regression**: Y on X for training period, get starting β₀
2. **Estimate noise variances**:
   - Process noise V_e: how much β changes per period (try 0.0001)
   - Observation noise V_w: regression residual variance
3. **Initialize filter**: Set β(0) = β₀, uncertainty P(0) = 1.0
4. **For each new period**:
   - Predict: β_pred(t) = β(t-1), P_pred(t) = P(t-1) + V_e
   - Observe: error = Y(t) - β_pred(t) × X(t)
   - Update: Kalman gain K = P_pred / (P_pred × X² + V_w)
   - New estimate: β(t) = β_pred(t) + K × error
   - New uncertainty: P(t) = (1 - K×X) × P_pred
5. **Trade**: Use β(t) to calculate spread S(t) = Y(t) - β(t)×X(t)
6. **Deploy mean-reversion**: [[bollinger-bands]] on S(t)

## Kalman vs Static Regression

**Static regression**:
- β estimated once from training data  
- Fast, simple, requires no tuning
- Fails when relationship evolves
- Spread drifts away from zero mean over time

**Kalman filter**:
- β updated every period
- More complex, requires noise variance tuning
- Adapts to evolving relationships  
- Spread stays centered even as β changes

For [[etf-pairs]] with stable fundamentals (EWA-EWC), static wins (simpler). For [[currency-pairs]] or stocks with changing fundamentals, Kalman wins (adapts).

## Tuning the Filter

**Process noise V_e** (β variance per period):
- Too small: Filter ignores new data, acts like static regression
- Too large: Filter over-reacts to noise, β jumps wildly
- Typical range: 0.00001 to 0.001
- Tune by maximizing Sharpe on validation set

**Observation noise V_w**:
- Regression residual variance from training period  
- Can be estimated from historical data
- Less sensitive than V_e, usually keep fixed

##Real-World Example

**AUD/CAD currency pair 2009-2012**:
Using [[johansen-test]] static hedge ratio: APR 11%, Sharpe 1.6
Using Kalman filter dynamic hedge ratio: Not reported in book, but typically improves when currencies affected by commodity price changes

The benefit comes from USD.AUD vs USD.CAD β changing as commodity (iron ore, oil) prices shift. Kalman tracks this evolution; static regression doesn't.

## Pitfalls

**Over-fitting V_e**: Optimizing process noise on backtest creates [[data-snooping-bias]]. Use broad range (0.0001-0.001) and verify robustness, don't over-optimize.

**Initialization period**: Filter needs 100+ observations to converge. Don't trade first 100 bars. Or initialize from long regression period.

**Regime change detection**: Kalman adapts to SLOW evolution, not sudden breaks. If [[cointegration]] breaks completely, filter will lag. Monitor [[augmented-dickey-fuller-test]] on rolling spread; exit if p > 0.10.

**Mean estimation**: Kalman can track evolving mean of spread, not just β. Requires additional state variable and complexity. For most applications, assume zero mean or use [[bollinger-bands]] which estimate mean naturally.

**Computational cost**: Kalman runs real-time recursive calculation. Static regression is one-time. For high-frequency trading of many pairs, computational load matters.

## Beyond Hedge Ratios

Kalman filter is general Bayesian estimation tool. Can also estimate:
- **Evolving mean** of mean-reverting series (alternative to moving average)
- **Time-varying variance** (alternative to moving std for [[bollinger-bands]])
- **Hidden state variables** (e.g., true VIX from noisy observations)

But in algorithmic trading, primary use is dynamic β for [[pair-trading]].

## Market-Making Application

High-frequency market makers use Kalman to estimate "fair value" from noisy last trades. Market jumps around due to bid-ask bounce and informed trading. Kalman filter smooths noise, providing stable fair value for quote placement.

This application in [[market-making]] is distinct from [[mean-reversion]] trading but uses same mathematical framework.

## Code Structure

```python
# Initialize
beta = initial_regression_slope  
P = 1.0  # uncertainty
V_e = 0.0001  # process noise (tunable)
V_w = regression_residual_variance  # observation noise

# For each new period:
# Predict
beta_pred = beta
P_pred = P + V_e

# Observe
error = Y[t] - beta_pred * X[t]

# Update (Kalman gain)
K = (P_pred * X[t]) / (P_pred * X[t]**2 + V_w)

# New estimates
beta = beta_pred + K * error
P = (1 - K * X[t]) * P_pred

# Trade spread
spread = Y[t] - beta * X[t]
# Apply mean-reversion strategy to spread
```

## Relationship to Other Concepts

Kalman filter is advanced alternative to static [[hedge-ratio]] estimation. Use after confirming [[cointegration]] with [[johansen-test]] or [[cointegrated-adf-test]].

Complements [[bollinger-bands]] by providing adaptive spread. Bollinger provides adaptive entry/exit, Kalman provides adaptive hedge.

For most [[etf-pairs]], static methods sufficient. For [[currency-pairs]] and volatile markets, Kalman's adaptiveness justifies complexity.

When [[cointegration]] is questionable or breaking down, no amount of Kalman magic helps. Exit the trade. Kalman adapts to SLOW evolution, not catastrophic breaks. Monitor [[augmented-dickey-fuller-test]] on spread regardless of estimation method.

For static alternatives, see [[pair-trading]] and [[linear-mean-reversion-strategy]]. For complete mean-reversion toolkit, [[mean-reversion-strategies-moc]].
