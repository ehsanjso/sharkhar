---
description: >
  Where to obtain reliable historical price data for backtesting — balancing cost, quality, and coverage. Use this when setting up your data infrastructure.
source:
  chapters: [3]
  key-insight: "Free data (Yahoo) has survivorship bias. Clean data (CRSP, Compustat) costs thousands. Choose based on strategy needs and budget."
---

# Historical Data Sourcing

Quality backtests require quality data. The book's Table 3.1 surveys data sources, revealing the tradeoff: free data has biases, clean data costs thousands annually.

## Free Sources (Survivorship-Biased)

**Yahoo Finance:**
- Coverage: Major exchanges, daily bars
- Cost: Free
- Quality: [[survivorship-bias]] — missing delisted stocks
- Adjustment: Provides adjusted close for [[split-dividend-adjustment]]

Book's verdict: Fine for testing ideas on large-caps, but don't trust [[mean-reversion]] backtests on broad universes.

**Google Finance (historical):**
Similar to Yahoo. Free but survivorship-biased.

## Professional Sources (Survivorship-Free)

**CRSP (Center for Research in Security Prices):**
- Coverage: All US stocks, complete history
- Cost: $thousands annually (institutional pricing)
- Quality: Gold standard, survivorship-free
- Used by: Academic researchers, large funds

**Compustat:**
- Coverage: US stocks + fundamental data
- Cost: $thousands annually
- Quality: Survivorship-free
- Bonus: Includes financials for [[factor-models]]

**QuantQuote:**
- Coverage: US equities, tick data
- Cost: More affordable than CRSP (~$hundreds-thousands)
- Quality: Survivorship-free
- Focus: Intraday data for [[high-frequency-trading]]

## Futures and Forex

**Commodity futures:**
Book mentions:
- CSIdata.com: Comprehensive futures history
- DTN.com: Another futures data vendor

Futures naturally survivorship-free (all contracts eventually expire by design).

**Forex:**
- ForexFeed.com (book mentions this)
- OANDA, GainCapital (broker historical data)
- Generally clean (currencies don't go bankrupt as frequently as small-cap stocks)

## Intraday Data

For [[high-frequency-trading]] and sub-daily strategies:

**Tick data:**
- QuantQuote: US equities
- TAQ (Trade and Quote): Expensive, institutional
- Nanex: High-resolution tick data

**Minute bars:**
- Some brokers provide (Interactive Brokers API)
- Generally need to collect yourself going forward

## Fundamental Data

For [[factor-models]]:
- **Capital IQ, Compustat:** Comprehensive but expensive
- **MSCI Barra, Northfield:** Factor model data
- **Quantitative Services Group:** Institutional pricing

Book notes these are "not very practical" for independent traders due to cost.

## Choosing a Source

**Budget < $500/year:**
- Use Yahoo Finance
- Restrict to large-caps or recent periods (limit [[survivorship-bias]])
- Focus on [[pair-trading]] with ETFs (less affected by survivorship)
- Validate heavily via [[out-of-sample-testing]] and [[paper-trading]]

**Budget $500-5,000/year:**
- QuantQuote for stocks
- CSIdata for futures
- Build serious systematic strategies
- Still validate, but trust backtests more

**Budget > $5,000/year:**
- CRSP or Compustat for stocks
- Add fundamental data if trading [[factor-models]]
- Institutional-grade infrastructure

## Practical Considerations

**Storage:**
Daily bars for Russell 3000 stocks, 10 years ≈ 10-50 GB (depends on format).

Intraday tick data for same universe ≈ terabytes. Plan storage accordingly.

**Download automation:**
Most professional sources provide APIs. Yahoo requires scraping (fragile).

Set up automated daily downloads to maintain fresh data.

**Verification:**
Always spot-check:
- Compare against broker's data for same dates
- Look for obvious errors (negative prices, volume = 0)
- Check [[split-dividend-adjustment]] worked correctly

## Related Skills

Data quality:
- [[survivorship-bias]] — Primary concern with free data
- [[split-dividend-adjustment]] — Ensure data is adjusted
- [[backtesting]] — Garbage in, garbage out

Strategies most affected:
- [[mean-reversion]] — Destroyed by survivorship bias
- [[pair-trading]] — Needs clean data for both legs
- [[high-frequency-trading]] — Requires tick data

Infrastructure:
- [[execution-systems]] — Daily data downloads part of workflow
- [[paper-trading]] — Validates your data pipeline works

The book's guidance: Don't let data costs prevent you from trading. Start with Yahoo Finance, restrict universe to large-caps or recent periods, and validate aggressively. As capital grows, invest in professional data. 

But never trade [[mean-reversion]] on broad small-cap universes with survivorship-biased data — that's gambling on false backtests.
