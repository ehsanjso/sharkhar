---
description: >
  Mathematical framework for optimal position sizing that maximizes long-term
  growth rate. Use when you want maximum compounded returns and can tolerate
  large drawdowns. Assumes Gaussian returns; adjust for fat tails.
source:
  chapters: [8]
  key-insight: "Kelly leverage = mean/variance, but half-Kelly is often wiser"
---

# Kelly Formula

The Kelly formula solves a fundamental question: How much capital should you risk per trade to maximize long-term wealth? Too much leverage and you'll eventually blow up; too little and you leave profits on the table. Kelly finds the sweet spot.

## Core Formula

For a strategy with Gaussian-distributed returns:

**f = μ / σ²**

Where:
- f is the optimal leverage (as multiple of net asset value)
- μ is mean excess return per period
- σ² is variance of excess returns

This leverage maximizes the expected value of log(wealth), which is equivalent to maximizing compounded growth rate over time. The formula elegantly balances return (numerator) against risk (denominator).

## When to Apply

Use Kelly when:
- You manage your own capital (no external drawdown constraints)
- Your goal is maximum long-term wealth, not steady returns
- Strategy has Gaussian or near-Gaussian return distribution  
- You have reliable estimates of μ and σ from sufficient backtest data

Don't use raw Kelly when:
- Managing client money with drawdown limits (use [[constant-proportion-portfolio-insurance]])
- Returns have fat tails (use [[monte-carlo-leverage-optimization]])
- Facing maximum leverage constraints from broker
- Strategy is new with limited track record

## Practical Steps

1. **Calculate excess returns**: Subtract risk-free rate from strategy returns
2. **Estimate mean μ**: Average of excess returns
3. **Estimate variance σ²**: Variance of excess returns  
4. **Compute Kelly f**: f = μ / σ²
5. **Apply half-Kelly**: Use f/2 as actual leverage to account for estimation error
6. **Monitor and rebalance**: Maintain constant leverage by rebalancing after P&L changes

## Why Half-Kelly?

[[kelly-formula|Full Kelly]] assumes your estimates of μ and σ are perfect. In reality, you have estimation error. Overestimating μ or underestimating σ leads to excessive leverage, which can cause ruin. Underestimating the optimal leverage merely reduces growth rate slightly.

The asymmetry favors caution: **Half-Kelly sacrifices only 25% of growth rate but dramatically reduces risk of ruin**. Most professional traders use fractional Kelly (1/2 to 1/4) rather than full Kelly.

## Multi-Strategy Allocation

For portfolio of strategies with returns R₁, R₂, ..., Rₙ:

**F = C⁻¹M**

Where:
- F is vector of optimal leverages
- C is covariance matrix of strategy returns
- M is vector of mean excess returns

This accounts for correlations between strategies. Uncorrelated strategies get higher allocations because they provide diversification.

## Pitfalls

**Estimation error is asymmetric**: Using 2× Kelly when true optimal is 1× leads to ruin. Using 0.5× Kelly when true optimal is 1× merely halves your growth rate. Error in one direction is catastrophic; in the other direction it's just suboptimal.

**Non-Gaussian returns**: If your strategy has fat tails (high [[kurtosis]]), Kelly formula underestimates risk. Returns that are "3-sigma events" in Gaussian world happen far more often with fat tails. Use [[monte-carlo-leverage-optimization]] instead.

**Regime changes**: μ and σ estimated from past data won't match future if market structure changes. Kelly formula can't predict [[regime-change]]. Monitor strategy performance and delever quickly if returns degrade.

**Drawdowns are severe**: Full Kelly can experience 50%+ drawdowns even though it maximizes growth. If you can't tolerate this psychologically or have external constraints, use [[constant-proportion-portfolio-insurance]] or fractional Kelly.

## Constant Leverage Requirement

Kelly requires rebalancing to maintain constant leverage as your capital changes. After profitable period, BUY to increase positions. After loss, SELL to reduce positions. This "selling into losses" feels counterintuitive but is mathematically necessary.

Example from [[constant-leverage-requirement]]: Start with $100K, Kelly leverage 5×, so $500K portfolio. Lose $10K → equity now $90K. Must liquidate $40K of portfolio to maintain 5× leverage ($90K × 5 = $450K). This forced selling during crisis contributed to 2007-2008 quant meltdown.

## Leverage Constraints

If broker allows maximum leverage F_max < Kelly optimal f:
- **Wrong approach**: Scale all positions by F_max / f (reduces growth rate substantially)
- **Better approach**: Allocate most capital to highest-return strategy

When F_max << f, it's often optimal to concentrate in single best strategy rather than diversifying at suboptimal total leverage. See [[optimal-capital-allocation]].

## Beyond Kelly

When Kelly assumptions break:
- Fat tails → [[monte-carlo-leverage-optimization]]
- Drawdown limits → [[constant-proportion-portfolio-insurance]]  
- Unknown distribution → [[historical-growth-rate-optimization]]
- Very high optimal leverage → View Kelly as upper bound, not target

Kelly is elegant but assumes stationary statistics. Real markets have [[regime-change]], so combine Kelly's mathematical precision with judgment about when the model's assumptions break down.

For risk management beyond simple leverage, explore [[risk-management-moc]]. For optimizing leverage with non-Gaussian returns, see [[monte-carlo-leverage-optimization]].
