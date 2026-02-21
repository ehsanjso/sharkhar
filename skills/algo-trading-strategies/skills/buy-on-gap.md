---
description: >
  Intraday mean-reversion strategy buying stocks gapping down at open, selling
  at close. Exploits panic selling and liquidity-driven price moves that revert
  same day. APR ~8%, Sharpe ~1.5. Works on S&P 500 stocks.
source:
  chapters: [4]
  key-insight: "Overnight gaps from panic revert intraday even when interday shows momentum"
---

# Buy-on-Gap Strategy

Buy-on-gap exploits [[intraday-mean-reversion]]: stocks gapping down significantly at open tend to revert toward previous close by end of day. This pattern is invisible in daily bars but profitable intraday, driven by panic selling and liquidity provision.

## Core Logic

If stock opens ≥1-2 standard deviations below yesterday's close:
- **Buy at open** (or slightly after to avoid execution issues)
- **Sell at close** same day
- Profit from intraday reversion to previous equilibrium

Gap creates temporary mispricing from overnight panic, forced liquidation, or stop-loss cascades. Market makers and value buyers step in during regular hours, pushing price back toward fair value.

## When to Apply

Works best on:
- S&P 500 stocks (liquid, large-cap)  
- Gaps >1σ from 90-day volatility  
- No fundamental news justifying gap (pure technical/liquidity-driven)
- Normal market conditions (not crisis when gaps persist)

Don't use on:
- Earnings announcement gaps (justified by news, may continue)
- Small-cap or illiquid stocks (wider bid-ask, hard to fill)
- Crisis periods (gaps may widen, not revert)

## Practical Steps

1. **Calculate overnight gap**: (Open - PreviousClose) / PreviousClose
2. **Compute std threshold**: 90-day rolling std of close-to-close returns  
3. **Entry condition**: Gap < –1σ (or –0.1σ per book's less aggressive version)
4. **Buy at open**: Market order or limit slightly above open
5. **Sell at close**: Market-on-close order
6. **Size positions**: Equal dollar amount per stock, max 20-30 stocks per day
7. **Risk management**: Never hold overnight, this breaks the thesis

## Performance Example

S&P 500 stocks, May 2006 - April 2012:
- **Entry**: Gap < –0.1× (90-day std)  
- **APR**: 8.7%
- **Sharpe**: 1.5  
- **Max positions**: ~30 stocks max per day

Intraday Sharpe of 1.5 is excellent. Can apply 4× intraday leverage for ~35% annual return.

## Why It Works

**Panic selling**: Overnight news (often overseas) triggers emotional selling at open. Rational valuation reasserts during day.

**Forced liquidation**: Stop-losses cluster at round numbers. Gap triggers stops, creating forced selling pressure that reverses once stops are absorbed.

**Market making**: Professional market makers provide liquidity to panicky sellers at open, then unload inventory as price normalizes.

**Liquidity vacuum**: Pre-market has lower volume, exaggerates moves. Regular hours bring more participants, tightening spreads.

## Pitfalls

**Earnings gaps**: Fundamental news gaps often DON'T revert same day. They exhibit [[post-earnings-announcement-drift]] instead. Filter out earnings days or accept lower win rate.

**Crisis periods**: During crashes, gaps widen further intraday instead of reverting. 2008-2009 likely destroyed this strategy temporarily. Use [[vix-as-risk-indicator]]: don't trade when VIX > 35.

**Execution slippage**: Market order at open gets terrible fill due to wide spreads. Consider entering 10-30 minutes after open, accepting some reversion already occurred.

**Overnight news**: Major overnight developments (geopolitical, macro) can justify gaps. These don't revert. No systematic way to filter except avoiding during known macro events.

## Opposite Strategy: Sell-on-Gap-Up

Symmetric strategy: sell stocks gapping up >1σ at open, cover at close. Intuition same (temporary overextension reverts).

However, asymmetry exists: **Gaps down revert more reliably than gaps up** due to:
- [[short-sale-constraints]] limit selling pressure on gap-ups
- Positive momentum  in stocks (gaps up may continue)
- Buy panic less intense than sell panic

Test both but expect buy-on-gap to outperform sell-on-gap.

## Relationship to Other Concepts

Buy-on-gap is [[intraday-mean-reversion]] applied to opening gaps. Contrast with:
- [[bollinger-bands]]: Daily/weekly mean reversion, hold multiple days
- [[pair-trading]]: Relative mean reversion between instruments
- [[post-earnings-announcement-drift]]: Momentum after news, not mean reversion

This is rare example of [[mean-reversion]] working INTRADAY on individual stocks, whereas daily returns show [[momentum-trading]]. Time scale matters.

For other intraday strategies, see [[momentum-strategies-moc]]. For risk management, [[risk-management-moc]].
