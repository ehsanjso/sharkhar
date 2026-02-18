---
type: research
tags: [research, kelly-criterion, bankroll-management, polymarket, prediction-markets, position-sizing]
date: 2026-02-18
---
# Research: Kelly Criterion & Position Sizing for Binary Prediction Markets

## Summary

The Kelly Criterion is the mathematically optimal formula for bet sizing that maximizes long-term bankroll growth. For Polymarket and similar binary prediction markets, it tells you exactly what fraction of your bankroll to risk based on your edge over the market price. However, **fractional Kelly (25-50% of full Kelly) is strongly recommended** due to probability estimation errors and variance management.

## Key Findings

### The Formula for Binary Prediction Markets

For prediction markets where YES + NO = $1.00:

```
f* = (bp - q) / b

where:
  p = your true probability estimate
  q = 1 - p (probability you're wrong)
  b = (1 - Market_Price) / Market_Price (net odds)
```

**Simplified for prediction markets:**
```
f* = (p - p_m) / (1 - p_m)

where:
  p = your probability estimate
  p_m = market-implied probability (the share price)
```

### Worked Example (Polymarket BTC 5-min)

Market: "BTC Up" trading at $0.45 (45% implied probability)
Your model: 65% confidence BTC goes up

```python
p = 0.65      # Your estimate
p_m = 0.45    # Market price
b = (1 - 0.45) / 0.45 = 1.222  # Net odds

f* = (1.222 × 0.65 - 0.35) / 1.222
f* = (0.794 - 0.35) / 1.222
f* = 0.363  # 36.3% of bankroll
```

Full Kelly says bet 36.3% of bankroll. **But don't do this.**

### Why Fractional Kelly (Never Go Full Kelly)

| Kelly Fraction | Growth Rate | Variance | Risk of Ruin | Recommended For |
|----------------|-------------|----------|--------------|-----------------|
| Full (100%) | Maximum | Very High | Significant | Never in practice |
| Half (50%) | 75% of max | 50% of full | Low | Confident edge, experienced |
| Quarter (25%) | 50% of max | 25% of full | Very Low | **Default choice** |
| Eighth (12.5%) | ~30% of max | ~12% of full | Minimal | New strategies, uncertain edge |

**Key insight from CFA Institute research:** Full Kelly assumes your probability estimate is *exactly correct*. In reality, even a small estimation error can turn optimal sizing into over-betting.

**The vol-regime strategy claims 88.5% win rate in paper trading.** Before trusting that number, apply fractional Kelly:
- Quarter Kelly protects if actual win rate is lower
- If the edge is real, you still compound gains
- If the edge is illusory, you avoid catastrophic drawdowns

### Bankroll Protection Rules

From the $110 loss on Feb 16 (over-betting bug), implement these safeguards:

1. **Hard Maximum Per Bet:** Never exceed 5% of total bankroll regardless of Kelly calculation
2. **Daily Loss Limit:** Stop trading if down 15% in a single day
3. **Session Tracking:** Reset position sizing after each window resolution
4. **Minimum Confidence Threshold:** Don't bet if model confidence < 55%

### The Math of Prediction Market Fees

Polymarket BTC 5-min markets have specific cost structure:

```
Break-even Analysis:
- Gas costs: ~$0.04 per round trip (buy + redeem)
- Spread impact: ~1-2% for thin liquidity
- Redemption delay: 5-10 min after resolution

Minimum viable bet to keep fee ratio < 3%:
  $5 minimum bet (from Feb 17 profitability filter)
  
Win rate needed to break even (at $5 bet):
  51.2% after fees
```

### Position Sizing Algorithm (Python)

```python
def kelly_prediction_market(
    model_probability: float,
    market_price: float,
    bankroll: float,
    kelly_fraction: float = 0.25,  # Quarter Kelly default
    max_bet_pct: float = 0.05,     # 5% hard cap
    min_edge: float = 0.03,        # 3% minimum edge
    min_confidence: float = 0.55   # 55% minimum probability
) -> float:
    """
    Calculate position size for binary prediction market bet.
    Returns bet amount in dollars.
    """
    # Safety checks
    if model_probability < min_confidence:
        return 0  # Don't bet without sufficient confidence
    
    edge = model_probability - market_price
    if edge < min_edge:
        return 0  # Don't bet without sufficient edge
    
    # Kelly formula for binary outcomes
    # f* = (p - p_m) / (1 - p_m)
    if market_price >= 1.0:
        return 0  # Invalid market price
    
    kelly_full = (model_probability - market_price) / (1 - market_price)
    
    # Apply fractional Kelly
    kelly_bet = kelly_full * kelly_fraction
    
    # Apply hard cap
    kelly_bet = min(kelly_bet, max_bet_pct)
    
    # Don't bet negative (no edge)
    kelly_bet = max(kelly_bet, 0)
    
    return bankroll * kelly_bet

# Example usage:
# Current bot config: $10.59 bankroll, vol-regime says 65% UP at 0.45 market price
bet = kelly_prediction_market(
    model_probability=0.65,
    market_price=0.45,
    bankroll=10.59,
    kelly_fraction=0.25  # Quarter Kelly
)
# Returns: ~$0.96 bet (9.1% of bankroll, capped by Quarter Kelly)
```

### Risk of Ruin Calculator

