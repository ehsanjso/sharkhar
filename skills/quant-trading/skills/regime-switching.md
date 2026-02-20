---
description: >
  Detecting and adapting to changing market conditions — when mean-reversion shifts to momentum or volatility regimes change. Use this to avoid catastrophic losses when market structure fundamentally changes.
source:
  chapters: [5, 7]
  key-insight: "Regime shifts (decimalization, plus-tick rule changes) can permanently alter strategy performance. Detect them early via parameter drift or use machine learning to predict transitions."
---

# Regime Switching

Regime switching refers to transitions between different market states — from bull to bear, low to high volatility, or mean-reversion to momentum. The book addresses this in Chapters 5 and 7 as both a risk (unexpected shifts destroy strategies) and an opportunity (predicting shifts enables profitable trading).

## Types of Regime Shifts

**1. Regulatory/structural (permanent):**
- **Decimalization (2001):** Stock prices changed from fractions to decimals, dramatically impacting statistical arbitrage profitability
- **Plus-tick rule elimination (2007):** Removed short-sale restrictions, changing short-selling dynamics
- Book notes these shifts made pre-2001 backtests "far superior to present-day performance"

**2. Market volatility:**
- Low vol → high vol (or reverse)
- GARCH models can predict these somewhat
- Less useful for stock traders, more for options

**3. Mean-reversion ↔ momentum:**
- Most relevant for quantitative traders
- Prices shift from reverting to trending behavior
- Book: "At any given time, stock prices can be both mean reverting and trending depending on time horizon"

**4. Factor regime changes:**
- Value → growth preference
- Book example: August/December 2007 when growth stocks outperformed value despite historical patterns

## Detection via Parameter Drift

Book's diagnostic (Chapter 5): If live performance diverges from backtest, check if "factor returns remain constant from current period to next."

Method:
- Update [[kelly-formula]] parameters using trailing window (e.g., 6 months)
- If mean return M trends toward zero → regime changing
- Kelly leverage automatically decreases → systematic de-risking

This is "preferable to abruptly shutting down a model because of large drawdown."

## Machine Learning Approach

Book Example 7.1 demonstrates regime switching detection using Alphacet Discovery's neural network on Goldman Sachs (GS) stock.

**Methodology:**
- Inputs: 1-day percent changes, 10-day highs/lows
- Triggers: ±1% and ±3% moves when at 10-day extremes
- Outputs: Optimal holding periods (1, 5, 10, 20, 40, 60 days)
- Algorithm: Perceptron (neural network) optimizes weights in rolling 50-day window

**Results:**
- Buy-hold Sharpe: 0.38
- Optimized regime-switching: Sharpe 0.48
- Period: 6 months (short backtest)

**Key insight:** "Perceptron will not force us to hold position for exactly N days... Every day, strategy will decide whether to buy, sell, or do nothing, based on latest parameter optimization."

## Practical Implementation

**For independent traders without ML platforms:**

**1. Simple trend/reversion detector:**
- Calculate rolling correlation between price and time
- Positive correlation (>0.3) → trending regime → use [[momentum-strategies]]
- Near-zero correlation → mean-reverting → use [[mean-reversion]]

**2. Volatility regime:**
- Calculate rolling standard deviation
- High vol (>1.5× average) → avoid mean-reversion (wider stops hit more often)
- Low vol → favor mean-reversion

**3. News-driven regime shift:**
- Earnings announcements → shift to momentum temporarily
- No news + big move → assume liquidity-driven mean-reversion

## Pitfalls

**Data-snooping via regime optimization:**
Book warns: Don't add conditions that "turn off strategy outside specific periods" after looking at backtest.

Example of bad practice:
- Notice strategy failed 2015-2017
- Add rule: "Don't trade if VIX > 20" (happens to match 2015-2017)
- This is curve-fitting the regime dates

**Small sample for regime prediction:**
Book acknowledges difficulty: "How could you know how big an order an institution needs to execute incrementally? How do you predict when the 'herd' is large enough to form a stampede?"

Limited historical regime transitions = weak statistical power.

## Relationship to Stop Loss

Book connects regime switching to [[exit-strategies]]:

**For momentum:** Regime switch back to mean-reversion = stop loss trigger. "Rather than imposing arbitrary stop-loss price... exiting based on most recent entry signal is clearly justified."

**For mean-reversion:** Only exit on news-driven regime change (earnings that alter fundamentals), not price-driven stops.

## Related Skills

Foundation:
- [[mean-reversion]] — One regime type
- [[momentum-strategies]] — The other regime type
- [[exit-strategies]] — Regime-aware exits

Risk management:
- [[kelly-formula]] — Update parameters to adapt to regimes
- [[risk-management]] — Gradual deleveraging as regimes shift
- [[maximum-drawdown]] — Regime shifts cause unexpected drawdowns

Validation:
- [[backtesting]] — Test across multiple regimes
- [[out-of-sample-testing]] — Especially important if regimes present
- [[paper-trading]] — Validates strategy adapts to current regime

The book's verdict: Regime switching is real and dangerous (structural shifts destroy strategies) but also predictable to some degree (via parameter monitoring or ML). 

The solution isn't trying to perfectly predict regimes. It's building adaptive systems that gracefully reduce exposure as parameters deteriorate, rather than blindly trusting historical backtests.
