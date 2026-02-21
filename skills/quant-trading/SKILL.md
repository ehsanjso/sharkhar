---
name: quant-trading
description: Quantitative trading frameworks from Ernest Chan. Use for position sizing (Kelly formula), strategy selection (mean-reversion vs momentum), regime detection, exit strategies, and backtesting best practices. Essential for making trading decisions with statistical edge.
---

# Quantitative Trading Skill

> Extracted from Ernest Chan's "Quantitative Trading: How to Build Your Own Algorithmic Trading Business"

## Description

Actionable frameworks for building algorithmic trading strategies. Use when making trading decisions, sizing positions, backtesting strategies, or evaluating risk.

## When to Use

- **Position sizing** — Use `kelly-formula.md` to calculate optimal bet size
- **Strategy type** — Use `mean-reversion.md` vs `momentum-strategies.md` to match your market
- **Regime detection** — Use `regime-switching.md` when unsure if market is trending or reverting
- **Exit decisions** — Use `exit-strategies.md` to match exits to strategy type
- **Cost modeling** — Use `transaction-costs.md` before assuming an edge exists
- **Backtesting** — Use `backtesting.md` and the three bias files to avoid self-deception

## Key Files

### Entry Points
- `skills/index.md` — Start here for navigation
- `SUMMARY.md` — Overview of all 29 skill files

### Core Frameworks
| File | Use When |
|------|----------|
| `skills/kelly-formula.md` | Sizing positions, calculating leverage |
| `skills/sharpe-ratio.md` | Evaluating strategy quality |
| `skills/optimal-leverage.md` | Multi-strategy allocation |
| `skills/maximum-drawdown.md` | Setting risk limits |

### Strategy Types
| File | Use When |
|------|----------|
| `skills/mean-reversion.md` | Prices deviate from fair value temporarily |
| `skills/momentum-strategies.md` | Trends continue (news, institutional flow) |
| `skills/pair-trading.md` | Two correlated assets diverge |
| `skills/regime-switching.md` | Unsure which regime you're in |

### Critical Biases (Backtest Pitfalls)
| File | Use When |
|------|----------|
| `skills/look-ahead-bias.md` | Backtest looks too good |
| `skills/data-snooping-bias.md` | Optimized too many parameters |
| `skills/survivorship-bias.md` | Testing on historical stock data |

### Execution
| File | Use When |
|------|----------|
| `skills/transaction-costs.md` | Modeling realistic fills |
| `skills/exit-strategies.md` | When to close positions |
| `skills/capacity.md` | How much capital strategy supports |

## Quick Reference

### Kelly Formula (Position Sizing)
```
f = mean_excess_return / variance
```
- Use **half-Kelly** for fat-tail assets (crypto, small caps)
- Growth rate = r + S²/2 (Sharpe squared matters most)

### Mean Reversion vs Momentum
| Aspect | Mean Reversion | Momentum |
|--------|---------------|----------|
| Stop loss | ❌ Harmful | ✅ Beneficial |
| Exit | At mean crossing | On reversal signal |
| Competition effect | Eliminates edge | Shortens timeframe |
| Survivorship bias | High risk | Lower risk |

### Half-Life (Mean Reversion)
```
halfLife = -log(2) / theta
```
Where theta is regression coefficient of spread changes on prior spread.

## Source

**Book:** "Quantitative Trading: How to Build Your Own Algorithmic Trading Business" by Ernie Chan (2008)

**Key insight:** Independent traders can succeed where large funds fail by trading low-capacity strategies with high Sharpe ratios.
