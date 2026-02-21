---
description: >
  Critical errors that inflate backtest performance and doom live trading.
  Use this checklist before deploying capital. Most common pitfalls:
  look-ahead bias, survivorship bias, data errors, and transaction cost omission.
source:
  chapters: [1]
  key-insight: "Backtest shows COULD have made money; pitfalls show you WON'T"
---

# Backtesting Pitfalls

A strategy that works beautifully in backtest can fail catastrophically live due to subtle data or logic errors. These pitfalls systematically inflate backtest returns, creating false confidence. Master this checklist before risking capital.

## Critical Pitfalls

**Look-ahead bias**: Using information not available at signal time. Classic example: using day's close price to generate entry signal for that close. You don't know closing price until market closes! Pre-open prices solve this but introduce [[signal-noise]].

**Survivorship bias**: Testing only stocks that survived to present. Delisted/bankrupt stocks disappeared from your dataset, removing biggest losers. Your backtest never experienced the disasters that ruined real traders. Buy survivorship-free data or accept 2-3% annual return drag.

**Data errors**: Even professional data feeds contain errors. [[data-errors-mean-reversion]] especially vulnerable - false quote creates fake reversion signal. Spread strategies amplify small errors into large percentage moves. Scrutinize outliers before assuming profitability.

**Primary vs consolidated prices**: Stock exchanges report two prices. Primary (one exchange) vs consolidated (all venues). Backtesting on consolidated but executing on primary (MOO, MOC orders) creates slippage. Historical prices often use consolidated; live orders fill at primary.

**Futures close vs settlement**: Futures have settlement price (used for margin) and last trade price. Differs by 0.1-1%. Strategies using closing price in backtest but settlement in live trading experience systematic slippage.

**Continuous contract methodology**: Rolling futures requires back-adjustment. Panama method (add/subtract roll difference to history) preserves returns but creates negative prices. Ratio method (multiply) preserves price levels but distorts returns. Calendar spreads require Panama; momentum strategies require ratio.

**Stock splits and dividends**: Must adjust historical prices for corporate actions. Un-adjusted AAPL at $700 pre-split looks nothing like post-split price. Most data vendors do this, but verify, especially for dividends which may be reinvested or paid as cash.

**Transaction costs**: Commission, slippage, market impact, bid-ask spread, short borrow cost. Omitting these is #1 reason backtests fail live. High-frequency strategies especially sensitive - 0.5 cent slippage can eliminate entire edge.

**Short-sale constraints**: Can you actually short this stock? Hard-to-borrow names charge 20%+ annual borrow cost. Circuit breakers forbid new shorts during crashes. Your backtest shorted everything; live trading can't.

## When to Apply This Knowledge

BEFORE EVERY BACKTEST:
- Audit data for survivorship bias, splits, dividends
- Verify price timestamp matches your signal timestamp  
- Check futures settlement vs close methodology
- Estimate transaction costs (2-10 bps for stocks, 0.1-1 tick for futures)

DURING BACKTEST:
- Flag any outlier returns (> 5 sigma) as potential data errors
- Verify you can't peek into future (all data lagged properly)
- Confirm execution prices available when signals generated

AFTER BACKTEST:
- Add realistic transaction costs and recalculate
- Stress test with higher costs (2x your estimate)
- Check if hard-to-borrow stocks are critical to returns

## Practical Steps

1. **Source clean data**: Buy from reputable vendor (CSI, Kibot, Tickdata) with survivorship-free option
2. **Lag all signals**: Use backshift(1, price) to ensure using yesterday's data
3. **Match execution venue**: If using MOO/MOC orders, use primary exchange prices
4. **Add transaction costs**: Use venue-specific costs (Nasdaq vs NYSE different fees)
5. **Account for borrowing**: Short positions pay borrow cost, reduce returns
6. **Validate extremes**: Any return >100% in a day is probably data error
7. **Walk-forward test**: Train on period 1, test on period 2, repeat

## Data-Snooping Bias

Most insidious pitfall: testing multiple variations and reporting only the best. If you test 100 random strategies, 5 will show statistical significance (p < 0.05) by pure chance.

Combat [[data-snooping-bias]] by:
- Pre-registering hypothesis before testing
- Using hold-out test set never touched during development  
- Requiring p-value << 0.05 (e.g., < 0.01) for multiple-testing correction
- Testing on different markets/time periods for robustness
- Using [[fundamental-reasoning]] not just data mining

## Futures-Specific Pitfalls

**Misaligned closes**: CL (crude oil) settles 2:30 PM ET, but XLE (energy stocks) closes 4:00 PM ET. Can't compare their closing prices to generate signals - they're from different times!

**Roll methodology**: [[futures-continuous-contracts]] must adjust for roll. If you're trading spreads, use Panama (add/subtract). If testing trend-following, use ratio (multiply). Mixing them creates false breakouts at roll dates.

**Calendar spreads**: Testing 12-month spread requires both front and back contracts exist simultaneously. Early history may lack far months, creating survivorship bias in your spread construction.

## Stock-Specific Pitfalls

**NBBO quote size**: National best bid offer in SPY might be 10,000 shares, but AAPL often only 100 shares. Can't backtest filling 1000 shares at NBBO - you'd move the market. Use realistic market impact model.

**Earnings announcements**: Using day's open to trade post-earnings assumes you can react instantly to after-hours announcement. Reality: you use pre-open indication which differs from official open.

**Hard to borrow**: Backtesting short of popular momentum stocks assumes infinite borrow availability. Live trading: stock gets recalled during losing period, forced buy-to-cover at worst price.

## The Silver Lining

These pitfalls are SYSTEMATIC. Once you fix them, your backtest becomes more realistic, not more pessimistic. A strategy that survives rigorous pitfall elimination has vastly higher probability of live success.

Don't view this list as obstacles - view as quality gates that separate amateur from professional trading system development.

For data error detection specific to mean-reversion, see [[data-errors-mean-reversion]]. For futures methodology, explore [[futures-continuous-contracts]]. For statistical validation, see [[statistical-tests-moc]].
