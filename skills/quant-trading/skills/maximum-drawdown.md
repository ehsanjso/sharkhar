---
description: >
  Peak-to-trough equity decline during a trading period — measures pain tolerance and helps constrain leverage. Use this alongside Sharpe ratio to understand a strategy's risk profile.
source:
  chapters: [3, 6]
  key-insight: "Two strategies with same Sharpe can have vastly different drawdowns. Max drawdown tells you the pain you'll endure before recovery."
---

# Maximum Drawdown

Maximum drawdown measures the largest peak-to-trough decline in equity during backtesting or live trading. It answers: "How much pain will I suffer before this strategy recovers?"

## Definition

**Max Drawdown = max over all t of: (HighWaterMark_t - Equity_t) / HighWaterMark_t**

Where high watermark = maximum cumulative return achieved up to time t.

Book's formula: `DD(t) = (1 + highWaterMark) / (1 + cumReturn(t)) - 1`

Example:
- Start with $100K
- Grow to $120K (new high watermark)
- Drop to $102K
- Drawdown = ($120K - $102K) / $120K = 15%

## Why It Matters

[[sharpe-ratio]] measures efficiency (return per risk unit). Maximum drawdown measures **psychological endurance**.

Book Example 3.4 (IGE buy-and-hold):
- Sharpe: 0.25
- **Max drawdown: 32%**
- Max drawdown duration: 497 days

Compare to book Example 3.6 (GLD/GDX [[pair-trading]]):
- Sharpe: 2.3 (training), 1.5 (test)
- **Max drawdown: ~11%** (estimated from Calmar ratio)
- Much shorter duration (days to weeks, not years)

Both involve trading, but the **pain profile differs dramatically**. IGE's 497-day drawdown tests psychological resolve far more than GLD/GDX's brief dips.

## Calculating Maximum Drawdown

**Book's MATLAB approach (Example 3.5):**

```matlab
% Calculate cumulative returns
cumReturn = cumprod(1 + dailyReturns) - 1;

% Track running maximum (high watermark)
highWaterMark = cummax(cumReturn);

% Calculate drawdown at each point
drawdown = (1 + highWaterMark) ./ (1 + cumReturn) - 1;

% Maximum drawdown
maxDD = max(drawdown);

% Maximum drawdown duration (days)
[maxDD, idx] = max(drawdown);
% Find when this drawdown started (last high watermark before idx)
% Find when it ended (next time cumReturn exceeded previous high)
```

For Book Example 3.4, the code outputs:
- **maxDD = 0.32** (32%)
- **maxDDDuration = 497 days**

## Using Drawdown to Constrain Leverage

The book recommends using maximum historical drawdown to override [[kelly-formula]] leverage recommendations.

**Method:**
1. Calculate max one-period historical loss (worst day, week, or month)
2. Decide your maximum tolerable equity drawdown
3. **Max leverage = tolerable drawdown / max historical loss**

Example from the book (SPY, Chapter 6):
- Max historical one-day loss: 20.47% (Black Monday, Oct 19, 1987)
- Tolerable equity drawdown: 20%
- **Max leverage = 20% / 20.47% ≈ 1.0**

Compare to Kelly recommendation for SPY: **f = 2.528**

Book's guidance: "Even half-Kelly leverage would not be conservative enough to survive Black Monday." Use **min(half-Kelly, drawdown-constrained leverage)**.

