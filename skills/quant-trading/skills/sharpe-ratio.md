---
description: >
  The universal metric for comparing risk-adjusted returns across strategies. Use this to evaluate and rank trading opportunities — higher Sharpe means better risk-reward and higher maximum growth via Kelly formula.
source:
  chapters: [2, 3, 6]
  key-insight: "Sharpe ratio squared determines maximum compounded growth rate; focus on Sharpe, not raw returns."
---

# Sharpe Ratio

The Sharpe ratio measures return per unit of risk. It's the single most important metric in quantitative trading because it directly determines your maximum long-term wealth growth via the [[kelly-formula]].

## Definition

**Sharpe Ratio = (Average Return - Risk-Free Rate) / Standard Deviation of Returns**

Key points:
- Use **excess returns** (returns minus risk-free rate) in the numerator
- Standard deviation measures total volatility (up **and** down)
- Annualize both components for comparability

## Why It Matters

The book proves that maximum compounded growth rate = **r + S²/2** where S is Sharpe ratio.

This means:
- Sharpe of 1.0 → 0.5% additional growth per year (beyond risk-free rate)
- Sharpe of 2.0 → 2.0% additional growth  
- Sharpe of 3.0 → 4.5% additional growth

Doubling Sharpe ratio quadruples growth! This is why [[high-frequency-trading]] strategies with 3.0+ Sharpes can compound capital at extraordinary rates despite modest total returns.

## Calculation

For a strategy with monthly returns:

**Step 1:** Calculate excess returns for each month
- Monthly return - (risk-free rate / 12)

**Step 2:** Find mean and standard deviation of excess returns
- Mean excess monthly return: m̄
- Std dev of monthly returns: σ_monthly

**Step 3:** Annualize
- Annualized Sharpe = √12 × (m̄ / σ_monthly)

General formula for T-period returns:
- **Annualized Sharpe = √N_T × Sharpe_T**
- N_T = number of periods T in one year

Example from book: For hourly strategy during NYSE hours (6.5 hours/day):
- N_T = 252 days × 6.5 hours = 1,638 hours/year
- Annualized Sharpe = √1,638 × hourly Sharpe

