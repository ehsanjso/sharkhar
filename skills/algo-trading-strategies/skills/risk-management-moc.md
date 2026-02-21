---
description: >
  Map of Content for position sizing, leverage optimization, and drawdown
  control. Navigate this to protect capital while maximizing growth.
  Critical skills: Kelly formula, stop losses, CPPI, risk indicators.
source:
  chapters: [8]
  key-insight: "Optimal leverage maximizes growth; fractional Kelly ensures survival"
---

# Risk Management - Map of Content

Risk management isn't about avoiding losses - it's about sizing positions to maximize long-term growth while surviving inevitable drawdowns. This map organizes all risk techniques by objective.

## Position Sizing for Growth

**[[kelly-formula]]**
Fundamental framework: f = μ/σ². Maximizes compounded growth rate assuming Gaussian returns. Use half-Kelly (f/2) to account for estimation error. Requires constant leverage through rebalancing.

**[[optimal-leverage]]**
Calculating the leverage that maximizes growth under various assumptions. Includes Kelly (Gaussian), Monte Carlo (fat tails), and historical optimization methods.

**[[monte-carlo-leverage-optimization]]**
When returns have fat tails ([[kurtosis]] > 3), Kelly formula underestimates risk. Simulate 100K+ return sequences from Pearson distribution matching your first 4 moments. Find leverage that maximizes median growth.

**[[historical-growth-rate-optimization]]**
Brute force: find leverage that maximized compounded growth in your backtest. Simpler than Monte Carlo but suffers data-snooping bias. Use only if backtest sample is large (1000+ days).

**[[constant-leverage-requirement]]**
All optimization methods require constant leverage. After profit, BUY more; after loss, SELL to reduce positions. This "selling into losses" is mathematically necessary but psychologically difficult and contributed to 2007 quant meltdown.

## Drawdown Control

**[[constant-proportion-portfolio-insurance]]** (CPPI)
Allocate D fraction of capital to trading subaccount, apply Kelly leverage to subaccount only. Guarantees maximum drawdown of –D on total account while maintaining upside from optimal leverage. Graceful way to wind down failing strategies.

**[[stop-losses]]**
Exit position when unrealized P&L drops below threshold. Natural for [[momentum-trading]] (reversal = wrong). Contradictory for [[mean-reversion]] (deepest dip = best entry). Set mean-reversion stops WIDER than backtest maximum to survive [[regime-change]].

**[[maximum-drawdown]]**
Constraint imposed by risk managers or clients. Requires reducing leverage below optimal Kelly level. Use CPPI or Monte Carlo simulation to find leverage that keeps drawdown magnitude < limit.

## Risk Indicators

**[[vix-as-risk-indicator]]**
VIX > 35 signals high-risk period. Some strategies profit (buy-on-gap), others suffer (opening gap momentum). Test YOUR strategy's performance conditional on VIX > threshold.

**[[ted-spread]]**
Difference between 3-month LIBOR and T-bill rate. Measures bank default risk. Spike indicates credit crisis. More informed than VIX since credit markets dominated by institutions not retail.

**[[order-flow-risk]]**
At high frequency, sudden large change in order flow (signed transaction volume) predicts price move. Negative flow in risky assets or positive flow in safe havens indicates informed trading ahead of news.

## Leverage Constraints

**[[optimal-capital-allocation]]**
When broker limits total gross leverage to F_max < Kelly optimal ∑|f_i|, don't just scale all positions proportionally. Often optimal to concentrate in highest-return strategy rather than diversify at suboptimal leverage.

**Multiple strategy allocation**
For N strategies with covariance matrix C and mean returns M, optimal leverages are F = C⁻¹M (vectorized Kelly formula). Accounts for correlations. Uncorrelated strategies get higher allocations.

## Black Swan Protection

**Momentum strategies**: Benefit from black swans during normal times (unlimited upside, limited downside). But crash AFTER financial crises when shorts rebound. See [[momentum-crashes]].

**Mean-reversion strategies**: Suffer from black swans (unlimited downside from trend, limited upside from mean). Require [[stop-losses]] wider than backtest maximum to survive regime shifts.

**Put options**: Buy out-of-money puts before known market closures (weekends, holidays) to protect overnight positions from gaps. Expensive but eliminates tail risk that stop-losses can't prevent.

## Position Sizing Formulas

**Single strategy**: 
f = μ/σ² (Kelly)
Use f/2 for safety (half-Kelly)

**Multiple strategies**:
F = C⁻¹M where F is leverage vector, C is covariance matrix, M is mean returns vector

**Constant leverage maintenance**:
After P&L, adjust positions so Market Value = f × Current Equity

**CPPI leverage**:
Apply leverage f to subaccount D × Total Equity, keep (1-D) in cash

## Practical Application Flow

1. **Calculate optimal leverage**: Use [[kelly-formula]] for Gaussian, [[monte-carlo-leverage-optimization]] for fat tails, or [[historical-growth-rate-optimization]] for empirical
2. **Apply fractional Kelly**: Use f/2 or f/4 to account for estimation error
3. **Check constraints**: If broker limits leverage, use [[optimal-capital-allocation]]
4. **Add drawdown protection**: If maximum drawdown constraint exists, use [[constant-proportion-portfolio-insurance]]
5. **Set stop-losses**: For [[momentum-trading]], align with signal reversal. For [[mean-reversion]], set wider than backtest maximum
6. **Monitor risk indicators**: Track [[vix-as-risk-indicator]], [[ted-spread]], or [[order-flow-risk]] relevant to your strategy
7. **Rebalance constantly**: Maintain [[constant-leverage-requirement]] through daily/weekly rebalancing

## Common Mistakes

**Using full Kelly**: Estimation error in μ or σ leads to excessive leverage and ruin. Always use fractional Kelly.

**Forgetting constant leverage**: After big win, taking profits violates optimal leverage (should increase positions). After loss, adding capital ("doubling down") also violates it.

**Misaligning stop-losses**: Using stops on [[mean-reversion]] at signal reversal contradicts the model. Use stops only to prevent [[regime-change]] catastrophe.

**Ignoring correlations**: Allocating capital to strategies independently when they're correlated. Use covariance matrix C in vectorized Kelly formula.

**Oversizing**: Single large position creates tail risk that ruins account. Kelly formula prevents this by incorporating variance into denominator.

**Static leverage**: Setting leverage once and never adjusting. Markets change, strategy performance changes. Recalculate optimal leverage quarterly using recent data.

## Integration with Trading

Risk management isn't separate from strategy - it's integral to profitability:

**Before trading**: Use [[kelly-formula]] or [[monte-carlo-leverage-optimization]] to determine optimal size
**During drawdown**: [[constant-proportion-portfolio-insurance]] prevents catastrophic loss
**After regime change**: [[stop-losses]] wider than backtest max allow survival until you shut down strategy
**When constrained**: [[optimal-capital-allocation]] maximizes growth under leverage limits

For leverage calculation methods, see [[optimal-leverage]]. For specific instruments, consult [[futures-leverage]] or [[equity-leverage]]. For psychological aspects, read about [[constant-leverage-requirement]] and why it's hard but necessary.
