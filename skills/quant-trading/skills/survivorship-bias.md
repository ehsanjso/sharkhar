---
description: >
  Historical databases missing delisted stocks (bankrupt or acquired) — artificially inflates backtest performance, especially for mean-reversion strategies. Use this to identify and avoid databases that paint false pictures of profitability.
source:
  chapters: [2, 3, 7]
  key-insight: "Mean-reversion backtests on survivorship-biased data show profits on trades you could never have made — buying stocks that went bankrupt (missing from data) and shorting stocks that got acquired (also missing)."
---

# Survivorship Bias

Survivorship bias occurs when historical databases only contain stocks that survived to the present, excluding those that delisted (bankruptcy, acquisition, merger, or other reasons). This creates an illusion of profitability for strategies that would have failed in reality.

## How It Inflates Performance

**The mechanism (from the book):**

Mean-reversion strategy says "buy stocks that crashed, short stocks that rallied."

**With survivorship-biased data:**
- You backtest buying stocks that crashed but later recovered (survivors in database)
- You backtest shorting stocks that rallied but later declined (survivors in database)
- Both trades appear profitable

**Reality:**
- Some crashed stocks went bankrupt (delisted → missing from database → you'd have lost 100%)
- Some rallied stocks got acquired at premium (delisted → missing → you'd have lost on short)

Result: "Your backtest shows profits on trades you could never have made." This is the book's exact warning.

## Example Impact

Book doesn't provide specific numbers, but academic research suggests:
- Mean-reversion Sharpe can be inflated 50-100% on survivorship-biased data
- Buy-and-hold less affected (maybe 5-15% inflation)
- Short-selling strategies severely affected (100-200% inflation possible)

The bias is **asymmetric**: affects [[mean-reversion]] far more than [[momentum-strategies]].

## Which Databases Have Bias

**Book's guidance (Table 3.1 summary):**

**Survivorship-free (clean):**
- CRSP (expensive, institutional-grade)
- Compustat (expensive)
- QuantQuote (relatively affordable)

**Survivorship-biased (contaminated):**
- Yahoo! Finance (free but biased)
- Most free internet sources
- Some vendor feeds that only track "current universe"

**Unknown/partial:**
- Commodity futures: Generally clean (all contracts eventually delist by design)
- ForexFeed.com (probably clean — currencies don't go bankrupt as often)

## Detection Techniques

**Method 1: Index constituent lists:**
Book example: "Select all stocks in S&P 500 as of today, backtest on those stocks for past 10 years."

This is **wrong** — you're selecting survivors (stocks still in index today) and testing as if they were always in the index.

Correct: "Select stocks in S&P 500 as of date T, trade only those stocks on date T." Requires historical constituent lists (expensive).

**Method 2: Missing stocks test:**
If database has zero stocks with:
- <$1 final price
- Dramatic volume spikes followed by delisting
- Gap downs exceeding 80%

...it's probably survivorship-biased. Real markets have bankruptcies; databases should contain them.

**Method 3: Performance too good:**
If your [[mean-reversion]] backtest shows Sharpe >3.0 on broad universe going back 10+ years, you probably have survivorship bias (or [[data-snooping-bias]]).

## Workarounds

**1. Pay for clean data:**
Invest in CRSP, Compustat, or QuantQuote. The book implies this is worthwhile for serious trading.

Cost: $thousands to $tens of thousands annually. But cheaper than losing money on biased backtests.

**2. Test on recent periods:**
Book suggestion: "Test on recent periods where delisting is less common."

2015-present has fewer delistings than 2000-2010 (which included dot-com bust). Not perfect, but reduces bias.

**3. Exclude small-caps:**
Delisting primarily affects small-cap and micro-cap stocks. S&P 500 large-caps rarely delist.

If you restrict universe to S&P 100 or DJIA, survivorship bias is minimal (but you sacrifice [[mean-reversion]] opportunities in small-caps).

**4. Conservative validation:**
Even with biased data, apply rigorous [[out-of-sample-testing]] and [[paper-trading]]. If strategy survives both **and** economic rationale is sound, bias might not destroy it.

But remain skeptical until live trading confirms.

## Strategy-Specific Impact

**[[mean-reversion]]:** Catastrophically affected.

Why: You're explicitly targeting stocks that deviated from "normal" (crashed or spiked). Many of those deviations were permanent (bankruptcy/acquisition), not temporary. Survivorship bias hides the permanent ones.

Book: "Survivorship bias also affects the backtesting of mean-reverting strategies disproportionately."

**[[momentum-strategies]]:** Less affected.

Momentum often involves buying winners and shorting losers. Survivors database contains many winners (no problem) and excludes complete losers (helps short side slightly).

Still biased, but magnitude is smaller.

**[[pair-trading]]:** Moderate impact.

If one stock in pair delists, the spread calculation breaks. Survivorship-biased data hides these events. You'd backtest trading pairs that broke due to delisting, showing false losses or gains.

**Buy-and-hold:** Minimal impact.

Long-only portfolios of large-caps rarely affected. Small-caps more affected, but less than active strategies.

## Real-World Consequences

The book shares: When traders move from survivorship-biased backtest to live trading with [[mean-reversion]] strategies, they often experience "meager or maybe even negative returns."

Diagnostic checklist from Chapter 5 includes: "Is survivorship bias causing the underperformance?"

If backtest used Yahoo! Finance and strategy was mean-reverting on small-caps, answer is almost certainly "yes."

## Related to Other Biases

**Survivorship + [[look-ahead-bias]]:**
Deadly combination. Not only are delisted stocks missing (survivorship), but you're also using unavailable data (look-ahead). Double contamination.

**Survivorship ≠ [[data-snooping-bias]]:**
Different issues:
- Survivorship: Database contamination (missing data)
- Data-snooping: Methodology contamination (overfitting parameters)

Both inflate backtest performance, but via different mechanisms. You can have one without the other.

## Example Detection

Book Example 3.7 ([[mean-reversion]] on S&P 500):
- Uses "current S&P 500" constituents
- Likely has survivorship bias (stocks that dropped out aren't included)
- But Sharpe 4.43 → 0.78 after [[transaction-costs]]

Even with potential survivorship bias, transaction costs dominated. This suggests: bias exists but isn't the primary performance driver for this specific strategy (large-cap, short-term mean-reversion).

Contrast: Small-cap mean-reversion over 10 years would be destroyed by survivorship bias.

## Practical Guidance

**Before trading:**
1. Identify if your data source has survivorship bias
2. If yes and strategy is [[mean-reversion]]: **Don't trust the backtest**
3. Either buy clean data or restrict to recent periods/large-caps
4. Run extended [[paper-trading]] (months, not weeks) to validate

**During backtesting:**
Ask: "Does this strategy profit from extreme moves?"
- If yes → highly susceptible to survivorship bias
- If no → less susceptible

**Interpretation:**
Book's implicit guidance: Treat survivorship-biased backtests as **upper bound** on performance, not realistic expectation. Real performance will be worse, possibly dramatically.

## Related Skills

Data quality:
- [[historical-data-sourcing]] — Where to find clean data
- [[split-dividend-adjustment]] — Another data quality issue
- [[backtesting]] — Methodology to minimize bias

Most vulnerable strategies:
- [[mean-reversion]] — Disproportionately affected
- [[pair-trading]] — Affected when pairs break
- [[momentum-strategies]] — Less affected but still impacted

Validation:
- [[out-of-sample-testing]] — Can partly compensate
- [[paper-trading]] — Ultimate reality check

The book's message: Survivorship bias is invisible in backtests but brutally visible in live trading. For [[mean-reversion]] strategies on broad universes, it's not a minor issue — it's potentially the difference between 3.0 Sharpe and bankruptcy.

Pay for clean data if you can afford it. If not, restrict your universe and remain highly skeptical of backtest results until paper trading validates them.
