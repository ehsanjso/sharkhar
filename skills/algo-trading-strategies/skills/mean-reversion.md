---
description: >
  Core trading paradigm where prices revert to mean after deviating.
  Use when you detect stationary price series or cointegrating portfolios.
  Opposite of momentum - assumes temporary deviations correct themselves.
source:
  chapters: [2, 3, 4, 5]
  key-insight: "Mean reversion requires stationarity; without it you face unlimited losses"
---

# Mean Reversion

Mean reversion is the phenomenon where price changes are proportional to the distance from the mean price. When a stock or portfolio deviates far from its average, mean reversion predicts it will return to that average, creating profitable trading opportunities.

## Core Principle

Unlike [[momentum-trading]] which bets on continuation, mean reversion bets on reversal. The mathematical model is the [[ornstein-uhlenbeck-process]]: the farther a price strays from equilibrium, the stronger the pull back. This creates a natural profit cap (the mean) but poses unlimited downside risk if the series stops mean-reverting.

You must distinguish mean reversion from [[geometric-random-walk]]. In random walks, price diffuses away and never returns. Testing for [[stationarity]] via [[augmented-dickey-fuller-test]] or [[variance-ratio-test]] is mandatory before deploying capital. The [[half-life-mean-reversion]] tells you how quickly reversion occurs, directly predicting your holding period and Sharpe ratio.

## When to Apply

- Price series passes [[augmented-dickey-fuller-test]] with <5% p-value
- [[hurst-exponent]] < 0.5, indicating mean reversion not momentum  
- [[half-life-mean-reversion]] is reasonable (days to months, not years)
- You can identify [[cointegration]] between two+ non-stationary series
- Fundamental story supports reversion (e.g., same-sector ETFs affected by common factors)

## Practical Steps

1. **Test for stationarity**: Run [[augmented-dickey-fuller-test]] on price series or [[johansen-test]] for portfolios
2. **Calculate half-life**: Use [[half-life-mean-reversion]] to set your look-back period
3. **Choose entry method**: [[bollinger-bands]] for fixed-leverage entries, or [[linear-mean-reversion-strategy]] for scaling
4. **Determine hedge ratios**: Use regression or [[johansen-test]] eigenvectors for [[hedge-ratio]] in pairs
5. **Consider dynamics**: Apply [[kalman-filter]] if relationships shift over time
6. **Manage risk**: Set stop-loss ABOVE backtest max drawdown (not AT signal reversal)

## Pitfalls

**Unlimited downside**: A mean-reverting series can undergo [[regime-change]] and start trending, causing catastrophic losses. Unlike momentum strategies where stop-losses align with the model, mean-reversion stop-losses contradict your thesis. Set them wider than backtest extremes.

**Data errors magnify**: [[data-errors-mean-reversion]] inflates backtest performance since errors create fake reversions. Be paranoid about data quality, especially for spreads where small quote errors become large percentage deviations.

**Survivorship bias**: Your backtest only includes pairs that STAYED cointegrated. Out-of-sample, many pairs "fall apart." This is why [[cointegration]] in stocks is treacherous but works better for [[etf-pairs]].

**Overfitting look-back**: The optimal look-back in backtest won't be optimal forward. Use [[half-life-mean-reversion]] as principled guide rather than optimizing arbitrarily.

## Advantages Over Momentum

Mean reversion offers easier diversification since you can construct [[cointegration]] portfolios from vast combinations of instruments. [[etf-pairs]] provide particularly reliable opportunities since baskets of stocks change fundamentals slower than individual companies. You also benefit from [[cross-sectional-mean-reversion]] in stock portfolios, where relative performance mean-reverts even when absolute prices don't.

The statistical tests like [[augmented-dickey-fuller-test]] and [[johansen-test]] give you confidence before deploying capital, unlike momentum where you're betting on [[trend-persistence]] that might end tomorrow.

## Implementation Variants

For practical trading, [[bollinger-bands]] beat the theoretical [[linear-mean-reversion-strategy]] since they cap capital requirements. When relationships evolve, [[kalman-filter]] dynamically updates [[hedge-ratio]] and mean, crucial for [[currency-pairs]] and [[futures-calendar-spreads]].

[[intraday-mean-reversion]] exploits seasonal patterns (e.g., [[buy-on-gap]]) where daily bars hide mean reversion visible in intraday data. This sidesteps the regime-change risk of multi-day holds.

Explore [[mean-reversion-strategies-moc]] for complete toolkit including pair selection, execution, and risk management specific to mean-reverting strategies.