Common mistake: Using 252 × 24 = 6,048 (wrong because market isn't open 24 hours).

## Interpreting Values

Typical institutional benchmarks:
- **< 0.5:** Poor, likely unviable after costs
- **0.5 - 1.0:** Decent, but requires significant capital to be worthwhile
- **1.0 - 2.0:** Good, attractive for most traders
- **2.0 - 3.0:** Excellent, typical of successful [[mean-reversion]] strategies
- **> 3.0:** Outstanding, often [[high-frequency-trading]] or very low-capacity

The book's examples:
- Buy-hold SPY: 0.43 (mediocre)
- GLD/GDX [[pair-trading]]: 2.3 training, 1.5 test (excellent)
- Mean-reverting S&P 500 strategy: 0.25 before costs, -3.19 after (disaster)

## Dollar-Neutral Strategies

Critical subtlety from the book: For dollar-neutral (market-neutral) portfolios, do **not** subtract risk-free rate when calculating excess returns.

Why? A dollar-neutral portfolio is self-financing: cash from shorts funds the longs. Your margin balance earns risk-free rate r_F. The portfolio return R already accounts for this.

Excess return for Sharpe calculation:
- R + r_F - r_F = R (the risk-free components cancel)

Similarly, for day-trading strategies with no overnight positions, you have no financing costs, so don't subtract the risk-free rate.

**Only subtract risk-free rate when your strategy incurs financing costs** (e.g., leveraged long-only holding overnight).

## Sharpe vs. Other Metrics

**Sharpe vs. Average Return:** A 30% annual return with 50% volatility (Sharpe = 0.6) is inferior to 15% return with 10% volatility (Sharpe = 1.5) for long-term wealth building. The second strategy allows 2.5x leverage via [[kelly-formula]], producing higher growth with same risk.

**Sharpe vs. Maximum Drawdown:** [[maximum-drawdown]] measures pain tolerance, Sharpe measures efficiency. Ideal: high Sharpe **and** low drawdown. But given a choice, prioritize Sharpe — it determines long-term wealth.

**Sharpe vs. Win Rate:** High win rate with negative Sharpe loses money. Low win rate with positive Sharpe makes money. Sharpe accounts for both frequency and magnitude of wins/losses.

## Practical Steps

**1. Run backtest, calculate returns:**
```matlab
dailyReturns = (prices(2:end) - prices(1:end-1)) ./ prices(1:end-1);
```

**2. Calculate excess returns:**
```matlab
riskFreeRate = 0.04; % 4% annually
excessReturns = dailyReturns - riskFreeRate/252;
```

**3. Compute annualized Sharpe:**
```matlab
sharpe = sqrt(252) * mean(excessReturns) / std(excessReturns);
```

**4. Compare to benchmarks:**
- Is it > 1.0? Worth pursuing
- Does it beat buy-and-hold of the index?
- Does it survive [[transaction-costs]]?

## Common Pitfalls

**Pitfall: Ignoring transaction costs**
The book's Example 3.7 shows a strategy with 4.43 Sharpe before costs, 0.78 after 5bp costs. Always calculate Sharpe **after** realistic [[transaction-costs]].

**Pitfall: Short backtests**
Sharpe calculated on 3 months of data is almost meaningless (insufficient samples). Need ≥1 year, preferably 3+ years.

**Pitfall: Overfitting**
High backtest Sharpe from [[data-snooping-bias]] won't persist. Require economic rationale and validate via [[out-of-sample-testing]].

**Pitfall: Regime changes**
The book notes [[regime-switching]] (e.g., decimalization in 2001) can permanently alter strategy Sharpe. Historical Sharpe may not predict future Sharpe.

**Pitfall: Return distribution**
Sharpe assumes Gaussian returns. Strategies with fat tails (occasional huge losses) appear to have good Sharpe until the tail event occurs. Supplement with [[maximum-drawdown]] analysis.

## Improving Sharpe

**Increase frequency:** Higher-frequency strategies typically have higher Sharpes (more independent bets per year). This is why [[high-frequency-trading]] dominates institutional quant trading.

**Portfolio diversification:** Combining uncorrelated strategies improves aggregate Sharpe. The book's multi-strategy portfolio (Example 6.3) achieved Sharpe of 0.48 vs. individual stocks with Sharpes of 0.38, 0.36, -0.39.

**Better execution:** Reducing slippage and market impact via [[brokerage-selection]] can boost Sharpe by 20-30% without changing the strategy.

**Reduce volatility:** Trade lower-beta stocks with higher leverage (per [[kelly-formula]]) rather than high-beta stocks without leverage. Same return, lower risk, higher Sharpe.

## Example: Comparing Strategies

Book Example 3.4 (IGE buy-and-hold):
- Annual return: 11.23%
- Risk-free rate: 4%
- Std dev: 16.91%
- **Sharpe = (11.23% - 4%) / 16.91% = 0.43**

Book Example 3.6 (GLD/GDX pair trade):
- Training set Sharpe: 2.3
- Test set Sharpe: 1.5

The pair trade's 1.5 Sharpe is 3.5x better than buy-hold's 0.43. Via [[kelly-formula]], this means 12.25x higher maximum growth rate (1.5² / 0.43² ≈ 12.25).

## Related Skills

- [[kelly-formula]] — Uses Sharpe to determine optimal leverage
- [[maximum-drawdown]] — Complementary risk metric
- [[transaction-costs]] — Can destroy Sharpe
- [[high-frequency-trading]] — Achieves high Sharpe via frequency
- [[mean-reversion]] — Often produces high Sharpe
- [[pair-trading]] — Example of high-Sharpe strategy
- [[out-of-sample-testing]] — Validates Sharpe robustness
- [[capacity]] — High Sharpe often correlates with low capacity

Focus on Sharpe ratio above all other metrics. It directly maps to long-term wealth via the Kelly formula and provides apples-to-apples comparison across vastly different strategies. A 1.5 Sharpe day-trading strategy, a 1.5 Sharpe monthly rebalancing strategy, and a 1.5 Sharpe annual seasonal trade all produce the same maximum growth rate — the book proves this mathematically.

Your goal: Find strategies with >1.0 Sharpe after [[transaction-costs]], combine them in a portfolio for diversification, and apply [[optimal-leverage]] via Kelly. That's the formula for compounding wealth.
