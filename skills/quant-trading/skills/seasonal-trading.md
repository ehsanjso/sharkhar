---
description: >
  Calendar-driven strategies that exploit predictable annual patterns in commodities or equities. Use this when supply/demand cycles create recurring price movements at specific times of year.
source:
  chapters: [7]
  key-insight: "Equity seasonal effects (January effect) have largely disappeared. Commodity seasonal trades (gasoline, natural gas) remain profitable due to real economic demand cycles."
---

# Seasonal Trading

Seasonal trading exploits calendar effects — predictable price patterns that recur annually. The book devotes Section 7.7 to these strategies, drawing a sharp distinction between equity seasonality (mostly dead) and commodity seasonality (alive and well).

## What Are Seasonal Strategies

Also called "calendar effects," these strategies recommend buying or selling securities at fixed annual dates:
- Enter on date X every year
- Exit on date Y every year
- Profit from the recurring pattern

Unlike [[mean-reversion]] or [[momentum-strategies]] that react to price signals, seasonal trades are **pre-scheduled** based on calendar.

## Equity Seasonal Strategies (Mostly Failed)

**January Effect:**
The most famous equity seasonal trade. Book describes one version: "Small-cap stocks that had worst returns in previous calendar year will have higher returns in January than small-cap stocks that had best returns."

**Rationale:** Tax-loss selling in December depresses losers artificially. When pressure lifts in January, prices recover.

**Book's backtest (Example 7.6):**
- Test period: 2004-2007
- Results:
  - 2004: **-2.44%** (loss)
  - 2005: **-0.68%** (loss)
  - 2006: **+8.81%** (profit)
- Average: Barely positive, high variance

Book conclusion: "This strategy did not work in 2006-07, but worked wonderfully in January 2008" (market turmoil month). Inconsistent.

**Year-on-year seasonal trending:**
Buy stocks that performed best in same month last year, short worst performers.

Heston & Sadka (2007) found 13% annual return pre-2002. But book's backtest (Example 7.7) from 2000-2007:
- **Average annual return: -0.92%**
- **Sharpe: -0.11**

Book: "This effect has disappeared since then."

**Why equity seasonality died:**
- Widespread knowledge → arbitraged away
- Information technology → faster diffusion
- More algorithmic traders → patterns exploited earlier

## Commodity Seasonal Strategies (Still Work)

**Gasoline Futures (Book sidebar):**
- **Trade:** Buy RB (unleaded gasoline) contract expiring in May
- **Entry:** April 13 close (or next trading day)
- **Exit:** April 25 close (or previous trading day)
- **Holding period:** ~12 days

**Performance (1995-2008):**
- Profitable **every year** for 14 consecutive years
- 2007-2008: Actual trading results confirmed
- Annual P&L: $118 to $6,985 per contract

**Rationale:** Summer driving season in North America → gasoline demand rises → futures prices rise in spring.

**Natural Gas Futures (Book sidebar):**
- **Trade:** Buy NG June contract
- **Entry:** February 25 close
- **Exit:** April 15
- **Holding period:** ~50 days

**Performance (1995-2008):**
- Profitable **14 consecutive years**
- 2008 actual trading: $10,137 profit (4 × QG mini contracts)
- Max drawdown: Varies, but strategy survived

**Rationale:** Summer air conditioning → electricity demand → natural gas demand for power generation → prices rise.

## Why Commodity Seasonality Persists

Book explains: "Seasonal demand for certain commodities is driven by 'real' economic needs rather than speculations."

**Real demand cycles:**
- Gasoline: Summer driving, winter heating oil
- Natural gas: Summer air conditioning, winter heating
- Agricultural: Planting/harvest seasons

These patterns aren't arbit raged away because:
1. **Limited speculation:** Fewer hedge funds trade commodities than equities
2. **Storage costs:** Can't easily arbitrage seasonal by buying and storing (expensive)
3. **Fundamental drivers:** Weather and seasons don't change

## Drawbacks

**Limited frequency:**
Book notes: "Commodity futures seasonal trades do suffer from one drawback despite their consistent profitability: they typically occur only **once a year**."

This creates problems:
- Hard to tell if backtest performance is [[data-snooping-bias]]
- 14 years = only 14 independent observations (small sample)
- Can't quickly validate via [[out-of-sample-testing]]

**Solution:** Test variations (entry ±3 days, exit ±3 days). If profitability holds, less likely to be curve-fitted. Also require economic rationale (book emphasizes this).

**Low [[capacity]]:**
Single contract per year = ~$50K max position (for nat gas example). Can't scale without dramatically changing risk profile.

**Operational simplicity:**
Unlike [[high-frequency-trading]] demanding constant attention, seasonal trades need work only a few days per year. But this is also a limitation — capital sits idle most of the year.

## Practical Guidance

**Entry/exit precision:**
Book specifies exact dates (April 13, April 25 for gasoline). But notes: "Or following/previous trading day if holiday."

Suggests these dates are somewhat robust (not hyper-optimized to exact day). Probably work within ±2-3 day window.

**Position sizing:**
Use [[kelly-formula]] based on historical Sharpe. But constrain by [[capacity]] — can't deploy millions per contract.

For gasoline (12-day hold, 14-year average ~$1,500 profit per $25,000 position):
- Annual return ≈ 6%
- Risk (std dev) ≈ 3-4% (estimated)
- Sharpe ≈ 1.5-2.0 (rough estimate)

Kelly would suggest 2-4x leverage, but limited to 1-2 contracts for retail traders.

**Multiple seasonal trades:**
Combine different commodities:
- January: Trade X
- April: Gasoline
- June: Natural gas
- September: Trade Y

This increases [[capacity]] and provides more frequent trading opportunities.

## Backtesting Challenges

**Small sample size:**
14 annual occurrences = statistically weak. Book acknowledges: "It is hard to tell whether the backtest performance is a result of data-snooping bias."

**Mitigation:**
- Test parameter sensitivity (different entry/exit dates)
- Require economic rationale
- Only trade patterns with >10 years profitable history
- Accept uncertainty — seasonal trades are inherently higher risk of false patterns

**Data availability:**
Commodity futures data easier to obtain than equity data. CSIdata.com, DTN.com provide historical futures.

## Exit Strategy

For seasonal trades, [[exit-strategies]] are **fixed holding periods** by definition.

Book's gasoline example: Hold exactly from April 13 to April 25. No optimization, no dynamic exits.

This simplicity is both strength (no parameters to overfit) and weakness (miss opportunities to exit early if pattern accelerates or fails).

## Related Skills

Strategy foundations:
- [[mean-reversion]] — Some seasonal trades are mean-reverting
- [[momentum-strategies]] — Others are momentum-based
- [[backtesting]] — Critical to validate seasonality

Validation challenges:
- [[data-snooping-bias]] — Major risk with limited annual samples
- [[out-of-sample-testing]] — Difficult with yearly patterns
- [[paper-trading]] — Must wait full year to validate

Practical:
- [[capacity]] — Inherently low for seasonal trades
- [[transaction-costs]] — Lower frequency = lower total costs
- [[brokerage-selection]] — Need futures access for commodities

The book's verdict: Equity seasonality is dead or dying (too well-known). Commodity seasonality works but has limitations (low frequency, low capacity). 

Use seasonal trades as **part of** a diversified strategy portfolio, not as standalone business. The gasoline and natural gas trades provide nice annual returns with minimal time investment, but won't support full-time trading career.

And always, always require economic rationale. "Buy in April because it worked 14 years" isn't enough. "Buy in April because summer driving demand rises" is the mindset that separates robust seasonality from statistical flukes.