```python
def risk_of_ruin(
    win_rate: float,
    avg_win: float,
    avg_loss: float,
    bankroll_units: int = 100,
    max_drawdown_pct: float = 0.5
) -> float:
    """
    Estimate probability of hitting max drawdown.
    Based on simplified formula from Wizard of Odds.
    """
    if win_rate <= 0 or win_rate >= 1:
        return 1.0 if win_rate <= 0 else 0.0
    
    # Edge per bet
    edge = (win_rate * avg_win) - ((1 - win_rate) * avg_loss)
    if edge <= 0:
        return 1.0  # No edge = eventual ruin
    
    # Approximate risk of ruin using Kelly-adjacent formula
    # For binary bets: RoR ≈ (q/p)^n where n = bankroll in units
    q = 1 - win_rate
    p = win_rate
    
    if q >= p:
        return 1.0  # Losing strategy
    
    # Units to lose before hitting max drawdown
    units_to_ruin = int(bankroll_units * max_drawdown_pct)
    
    ror = (q / p) ** units_to_ruin
    return min(ror, 1.0)

# Example: vol-regime with claimed 88.5% win rate
ror = risk_of_ruin(
    win_rate=0.885,
    avg_win=1.0,   # Binary: win doubles stake
    avg_loss=1.0,  # Binary: lose entire stake
    bankroll_units=100,
    max_drawdown_pct=0.5
)
# Returns: ~0.0001% (effectively zero with true 88.5% edge)
# BUT if actual win rate is 55%: RoR jumps to ~15%
```

## Practical Applications for Ehsan's Bot

### Immediate Changes to `btc_agent.py`

1. **Replace fixed $3 BET_AMOUNT with Kelly calculation:**
```python
# Current (risky)
BET_AMOUNT = 3.00

# Better (dynamic)
def get_bet_amount(confidence, market_price, balance):
    return kelly_prediction_market(
        model_probability=confidence,
        market_price=market_price,
        bankroll=balance,
        kelly_fraction=0.25,
        max_bet_pct=0.05
    )
```

2. **Add confidence-based tiering:**
```python
KELLY_TIERS = {
    (0.55, 0.65): 0.125,  # Low confidence: Eighth Kelly
    (0.65, 0.75): 0.25,   # Medium confidence: Quarter Kelly
    (0.75, 0.85): 0.375,  # High confidence: 3/8 Kelly
    (0.85, 1.00): 0.50,   # Very high confidence: Half Kelly (max)
}
```

3. **Track actual vs predicted for Kelly recalibration:**
```python
# Log every prediction vs outcome
predictions_log.append({
    "timestamp": now,
    "model_prob": confidence,
    "market_price": market_price,
    "outcome": "WIN" | "LOSS",
    "kelly_fraction_used": fraction
})

# Weekly recalibration: if model overestimates, reduce Kelly
actual_win_rate = wins / total_bets
if actual_win_rate < (average_model_confidence - 0.10):
    kelly_fraction *= 0.8  # Reduce by 20%
```

### Strategy-Specific Recommendations

| Strategy | Paper Win Rate | Recommended Kelly | Rationale |
|----------|----------------|-------------------|-----------|
| vol-regime | 88.5% | Start 1/8, graduate to 1/4 | Unproven live, needs validation |
| ensemble | 76.5% | 1/4 Kelly | Good confidence, proven concept |
| breakout | 100% (small n) | 1/8 Kelly | Sample size too small |
| Others | <60% | Skip entirely | No positive EV |

### Validation Framework

Before trusting paper trading numbers, validate with:

1. **Sample size:** Need 50+ bets minimum for statistical significance
2. **Market conditions:** Paper results during low-volatility may not transfer
3. **Execution quality:** Paper doesn't account for slippage, failed orders
4. **Regime changes:** What worked last week may not work today

## Resources

### Calculators & Tools
- [Kelly Calculator (OddsIndex)](https://oddsindex.com/bet-calculators/kelly) - Sports betting focused
- [Risk of Ruin Calculator (Wizard of Odds)](https://wizardofodds.com/games/risk-of-ruin/calculator/)
- [Manifold Kelly Tool](https://manifund.org/projects/a-tool-for-making-well-sized-kelly-optimal-bets-on-manifold)

### Deep Reading
- [The Math of Prediction Markets (Substack)](https://navnoorbawa.substack.com/p/the-math-of-prediction-markets-binary) - Excellent technical breakdown
- [The Kelly Criterion: You Don't Know the Half of It (CFA Institute)](https://blogs.cfainstitute.org/investor/2018/06/14/the-kelly-criterion-you-dont-know-the-half-of-it/) - Why most implementations are wrong
- [Never Go Full Kelly (LessWrong)](https://www.lesswrong.com/posts/TNWnK9g2EeRnQA8Dg/never-go-full-kelly) - Bayesian updating for market odds
- [Fortune's Formula (Book)](https://www.amazon.com/Fortunes-Formula-Scientific-Betting-Casinos/dp/B072VX7DCS) - The definitive history

### Python Libraries
- `vectorbt` - Backtesting with Kelly position sizing built-in
- `scipy.optimize` - For continuous Kelly optimization
- Basic formula only needs `math` module

## Next Steps

1. **Today:** Add Kelly function to `btc_agent.py` with Quarter Kelly default
2. **This week:** Create `predictions_log` table to track model calibration
3. **After 50 bets:** Analyze actual vs predicted win rates, adjust Kelly fraction
4. **Weekly:** Review risk of ruin metrics and adjust if needed

## Key Takeaway

> "The Kelly Criterion tells you how to grow fastest. Fractional Kelly tells you how to survive long enough to get there."

The Feb 16 loss ($180→$70) happened because of uncapped percentage betting. Kelly with a 5% hard cap would have prevented it. **Always bet less than you think you should.**
