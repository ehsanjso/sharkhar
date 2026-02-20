---
description: >
  Extending Kelly formula to allocate capital across multiple strategies based on their returns, volatilities, and correlations. Use this to maximize portfolio growth while diversifying risk.
source:
  chapters: [6]
  key-insight: "For multiple strategies: F* = C⁻¹M where C is covariance matrix and M is mean excess returns. Automatically diversifies based on Sharpe ratios and correlations."
---

# Optimal Leverage

Optimal leverage extends the [[kelly-formula]] from single strategies to portfolios of multiple strategies. It answers: "How should I allocate my capital across different trading strategies to maximize long-term growth?"

## The Multi-Strategy Formula

For n strategies with returns R, the optimal allocation is:

**F* = C⁻¹M**

where:
- **F*** = (f₁*, f₂*, ..., f_n*)ᵀ = column vector of optimal leverage for each strategy  
- **C** = n×n covariance matrix of strategy returns
- **M** = (m₁, m₂, ..., m_n)ᵀ = column vector of mean excess returns

The book (Chapter 6) emphasizes this formula "automatically diversifies across strategies based on their individual Sharpes AND their correlations."

## Book Example: Three Sector ETFs

Example 6.3 demonstrates optimal allocation across OIH (oil), RKH (banks), RTH (retail):

**Inputs:**
```matlab
% Mean annual excess returns
M = [0.1396; 0.0294; -0.0073]

% Covariance matrix (annualized)
C = [0.1109  0.0200  0.0183;
     0.0200  0.0372  0.0269;
     0.0183  0.0269  0.0420]

% Optimal leverages
F* = inv(C) * M
% F* = [1.29; 1.17; -1.49]
```

**Interpretation:**
- Long 1.29x capital in OIH
- Long 1.17x capital in RKH  
- **Short 1.49x capital in RTH** (negative mean return → short position)

Total leverage: |1.29| + |1.17| + |-1.49| = 3.95

The formula automatically determined to short RTH due to negative expected return, without you explicitly specifying a market-neutral constraint.

**Portfolio performance:**
- Maximum growth rate: 15.29% annually
- Portfolio Sharpe: 0.4751

Compare to individual stocks:
- OIH alone (highest individual return): 12.78% growth rate
- Portfolio beats best individual via diversification

## When to Apply

Use optimal leverage when:
- Running multiple strategies simultaneously
- Strategies have some correlation (not perfectly independent)
- Want to maximize long-term compounded growth
- Can rebalance positions daily

The book emphasizes: "You should allocate capital among them in an optimal way... to maximize overall risk-adjusted return."

## Independent Strategies Special Case

If strategies are statistically independent (zero correlation), C becomes diagonal. This simplifies to:

**f_i = m_i / σ_i²**

Each strategy gets [[kelly-formula]] leverage independently. No interaction effects.

But book notes real strategies rarely perfectly independent, especially in same asset class (all trade equities → some market correlation).

## Daily Rebalancing

Critical: Optimal leverage requires **continuous rebalancing**.

**Example from the book:**
- Start with $100K equity
- Optimal allocation: $252.8K in SPY (f* = 2.528)
- SPY drops 10%
- Portfolio now worth $74.72K ($100K - 10% of $252.8K)

**Required action:** Immediately reduce SPY position to $188.89K (2.528 × $74.72K).

Why? Kelly assumes you're always at optimal leverage. Failure to rebalance after losses = overleveraging on remaining equity = increased ruin risk.

The book: "This continuous updating of capital allocation should occur at least once at end of each trading day."

## Updating Parameters

Beyond rebalancing for equity changes, periodically update F* itself by recalculating:
- Mean returns M (using trailing window)
- Covariance matrix C (using trailing window)

**Book's guidance:**
- Lookback period: ~6 months for daily strategies
- Update frequency: Daily (computationally trivial once coded)
- Allows gradual reduction of exposure to decaying strategies

As a strategy's mean return decreases (appears in M), its optimal leverage automatically decreases. No manual intervention needed.

## Leverage Constraints

