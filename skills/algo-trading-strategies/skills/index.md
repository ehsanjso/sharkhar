---
description: >
  Entry point to algorithmic trading skills from Ernie Chan's book.
  Use this to navigate the interconnected network of quantitative trading
  concepts, strategies, and risk management techniques.
source:
  book: "Algorithmic Trading: Winning Strategies and Their Rationale"
  author: "Ernie Chan"
---

# Algorithmic Trading Skills

Welcome to a comprehensive skill graph derived from Ernie Chan's algorithmic trading expertise. This network of interconnected concepts will guide you through building, testing, and managing quantitative trading strategies.

## Core Philosophy

Algorithmic trading success comes from understanding [[market-inefficiencies]] and exploiting them systematically. Rather than relying on complex models, Chan emphasizes [[simple-linear-strategies]] that directly address specific inefficiencies while avoiding [[backtesting-pitfalls]].

## Navigate by Strategy Type

The two foundational paradigms are [[mean-reversion]] and [[momentum-trading]]. Mean reversion assumes prices oscillate around equilibrium, requiring tests for [[stationarity]] and [[cointegration]]. Momentum trading exploits persistent directional moves, validated through [[time-series-momentum]] or [[cross-sectional-momentum]].

## Statistical Foundation

Before trading any pattern, validate it. Use [[augmented-dickey-fuller-test]] for mean reversion, [[half-life-mean-reversion]] for timing, and [[hurst-exponent]] to distinguish random walks from trends. For pairs, apply [[johansen-test]] or [[cointegrated-adf-test]].

##Maps of Content (MOCs)

- [[statistical-tests-moc]] - All tests for validating trading hypotheses
- [[mean-reversion-strategies-moc]] - Complete mean reversion toolkit  
- [[momentum-strategies-moc]] - Time series and cross-sectional momentum
- [[risk-management-moc]] - Position sizing, leverage, and drawdown control
- [[futures-trading-moc]] - Calendar spreads, roll returns, and intermarket strategies

## Critical Frameworks

Master [[kelly-formula]] for [[optimal-leverage]] calculation. When prices deviate non-Normally, use [[kalman-filter]] for dynamic [[hedge-ratio]] estimation. For portfolios, understand [[roll-returns]] in futures and [[leveraged-etf-rebalancing]] effects on equity markets.

## Practical Implementation

Real trading requires managing [[transaction-costs]], handling [[short-sale-constraints]], and avoiding [[survivorship-bias]]. Deploy [[stop-losses]] for momentum but not mean reversion. Use [[bollinger-bands]] for practical mean-reversion entry/exit, and apply [[constant-proportion-portfolio-insurance]] to limit catastrophic drawdowns while maintaining upside.

## When to Apply

Use this knowledge when you need to:
- Validate a trading hypothesis with proper statistical tests
- Build a strategy exploiting a specific market inefficiency  
- Size positions to maximize growth while controlling risk
- Understand why a backtest succeeded or failed
- Decide between mean-reversion and momentum approaches for an asset

Start exploring from any node - the wikilinks will guide you to related concepts that deepen your understanding.
