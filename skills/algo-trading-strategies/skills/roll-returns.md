---
description: >
  Return component unique to futures from converging to spot at expiration.
  Use to understand futures profitability beyond spot price moves. Foundation
  for time-series momentum in futures and calendar spread strategies.
source:
  chapters: [5]
  key-insight: "Total futures return = spot return + roll return; roll can dominate"
---

# Roll Returns

Roll return is the profit or loss from holding a futures contract as it converges toward spot price at expiration, even if spot price itself doesn't move. This return component is unique to futures and often larger than spot returns, making it the primary driver of [[time-series-momentum]] in commodities.

## Mathematical Framework

**F(t,T) = S(t) × exp(γ(T-t))**

Where:
- F(t,T) = futures price at time t expiring at T
- S(t) = spot price at time t  
- γ = roll return (constant rate of convergence)

Taking derivatives:
- Total return = α + γ (spot return + roll return)
- Roll return = –∂(log F)/∂T = γ

Roll return is the slope of the futures curve against time-to-maturity.

## Backwardation vs Contango

**Backwardation** (γ > 0): Near contracts trade HIGHER than far contracts. Roll return is POSITIVE. Futures price declines toward lower spot as expiration approaches, but you profit from being long because you bought high (near) and spot is lower.

**Contango** (γ < 0): Near contracts trade LOWER than far contracts. Roll return is NEGATIVE. Futures price rises toward higher spot as expiration approaches, but you lose from being long because you bought low (near) and spot is higher.

Mnemonic: "Normal backwardation" means futures < expected spot (positive roll). "Contango" sounds like "contain" (futures prices contained by storage costs, trading above spot).

## When It Matters

**Futures momentum strategies**: [[time-series-momentum]] in futures comes from persistence of roll return sign, not spot price trends. Corn can have negative spot returns but strong positive total returns if backwardation persists.

**VX (volatility) futures**: Negative 50% annualized roll return explains why VX trends down despite VIX mean-reverting. Never buy-and-hold VX expecting VIX mean-reversion to profit.

**Calendar spreads**: [[futures-calendar-spreads]] directly trade roll return by going long far contract, short near contract. If γ mean-reverts, spread is profitable.

**ETF vs futures arbitrage**: [[extracting-roll-returns]] by pairing commodity future (has roll return) with commodity ETF or producer stocks (have only spot return). Short future in contango, long ETF.

## Measuring Roll Returns

**Method 1: Forward curve regression**
On any day, plot log(F) vs time-to-maturity for 5 nearest contracts. Slope = γ (annualized roll return). This is [[constant-returns-model]].

**Method 2: Front-back price ratio**
Simpler: γ ≈ 12 × log(F_back / F_front) for monthly futures. If front month $100, back month $95, γ ≈ 12 × log(0.95) = –63% annualized (contango).

## Practical Steps

1. **Collect futures curve**: Get prices for 5+ contract months
2. **Scatter plot log-prices**: x-axis = months to expiry, y-axis = log(price)
3. **Linear regression**: Slope gives γ (annualized roll return)
4. **Track over time**: γ varies slowly; positive/negative periods persist
5. **Compare to spot returns**: For many commodities, |γ| > |α| (roll dominates)

## Examples from Book

**Corn (C)**: α = 2.8%, γ = –12.8% annual. Roll return dominates. Don't buy-and-hold corn futures!

**Crude Oil (CL)**: α = 7.3%, γ = –7.1% annual. Roughly equal magnitude, opposite signs. Net return near zero despite rising oil prices 2004-2012.

**Copper (HG)**: α = 5.0%, γ = 7.7% annual. Both positive. Buy-and-hold very profitable from both components.

**VX**: γ ≈ –50% annual. Catastrophic to hold long even though VIX mean-reverts.

## Pitfalls

**Confusing VIX with VX**: VIX index mean-reverts strongly (stationary). VX futures does NOT mean-revert due to massive negative roll return. Many traders lose fortunes buying VX expecting VIX mean-reversion.

**Ignoring roll in ETF pairs**: Pairing GLD (holds physical gold, no roll) with GC futures (has roll) works. Pairing XLE (stocks) with USO (holds futures, has roll) requires accounting for USO's roll return.

**Regime changes**: γ sign can flip. Crude oil switched from backwardation to contango around 2008. Don't assume current regime persists forever.

**Calendar spread model breakdown**: Simple model F(t,T) = S exp(γ(T-t)) only works for assets with storage costs (commodities). Fails for VX, interest rate futures, others. Test empirically.

## Extracting Roll Returns

**Strategy 1**: Trade [[time-series-momentum]] on futures. Long if γ > threshold (e.g., 3% annual), short if γ < –threshold. Exploits persistence of roll return sign.

**Strategy 2**: [[extracting-roll-returns]] via arbitrage. If contango (γ < 0), short future and long commodity ETF/producer stocks. Capture negative roll while hedging spot exposure.

**Strategy 3**: Trade [[futures-calendar-spreads]]. Long far contract, short near contract. If γ mean-reverts (ADF test passes on γ time series), profitable.

## Connection to Other Concepts

Roll returns explain why:
- [[time-series-momentum]] works better on futures than stocks (persistence of γ sign)  
- Commodity ETFs holding futures (USO, UNG) underperform spot indices (negative roll drag)
- [[futures-calendar-spreads]] can mean-revert even though futures themselves don't
- Simple VIX mean-reversion fails when applied to VX (roll overwhelms spot)

For implementing roll-based strategies, see [[futures-calendar-spreads]], [[time-series-momentum]], and [[extracting-roll-returns]]. For validation, use [[augmented-dickey-fuller-test]] on γ time series to check if roll return mean-reverts.
