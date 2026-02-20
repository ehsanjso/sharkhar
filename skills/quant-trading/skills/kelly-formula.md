---
description: >
  The mathematical foundation for optimal position sizing. Use this to determine how much capital to allocate to a strategy to maximize long-term compounded growth while avoiding ruin.
source:
  chapters: [6, Appendix]
  key-insight: "Optimal leverage = mean_excess_return / variance; too little growth is slow, too much risks ruin."
---

# Kelly Formula

The Kelly formula solves the fundamental problem of trading: **how much should I bet?** It mathematically proves the position size that maximizes long-term wealth while guaranteeing survival.

## What It Is

For a single strategy with Gaussian returns, the optimal leverage f is:

**f = m / σ²**

where:
- f = fraction of equity to deploy (leverage)
- m = mean one-period excess return (return minus risk-free rate)
- σ = standard deviation of one-period returns

The resulting maximum compounded growth rate is:

**g = r + f×m - σ²×f²/2**

which simplifies at optimal f to **g = r + S²/2** where S is the [[sharpe-ratio]].

This reveals a profound insight: long-term growth depends on Sharpe ratio squared, not raw returns. A 15% return with 0.3 Sharpe grows wealth slower than 8% return with 0.6 Sharpe.

## For Multiple Strategies

When managing multiple strategies, the formula generalizes to:

**F* = C⁻¹M**

where:
- F* = vector of optimal leverage for each strategy
- C = covariance matrix of strategy returns
- M = vector of mean excess returns

This automatically diversifies across strategies based on their individual Sharpes and their correlations. If two strategies are perfectly correlated, Kelly tells you to treat them as one. If uncorrelated, you can safely leverage both.

The maximum growth rate becomes **g = r + S²_portfolio/2** where S_portfolio = √(F*ᵀCF*).

## When to Apply

Use Kelly formula when:
- You want to maximize long-term wealth (not minimize short-term variance)
- You can tolerate the volatility that comes with optimal leverage
- You'll rebalance daily to maintain optimal allocation as equity changes
- You have reliable estimates of mean returns and volatility

The formula is time-scale independent: whether you calculate daily, monthly, or hourly returns and volatility, the optimal f remains the same. Only the growth rate calculation needs annualization via [[sharpe-ratio]].

## Practical Steps

**1. Calculate strategy statistics:**
- Run backtest to get daily (or other period) returns
- Calculate mean excess return m (subtract risk-free rate)
- Calculate standard deviation σ

Example from the book (SPY ETF, 1/1/2000 - 12/29/2007):
- Mean annual return: 11.23%
- Risk-free rate: 4%
- Mean excess return m: 7.23%
- Annual std dev σ: 16.91%

**2. Compute optimal leverage:**
f = 0.0723 / 0.1691² = 2.528

Interpretation: With $100K equity, buy $252,800 of SPY (borrow $152,800).

**3. Calculate expected growth:**
- Sharpe ratio S = 0.0723 / 0.1691 = 0.4275
- Max growth g = 0.04 + 0.4275² / 2 = 0.1314 = 13.14% annually

**4. Rebalance daily:**
- If portfolio drops 10%, reduce position by 10%
- If portfolio gains 20%, increase position by 20%

Continuous rebalancing is critical. Kelly assumes you're always at optimal leverage. Failure to rebalance after losses means overleveraging on remaining equity.

## Pitfalls

**Fat tails:** Real return distributions have larger tail risks than Gaussian. The 1987 crash (20.47% single-day drop) would have devastated full Kelly leverage. Solution: use **half-Kelly** (50% of optimal f).

**Parameter uncertainty:** Your estimates of m and σ are never perfect. Errors compound when leveraged. Solution: be conservative with inputs.

**Regime shifts:** A strategy's mean return can decay or reverse due to [[regime-switching]]. Kelly assumes stable parameters. Solution: update m and σ frequently using trailing windows (e.g., 6 months for daily strategies).

**Overleveraging:** The formula tells you the maximum safe leverage, not the minimum required. Going above Kelly risks ruin. The book emphasizes: constraint leverage by historical worst-case one-period loss.

Example: If max historical loss was 20% in one day, and you tolerate 20% equity drawdown, your max leverage = 1.0 regardless of Kelly's recommendation.

## Behavioral Challenge

Kelly requires disciplined execution:
- **Selling into losses** (reduce positions when equity drops)
- **Buying into gains** (increase positions when equity rises)

Both actions feel wrong emotionally. After a loss, you want to "wait for recovery" before reducing. After a gain, you want to "lock in profits" before adding. Resist these urges. Kelly's genius is it compounds gains and limits losses automatically through rebalancing.

The August 2007 quant meltdown illustrates this: funds forced to sell during losses created cascading price drops. But this was Kelly working as designed — reducing exposure to strategies whose statistical properties had shifted. The mistake was overleveraging initially, not the sell-off itself.

## Example: Practical Kelly

Using the book's GLD/GDX [[pair-trading]] example (Example 3.6):

Training set Sharpe: 2.3
Test set Sharpe: 1.5

Optimal leverage f = m / σ² (calculate from daily returns)
Expected growth = r + 1.5² / 2 = r + 1.125 (assuming test set Sharpe is reliable)

With half-Kelly:
- Reduce f by 50%  
- Reduces expected growth but dramatically cuts blow-up risk
- The book's practical recommendation for live trading

## Connection to Maximum Drawdown

Kelly and [[maximum-drawdown]] are linked. The book shows that a strategy following Kelly will experience drawdowns proportional to its volatility. Higher Sharpe allows higher leverage, which increases both growth **and** intra-period volatility.

This is why [[capacity]] matters: low-capacity, high-Sharpe strategies let you achieve high growth rates with modest absolute capital.

## Related Skills

- [[optimal-leverage]] — Applying Kelly to multiple strategies
- [[sharpe-ratio]] — The key input to Kelly
- [[maximum-drawdown]] — Constraining Kelly via worst-case loss
- [[risk-management]] — Kelly within broader risk framework
- [[regime-switching]] — When Kelly parameters change
- [[pair-trading]] — Example strategy with high Sharpe
- [[capacity]] — Why high Sharpe often means low capacity

The Kelly formula is elegant mathematics that most traders ignore to their detriment. Master it, and you transform good strategies into exponentially growing wealth. Ignore it, and you either grow too slowly (under-leveraged) or blow up eventually (over-leveraged).

For most independent traders, half-Kelly applied to strategies with >1.0 Sharpe ratio provides the sweet spot: meaningful growth with survivable drawdowns.
