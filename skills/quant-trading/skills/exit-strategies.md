---
description: >
  When and how to close positions — as important as entry signals but often neglected. Use this to systematically exit trades for mean-reversion vs. momentum strategies.
source:
  chapters: [7]
  key-insight: "Mean reversion: exit at mean crossing or profit target. Momentum: exit when trend reverses. Stop loss helps momentum, hurts mean reversion."
---

# Exit Strategies

The book dedicates Section 7.6 to exits, noting they're often overlooked despite being as critical as entries. The optimal exit depends entirely on your strategy type.

## Exit Methods

### 1. Fixed Holding Period

**When:** Default for any strategy (momentum, reversal, or seasonal).

For [[momentum-strategies]], research determines average trend duration. PEAD (post-earnings drift) lasts ~20-60 days. Institutional order execution momentum lasts hours to days.

For [[seasonal-trading]], holding period is inherent. Gasoline futures seasonal (book example): enter April 13, exit April 25 = 12-day fixed hold.

**Challenge:** The book warns optimal holding period typically decreases over time as competition increases and information diffuses faster. "A momentum model that worked well with holding period equal to a week in backtest period may work only with one-day holding period now."

**For mean reversion:** Can estimate optimal holding period more robustly via half-life calculation (see below).

### 2. Target Price or Profit Cap

**When:** Primarily for [[mean-reversion]] strategies.

If your security is mean reverting, you have a ready-made target: the historical mean price μ.

Book introduces **Ornstein-Uhlenbeck formula** to model mean reversion:

**dz(t) = -θ(z(t) - μ)dt + dW**

where:
- z(t) = spread or price
- μ = mean value
- θ = mean-reversion speed
- dW = random noise

**Estimating half-life (Book Example 7.5):**

```matlab
% Calculate change in spread
dz = spread(2:end) - spread(1:end-1);
prevSpread = spread(1:end-1) - mean(spread);

% Estimate θ via linear regression
theta = regress(dz, prevSpread);

% Calculate half-life
halfLife = -log(2) / theta;
```

For GLD/GDX [[pair-trading]]: **halfLife ≈ 10 days**

Interpretation: Expected time for spread to revert halfway to its mean. Use this as holding period estimate or exit criterion.

**Advantage:** Uses entire time series (not just trade signals) → more statistically robust than optimizing holding period via backtest (which suffers from [[data-snooping-bias]] due to limited trade samples).

### 3. Latest Entry Signals

**When:** Strategy can be run more frequently than optimal holding period.

**Method:** Run entry model again. If latest signal opposes current position, exit (and optionally reverse).

Example:
- Currently long AAPL (signal 3 days ago: "buy")
- Run model today → signal says "sell"  
- **Exit the long** (or flip to short)

**For momentum:** This approach implicitly implements stop loss. Signal reversal means trend changed → exit makes sense.

**For mean reversion:** Latest signal rarely conflicts with existing position (mean hasn't been crossed yet). Only generates exit when spread finally crosses mean.

The book prefers this over arbitrary stop loss because it's "clearly justified based on rationale for the momentum model" rather than introducing extra adjustable parameters.

### 4. Stop Loss

**Controversial.** The book takes nuanced view in "Is the Use of Stop Loss a Good Risk Management Practice?" sidebar.

**For [[momentum-strategies]]: Beneficial**

If price moves against you, the trend you bet on failed. Exit is logical.

But book recommends: **Use reversal signals (method #3) instead of arbitrary price stops.** Avoids introducing another parameter to overfit.

**For [[mean-reversion]]: Usually harmful**

By definition, you enter when price is far from mean. Stop loss exits at maximum deviation — the worst possible time.

Example: Enter [[pair-trading]] spread at -2σ, set stop at -3σ. You're exiting just before maximum reversion opportunity. The book: "A stop loss in this case often means you are exiting at the worst possible time."

**Exception:** News-driven fundamental change. If earnings announcement suggests cointegration is broken or fundamental value shifted, exit immediately regardless of price. Not a stop-loss rule; it's a regime-change override.

**For accidental positions:** If you entered by mistake (software bug, data error), exit immediately. Don't wait for mean reversion — you have no model supporting the position.

## Strategy-Specific Guidance

### Mean-Reversion Exits

**Primary:** Exit when spread crosses mean (target price achieved)

**Secondary:** Exit after half-life duration (expected reversion time)

**Avoid:** Stop loss (harmful except for regime change)

Example from book (GLD/GDX):
- Enter when spread < mean - 2σ or > mean + 2σ
- Exit when spread returns to within ±1σ of mean
- Or hold for 10 days (estimated half-life)

### Momentum Exits

**Primary:** Exit when reversal signal appears (run model again, signal flips)

**Secondary:** Exit after estimated trend duration (from backtest)

**Acceptable:** Stop loss if price moves against position (trend failed)

Example (PEAD):
- Enter when earnings beat expectations
- Exit after 30 days (average drift duration from research)
- Or exit earlier if next earnings announcement (new regime)

### Seasonal Exits

**Fixed:** Calendar-driven holding periods

Example (gasoline futures, book sidebar):
- Enter: April 13 close
- Exit: April 25 close
- Duration: 12 trading days (seasonally optimal)

No optimization needed — timing driven by known seasonal demand patterns.

## Pitfalls

**Over-optimizing exits:** Adding too many exit conditions (profit target AND time stop AND trailing stop AND reversal signal) = [[data-snooping-bias]]. Keep it simple.

**Ignoring transaction costs:** Frequent exits rack up [[transaction-costs]]. Tightening exit criteria from ±1σ to ±0.5σ might increase trade frequency 2x → double the costs → destroy returns.

**Using momentum exits for mean reversion:** Stop loss on mean-reverting position = selling at the bottom. The book emphasizes understanding your regime.

**Fixed stops without rationale:** "Exit if down 2%" is arbitrary. Why 2%? Why not 1.5% or 3%? Each parameter you optimize invites overfitting.

## Related Skills

Strategy types:
- [[mean-reversion]] — Exits at mean crossing, not stop loss
- [[momentum-strategies]] — Exits on reversal or after trend exhaustion
- [[pair-trading]] — Specific mean-reversion exits
- [[seasonal-trading]] — Fixed calendar-based exits

Validation:
- [[backtesting]] — Test exit rules without overfitting
- [[data-snooping-bias]] — Risk from optimizing holding periods
- [[out-of-sample-testing]] — Validate exit timing

Practical:
- [[transaction-costs]] — Frequent exits compound costs
- [[regime-switching]] — When to override normal exit rules

The book's bottom line: **Match exit strategy to entry strategy.** Mean reversion exits at target, momentum exits on reversal, seasonal exits on calendar. And wherever possible, use mathematical estimation (half-life) rather than backtest optimization to avoid [[data-snooping-bias]] from limited trade samples.

Exit discipline matters as much as entry discipline. A brilliant entry with poor exit execution leaves money on the table or turns winners into losers.
