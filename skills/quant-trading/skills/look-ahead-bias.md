---
description: >
  Using tomorrow's information for today's decisions in backtests — the most common and insidious backtest error. Use this to detect and eliminate impossible trades that appear profitable only because of time-travel.
source:
  chapters: [3, 5]
  key-insight: "If your backtest uses data not available at decision time, you're backtesting fiction. Paper trading will expose this immediately."
---

# Look-Ahead Bias

Look-ahead bias is using future data to make past decisions. Your backtest executes trades based on information that wouldn't exist yet in reality. Result: spectacularly profitable backtests, catastrophic live trading.

The book calls this "perhaps the most common error" in backtesting and notes that [[paper-trading]] "often" reveals it immediately when trades don't match backtest predictions.

## How It Happens

**Example 1: Intraday high/low (from the book)**

Bad backtest logic:
```
If close < 0.99 * dayLow:
    buy at close
```

Problem: You don't know `dayLow` until after the close! In the backtest, you bought at or near the low. Live, you'd discover the low only after market close, then execute next day (much higher price).

**Example 2: Same-day data**

Bad: `if (todayVolume > 1,000,000) buy at todayClose`

You're using the full day's volume to decide whether to buy at the close. But you only know the final volume **after** the close. Either the order executes tomorrow (different price), or it executes intraday before you know volume (can't use volume as criteria).

**Example 3: Corporate actions**

Bad: Using adjusted prices without shifting corporate action dates. Stock splits don't change the stock's value, but adjusted historical prices change retroactively. If you backtest "buy when price < $10" using split-adjusted prices, you'll generate buy signals that couldn't have existed pre-adjustment.

## Detection Techniques

### Method 1: Manual Code Review

Trace through decision logic step-by-step:

1. List all data used to make decision
2. Note the timestamp of the decision  
3. Verify each data point existed before that timestamp

The book's "golden rule": **If trading at the close, use only data through yesterday's close for today's signals.**

For intraday strategies: decisions at time T can only use data through time T-1 (or T minus reaction time).

### Method 2: Truncation Test (from the book)

Clever validation technique:

1. Run your backtest on full historical dataset
2. Note the positions generated on specific past dates
3. Delete the last N days from your database  
4. Re-run backtest
5. Check if positions on dates before the deletion match

If positions differ, your strategy uses future data (look-ahead bias). 

Why this works: If your strategy only uses data available at decision time, deleting future days shouldn't change past decisions.

### Method 3: Paper Trading Comparison

Run [[paper-trading]] and compare to backtest using identical historical dates:

```
Backtest position on 2023-01-15: Long 100 shares AAPL
Paper trading position on 2023-01-15: Long 50 shares AAPL (or different stocks entirely)
```

Mismatch indicates look-ahead bias in backtest. The book emphasizes this is often the **only** way to catch subtle biases.

### Method 4: Excel Time-Stamp Verification

The book recommends using Excel for simple strategies specifically because it forces explicit row-by-row calculation, making look-ahead bias more obvious.

In MATLAB or Python, vectorized operations can hide temporal ordering. In Excel, you see row 100 can only reference rows 1-99, not row 101.

## Common Pitfalls

**Dynamic arrays in MATLAB:**
```matlab
mean_price = mean(prices(1:end));  % This includes TODAY's close
signal = prices(end) < 0.99 * mean_price;  % Look-ahead bias!
```

Correct version:
```matlab
mean_price = mean(prices(1:end-1));  % Exclude today
signal = prices(end) < 0.99 * mean_price;  % Now using only yesterday and earlier
```

**Database timestamps:**
Some databases timestamp records with trade time, others with delivery/settlement time. Ensure you know which. Using settlement-timestamped data for trade-time decisions = look-ahead bias.

**Survivorship filters:**
Bad: "Select all stocks in S&P 500 as of today, backtest on those stocks for past 10 years."

You're using today's knowledge of which stocks survived to select yesterday's universe. This is both [[survivorship-bias]] and look-ahead bias.

Correct: "Select stocks in S&P 500 as of date T, trade only those stocks on date T."

**News/announcements:**
Trading on earnings announcements requires knowing the exact timestamp. Earnings released "after market close" means trade next day, not same day. If your backtest buys at the close on earnings date, but earnings were released at 4:01 PM, you have look-ahead bias.

## Impact on Strategy Types

**[[mean-reversion]]:** Extremely vulnerable. Example from the book: "Buy when price is within 1% of day's low." But you don't know the day's low until the end! The backtest appears to buy at perfect times; live trading buys randomly.

**[[momentum-strategies]]:** Somewhat less vulnerable if using previous day's data (e.g., "buy stocks with highest return yesterday, sell today"). But if using intraday momentum ("buy if up >2% today"), you need to specify the exact cutoff time.

**[[pair-trading]]:** Moderate vulnerability. Calculating hedge ratios requires data lags. If you calculate spread using today's close prices and also trade at today's close, that's borderline look-ahead (spread calculation and trade decision simultaneous).

**[[high-frequency-trading]]:** Extremely vulnerable. Sub-second strategies require precise timestamp alignment. Microsecond mismatches between quote data and trade data can create look-ahead bias.

## Fixes

**For daily strategies:**
- Lag all signals by one day
- If signal generates at close of day T, execute at open/close of day T+1
- Use only data through close of day T-1 for decisions on day T

**For intraday strategies:**
- Timestamp all data to the millisecond
- Build in realistic reaction time (human: 1+ second, automated: 100ms+)
- Use separate historical tick database for signals vs. execution prices

**For fundamental data:**
- Be conservative with announcement times (assume late in day)
- Account for filing delays (10-K might be filed weeks after quarter end)
- Build in processing time (you need time to download and parse the filing)

## Example from the Book

The GLD/GDX [[pair-trading]] strategy (Example 3.6) carefully avoids look-ahead bias:

- Calculates hedge ratio using historical data (regression on full training set)
- Uses lagged prices for spread calculation: `spread(t) = price_GLD(t-1) - hedgeRatio * price_GDX(t-1)`
- Executes at open of day T+1 based on spread calculated from close of day T

This conservative approach ensures no look-ahead bias, verified by paper trading matching backtest performance.

## Related Skills

Detection methods:
- [[paper-trading]] — Ultimate look-ahead bias detector
- [[backtesting]] — Contains detailed methodology to avoid bias

Related biases:
- [[data-snooping-bias]] — Overfitting parameters
- [[survivorship-bias]] — Using today's index constituents for yesterday
- [[split-dividend-adjustment]] — Retroactive price changes can introduce bias

Strategies requiring extra care:
- [[mean-reversion]] — Easy to buy at "perfect" lows that weren't knowable
- [[high-frequency-trading]] — Timestamp precision critical
- [[regime-switching]] — Don't use future data to detect past regime changes

The book's bottom line: Look-ahead bias is easy to introduce, hard to detect via backtest alone, but **trivial** to expose via [[paper-trading]]. If your paper trading trades don't match your backtest recommendations on the same historical dates, you have look-ahead bias. Fix it before going live, or your first month will be a very expensive lesson.

Remember the book's golden rule: **At time T, you can only use data from time < T, not time ≤ T (unless you're certain of exact timestamps and have built in reaction time).**
