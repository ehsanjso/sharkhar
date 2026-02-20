---
description: >
  The five components of trading costs that can turn a 4.0 Sharpe backtest into bankruptcy. Use this to model realistic execution costs and make honest decisions about strategy viability.
source:
  chapters: [3, 5]
  key-insight: "Mean-reversion strategy: Sharpe 4.43 before costs, 0.78 after 5bp one-way costs. Always model costs realistically or you're backtesting fiction."
---

# Transaction Costs

Transaction costs are the difference between theoretical backtest returns and actual realized profits. The book's Example 3.7 demonstrates their brutal impact: a mean-reversion strategy with 4.43 Sharpe before costs delivered only 0.78 after adding realistic 5 basis point costs.

The message: **Transaction costs kill more strategies than any other single factor.**

## The Five Components

### 1. Commission

The explicit fee charged by your broker. Easiest to measure, hardest to avoid.

**Typical rates:**
- Retail accounts (Interactive Brokers): ~$0.005/share ($0.50 per 100 shares)
- Proprietary firms: ~$0.003/share with volume discounts
- Institutional: ~$0.001-$0.002/share at high volume

**Calculation:** For round-trip (buy then sell), double the commission. Trading 1,000 shares at $0.005/share = $5 entry + $5 exit = $10 total commission.

The book's guidance: [[brokerage-selection]] matters. Saving 0.2¢ per share saves $200 on 100,000 shares. But don't sacrifice execution quality for tiny commission savings — the other four costs dwarf commissions.

### 2. Liquidity Cost (Bid-Ask Spread)

The price difference between best bid and best offer. You buy at the ask (higher), sell at the bid (lower). The spread is pure cost.

**Impact example:** $50 stock with 3¢ spread:
- Buy at $50.03 (ask)
- Sell immediately at $50.00 (bid)  
- Loss: $0.03 = 6 basis points one-way
- Round-trip: 12 basis points

The book emphasizes: **Don't trade low-price stocks.** A $3 stock with 3¢ spread = 1% cost one-way. Need 2% profit just to break even on round-trip. Most institutional traders avoid stocks under $5 entirely.

Spread widens for:
- Small-cap stocks (lower liquidity)
- High volatility periods
- Before market open / after market close (wider spread)
- Thinly traded stocks

**Modeling in backtests:** Conservative estimate is 0.5-1.0 bp for large-caps, 5-10 bp for small-caps. The book's Example 3.7 uses 5 bp total one-way (includes commission + spread).

### 3. Market Impact

Your order moves the price against you. Buying pushes price up; selling pushes it down. Impact increases with order size relative to liquidity.

**Rule of thumb from the book: Don't exceed 1% of average daily volume (ADV).**

Example: Stock IRN (from S&P 600 SmallCap):
- 3-month ADV: 51,000 shares
- Price: $4.45
- 1% of ADV: 510 shares = $2,269

Above this threshold, your order significantly impacts price. The book notes: "You may be surprised by the low liquidity of some small-cap stocks."

**Scaling to market cap:**
Don't scale position size linearly to market cap (creates tiny weights for small-caps, eliminating diversification). Use fourth root of market cap instead.

If linear scaling gives 10,000:1 ratio (large-cap : small-cap), fourth root gives ~10:1 ratio, preserving diversification while respecting liquidity constraints.

