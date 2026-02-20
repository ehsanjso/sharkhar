---
description: >
  MOC for building automated trading infrastructure. Use this when you need to bridge the gap between backtest and live trading — implementing order generation, transmission, and execution monitoring.
source:
  chapters: [4, 5]
  key-insight: "The difference between backtest and live performance often comes down to execution quality, not strategy quality."
---

# Execution Systems

A brilliant strategy is worthless if you can't execute it reliably. This Map of Content covers building trading systems that faithfully implement your backtest in live markets — from semi-automated Excel macros to fully automated API-driven platforms.

## The Execution Challenge

Your backtest assumed instant, costless execution at historical prices. Reality delivers slippage, partial fills, failed orders, and system crashes during volatile markets. [[execution-systems]] turn theoretical edges into actual profits by minimizing the gap between simulation and reality.

The book distinguishes two approaches: semi-automated (you press buttons) and fully automated (the computer does everything). Start semi-automated to learn the operational workflow, then automate the bottlenecks.

## Infrastructure Foundation

Before writing code, handle the business logistics via [[brokerage-selection]]. Your choice impacts everything: available leverage, API access, execution speed, and access to dark-pool liquidity.

Interactive Brokers suits retail traders (low commissions, good API). Proprietary firms offer higher leverage but require Series 7 licensing. Goldman Sachs REDIPlus provides superior execution but higher costs. Each broker's DDE (Dynamic Data Exchange) links and API capabilities determine what's possible.

Physical infrastructure matters more than traders expect: a fast internet connection (cable → T1) can recover its monthly cost through reduced slippage on a single trade. [[execution-systems]] details the progressive build-out from basic home office to collocated servers.

## Semi-Automated Systems

Most traders start here: use MATLAB or Excel to generate orders, then upload to a basket trader or spread trader provided by your broker.

**Workflow:**
1. Download historical data (overnight)
2. Run strategy code to generate orders (pre-market)
3. Load orders into broker's basket trader
4. Press "submit" at market open (or throughout day for limit orders)
5. Monitor fills and adjust as needed

Advantages: Simple to build, easy to debug, you maintain control. Disadvantages: Labor-intensive, prone to operational errors, can't react intraday fast enough for high-frequency strategies.

The book's MATLAB examples demonstrate this approach for strategies from simple buy-and-hold to complex pair-trading with GLD/GDX.

## Fully Automated Systems

High-frequency strategies demand automation: continuously monitoring prices, generating orders, and transmitting them without human intervention.

**Requirements:**
- Broker provides API (REST, FIX, or proprietary protocol)
- Strategy coded in API-compatible language (Java, C++, C#, Python)
- Real-time data feed (streaming quotes, not just snapshots)
- Error handling (what happens when data feed dies?)
- Position reconciliation (verify API-reported positions match your records)

Building fully automated systems requires programming expertise beyond MATLAB. Most hire developers or use platforms like TradeStation that combine backtesting and live execution.

## Minimizing Transaction Costs

[[transaction-costs]] don't end with commissions. The book identifies five components:

**Commission:** Easily measured, optimize through [[brokerage-selection]]. Expect 0.5¢/share for retail, potentially less for high volume.

**Liquidity cost (bid-ask spread):** Avoid stocks under $5 — wider spreads destroy returns. For a $3 stock with 3¢ spread, you pay 1% just to round-trip.

**Market impact:** Your order moves the price against you. Rule of thumb: don't exceed 1% of average daily volume. For small-caps, this limit binds quickly (example: IRN at $4.45 with 51K daily volume → cap at 510 shares = $2,269).

**Slippage:** Difference between signal price and fill price. Caused by execution delays or slow brokers. The book emphasizes: broker execution speed matters as much as commission rates.

**Opportunity cost:** Missed fills when limit orders don't execute. Hard to measure, easy to underestimate.

Scale position sizes proportional to fourth root of market cap (not linearly) to balance diversification against market impact.

## Paper Trading as Integration Test

[[paper-trading]] serves double duty: validates your strategy **and** tests your execution system. Run it for weeks or months to discover:

- **Software bugs:** Do live orders match backtest recommendations?
- **Data issues:** Can you reliably download/parse required data before market open?
- **Timing problems:** The book notes 35 minutes from data download to order transmission — will old data invalidate signals?
- **Operational workflow:** How to handle failed orders, partial fills, unusual market conditions?

Paper trading reveals the friction between theory and practice. Better to discover you can't download 500 stock histories in 10 minutes during paper trading than during live trading.

## When Reality Diverges from Backtest

[[execution-systems]] outlines the diagnostic checklist when live performance disappoints:

1. **Software bugs** — Compare live trades to backtest recommendations on same dates
2. **Execution costs** — Much higher than modeled? See [[transaction-costs]]
3. **Illiquidity** — Trading stocks with insufficient volume?
4. **Data-snooping bias** — Overfit the backtest? Try [[out-of-sample-testing]]
5. **Regime shift** — Market structure changed (decimalization, plus-tick rule elimination)
6. **Hard to borrow** — Can't actually short the stocks your backtest assumed?

Regime shifts are particularly insidious. The book cites decimalization (2001) killing many statistical arbitrage strategies and the plus-tick rule elimination (2007) changing short-selling dynamics.

## Evolution Path

Start simple: semi-automated Excel/MATLAB generating orders for a basket trader. As strategies multiply and frequency increases, progressively automate:
- Automatic data download and parsing
- Automatic order generation and validation
- Automatic order transmission (via API)
- Automatic position monitoring and risk checks
- Full lights-out operation (servers run strategies 24/7)

Each automation step reduces operational burden and human error, but increases technical complexity and upfront development cost.

## Connected Skills

Infrastructure decisions:
- [[brokerage-selection]] — Choosing execution platform
- [[execution-systems]] — Building trading software

Execution quality:
- [[transaction-costs]] — Five components of execution cost
- [[paper-trading]] — Testing without risking capital

Common issues:
- [[look-ahead-bias]] — Often detected in paper trading
- [[regime-switching]] — Markets change over time

Next phase: [[risk-management]] — protecting your capital through position sizing and emotional discipline.

The goal isn't perfection. It's building a system robust enough that operational issues don't prevent your strategy's edge from becoming realized profits. Start simple, automate incrementally, and always maintain the ability to go flat quickly if things go wrong.
