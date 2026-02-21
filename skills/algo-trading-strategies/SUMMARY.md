# Algorithmic Trading Skill Graph - Summary

## Source Material
**Book**: "Algorithmic Trading: Winning Strategies and Their Rationale" by Ernie Chan  
**Chunks Processed**: 88 markdown files from parsed book content  
**Extraction Date**: 2026-02-20

## Skill Graph Overview

This skill graph contains **27 interconnected markdown files** organized as a knowledge network for algorithmic trading. Each file represents a discrete skill, concept, or technique with `[[wikilinks]]` woven into prose to create meaningful connections that guide learning and application.

## Structure

### Entry Point
- **index.md**: Main navigation hub introducing the two trading paradigms (mean-reversion and momentum) and linking to all major concept clusters

### Maps of Content (MOCs)
High-level organizational files connecting related skills:

1. **statistical-tests-moc.md**: All tests for validating trading hypotheses (stationarity, cointegration, momentum)
2. **mean-reversion-strategies-moc.md**: Complete toolkit for mean-reverting strategies from validation through execution
3. **risk-management-moc.md**: Position sizing, leverage optimization, and drawdown control

### Core Statistical Concepts (9 files)
- **stationarity.md**: Foundation for mean reversion
- **cointegration.md**: Creating stationary portfolios from non-stationary components
- **augmented-dickey-fuller-test.md**: Primary test for mean reversion  
- **cointegrated-adf-test.md**: Two-step test for pairs
- **johansen-test.md**: Multivariate cointegration for 3+ instruments
- **hurst-exponent.md**: Classifying series as mean-reverting vs momentum vs random
- **variance-ratio-test.md**: Alternative stationarity test
- **half-life-mean-reversion.md**: Timing mean reversion, setting look-back periods
- **backtesting-pitfalls.md**: Critical errors that inflate backtest performance

### Mean-Reversion Strategies (7 files)
- **mean-reversion.md**: Core paradigm and principles
- **bollinger-bands.md**: Practical entry/exit framework  
- **kalman-filter.md**: Dynamic hedge ratio estimation
- **pair-trading.md**: General framework for trading cointegrated pairs
- **etf-pairs.md**: ETF-specific pairs (superior to stock pairs)
- **buy-on-gap.md**: Intraday mean reversion on opening gaps
- **futures-calendar-spreads.md**: Trading roll returns in futures curves

### Momentum Strategies (3 files)
- **momentum-trading.md**: Core paradigm opposite to mean reversion
- **time-series-momentum.md**: Each instrument vs its own history  
- **cross-sectional-momentum.md**: Ranking instruments by relative performance

### Risk Management (4 files)
- **kelly-formula.md**: Optimal leverage for Gaussian returns
- **optimal-leverage.md**: Three methods for calculating optimal position size
- **stop-losses.md**: When and how to use stops (depends on strategy type)
- **roll-returns.md**: Futures-specific return component driving momentum

## Key Insights Extracted

### Mean Reversion
1. **ETF pairs outperform stock pairs** - Basket fundamentals change slower than individual companies
2. **Stationarity is prerequisite** - Never trade mean reversion without ADF test p < 0.05
3. **Half-life sets look-back** - Use calculated half-life, don't optimize arbitrarily
4. **GLD-GDX-USO lesson** - When pairs break, identify missing external variable
5. **Stop losses contradict thesis** - Set wider than backtest max for regime-change protection only

### Momentum
1. **12-month lag predicts 1-month forward** - Remarkably consistent across all asset classes
2. **Roll returns persistence** - Futures momentum driven by backwardation/contango sign persistence
3. **Momentum crashes post-crisis** - 2008-2009 destroyed decades of gains
4. **Shortening duration** - Patterns arbitrage away faster as more traders discover them
5. **Natural stop alignment** - Unlike mean reversion, momentum stops align with model

