---
name: algo-trading-strategies
description: "Algorithmic Trading: Winning Strategies and Their Rationale by Ernie Chan. Statistical tests (ADF, Johansen, Hurst), mean-reversion strategies (pairs, ETF pairs, Bollinger bands, Kalman filter), momentum strategies (time-series, cross-sectional), risk management (Kelly, optimal leverage, CPPI), and backtesting pitfalls. Use for validating trading hypotheses, selecting strategies, sizing positions, and avoiding common errors."
---

# Algorithmic Trading Strategies

> Knowledge graph from Ernie Chan's "Algorithmic Trading: Winning Strategies and Their Rationale"

## When to Use

**This skill provides:**
- Statistical tests to validate mean-reversion vs momentum hypotheses
- Specific trading strategies with performance examples
- Risk management frameworks (Kelly formula, optimal leverage, CPPI)
- Backtesting pitfall detection
- Strategy-specific position sizing and stop-loss guidance

**Use this skill when:**
1. **Validating a trade idea** - Use ADF test, Johansen test, Hurst exponent to confirm stationarity/momentum
2. **Selecting a strategy** - Choose mean-reversion vs momentum based on instrument characteristics
3. **Sizing positions** - Apply Kelly formula or optimal leverage calculation
4. **Setting stops** - Understand when stops align vs contradict strategy thesis
5. **Evaluating backtest results** - Check for survivorship bias, data snooping, look-ahead bias
6. **Troubleshooting failed strategies** - Identify regime changes, cointegration breaks

## Quick Navigation

**Entry point:** Start at `skills/index.md` for overview of both paradigms

**Maps of Content (MOCs):**
- `skills/statistical-tests-moc.md` - All validation tests
- `skills/mean-reversion-strategies-moc.md` - Complete mean-reversion toolkit
- `skills/risk-management-moc.md` - Position sizing and drawdown control

**Common workflows:**
1. **Validate mean-reversion idea**: Read `augmented-dickey-fuller-test.md` → `half-life-mean-reversion.md` → `bollinger-bands.md`
2. **Build pairs strategy**: Read `cointegration.md` → `johansen-test.md` → `pair-trading.md` → `kalman-filter.md`
3. **Size positions**: Read `kelly-formula.md` → `optimal-leverage.md`
4. **Check backtest validity**: Read `backtesting-pitfalls.md`

## Key Concepts

### Mean Reversion
- **Stationarity is prerequisite** - Never trade without ADF test p < 0.05
- **Half-life sets parameters** - Don't optimize arbitrarily
- **ETF pairs >> stock pairs** - Basket fundamentals more stable
- **Stop losses contradict thesis** - Only for regime-change protection

### Momentum  
- **12-month lag → 1-month forward** - Consistent pattern
- **Natural stop alignment** - Unlike mean-reversion
- **Roll returns drive futures momentum** - Backwardation/contango persistence
- **Post-crisis crashes** - Be aware of momentum regime changes

### Risk Management
- **Half-Kelly > full Kelly** - Estimation error asymmetry
- **Constant leverage needs rebalancing** - Sell losses, buy gains
- **CPPI for drawdown limits** - Better than stops for mean-reversion
- **Strategy-dependent stops** - Momentum: yes, Mean-reversion: rarely

## Coverage

✅ Statistical validation (ADF, Johansen, Hurst, variance ratio)  
✅ Mean-reversion strategies (pairs, ETF pairs, Bollinger, Kalman, buy-on-gap, calendar spreads)  
✅ Momentum strategies (time-series, cross-sectional)  
✅ Risk management (Kelly, optimal leverage, stops, CPPI, roll returns)  
✅ Backtesting pitfalls (survivorship, data errors, look-ahead, data snooping)  
✅ Instrument-specific guidance (stocks, ETFs, futures, currencies)

## How to Read Skills

Each skill file contains:
- **Description** - What it is and when to use it
- **When to Apply** - Practical triggers
- **Practical Steps** - Implementation guidance
- **Pitfalls** - Common mistakes
- **[[Wikilinks]]** - Meaningful connections explained in prose

Follow wikilinks to build understanding progressively. The connections aren't just navigation - they explain WHY concepts relate.

## Integration with Other Skills

**Complements `quant-trading` skill:**
- quant-trading: Covers execution, order types, market structure, Kelly derivation
- algo-trading-strategies: Covers validation tests, specific strategies, momentum (missing from quant-trading)

**Use together:**
- This skill for strategy selection and validation
- quant-trading for execution mechanics and risk frameworks
- Both for complete quantitative trading system

## Source

**Book:** "Algorithmic Trading: Winning Strategies and Their Rationale" by Ernie Chan  
**Extracted:** 2026-02-20  
**Files:** 27 interconnected markdown skills  
**Format:** Wikilink knowledge graph
