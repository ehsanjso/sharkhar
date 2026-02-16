# Polymarket BTC Bot - Research Documentation

## Contents

### 📚 `academic-foundations.md`
Comprehensive research on the theoretical foundations:
- Kelly Criterion for optimal bet sizing
- Mean reversion theory
- Momentum effect research
- Volatility clustering (GARCH)
- Gambler's fallacy (what to avoid)
- Prediction market microstructure
- Risk management principles

### 🎯 `new-strategies.md`
Five sophisticated betting strategies with full code implementations:

1. **Adaptive Kelly** - Dynamic position sizing based on edge estimation
2. **Volatility Regime Detector** - Adapts strategy to market volatility state
3. **RSI Divergence Hunter** - Contrarian plays when momentum exhausted
4. **Market Odds Arbitrage** - Exploits mispricing vs fair probability model
5. **Ensemble Consensus** - Combines multiple signals for higher accuracy

Each strategy includes:
- Academic/empirical basis
- Decision logic
- Entry timing
- Bet schedule
- Risk management rules
- Expected win rate
- Known weaknesses
- Complete TypeScript implementation

## Quick Win Rates Summary

| Strategy | Expected Win Rate | Risk Level |
|----------|------------------|------------|
| Adaptive Kelly | 52-55% | Medium |
| Volatility Regime | 50-54% | Medium |
| RSI Divergence | 48-52% | High |
| Market Arbitrage | 53-57% | Medium |
| Ensemble Consensus | 54-58% | Low |

## Implementation Order

1. Start with **Ensemble Consensus** (most robust)
2. Add **Adaptive Kelly** for position sizing
3. Layer in **Volatility Regime** detection
4. Use **Market Arbitrage** opportunistically
5. Deploy **RSI Divergence** for reversal plays

## Key Takeaways

- **Half-Kelly** is safer than full Kelly for real-world betting
- **Volatility clusters** - big moves follow big moves
- **Momentum persists** in crypto more than mean reversion
- **Ensemble methods** reduce noise and improve accuracy
- **Never bet > 5%** of bankroll on a single 15-min market

## Date

Research compiled: February 2026