### Risk Management
1. **Half-Kelly is wiser than full Kelly** - Estimation error asymmetry favors caution
2. **Constant leverage requires rebalancing** - Sell into losses, buy into gains (counterintuitive but necessary)
3. **CPPI limits drawdowns** - Better than stop-losses for drawdown-constrained accounts
4. **Mean-reversion unlimited downside** - Can't use stops at signal reversal
5. **Momentum unlimited upside** - Black swans help during normal times, crash afterward

### Backtesting
1. **Survivorship bias** - Only seeing pairs that stayed cointegrated inflates expectations
2. **Data errors magnify in mean reversion** - Single bad quote creates fake extreme signal
3. **Futures settlement vs close** - Using wrong price causes systematic slippage
4. **Look-ahead bias** - Using day's close to generate signal for that close
5. **Data-snooping correction** - Require p << 0.05 when testing many candidates

## File Interconnections

The skill graph creates a web of meaningful connections:

- **Statistical validation flows to strategy selection**: ADF test → stationarity → mean-reversion strategies
- **Strategy selection informs risk management**: Momentum → natural stops, Mean-reversion → CPPI
- **Practical strategies reference core concepts**: Buy-on-gap → stationarity → ADF test → half-life
- **MOCs organize by purpose**: Need to validate? → statistical-tests-moc. Need to execute? → mean-reversion-strategies-moc
- **Cross-references explain WHY**: Not bare links, but prose explaining why you'd follow that connection

## Coverage

### What's Included
✓ Both major paradigms (mean reversion and momentum)
✓ Statistical tests with practical interpretation  
✓ Specific strategies with performance examples
✓ Risk management from Kelly formula to CPPI
✓ Instrument-specific considerations (stocks, ETFs, futures, currencies)
✓ Common pitfalls and how to avoid them
✓ When to apply each technique

### What's Excluded
✗ Book metadata (title pages, index, bibliography, acknowledgments)
✗ Overly specific code listings (referenced but not detailed)
✗ Author biography and book sales copy
✗ Redundant examples of same concept
✗ Historical anecdotes without actionable insight

## Usage

Start at **index.md** and follow wikilinks based on your needs:
- **Learning**: Follow conceptual chains (e.g., stationarity → ADF test → half-life → Bollinger bands)
- **Validating**: Go to statistical-tests-moc, pick appropriate test
- **Implementing**: Go to mean-reversion-strategies-moc or momentum-strategies-moc
- **Sizing positions**: Go to risk-management-moc
- **Troubleshooting**: Start at backtesting-pitfalls or the specific strategy file

The wikilinks aren't just navigation - they carry semantic meaning about relationships between concepts. The surrounding prose explains WHY you'd explore that connection.

## File Statistics
- **Total files**: 27 (1 index + 3 MOCs + 23 concept/strategy files)
- **Average file size**: ~4-7 KB (detailed enough for depth, compact enough for focus)
- **Total network size**: ~150 KB of interconnected knowledge
- **Wikilink density**: 10-25 links per file (heavily interconnected)

## Skill Progression

**Beginner Path**: index → stationarity → ADF test → bollinger-bands → etf-pairs  
**Intermediate Path**: cointegration → johansen-test → pair-trading → kalman-filter  
**Advanced Path**: roll-returns → futures-calendar-spreads → cross-sectional-momentum  
**Risk-Focused Path**: kelly-formula → optimal-leverage → stop-losses → CPPI

Each path builds understanding progressively through meaningful connections.

## Quality Markers

Each file includes:
- **YAML frontmatter**: Description field explaining what the skill is and when to use it
- **Source attribution**: Chapter numbers and key insight from the book
- **When to Apply section**: Practical triggers for using this skill
- **Practical Steps**: Concrete implementation guidance
- **Pitfalls section**: Common mistakes and how to avoid them
- **Wikilinks in prose**: Not bare lists, but meaningful connections explained in context

This skill graph represents the actionable knowledge from Ernie Chan's book, organized for an AI agent to navigate and apply to algorithmic trading tasks.
