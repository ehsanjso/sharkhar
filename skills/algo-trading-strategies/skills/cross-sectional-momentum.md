---
description: >
  Momentum strategy ranking instruments by relative performance. Long top
  performers, short bottom performers. Works across stocks, futures, currencies.
  Higher returns than time-series but crashes harder post-crisis.
source:
  chapters: [6, 7]
  key-insight: "Past relative winners continue outperforming; rank monthly, hold monthly"
---

# Cross-Sectional Momentum

Cross-sectional momentum exploits relative performance persistence: instruments that outperformed their peers continue outperforming. Unlike [[time-series-momentum]] which compares each instrument to its own past, cross-sectional compares instruments to EACH OTHER.

## Core Principle

Rank N instruments by past K-month returns. Long top decile, short bottom decile. Rebalance monthly. The spread between winners and losers persists due to slow information diffusion, forced flows, and investor psychology.

This is [[momentum-trading]] applied to relative returns rather than absolute returns. An instrument can have negative absolute return but still be longed if its peers did even worse.

## Mathematical Framework

For stock i:
- Raw return: r[i,t]
- Average return: μ[t] = mean(r[j,t] for all j)
- Relative return: r[i,t] - μ[t]

**Hypothesis**: sign(r[i,t-K] - μ[t-K]) predicts sign(r[i,t] - μ[t])

Positive relative return in past K months → Continue outperforming
Negative relative return → Continue underperforming

## When to Apply

Use cross-sectional momentum when:
- You have universe of 50+ related instruments (S&P500 stocks, commodity futures, country ETFs)
- Individual instruments show [[time-series-momentum]] but it's noisy
- You want market-neutral exposure (long-short eliminates market beta)
- News-driven or fund-flow-driven markets where information diffuses slowly

## Classic Stock Implementation

**Universe**: S&P 500 stocks
**Look-back**: 252 days (12 months)
**Holding**: 21 days (1 month)
**Long/short**: Top/bottom 50 stocks (deciles)

```python
lookback = 252  
holddays = 21
topN = 50

# Rank by 12-month return
returns_lagged = (price[t] - price[t-lookback]) / price[t-lookback]
ranked = argsort(returns_lagged)

# Long best, short worst
longs = ranked[-topN:]  # Top 50
shorts = ranked[:topN]  # Bottom 50

# Hold for 1 month with daily rebalancing
for h in range(holddays):
    positions[longs shifted by h] += 1/holddays/topN
    positions[shorts shifted by h] -= 1/holddays/topN

daily_return = sum(positions[t-1] * returns[t])
```

## Performance Characteristics

**Pre-2008**: APR 16-37%, Sharpe 0.83-4.1 depending on universe and parameters. Remarkably consistent across decades.

**2008-2009 crash**: APR –30%. Catastrophic. Short positions (former losers) rebounded violently while longs (former winners) collapsed. This is [[momentum-crashes]].

**Post-2010**: Performance recovered but never regained pre-crisis levels. Market structure changed.

The crash vulnerability is this strategy's defining risk. See [[momentum-crashes]] for why crashes occur and how to detect them.

## Futures Implementation

**Daniel & Moskowitz (2011)**: 52 commodity futures, 12-month lookback, 1-month hold
**2005-2007**: APR 18%, Sharpe 1.37
**2008-2009**: APR –33% (crash)
**Post-2009**: Recovery

Same pattern as stocks. Cross-sectional momentum works until crisis, then devastates. The strategy is universal but so is its vulnerability.

## Sources of Cross-Sectional Momentum

**Slow information diffusion**: [[post-earnings-announcement-drift]], analyst upgrades, guidance changes take days/weeks to fully incorporate. Early movers profit.

**Forced fund flows**: [[mutual-fund-flows]] create momentum. Funds experiencing inflows buy existing holdings (not new stocks). Outflows force sales of current positions. Creates persistent buying/selling pressure.

**News sentiment**: [[news-sentiment-momentum]] from machine-readable feeds. Positive sentiment stocks outperform, negative underperform, for days after initial news.

**Behavioral factors**: Anchoring, herding, momentum chasing by retail investors.

## Factors Beyond Returns