**Execution strategies to minimize impact:**
- Don't use market orders (accept worst execution)
- Use limit orders at mid-quote (risk no fill)
- Break large orders into smaller chunks over time (but creates slippage cost #4)

### 4. Slippage

Difference between the price that triggered your signal and your average execution price. Caused by delays in order transmission, broker processing speed, or intentional time-spreading of large orders.

**Sources:**
- **Software delays:** MATLAB generates order, writes to file, you upload to broker — seconds or minutes pass
- **Broker processing:** Risk checks, account verification before routing to exchange
- **Network latency:** Internet speed, distance to exchange
- **Dark pool routing:** Broker searches for better price, adding delay

The book shares operational reality: 20 minutes to download/parse daily data, 15 minutes to transmit orders. If your strategy depends on data <35 minutes old at market open, you need faster infrastructure.

**Modeling:** Difficult to estimate in backtests. Conservative approach: assume 2-5 bp slippage for liquid stocks, 10-20 bp for illiquid. Or use execution prices from [[paper-trading]] to empirically measure your actual slippage.

### 5. Opportunity Cost

Profit you would have made if the order executed, but it didn't. Hardest to quantify, easy to underestimate.

Example: You place a limit buy at $50.00, trying to avoid paying the $50.03 ask. Stock rallies to $55 without ever hitting $50.00. Your "savings" of 3¢ cost you $5 in missed profit.

No good way to model this in backtests. Some researchers use "realistic fill" models (assume limit orders at mid-quote fill 50% of time, rest trigger at next period's open). But this adds complexity and parameters.

Practical solution: Use market orders or marketable limit orders (limit at ask for buys, bid for sells) to guarantee fills. Accept the liquidity cost as the price of certainty.

## Backtesting with Costs

The book demonstrates two approaches in Example 3.7:

**Approach 1: Opening execution**
- Generate positions based on previous day close
- Execute at next day's open
- Model cost as 5 bp one-way (conservative for open execution with limit orders)
- Result: Sharpe 4.43 → 0.78 after costs (83% reduction!)

**Approach 2: Closing execution**  
- Generate positions intraday
- Execute at same day's close
- Higher signal quality (more recent data) but harder to execute
- Model cost as 10 bp one-way
- Result: Sharpe 0.25 → -3.19 (strategy destroyed)

Key lesson: **Always model costs conservatively.** If strategy breaks with realistic costs, it's not a strategy, it's an illusion.

**MATLAB example:**
```matlab
% Without costs
dailyReturn = (positions .* (closePrice - lagClose)) ./ lagClose;

% With costs (5bp one-way on entry and exit)
cost = 0.0005;  % 5 basis points
positionChange = abs(positions - lagPositions);  % When position changes
costDrag = positionChange * cost;  % Pay cost on changes
dailyReturn = (positions .* (closePrice - lagClose)) ./ lagClose - costDrag;
```

## When Costs Kill Strategies

**High-frequency strategies:** More trades = more costs. A strategy trading 100x/day needs 100x lower cost per trade to maintain profitability vs. trading 1x/day. This is why [[high-frequency-trading]] requires:
- Collocated servers (minimize latency → slippage)
- Direct market access (eliminate broker processing delay)
- Maker-taker rebates (get paid for providing liquidity)

**[[mean-reversion]] strategies:** Trade frequently because they exploit short-term dislocations. The book's mean-reversion example traded S&P 500 stocks daily. With 500 positions × 252 days = 126,000 round-trips per year. Even 1 bp adds up to massive cost drag.

**Small-cap strategies:** Lower liquidity = wider spreads and more market impact. A large-cap strategy might survive 5 bp costs; same strategy on small-caps might face 20 bp costs.

**Portfolio strategies:** The book notes ETF example (OIH, RKH, RTH in Example 6.3). ETFs typically have tighter spreads than individual stocks, making portfolio rotations less expensive. One reason institutional traders prefer them.

## Minimizing Costs

From the book's "Minimizing Transaction Costs" section:

**1. Avoid low-price stocks**
- Institutional rule: No stocks < $5
- Lower price = larger position size for same dollar amount = higher commission
- Lower price = wider spreads percentage-wise

**2. Respect liquidity constraints**
- Order size ≤ 1% of ADV
- Scale position to 4th root of market cap
- Use [[brokerage-selection]] for dark pool access (additional liquidity)

**3. Choose broker wisely**
Not just commission rates — consider:
- Execution speed (slippage)
- Access to dark pools (liquidity cost)
- Order routing quality (market impact)
- API reliability (minimize failures → opportunity cost)

The book's example: Some brokers route orders slowly due to excessive risk checks, creating slippage that exceeds commission savings from lower fees.

**4. Execution timing**
- Avoid first/last 10 minutes of trading day (widest spreads)
- Consider crossing at close (better price discovery than open)
- For large positions, scale in/out over days (reduces impact, increases slippage — tradeoff)

## Related Skills

Backtesting:
- [[backtesting]] — Must include realistic transaction cost models
- [[sharpe-ratio]] — Calculate before AND after costs
- [[paper-trading]] — Reveals actual costs vs. modeled costs

Strategy evaluation:
- [[mean-reversion]] — High frequency → high cost sensitivity
- [[momentum-strategies]] — Lower frequency → less cost sensitive
- [[high-frequency-trading]] — Requires sub-bp costs to be viable
- [[pair-trading]] — Lower frequency, but still needs cost modeling

Execution:
- [[brokerage-selection]] — Primary lever for minimizing costs
- [[execution-systems]] — Software speed impacts slippage
- [[regime-switching]] — Costs can vary by regime (volatility affects spreads)

Risk management:
- [[kelly-formula]] — Optimal leverage depends on after-cost returns
- [[capacity]] — Cost per trade often increases with strategy size

The book's bottom line: Model transaction costs realistically in backtests, or prepare for brutal disappointment in live trading. Use 5-10 bp one-way for liquid large-caps, 10-20 bp for small-caps. If your strategy can't survive these costs, it's not a strategy.

Better to overestimate costs and be pleasantly surprised than underestimate and blow up. "Transactions costs matter more than your model," the book implies. A simple, low-frequency strategy with modest returns and minimal costs beats a complex, high-Sharpe, high-frequency strategy decimated by execution realities.
