---
description: >
  Leverage that maximizes long-term growth rate. Calculate via Kelly formula
  (Gaussian), Monte Carlo (fat tails), or historical optimization (empirical).
  Always use fractional Kelly (1/2 or 1/4) for estimation error safety.
source:
  chapters: [8]
  key-insight: "Optimal leverage = maximal growth, but half-optimal = safer growth"
---

# Optimal Leverage

Optimal leverage is the position size multiplier that maximizes compounded growth rate. Too little leverage leaves profits on table; too much causes eventual ruin. The [[kelly-formula]] provides elegant solution under Gaussian assumption, but real markets have fat tails requiring [[monte-carlo-leverage-optimization]].

## Three Calculation Methods

**[[kelly-formula]]**: f = μ/σ² for Gaussian returns. Simple, fast, but assumes normality.

**[[monte-carlo-leverage-optimization]]**: Simulate 100K return sequences matching first 4 moments, find f that maximizes median growth. Handles fat tails.

**Historical optimization**: Brute force find f that maximized growth in backtest. Simple but suffers [[data-snooping-bias]].

## Fractional Kelly

ALWAYS use fractional Kelly in practice:
- **Full Kelly**: Maximum growth but maximum risk
- **Half Kelly**: 75% of max growth, dramatically lower ruin risk
- **Quarter Kelly**: 50% of max growth, very conservative

Estimation error in μ or σ causes overestimating optimal f. Since overleverage → ruin but underleverage → suboptimal, asymmetry favors caution.

## When to Apply

Calculate optimal leverage:
- Before deploying any strategy
- Quarterly using recent 250-day performance
- After significant [[regime-change]]  
- When strategy Sharpe ratio changes >20%

## Integration

Optimal leverage connects statistical validation to position sizing. After confirming edge with [[statistical-tests-moc]], use optimal leverage to size positions for maximum long-term growth.

For complete framework, see [[risk-management-moc]].
