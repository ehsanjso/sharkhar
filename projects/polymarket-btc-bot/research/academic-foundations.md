# Academic Foundations for BTC 15-Min Binary Betting Strategies

## Overview
This document synthesizes research relevant to designing betting strategies for Polymarket's 15-minute BTC Up/Down binary outcome markets.

---

## 1. Kelly Criterion - Optimal Position Sizing

### Core Theory (John Larry Kelly Jr., 1956)
The Kelly Criterion maximizes long-term expected geometric growth rate of wealth.

**Formula for binary outcomes:**
```
f* = (p*b - q) / b
```
Where:
- `f*` = optimal fraction of bankroll to bet
- `p` = probability of winning
- `b` = odds received on the bet (net odds: payout-to-1)
- `q` = probability of losing (1-p)

### Application to Polymarket
- In Polymarket, if you buy "UP" at $0.45, your implied odds b = (1-0.45)/0.45 = 1.22
- If your estimated probability of UP is 55%, Kelly fraction = (0.55 * 1.22 - 0.45) / 1.22 = 0.18 (18% of bankroll)

### Key Insights from Research:
1. **Half-Kelly is recommended** for real-world applications due to parameter uncertainty
2. **Edward Thorp** estimates Kelly can yield 117% annual returns on S&P 500 with proper estimates
3. The criterion assumes **identical, independent bets** - each 15-min market qualifies
4. **Stanford Study**: Only 21% of participants reached maximum payout using optimal Kelly; most bet sub-optimally

### Risk of Over-Betting:
- Betting MORE than Kelly dramatically increases bankruptcy risk
- Betting LESS than Kelly reduces returns but also reduces volatility

---

## 2. Mean Reversion Theory

### Core Concept
Asset prices tend to revert to a mean/average over time. Deviations from the average are expected to reverse.

### Application to 15-min BTC Markets:
- **Short-term extremes** may reverse within the 15-minute window
- If BTC moves +0.5% in first 3 minutes, mean reversion suggests pullback is likely
- **RSI < 30**: oversold, may reverse UP
- **RSI > 70**: overbought, may reverse DOWN

### Supporting Indicators:
1. **Bollinger Bands**: Price touching upper band = potential overbought
2. **Stochastic Oscillator**: %K crossing %D signals reversal
3. **ATR (Average True Range)**: Measures volatility - high ATR suggests larger moves expected

### Caution for Crypto:
- Crypto shows **momentum persistence** more than mean reversion in short timeframes
- Mean reversion works better in **ranging markets**, not trending
- Research by Mandelbrot suggests crypto follows Lévy distribution with fat tails

---

## 3. Momentum Effect

### Academic Evidence (Jegadeesh & Titman, 1993)
- Stocks with strong recent performance continue outperforming by ~1%/month
- Momentum exists due to cognitive biases: investors underreact to new information

### Crypto-Specific Research:
- Bitcoin exhibits **strong short-term momentum** (minutes to hours)
- Trend continuation is more common than reversal in directional moves
- Volatility clustering (Mandelbrot): "Large changes followed by large changes"

### Momentum Indicators:
1. **MACD**: 12-period EMA - 26-period EMA; signal line crossover
2. **Price Rate of Change**: Current price / Price N periods ago
3. **Moving Average Crossovers**: Fast MA crossing slow MA

---

## 4. Volatility Clustering (GARCH Models)

### Mandelbrot's Observation (1963):
"Large changes tend to be followed by large changes, of either sign, and small changes tend to be followed by small changes."

### Implications for 15-min Markets:
1. After a volatile period, expect MORE volatility (either direction)
2. Low volatility periods suggest upcoming move but uncertain direction
3. The **squeeze** pattern (Bollinger Bands narrowing) precedes breakouts

### Trading Implications:
- In high-volatility regimes, momentum strategies work better
- In low-volatility regimes, contrarian bets may be riskier
- Volatility itself is predictable even when direction is not

---

## 5. Gambler's Fallacy - What NOT to Do

### The Fallacy:
Believing past independent outcomes influence future probabilities.
- "BTC went UP last 4 periods, so DOWN is due" → WRONG
- Each 15-minute market is **independent** assuming no systemic correlation

### Exception - When Streaks DO Matter:
- If there's a **macro trend** (news, Fed announcement, etc.), streaks may continue
- Market microstructure can create short-term dependencies
- The key is distinguishing **true independence** from **correlated events**

---

## 6. Prediction Market Microstructure

### Polymarket-Specific Factors:
1. **No house edge**: Trading against other users, not the house
2. **Liquidity varies**: Thin markets have larger spreads
3. **Price discovery**: Early prices may be mispriced
4. **Maker vs Taker**: Maker orders avoid fees

### Edge Opportunities:
1. **Information asymmetry**: If you have faster price feeds
2. **Model accuracy**: Better probability estimates than market
3. **Timing**: Market inefficiencies at specific times (market open/close)

---

## 7. Risk Management Principles

### From Sports Betting Research:
1. **Flat betting**: Same amount every bet (simple, conservative)
2. **Kelly betting**: Optimal but requires accurate probability estimates
3. **Stop-loss**: Define maximum drawdown before pausing
4. **Session limits**: Maximum loss per day/session

### For Binary Outcomes:
- **Never risk more than 2-5% of bankroll** on a single market
- **Track actual win rate** vs expected to detect strategy degradation
- **Correlation awareness**: Multiple bets in same market multiply risk

---

## 8. Time Decay in Binary Options

### Traditional Binary Options Theory:
- As expiration approaches, probability converges to either 0 or 1
- **Theta decay**: The value of uncertainty decreases over time

### Application to 15-min Markets:
- **Early bets** (minute 1-5): Higher uncertainty, larger potential reward
- **Late bets** (minute 10-14): Lower uncertainty, prices closer to fair value
- **Sweet spot**: Often minute 5-10 has best risk/reward

---

## References

1. Kelly, J.L. (1956). "A New Interpretation of Information Rate"
2. Jegadeesh & Titman (1993). "Returns to Buying Winners and Selling Losers"
3. Mandelbrot, B. (1963). "The Variation of Certain Speculative Prices"
4. Thorp, E.O. "Beat the Market" and Kelly Criterion research
5. Bollinger, J. "Bollinger on Bollinger Bands"
6. Wilder, J.W. (1978). "New Concepts in Technical Trading Systems"