This protects against fat-tail events that Gaussian models (Kelly's assumption) underestimate.

## Drawdown Duration

**Equally important as magnitude.** The book emphasizes tracking both.

A strategy with:
- 15% max drawdown over 30 days = recoverable, manageable stress
- 15% max drawdown over 500 days = excruciating psychological test

Book Example 3.4:
- **497-day drawdown duration** = 1.97 years in drawdown!

Most traders (and their investors) can't psychologically handle multi-year drawdowns, even if strategy eventually recovers. This is why the book discusses "despair" in psychological preparedness (Chapter 6).

### Calculating Duration

MATLAB snippet:
```matlab
% Find index of maximum drawdown
[maxDD, maxDDIdx] = max(drawdown);

% Find when drawdown started (most recent high watermark)
startIdx = find(cumReturn(1:maxDDIdx) == highWaterMark(maxDDIdx), 1, 'last');

% Find when drawdown ended (next time cumReturn > previous high)
endIdx = find(cumReturn(maxDDIdx:end) > highWaterMark(maxDDIdx), 1) + maxDDIdx - 1;
if isempty(endIdx)
    endIdx = length(cumReturn);  % Still in drawdown
end

% Duration in days
maxDDDuration = endIdx - startIdx;
```

## Interpreting Drawdowns

**Typical institutional benchmarks:**
- **< 10%:** Excellent (high-Sharpe [[pair-trading]], [[high-frequency-trading]])
- **10-20%:** Good (solid [[mean-reversion]], diversified portfolios)
- **20-30%:** Acceptable (long-only with leverage, [[momentum-strategies]])
- **> 30%:** High risk (leveraged long-only, concentrated positions)

The book's examples:
- GLD/GDX pair trading: ~11% (good)
- IGE buy-hold: 32% (high)
- SPY buy-hold (implied): ~20.47% (Black Monday)

## Relationship to Sharpe Ratio

No direct mathematical relationship, but empirical patterns:

**High Sharpe (> 2.0):**
- Usually low drawdown (< 15%)
- [[pair-trading]], [[mean-reversion]], [[high-frequency-trading]]
- Law of large numbers smooths returns

**Medium Sharpe (0.8-1.5):**
- Moderate drawdown (15-25%)
- Diversified portfolios, some directional strategies

**Low Sharpe (< 0.5):**
- High drawdown (> 25%)
- Buy-and-hold, undiversified positions, overleveraged

But exceptions exist. A strategy could have high Sharpe from many small wins and low Sharpe×drawdown product from one catastrophic loss (fat tail).

## Live vs. Backtest Comparison

**Critical diagnostic:** Compare live drawdown to backtest maximum drawdown.

**If live exceeds backtest by >50%:**
- Likely [[data-snooping-bias]] (backtest overfit, didn't capture true risk)
- Or [[regime-switching]] (market structure changed)
- Or [[look-ahead-bias]] (backtest used future data)

**If live matches backtest within 20%:**
- Strategy likely robust
- Execution quality reasonable

Book warns: If live trading underperforms backtest dramatically, "this disappointing experience is common to freshly minted quantitative traders." Diagnose using the checklist in Chapter 5.

## Constraining via Calmar Ratio

**Calmar Ratio = Annual Return / Maximum Drawdown**

Some traders prefer this to Sharpe because it directly measures return vs. pain.

Book Example 3.6 (GLD/GDX):
- Calmar ratio: 2.3 (training set)
- Interpretation: Earn 2.3x the maximum drawdown annually

Compare to SPY:
- Annual return: ~11%
- Max drawdown: ~32%
- Calmar: 11% / 32% = 0.34

Higher Calmar = better risk-adjusted returns from a pain perspective.

## Practical Application

**During backtesting:**
1. Calculate max drawdown and duration
2. Ask yourself: "Can I psychologically handle this?"
3. If no → reduce leverage or find different strategy

**During live trading:**
1. Track current drawdown vs. high watermark
2. If approaching historical max → be prepared (not necessarily exit)
3. If exceeding historical max significantly → investigate for [[regime-switching]] or errors

**Portfolio construction:**
Combine strategies with uncorrelated drawdowns. When Strategy A is in drawdown, Strategy B might be at new highs → smoother equity curve.

## Related Skills

Risk metrics:
- [[sharpe-ratio]] — Measures efficiency; drawdown measures pain
- [[kelly-formula]] — Optimal leverage, but constrain by drawdown
- [[optimal-leverage]] — Use drawdown to override Kelly if needed

Strategy analysis:
- [[backtesting]] — Calculate max drawdown during validation
- [[out-of-sample-testing]] — Verify drawdown is realistic
- [[paper-trading]] — Observe drawdown before risking capital

Psychology:
- [[risk-management]] — Drawdown constrains leverage
- Psychological preparedness — Can you handle the pain?

The book's message: Focus on [[sharpe-ratio]] for selecting strategies, but use maximum drawdown to **constrain leverage** and **set expectations**. A 3.0 Sharpe strategy with 40% historical max drawdown is amazing on paper but might be psychologically unworkable. Better to trade a 2.0 Sharpe strategy with 12% max drawdown at higher leverage (Kelly-optimal) for equivalent risk-adjusted returns with tolerable pain.

Know your drawdown tolerance. It's as personal as risk tolerance, and ignoring it leads to abandoning good strategies at the worst possible time (maximum drawdown = capitulation point).
