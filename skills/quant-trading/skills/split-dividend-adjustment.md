---
description: >
  Handling corporate actions (stock splits, dividends) in historical price data — critical for accurate backtests. Use this to avoid false signals from price discontinuities that aren't real market moves.
source:
  chapters: [3]
  key-insight: "Unadjusted prices show false gaps when stocks split or pay dividends. Adjusted prices fix gaps but create new problems if not handled carefully."
---

# Split and Dividend Adjustment

Historical stock prices must be adjusted for corporate actions (splits, dividends) to prevent false trading signals. The book addresses this in Chapter 3's backtesting guidance.

## The Problem

**Stock splits:** A 2-for-1 split makes price drop 50% overnight. No real value change, but unadjusted price chart shows massive "crash."

**Dividends:** $2 dividend payment causes ex-dividend date price drop of ~$2. Again, no value destruction, just cash distribution.

**For backtesting:** Without adjustment, [[mean-reversion]] strategy sees "crash" → generates buy signal. But you couldn't have profitably traded this "dislocation" — it's mechanical, not a market inefficiency.

## Adjustment Methods

**Backward adjustment (most common):**
- Keep most recent price unchanged
- Adjust all historical prices proportionally

Example: Stock at $100 splits 2-for-1. Post-split price: $50.
- Adjusted: All pre-split prices divided by 2
- Pre-split $100 becomes $50 (adjusted)
- Post-split $50 stays $50
- Chart shows continuous $50, no discontinuity

**Forward adjustment (rare):**
- Keep oldest prices unchanged
- Adjust recent prices upward

Used for some technical analysis. Book doesn't recommend for backtesting.

## When to Use Adjusted Prices

**For returns calculations:** Always use adjusted prices.

```matlab
% Correct
dailyReturn = (adjClose_today - adjClose_yesterday) / adjClose_yesterday;

% Wrong
dailyReturn = (rawClose_today - rawClose_yesterday) / rawClose_yesterday;
% This will show massive negative return on split date
```

**For most price-based strategies:** Use adjusted prices.

Mean-reversion, momentum, technical indicators — all need continuous price series without corporate action gaps.

## When NOT to Use Adjusted Prices

**For absolute price thresholds:**

Strategy says: "Only trade stocks above $5." 

If using adjusted prices, a stock that split 10-for-1 might show adjusted historical price of $0.50 when it was actually $5.00 (unadjusted) at the time.

Solution: Use unadjusted prices for filters, adjusted prices for return calculations. Or note split dates and apply threshold to contemporaneous price.

**For volume-weighted prices:**
Book doesn't explicitly address, but implied: VWAP should use unadjusted prices (split multiplies shares outstanding but doesn't change total dollar volume).

## Data Sourcing

Most data providers offer adjusted prices:
- Yahoo Finance: Adjusted close
- QuantQuote, CRSP, Compustat: Both adjusted and unadjusted

Always verify which version you're downloading. Default to adjusted for backtesting.

## Handling Dividends Separately

Some strategies trade around ex-dividend dates. Here, adjustment removes the signal you want to trade!

Solution:
- Use adjusted prices for general backtesting
- For dividend strategies, note ex-div dates separately
- Calculate expected price drop = dividend amount
- Trade the deviation from expected drop

## Related Skills

Data quality:
- [[historical-data-sourcing]] — Where to get adjusted prices
- [[survivorship-bias]] — Another data contamination issue
- [[backtesting]] — Why adjustment matters

Strategies affected:
- [[mean-reversion]] — False signals from unadjusted data
- [[pair-trading]] — Spread calculation needs adjusted prices
- [[momentum-strategies]] — Return calculations need adjustment

The book's implicit guidance: Use adjusted prices by default. Only exception is absolute price thresholds (like $5 minimum) where contemporaneous unadjusted price is needed.

Most data quality issues are subtle, but split adjustment is binary: get it wrong, and backtest shows massive false signals on split dates. Always verify your data provider includes adjustments.