**Regulatory limits:**
- Retail accounts: 2x for overnight positions, 4x for intraday
- Proprietary firms: Much higher (10-20x common)

If unconstrained F* exceeds limits, scale down proportionally:

**constrainedF = regulatoryLimit / (|f₁| + |f₂| + ... + |f_n|) × F***

Book notes this assumes no offsetting positions. If your strategies hold longs and shorts that partially hedge, you might achieve higher effective leverage within constraints.

## Maximum Growth Rate

With optimal allocation F*, the portfolio's maximum compounded growth rate is:

**g(F*) = r + F*ᵀCF* / 2**

And portfolio Sharpe ratio:

**S = √(F*ᵀCF*)**

Book Example 6.3 result:
- g = 15.29% (vs. risk-free rate r = 4%)
- S = 0.4751

This exceeds any individual strategy's performance via diversification.

## Practical Implementation

**MATLAB example (from book):**

```matlab
% Calculate optimal leverages
F_optimal = inv(C) * M;

% Calculate maximum growth rate
g_max = riskFreeRate + F_optimal' * C * F_optimal / 2;

% Calculate portfolio Sharpe
S_portfolio = sqrt(F_optimal' * C * F_optimal);

% Daily rebalancing
for day = 1:numDays
    currentEquity = calculateEquity(positions, prices);
    targetPositions = F_optimal * currentEquity;
    adjustPositions(targetPositions);
end
```

## Variable Number of Signals

Some strategies generate variable signals daily (might trade 10 stocks today, 50 tomorrow). How to apply Kelly?

Book's solution: "Use Kelly formula to determine the **maximum** number of positions and thus maximum capital allowed. It is always safer to have leverage below what Kelly recommends."

On days with fewer signals, you're below optimal leverage — that's fine. Better than exceeding it.

## Pitfalls

**Fat tails:** Like single-strategy [[kelly-formula]], the math assumes Gaussian returns. Real markets have fatter tails. Solution: Use half-Kelly (50% of F*).

**Parameter uncertainty:** Your estimates of M and C contain errors. These compound in matrix inversion. Conservative traders use fraction of F*.

**Correlation instability:** During crises, correlations spike to 1.0 (everything crashes together). Your diversification vanishes exactly when needed. Book's August 2007 example illustrates this.

**Overleveraging:** The formula gives **maximum** safe leverage, not minimum required. Going above F* risks ruin. The book emphasizes this repeatedly.

## Example: Constraining by Historical Loss

Book recommends additional constraint beyond Kelly: use historical worst-case loss.

Method:
1. Calculate max one-period loss for each strategy
2. Determine tolerable portfolio drawdown
3. Constrain F* such that max historical loss doesn't exceed tolerance

Example (SPY from Chapter 6):
- Kelly f* = 2.528
- Max historical one-day loss: 20.47% (Black Monday)
- Tolerable drawdown: 20%
- Max safe leverage: 20% / 20.47% ≈ 1.0
- **Use min(half-Kelly, historical-constraint) = min(1.26, 1.0) = 1.0**

Book: "Even half-Kelly leverage would not be conservative enough to survive Black Monday."

## Related Skills

Foundation:
- [[kelly-formula]] — Single-strategy case
- [[sharpe-ratio]] — Inputs to Kelly formula

Portfolio construction:
- [[mean-reversion]] — Often combined with others
- [[momentum-strategies]] — Often combined for diversification
- [[pair-trading]] — Can run multiple pairs simultaneously

Validation:
- [[backtesting]] — Test multi-strategy portfolios
- [[maximum-drawdown]] — Constrain Kelly via worst-case

Practical:
- [[risk-management]] — Optimal leverage is core risk management
- [[capacity]] — Each strategy has limits

The book positions optimal leverage as the mathematical solution to capital allocation. No guesswork, no arbitrary portfolio weights — just maximize long-term growth subject to survival constraints.

Apply it, rebalance daily, update parameters frequently, and use half-Kelly or historical constraints for safety. This is how you compound wealth across multiple strategies while managing risk systematically.
