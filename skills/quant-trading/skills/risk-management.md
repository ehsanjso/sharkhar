---
description: >
  MOC for optimal capital allocation and loss prevention. Use this when sizing positions, applying leverage, or managing drawdowns — the difference between exponential wealth growth and ruin.
source:
  chapters: [6]
  key-insight: "Risk management is not about avoiding losses; it's about sizing bets optimally so losses don't destroy your ability to profit when the edge returns."
---

# Risk Management

Most traders think risk management means "don't lose too much." Wrong. Optimal risk management means maximizing long-term compounded growth while ensuring survival. The [[kelly-formula]] provides the mathematical foundation; psychological discipline provides the execution.

## The Kelly Framework

[[kelly-formula]] answers the fundamental question: **How much of my capital should I risk on each trade?** Too little, and you grow slowly. Too much, and you risk ruin.

The formula: `f = m / σ²` where f is leverage, m is expected excess return, and σ is standard deviation. This maximizes long-term geometric growth while ensuring you never go broke.

Key insight from the book: long-term compounded growth rate = `r + S² / 2` where S is [[sharpe-ratio]]. This is why high Sharpe ratio matters more than high returns. A 15% return with 0.4 Sharpe grows wealth slower than 8% return with 0.8 Sharpe (assuming optimal leverage).

## Optimal Leverage

[[optimal-leverage]] extends Kelly to multiple strategies. If you have several uncorrelated strategies, the optimal capital allocation is:

`F* = C⁻¹M`

where C is the covariance matrix of returns and M is the vector of mean excess returns. This automatically diversifies across strategies based on their individual Sharpes **and** their correlations.

Critical rule: **update allocations daily**. As your equity changes, rebalance to maintain optimal leverage. Lost 10%? Reduce positions proportionally. Gained 20%? Scale up. Kelly requires continuous rebalancing.

## Half-Kelly Protection

Most practitioners use "half-Kelly" leverage (50% of optimal) because:
- Return distributions have fat tails (not truly Gaussian)
- Parameter estimates (mean return, volatility) are uncertain
- Overleverage causes catastrophic losses during black swans

The book recommends further constraining leverage by historical worst-case drawdown. If max historical one-day loss was 20% and you can tolerate 20% equity drawdown, max leverage = 1.0 even if half-Kelly suggests 1.26.

## The Three Forms of Risk

**Position risk** (market + specific risk): Managed via [[kelly-formula]] and [[optimal-leverage]]. Diversify across strategies, never concentrate in single bets, and scale position sizes to liquidity (see [[transaction-costs]]).

**Model risk:** Your strategy might be wrong due to [[data-snooping-bias]], [[regime-switching]], or flawed assumptions. Mitigation: have collaborators independently validate backtests, and gradually reduce leverage as a strategy underperforms (via Kelly updates).

**Software risk:** Your [[execution-systems]] might have bugs. Mitigation: [[paper-trading]] before going live, reconcile live trades against backtest predictions, and maintain manual override capability.

## Maximum Drawdown

[[maximum-drawdown]] measures the peak-to-trough equity decline. It answers: "How much pain will I endure before this strategy recovers?"

Calculate it both in backtests and live trading. If live drawdown exceeds backtest max by 50%, something is wrong (likely [[data-snooping-bias]] or [[regime-switching]]).

The book's formula for tracking drawdown: maintain running "high watermark" (max cumulative return seen), then drawdown = `(1 + highWatermark) / (1 + currentReturn) - 1`.

Use max drawdown duration (how many days in drawdown) to set realistic expectations. A strategy with 11% max drawdown but 497-day duration tests your psychological stamina differently than 11% drawdown that recovers in 30 days.

## Stop Loss: When and When Not

The book takes a nuanced view on stop losses:

**For [[momentum-strategies]]:** Stop loss makes sense. If the trend reversed, exit. Running the strategy again generates opposite signals, effectively triggering the stop. Don't override this with arbitrary price levels.

**For [[mean-reversion]] strategies:** Stop loss is usually wrong. Exiting during maximum deviation means selling at the worst possible time. Exceptions: news-driven moves that indicate fundamental regime change rather than temporary dislocation.

Example from the book: accidentally entering a position due to error, then waiting for mean reversion to exit. Wrong. If you didn't intentionally want the position based on your model, exit immediately regardless of loss.

## Behavioral Traps

Psychological discipline separates successful risk managers from failures. The book identifies key biases:

**Loss aversion / endowment effect:** Holding losers too long (hoping for recovery) while cutting winners too early (fearing loss of gains). Antidote: let [[kelly-formula]] dictate position sizes, not emotions.

**Representativeness bias:** After big loss, immediately tweaking strategy to avoid that specific loss. Antidote: backtest any changes over full historical period, not just recent weeks.

**Despair:** During prolonged drawdown, pressure mounts to shut down the strategy. Antidote: if you're updating leverage via Kelly, position size automatically decreases during drawdowns. Trust the system.

**Greed:** After great run, temptation to massively scale up. Antidote: scale up gradually via Kelly rebalancing, not emotion-driven leaps.

The book's golden rule: **Keep position sizes under control at all times.** Overleveraging (whether from despair or greed) has destroyed more traders than bad strategies.

## Financial Contagion

Why did huge hedge funds lose billions in August 2007 when small traders profited? Risk management sell-offs created cascading liquidity crises.

Mechanism: Fund A suffers loss (e.g., subprime mortgages), triggering risk management selling of liquid positions (stocks). This moves prices, causing losses at Fund B (no subprime exposure), triggering their risk management selling, and so on. Contagion spreads from one asset class to uncorrelated assets.

Small traders avoided this by:
1. Not being forced sellers (no redemptions, no margin calls)
2. Trading low-capacity strategies (small positions don't create market impact)
3. Actually benefiting from the forced institutional selling (mean-reversion opportunities)

This illustrates why [[capacity]] is an advantage: small traders can exit positions without moving markets, enabling faster de-risking without contagion.

## Practical Implementation

Daily routine for risk management:
1. Update strategy parameters (mean returns, volatilities) using recent trailing data
2. Calculate optimal leverage via [[kelly-formula]]  
3. Rebalance portfolio to match optimal allocation
4. Track high watermark and current drawdown
5. Monitor for [[regime-switching]] indicators

Monthly review:
- Compare live [[sharpe-ratio]] to backtest expectations
- Analyze worst drawdown and duration
- Assess whether strategy behavior matches backtest
- Consider reducing leverage if persistent underperformance

## Connected Skills

Mathematical foundations:
- [[kelly-formula]] — Optimal position sizing
- [[optimal-leverage]] — Multi-strategy allocation
- [[sharpe-ratio]] — Risk-adjusted return metric
- [[maximum-drawdown]] — Peak-to-trough equity loss

Strategy considerations:
- [[mean-reversion]] — When stop loss hurts
- [[momentum-strategies]] — When stop loss helps
- [[regime-switching]] — Detecting changing market conditions
- [[capacity]] — Why small traders have advantages

Related topics:
- [[data-snooping-bias]] — Source of model risk
- [[execution-systems]] — Source of software risk
- [[transaction-costs]] — Limit position sizing

Risk management is your edge. Institutions with brilliant strategies blow up from overleveraging. Independent traders with modest strategies thrive through discipline. Master the Kelly formula, control your emotions, and you'll compound wealth while others chase returns straight into ruin.
