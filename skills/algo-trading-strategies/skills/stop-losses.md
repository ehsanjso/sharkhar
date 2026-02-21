---
description: >
  Exit trigger when unrealized loss exceeds threshold. Natural for momentum
  strategies (reversal = wrong hypothesis). Contradictory for mean-reversion
  (deeper = better value). Set mean-reversion stops wider than backtest max.
source:
  chapters: [8]
  key-insight: "Momentum stops align with model; mean-reversion stops contradict it"
---

# Stop Losses

Stop losses limit downside by exiting positions when unrealized P&L drops below threshold. But their appropriateness depends fundamentally on strategy type: natural for [[momentum-trading]], contradictory for [[mean-reversion]].

## Momentum Strategy Stop Losses

For [[momentum-trading]], stop losses ALIGN with the model:
- Entry: Price moving up → expect continuation
- Stop trigger: Price reverses → hypothesis failed → exit

Momentum reversal IS the signal you're wrong. Stops are integral to momentum strategies, not external risk management add-on.

## Mean-Reversion Strategy Stop Losses

For [[mean-reversion]], stop losses CONTRADICT the model:
- Entry: Price deviated far from mean → expect reversion
- Stop trigger: Price deviated even further → even BETTER value per model

If you believe in mean reversion, deeper drawdown is opportunity to add positions ([[scaling-in]]), not trigger to exit.

**So why use stops at all?** [[regime-change]]. The mean-reverting series can permanently shift to trending. Stops prevent catastrophic loss when model breaks.

## Setting Mean-Reversion Stops

**Wrong**: Stop at signal reversal (e.g., exit long when price breaks above entry). This contradicts mean-reversion thesis.

**Right**: Stop at 1.5-2× backtest maximum intraday drawdown. Wide enough to never trigger in backtest, tight enough to limit catastrophe if [[cointegration]] breaks.

Example: Backtest max drawdown –15% → Set stop at –25%. Never triggered historically but caps loss if pair "falls apart."

## Pitfalls

**Overnight gaps**: Stops execute at next available price. If market gaps through stop (crisis, earnings), execution far worse than stop price. Only solution: don't hold overnight or buy protective puts.

**Flash crashes**: May 2010 flash crash: stop orders on Accenture executed at $0.01. "Stub quotes" from market makers during stress. Stops useless in liquidity vacuum.

**Whipsaw**: Too-tight stops get triggered by noise, causing losses from bad exits and re-entries. Especially problematic for [[mean-reversion]].

For [[momentum-trading]], stops are strategy-integral. For [[mean-reversion]], use [[constant-proportion-portfolio-insurance]] instead when possible.

Complete risk framework: [[risk-management-moc]].
