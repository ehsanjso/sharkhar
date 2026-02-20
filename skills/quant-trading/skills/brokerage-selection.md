---
description: >
  Choosing the right broker or proprietary trading firm — impacts leverage, costs, execution speed, and strategy viability. Use this when setting up your trading infrastructure.
source:
  chapters: [4]
  key-insight: "Commission rates matter less than execution quality. Save 0.2¢/share but lose 2¢ to slippage = false economy."
---

# Brokerage Selection

Your broker determines what strategies are possible, how much they'll cost, and whether your edge survives execution. The book devotes Chapter 4 to business setup, with broker selection as the critical first decision.

## Retail vs. Proprietary Firm

**Retail broker:**
- Leverage: 2x overnight, 4x intraday (Regulation T)
- Capital: Your own money
- Licensing: None required
- Examples: Interactive Brokers, TD Ameritrade

**Proprietary trading firm:**
- Leverage: 10-20x (sometimes higher)
- Capital: Firm's money (profit sharing)
- Licensing: Series 7 required
- Examples: Genesis Securities, Bright Trading, ECHOtrade

Book's guidance: Start retail. Only go prop if you need >4x leverage for viable strategy.

## Key Broker Features

**1. Commission structure:**
- Per-share: ~$0.005/share retail, ~$0.003 prop
- Per-trade: Avoid (hurts high-frequency strategies)
- Volume discounts: Negotiate after proving volume

Book: "It is indeed possible to save several hundred thousand dollars per year for an active trader from choosing a brokerage with good execution and commission."

**2. Execution speed:**
Matters more than commission. Book: "Perhaps your brokerage's execution speed is simply too slow... your order has to be checked against your account's buying power and pass various risk control criteria before it can be routed."

Fast broker: Orders reach exchange in milliseconds. Slow broker: seconds or even minutes (risk checks, manual review).

**3. API access:**
Required for [[execution-systems]]. Look for:
- FIX protocol support
- REST/WebSocket APIs
- Real-time data feed
- Order status updates

Interactive Brokers: Excellent API. Many brokers: poor or no API.

**4. Dark pool access:**
Book: "Or perhaps your brokerage does not have access to deep enough 'dark-pool' liquidity."

Dark pools = hidden liquidity from institutional traders. Reduces [[transaction-costs]] (better fills, less market impact).

Goldman Sachs REDIPlus: Superior dark pool access. Retail brokers: limited or none.

**5. Product coverage:**
- Stocks: All brokers
- Options: Most brokers
- Futures: Some brokers (IB yes, many others no)
- Forex: Specialized brokers
- Fixed income: Institutional only

Match broker to your strategy's asset class.

**6. Paper trading:**
Book emphasizes: "A good idea to test in paper trading account, if your brokerage provides one."

IB, TD Ameritrade (thinkorswim), TradeStation: Yes. Many others: No.

## Cost Analysis

**Don't optimize commissions in isolation.**

Book example: Broker A charges $0.005/share. Broker B charges $0.003/share.

Seems obvious — choose B, save 40%!

But if Broker B's execution is slower (higher slippage) or lacks dark pool access (worse fills), you lose far more than 0.2¢/share in execution quality.

**Total cost = commission + spread + slippage + market impact + opportunity cost**

Only first component visible in broker's rate sheet.

## Broker Recommendations from Book

**Interactive Brokers:**
- Most recommended for retail
- Low commissions
- Excellent API
- Paper trading included
- Wide product range
- Global access

**Genesis Securities, Bright Trading, ECHOtrade:**
- Proprietary firms mentioned
- Higher leverage
- Lower commissions (for high volume)
- Require Series 7

**TD Ameritrade (thinkorswim):**
- Good for options strategies
- Paper trading (excellent for testing)
- Higher commissions than IB

**Goldman Sachs REDIPlus:**
- Institutional-grade execution
- Superior dark pool access
- Much higher costs
- Minimum account sizes ($millions)

## Practical Selection Process

**1. Determine leverage needs:**
- Strategy needs <2x → retail fine
- Strategy needs 2-4x → retail intraday or prop
- Strategy needs >4x → must go prop (get Series 7)

**2. Asset class:**
- Stocks only → any broker
- Futures → IB or specialized
- Forex → specialized forex broker (OANDA, GainCapital)
- Options → IB or thinkorswim

**3. Automation level:**
- Semi-automated ([[execution-systems]] generates file, you upload) → Broker with basket trader
- Fully automated → Must have API

**4. Volume projection:**
- <100 trades/day → commission rates matter less
- >1,000 trades/day → commission rates critical, negotiate discounts

**5. Try paper trading:**
Before committing real money, run [[paper-trading]] for weeks:
- Test API reliability
- Measure actual execution quality
- Verify data feed speed
- Check order routing times

## Common Pitfalls

**Choosing based on commission alone:**
Book repeatedly warns: execution quality >>> commission savings.

**Ignoring infrastructure needs:**
Strategy requires futures access → broker doesn't offer futures → must switch later (pain).

**Underestimating API importance:**
"We'll automate later" → Broker has no API → Must manually execute or switch brokers.

**Not testing execution speed:**
Only discover during live trading that orders take 30 seconds to route → Strategy requires <5 seconds → Game over.

## Migration Strategy

Start with one broker, but be prepared to switch as needs evolve:

**Phase 1:** IB retail (low commissions, API, paper trading)
**Phase 2:** Add futures/forex broker if needed (specialized products)
**Phase 3:** Prop firm if strategy demands >4x leverage
**Phase 4:** Prime broker if managing external capital (institutional)

Avoid committing to single broker permanently. Markets change, strategies evolve, better options emerge.

## Related Skills

Infrastructure:
- [[execution-systems]] — Broker must support your automation level
- [[paper-trading]] — Broker should provide paper trading
- [[transaction-costs]] — Broker determines major cost components

Strategy impact:
- [[high-frequency-trading]] — Demands fastest execution, lowest latency
- [[pair-trading]] — Benefits from dark pool access
- [[seasonal-trading]] — Needs futures access (for commodities)

Risk management:
- [[capacity]] — Some brokers limit position sizes
- [[optimal-leverage]] — Regulatory leverage limits vary by broker

The book's bottom line: "These execution costs and issues should affect your choice of brokerages." Don't default to cheapest commissions. Evaluate total execution quality, match to strategy needs, and test via [[paper-trading]] before going live.

For most independent traders, Interactive Brokers hits the sweet spot: reasonable costs, excellent API, wide product range, and reliable execution. But always validate for your specific strategies.
