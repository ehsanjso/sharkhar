---
description: >
  MOC for rigorous strategy validation. Use this when you need to test a trading idea historically without fooling yourself — the graveyard of trading is full of strategies that backtested beautifully but failed live.
source:
  chapters: [3]
  key-insight: "A backtest is only as good as its worst hidden assumption."
---

# Backtesting

Backtesting is where dreams meet reality. Done correctly, it reveals whether your strategy has genuine edge or just got lucky on historical data. Done poorly, it becomes an expensive exercise in self-deception.

## The Backtesting Minefield

The central challenge: **your backtest will lie to you**. Not intentionally, but through subtle biases that inflate performance. Master the art of detecting these lies, and you'll save yourself from catastrophic losses.

The three deadliest biases are [[look-ahead-bias]] (using tomorrow's data for today's decisions), [[data-snooping-bias]] (over-optimizing on limited history), and [[survivorship-bias]] (missing the stocks that went bankrupt). Each can turn a losing strategy into an apparent winner.

## Building a Honest Backtest

Start with clean data. [[historical-data-sourcing]] explains where to get reliable price history. But raw prices aren't enough — you need [[split-dividend-adjustment]] to avoid false signals when stocks split or pay dividends.

Then layer in realistic [[transaction-costs]]. A strategy with a 4.0 [[sharpe-ratio]] before costs can deliver -3.0 after. Include commissions, bid-ask spread, **and** market impact. The book's mean-reversion example showed this brutal truth: spectacular backtest, catastrophic live performance.

## Platform Selection

Excel works for simple strategies (single-stock, low-frequency). MATLAB handles complex portfolio strategies with hundreds of stocks. High-end platforms like Alphacet Discovery enable [[regime-switching]] models with moving parameter optimization.

The platform matters less than the methodology. You can fool yourself in any language.

## Performance Measurement

[[sharpe-ratio]] is your north star — it captures return **and** risk in one number. But supplement it with [[maximum-drawdown]] to understand pain tolerance. A 3.0 Sharpe with 5% max drawdown differs from 3.0 Sharpe with 40% max drawdown.

Calculate these metrics on both training and test sets via [[out-of-sample-testing]]. If performance crashes on unseen data, you've overfit.

## The Look-Ahead Trap

[[look-ahead-bias]] is subtle. Example: "Buy when the stock is within 1% of the day's low." But you don't know the day's low until the close! The backtest executed at the low; you'll execute at the close (or worse).

The fix: use lagged data for all signals. If trading at the close, only use data through yesterday's close. The book provides a clever verification technique — truncate your history by N days, rerun the backtest, and compare positions. Any difference reveals look-ahead bias.

## The Data-Snooping Quicksand

[[data-snooping-bias]] kills more strategies than any other pitfall. You backtest with different parameters, tweak entry/exit rules, try different universes — each iteration mines the same finite data. Eventually, you **will** find something that worked... by pure chance.

Antidotes:
- Limit parameters (rule of thumb: ≤5 adjustable parameters)
- Use [[out-of-sample-testing]] rigorously (hold back data for validation)
- Require economic rationale (know **why** the strategy should work)
- Test sensitivity (if changing a parameter by 10% destroys returns, you overfit)

The book recommends 252 days of data per parameter. Three-parameter strategy? Need 3+ years of daily data.

## The Survivorship Trap

[[survivorship-bias]] disproportionately inflates mean-reversion strategies. Why? You'll backtest shorting stocks that rallied (then got acquired) and buying stocks that crashed (then went bankrupt). But these stocks may not exist in your "current S&P 500" database.

Result: your backtest shows profits on trades you could never have made. Solutions: pay for survivorship-free data, or test on recent periods where delisting is less common.

## Paper Trading Bridge

After backtesting, run [[paper-trading]] for weeks or months. This reveals:
- Software bugs (do generated trades match the backtest?)
- Operational issues (can you download data and transmit orders fast enough?)
- Hidden look-ahead bias (positions not matching backtest on same historical dates = you're using future data)

Paper trading is the final exam before risking real capital.

## Connected Skills

Core biases to master:
- [[look-ahead-bias]] — Using tomorrow's data today
- [[data-snooping-bias]] — Overfitting historical noise  
- [[survivorship-bias]] — Missing bankrupt stocks

Essential techniques:
- [[out-of-sample-testing]] — Validating on unseen data
- [[paper-trading]] — Real-time testing without risk
- [[split-dividend-adjustment]] — Cleaning price data
- [[transaction-costs]] — Modeling realistic execution
- [[historical-data-sourcing]] — Finding reliable data

Performance metrics:
- [[sharpe-ratio]] — Risk-adjusted return measure
- [[maximum-drawdown]] — Peak-to-trough loss

Next step: [[execution-systems]] — turning backtest code into live trading.

Remember: backtesting is not about proving your strategy works. It's about discovering why it **won't** work live. Every bias you find and fix moves you closer to genuine edge.