Instead of ranking by returns, rank by:
- **P/E ratio**: Low P/E outperforms high P/E (value factor, actually mean-reversion)
- **News sentiment**: Rank by change in RavenPack sentiment scores
- **Analyst revisions**: Upgrades vs downgrades
- **Earnings surprises**: Actual vs expected, magnitude and direction
- **Mutual fund ownership**: Stocks held by funds with inflows outperform

These factors create [[fundamental-factors-momentum]] strategies. Same framework (rank, long top, short bottom), different ranking variable.

## Mutual Fund Pressure Factor

**Coval & Stafford (2007)**: Stocks disproportionately held by poorly-performing funds (experiencing redemptions) underperform. Stocks held by well-performing funds (experiencing inflows) outperform.

**Strategy**:
1. Measure fund flows (quarterly from SEC filings)
2. Identify stocks held by distressed funds
3. Short stocks with high selling pressure, long stocks with high buying pressure
4. APR ~17% before costs

This exploits forced flows rather than information. Funds MUST sell when clients redeem, regardless of valuation.

## Pitfalls

**Momentum crashes**: The defining risk. After market crashes, shorts rebound faster than longs recover. Strategy loses years of gains in months. No reliable early warning. See [[momentum-crashes]].

**Shortening duration**: 12-month look-back worked in 1970s. By 2000s, 6-month better. By 2010s, 3-month. As more traders discover patterns, they arbitrage away faster.

**Transaction costs**: Monthly rebalancing with 100 positions (50 long, 50 short) creates substantial costs. High-frequency version costs even more. Not suitable for retail accounts without institutional execution.

**[[short-sale-constraints]]**: Hard-to-borrow stocks (often the worst performers you want to short) charge 10-20% annual borrow cost. Can eliminate entire edge.

**Market-neutral illusion**: Long-short appears market-neutral (beta ≈ 0) in normal times. During crashes, long and short are no longer offsetting. Correlation → 1, hedge breaks, massive loss.

## Cross-Sectional vs Time-Series

**[[time-series-momentum]]**: Each instrument vs its own past. Simpler. Works with 1 instrument. Lower returns but more stable.

**[[cross-sectional-momentum]]**: Instruments ranked vs each other. Requires universe. Higher returns pre-crisis, catastrophic crashes.

**Combination**: Run both simultaneously on same universe. Correlation < 1 provides diversification. But both suffer during crisis.

## News-Driven Cross-Sectional

Modern variant uses [[news-sentiment-momentum]]:
- Subscribe to machine-readable news (RavenPack, Thomson Reuters)
- Calculate sentiment score for each stock each day
- Rank by sentiment change (not price change)
- Long top sentiment, short bottom sentiment  
- Hold intraday or overnight

**Hafez & Xie (2012)**: APR 52-156%, Sharpe 3.9-5.3 before costs. Astonishing. But high turnover makes transaction costs brutal. Requires institutional execution.

## Practical Considerations

**Universe selection**: S&P500 liquid, but smaller-cap universes (Russell 2000) historically had higher returns at cost of liquidity.

**Rebalancing frequency**: Monthly is classic. Weekly increases turnover. Daily creates unmanageable costs unless high-frequency infrastructure.

**Portfolio size**: Top/bottom decile (50 stocks each for S&P500). Smaller portfolios (top/bottom 20) increase concentration risk and returns.

**Equal vs cap weighting**: Equal weight each position, or weight by market cap? Equal weight gives more exposure to smaller stocks (higher returns, higher risk).

## Integration with Risk Management

Cross-sectional momentum CANNOT use [[constant-proportion-portfolio-insurance]] or [[stop-losses]] effectively because it's market-neutral. No natural stop level since you're long some, short others.

Instead:
- Use [[kelly-formula]] with LOWER leverage (f/4 instead of f/2) to account for crash risk
- Combine with [[time-series-momentum]] and [[mean-reversion]] strategies for diversification
- Monitor [[vix-as-risk-indicator]] and delever when VIX spikes
- Accept that crashes are unhedgeable; focus on maximizing growth between crashes

For complete momentum toolkit including crash detection, see [[momentum-strategies-moc]]. For news-based variant, explore [[news-sentiment-momentum]]. For time-series alternative, see [[time-series-momentum]].
