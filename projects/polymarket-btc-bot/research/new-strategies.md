# New Betting Strategies for Polymarket BTC 15-Min Markets

## Overview

These 5 strategies are designed based on academic research in betting mathematics, technical analysis, and prediction market theory. Each strategy is more sophisticated than the current implementations (Scaled Betting, Early Bird, Trend Follower, Late Entry, Martingale Light).

---

## Strategy 1: Adaptive Kelly

### Theory
Based on the Kelly Criterion (1956), this strategy dynamically sizes bets based on estimated edge and current market prices. Unlike fixed betting, it increases position size when edge is higher and reduces when edge is minimal.

### Logic
1. Calculate our estimated probability of UP/DOWN based on price movement
2. Compare to market implied probability (price)
3. Calculate Kelly fraction for optimal bet sizing
4. Use Half-Kelly for safety margin

### Entry Timing
- **First analysis**: Minute 3 (enough data to estimate probability)
- **Bet placement**: Minutes 3-5, then 8-10 if edge persists
- **Skip if**: Edge < 5% (no significant advantage)

### Bet Schedule
```
Kelly Fraction | Bet Size (% of budget)
< 5%           | Skip
5-10%          | 15% of budget
10-20%         | 30% of budget
> 20%          | 50% of budget (max)
```

### Risk Management
- **Max single bet**: 50% of session budget
- **Half-Kelly**: Divide calculated Kelly by 2
- **Stop betting**: If running loss > 40% of budget

### Expected Win Rate
52-55% (edge comes from better probability estimates)

### Weaknesses
- Requires accurate probability estimation (garbage in = garbage out)
- Over-betting if estimates are wrong
- Doesn't account for market manipulation

### Code Implementation

```typescript
interface AdaptiveKellyConfig {
  sessionBudget: number;
  maxBetPct: number; // 0.5 = 50%
  minEdge: number;   // 0.05 = 5%
  kellyFraction: number; // 0.5 = Half-Kelly
}

class AdaptiveKellyStrategy {
  private config: AdaptiveKellyConfig;
  private totalBet: number = 0;

  constructor(config: AdaptiveKellyConfig) {
    this.config = config;
  }

  estimateProbability(priceChange: number, volatility: number): { up: number; down: number } {
    // Simple momentum-based probability estimate
    // Positive price change -> higher UP probability
    const momentum = Math.tanh(priceChange / (volatility || 100));
    const upProb = 0.5 + (momentum * 0.2); // Range: 0.3 to 0.7
    return {
      up: Math.max(0.3, Math.min(0.7, upProb)),
      down: 1 - upProb
    };
  }

  calculateKellyFraction(estimatedProb: number, marketPrice: number): number {
    // Kelly formula: f = (p*b - q) / b
    // where b = (1-price)/price (net odds)
    const b = (1 - marketPrice) / marketPrice;
    const q = 1 - estimatedProb;
    const kelly = (estimatedProb * b - q) / b;
    
    return Math.max(0, kelly * this.config.kellyFraction);
  }

  decideBet(
    minutesSinceStart: number,
    priceChange: number,
    volatility: number,
    marketOdds: { upPrice: number; downPrice: number }
  ): { side: 'UP' | 'DOWN' | null; amount: number } {
    
    // Only bet between minutes 3-5 or 8-10
    const validWindow = (minutesSinceStart >= 3 && minutesSinceStart <= 5) ||
                        (minutesSinceStart >= 8 && minutesSinceStart <= 10);
    if (!validWindow) return { side: null, amount: 0 };

    const estimated = this.estimateProbability(priceChange, volatility);
    
    // Calculate edge for each side
    const upEdge = estimated.up - marketOdds.upPrice;
    const downEdge = estimated.down - marketOdds.downPrice;
    
    // Choose side with better edge
    const side = upEdge > downEdge ? 'UP' : 'DOWN';
    const edge = Math.max(upEdge, downEdge);
    const estimatedProb = side === 'UP' ? estimated.up : estimated.down;
    const marketPrice = side === 'UP' ? marketOdds.upPrice : marketOdds.downPrice;

    // Skip if edge too small
    if (edge < this.config.minEdge) {
      return { side: null, amount: 0 };
    }

    // Calculate Kelly bet size
    const kellyFrac = this.calculateKellyFraction(estimatedProb, marketPrice);
    const remainingBudget = this.config.sessionBudget - this.totalBet;
    let betAmount = kellyFrac * remainingBudget;

    // Apply max bet constraint
    betAmount = Math.min(betAmount, remainingBudget * this.config.maxBetPct);
    betAmount = Math.max(0, betAmount);

    this.totalBet += betAmount;

    return { side, amount: betAmount };
  }
}
```

---

## Strategy 2: Volatility Regime Detector

### Theory
Based on volatility clustering research (Mandelbrot, 1963) and GARCH models. High volatility tends to persist, and strategies should adapt to the current regime.

### Logic
1. Measure current volatility (ATR or standard deviation of recent prices)
2. Classify into regime: LOW, MEDIUM, HIGH
3. In HIGH volatility: bet on momentum continuation
4. In LOW volatility: skip or bet contrarian after breakout

### Entry Timing
- **Regime assessment**: Minute 2-3
- **High volatility bet**: Minute 4-6 (ride the wave)
- **Low volatility bet**: Minute 10-12 (after breakout confirms)

### Bet Schedule
```
Regime   | Minute 4-6 | Minute 8-10 | Minute 12
HIGH     | 50%        | 30%         | 20%
MEDIUM   | 30%        | 40%         | 30%
LOW      | 0%         | 30%         | 70% (after breakout)
```

### Risk Management
- **High regime cap**: Max 60% on single side
- **Low regime safety**: Wait for confirmation before betting
- **Regime flip detection**: If regime changes mid-session, pause

### Expected Win Rate
50-54% (regime detection provides timing advantage)

### Weaknesses
- Regime can change mid-15-minutes
- Low volatility may stay low (no payoff)
- False breakouts in low volatility periods

### Code Implementation

```typescript
type VolatilityRegime = 'LOW' | 'MEDIUM' | 'HIGH';

interface VolatilityConfig {
  lowThreshold: number;    // Below this = LOW regime
  highThreshold: number;   // Above this = HIGH regime
  sessionBudget: number;
}

class VolatilityRegimeStrategy {
  private config: VolatilityConfig;
  private priceHistory: number[] = [];
  private totalBet: number = 0;

  constructor(config: VolatilityConfig) {
    this.config = config;
  }

  addPrice(price: number): void {
    this.priceHistory.push(price);
    if (this.priceHistory.length > 30) {
      this.priceHistory.shift(); // Keep last 30 data points
    }
  }

  calculateVolatility(): number {
    if (this.priceHistory.length < 3) return 0;
    
    // Calculate standard deviation of returns
    const returns: number[] = [];
    for (let i = 1; i < this.priceHistory.length; i++) {
      returns.push((this.priceHistory[i] - this.priceHistory[i-1]) / this.priceHistory[i-1]);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100; // As percentage
  }

  detectRegime(): VolatilityRegime {
    const vol = this.calculateVolatility();
    if (vol < this.config.lowThreshold) return 'LOW';
    if (vol > this.config.highThreshold) return 'HIGH';
    return 'MEDIUM';
  }

  decideBet(
    minutesSinceStart: number,
    currentPrice: number,
    openPrice: number
  ): { side: 'UP' | 'DOWN' | null; amount: number } {
    
    const regime = this.detectRegime();
    const priceChange = currentPrice - openPrice;
    const direction = priceChange > 0 ? 'UP' : 'DOWN';
    const remainingBudget = this.config.sessionBudget - this.totalBet;

    let betAmount = 0;
    let side: 'UP' | 'DOWN' | null = null;

    if (regime === 'HIGH') {
      // Momentum strategy - bet with the trend
      if (minutesSinceStart >= 4 && minutesSinceStart <= 6) {
        betAmount = remainingBudget * 0.5;
        side = direction;
      } else if (minutesSinceStart >= 8 && minutesSinceStart <= 10) {
        betAmount = remainingBudget * 0.3;
        side = direction;
      }
    } else if (regime === 'MEDIUM') {
      // Balanced approach
      if (minutesSinceStart >= 4 && minutesSinceStart <= 6) {
        betAmount = remainingBudget * 0.3;
        side = direction;
      } else if (minutesSinceStart >= 8 && minutesSinceStart <= 10) {
        betAmount = remainingBudget * 0.4;
        side = direction;
      }
    } else { // LOW regime
      // Wait for breakout confirmation late in session
      if (minutesSinceStart >= 10 && minutesSinceStart <= 12) {
        const breakoutOccurred = Math.abs(priceChange) > (openPrice * 0.001); // 0.1% move
        if (breakoutOccurred) {
          betAmount = remainingBudget * 0.7;
          side = direction;
        }
      }
    }

    if (betAmount > 0) {
      this.totalBet += betAmount;
    }

    return { side, amount: betAmount };
  }
}
```

---

## Strategy 3: RSI Divergence Hunter

### Theory
Based on Relative Strength Index (Wilder, 1978) and divergence trading. When price makes new highs but RSI doesn't, it signals weakening momentum and potential reversal.

### Logic
1. Calculate short-term RSI (5-period for 15-min window)
2. Track price highs/lows and RSI highs/lows
3. Detect divergence: price trending one way, RSI trending opposite
4. Bet AGAINST the current price trend when divergence detected

### Entry Timing
- **Divergence detection**: Minutes 5-10 (need enough data)
- **Confirmation**: Wait for RSI to start reversing
- **Entry**: Minute 7-12 when divergence confirmed

### Bet Schedule
```
Signal Strength    | Bet Size
Strong divergence  | 60% of budget
Moderate divergence| 40% of budget
Weak divergence    | 20% of budget
No divergence      | Follow momentum (30%)
```

### Risk Management
- **Max contrarian bet**: 60% (divergence can fail)
- **Confirmation required**: RSI must start moving toward mean
- **Time stop**: If no resolution by minute 13, reduce position

### Expected Win Rate
48-52% (divergence is contrarian, lower base rate but higher payoff)

### Weaknesses
- Divergence can persist (trend continues despite divergence)
- Short timeframe may not show clear divergence
- RSI calculation needs continuous price data

### Code Implementation

```typescript
interface RSIDivergenceConfig {
  rsiPeriod: number;
  overboughtThreshold: number;
  oversoldThreshold: number;
  sessionBudget: number;
}

class RSIDivergenceStrategy {
  private config: RSIDivergenceConfig;
  private priceData: { price: number; timestamp: number }[] = [];
  private rsiHistory: number[] = [];
  private totalBet: number = 0;

  constructor(config: RSIDivergenceConfig) {
    this.config = config;
  }

  addPricePoint(price: number, timestamp: number): void {
    this.priceData.push({ price, timestamp });
    if (this.priceData.length > this.config.rsiPeriod + 10) {
      this.priceData.shift();
    }
    this.calculateRSI();
  }

  private calculateRSI(): void {
    if (this.priceData.length < this.config.rsiPeriod + 1) return;

    let gains = 0;
    let losses = 0;
    
    for (let i = this.priceData.length - this.config.rsiPeriod; i < this.priceData.length; i++) {
      const change = this.priceData[i].price - this.priceData[i-1].price;
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / this.config.rsiPeriod;
    const avgLoss = losses / this.config.rsiPeriod;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    this.rsiHistory.push(rsi);
    if (this.rsiHistory.length > 20) this.rsiHistory.shift();
  }

  detectDivergence(): 'BULLISH' | 'BEARISH' | null {
    if (this.priceData.length < 8 || this.rsiHistory.length < 5) return null;

    const recentPrices = this.priceData.slice(-5).map(p => p.price);
    const recentRSI = this.rsiHistory.slice(-5);

    const priceTrend = recentPrices[4] - recentPrices[0];
    const rsiTrend = recentRSI[4] - recentRSI[0];

    // Bullish divergence: Price making lower lows, RSI making higher lows
    if (priceTrend < 0 && rsiTrend > 0 && recentRSI[4] < this.config.oversoldThreshold + 20) {
      return 'BULLISH';
    }

    // Bearish divergence: Price making higher highs, RSI making lower highs
    if (priceTrend > 0 && rsiTrend < 0 && recentRSI[4] > this.config.overboughtThreshold - 20) {
      return 'BEARISH';
    }

    return null;
  }

  getDivergenceStrength(): 'STRONG' | 'MODERATE' | 'WEAK' {
    if (this.rsiHistory.length < 5) return 'WEAK';
    
    const rsi = this.rsiHistory[this.rsiHistory.length - 1];
    
    if (rsi > this.config.overboughtThreshold || rsi < this.config.oversoldThreshold) {
      return 'STRONG';
    }
    if (rsi > this.config.overboughtThreshold - 10 || rsi < this.config.oversoldThreshold + 10) {
      return 'MODERATE';
    }
    return 'WEAK';
  }

  decideBet(
    minutesSinceStart: number,
    currentPrice: number,
    openPrice: number
  ): { side: 'UP' | 'DOWN' | null; amount: number } {
    
    // Only look for divergence after minute 5
    if (minutesSinceStart < 5 || minutesSinceStart > 12) {
      return { side: null, amount: 0 };
    }

    const divergence = this.detectDivergence();
    const strength = this.getDivergenceStrength();
    const remainingBudget = this.config.sessionBudget - this.totalBet;

    // Bet size based on divergence strength
    const betPct = {
      'STRONG': 0.6,
      'MODERATE': 0.4,
      'WEAK': 0.2
    };

    if (divergence === 'BULLISH') {
      const amount = remainingBudget * betPct[strength];
      this.totalBet += amount;
      return { side: 'UP', amount };
    }

    if (divergence === 'BEARISH') {
      const amount = remainingBudget * betPct[strength];
      this.totalBet += amount;
      return { side: 'DOWN', amount };
    }

    // No divergence - follow momentum weakly
    if (minutesSinceStart >= 7) {
      const direction = currentPrice > openPrice ? 'UP' : 'DOWN';
      const amount = remainingBudget * 0.3;
      this.totalBet += amount;
      return { side: direction, amount };
    }

    return { side: null, amount: 0 };
  }
}
```

---

## Strategy 4: Market Odds Arbitrage

### Theory
Based on prediction market microstructure. When market prices deviate significantly from a fair probability model, there's an arbitrage-like opportunity.

### Logic
1. Build a probability model from multiple inputs (BTC price, momentum, volatility)
2. Compare our "fair" probability to market price
3. When market price deviates > 10% from our estimate, bet against market
4. Scale bet size by deviation magnitude

### Entry Timing
- **Continuous monitoring**: Minutes 2-13
- **Entry when**: |our_prob - market_prob| > 10%
- **Scale in**: Multiple small bets as mispricing persists

### Bet Schedule
```
Deviation | Entry Timing | Bet Size
10-15%    | Minutes 5-10 | 25% of budget
15-25%    | Minutes 3-12 | 40% of budget
> 25%     | Minutes 2-13 | 60% of budget
```

### Risk Management
- **Max exposure**: 70% of budget total
- **Scaling**: Multiple smaller bets rather than one large
- **Exit logic**: If our probability estimate changes significantly, stop

### Expected Win Rate
53-57% (exploiting market inefficiencies)

### Weaknesses
- Market may have information we don't
- Our probability model may be wrong
- Thin liquidity = wide spreads eating edge

### Code Implementation

```typescript
interface ArbitrageConfig {
  minDeviation: number;     // 0.10 = 10%
  sessionBudget: number;
  maxExposure: number;      // 0.70 = 70%
}

class MarketArbitrageStrategy {
  private config: ArbitrageConfig;
  private priceHistory: number[] = [];
  private totalBet: number = 0;
  private betsPlaced: number = 0;

  constructor(config: ArbitrageConfig) {
    this.config = config;
  }

  addPrice(price: number): void {
    this.priceHistory.push(price);
    if (this.priceHistory.length > 50) this.priceHistory.shift();
  }

  estimateFairProbability(currentPrice: number, openPrice: number): { up: number; down: number } {
    // Multi-factor probability model
    const priceChange = (currentPrice - openPrice) / openPrice;
    
    // Factor 1: Momentum (recent price direction)
    const momentum = this.calculateMomentum();
    
    // Factor 2: Trend consistency
    const trendConsistency = this.calculateTrendConsistency();
    
    // Factor 3: Mean reversion pressure (extreme moves may reverse)
    const reversion = this.calculateReversionPressure(priceChange);
    
    // Combine factors
    const baseProb = 0.5;
    const momentumWeight = 0.4;
    const consistencyWeight = 0.3;
    const reversionWeight = 0.3;
    
    let upProb = baseProb + 
      (momentum * momentumWeight) + 
      (trendConsistency * consistencyWeight * Math.sign(momentum)) -
      (reversion * reversionWeight * Math.sign(priceChange));
    
    // Clamp to realistic range
    upProb = Math.max(0.25, Math.min(0.75, upProb));
    
    return { up: upProb, down: 1 - upProb };
  }

  private calculateMomentum(): number {
    if (this.priceHistory.length < 5) return 0;
    
    const recent = this.priceHistory.slice(-5);
    const returns = [];
    for (let i = 1; i < recent.length; i++) {
      returns.push((recent[i] - recent[i-1]) / recent[i-1]);
    }
    return returns.reduce((a, b) => a + b, 0) / returns.length * 100;
  }

  private calculateTrendConsistency(): number {
    if (this.priceHistory.length < 10) return 0;
    
    const recent = this.priceHistory.slice(-10);
    let upMoves = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i] > recent[i-1]) upMoves++;
    }
    return (upMoves / (recent.length - 1)) - 0.5; // -0.5 to 0.5 range
  }

  private calculateReversionPressure(priceChange: number): number {
    // Larger moves have higher reversion pressure
    return Math.min(1, Math.abs(priceChange) * 50);
  }

  decideBet(
    minutesSinceStart: number,
    currentPrice: number,
    openPrice: number,
    marketOdds: { upPrice: number; downPrice: number }
  ): { side: 'UP' | 'DOWN' | null; amount: number } {
    
    // Check timing windows based on deviation
    if (minutesSinceStart < 2 || minutesSinceStart > 13) {
      return { side: null, amount: 0 };
    }

    // Don't exceed max exposure
    if (this.totalBet >= this.config.sessionBudget * this.config.maxExposure) {
      return { side: null, amount: 0 };
    }

    const fairProb = this.estimateFairProbability(currentPrice, openPrice);
    
    // Calculate deviation from market
    const upDeviation = fairProb.up - marketOdds.upPrice;
    const downDeviation = fairProb.down - marketOdds.downPrice;
    
    // Find best opportunity
    const bestSide = Math.abs(upDeviation) > Math.abs(downDeviation) ? 'UP' : 'DOWN';
    const deviation = bestSide === 'UP' ? upDeviation : downDeviation;
    
    // Only bet if deviation exceeds threshold
    if (deviation < this.config.minDeviation) {
      return { side: null, amount: 0 };
    }

    // Scale bet by deviation magnitude
    let betPct: number;
    if (deviation > 0.25) {
      betPct = 0.25; // 25% per bet when huge deviation
    } else if (deviation > 0.15) {
      betPct = 0.15;
    } else {
      betPct = 0.10;
    }

    const remainingBudget = this.config.sessionBudget - this.totalBet;
    const maxRemaining = this.config.sessionBudget * this.config.maxExposure - this.totalBet;
    const betAmount = Math.min(remainingBudget * betPct, maxRemaining);

    if (betAmount > 0) {
      this.totalBet += betAmount;
      this.betsPlaced++;
    }

    return { side: bestSide, amount: betAmount };
  }
}
```

---

## Strategy 5: Ensemble Consensus

### Theory
Combining multiple weak signals creates a stronger overall signal. This is the principle behind ensemble methods in machine learning and multi-factor models in finance.

### Logic
1. Run multiple sub-strategies simultaneously:
   - Momentum signal
   - Mean reversion signal
   - RSI signal
   - Volatility signal
2. Count "votes" for UP vs DOWN
3. Only bet when consensus is strong (3+ signals agree)
4. Weight bet by consensus strength

### Entry Timing
- **Signal collection**: Minutes 3-5 and 8-10
- **Bet when**: At least 3 of 4 signals agree
- **Strong consensus**: 4/4 signals = larger bet

### Bet Schedule
```
Consensus | Signal Agreement | Bet Size
Weak      | 2/4 or less     | SKIP
Moderate  | 3/4             | 30% of budget
Strong    | 4/4             | 50% of budget
```

### Risk Management
- **No bet without consensus**: Avoid conflicting signals
- **Equal weighting**: Each signal counts equally (no bias)
- **Adaptability**: Signals updated each tick

### Expected Win Rate
54-58% (ensemble reduces noise, improves accuracy)

### Weaknesses
- Slower decision-making (need multiple signals)
- May miss opportunities when signals conflict
- All signals may be wrong in unusual markets

### Code Implementation

```typescript
type Signal = 'UP' | 'DOWN' | 'NEUTRAL';

interface EnsembleConfig {
  sessionBudget: number;
  minConsensus: number;  // 3 = need 3 signals to agree
}

class EnsembleConsensusStrategy {
  private config: EnsembleConfig;
  private priceHistory: number[] = [];
  private totalBet: number = 0;

  constructor(config: EnsembleConfig) {
    this.config = config;
  }

  addPrice(price: number): void {
    this.priceHistory.push(price);
    if (this.priceHistory.length > 50) this.priceHistory.shift();
  }

  // Signal 1: Simple Momentum
  getMomentumSignal(currentPrice: number, openPrice: number): Signal {
    const change = (currentPrice - openPrice) / openPrice;
    if (change > 0.001) return 'UP';    // > 0.1% move up
    if (change < -0.001) return 'DOWN'; // > 0.1% move down
    return 'NEUTRAL';
  }

  // Signal 2: Short-term trend consistency
  getTrendSignal(): Signal {
    if (this.priceHistory.length < 5) return 'NEUTRAL';
    
    const recent = this.priceHistory.slice(-5);
    let upMoves = 0, downMoves = 0;
    
    for (let i = 1; i < recent.length; i++) {
      if (recent[i] > recent[i-1]) upMoves++;
      else if (recent[i] < recent[i-1]) downMoves++;
    }
    
    if (upMoves >= 3) return 'UP';
    if (downMoves >= 3) return 'DOWN';
    return 'NEUTRAL';
  }

  // Signal 3: RSI-based
  getRSISignal(): Signal {
    if (this.priceHistory.length < 8) return 'NEUTRAL';
    
    // Simplified RSI calculation
    const recent = this.priceHistory.slice(-8);
    let gains = 0, losses = 0;
    
    for (let i = 1; i < recent.length; i++) {
      const change = recent[i] - recent[i-1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const rs = losses === 0 ? 100 : gains / losses;
    const rsi = 100 - (100 / (1 + rs));
    
    // RSI interpretation: overbought suggests momentum UP continues
    // oversold suggests momentum DOWN continues
    // (Note: this is momentum interpretation, not contrarian)
    if (rsi > 60) return 'UP';
    if (rsi < 40) return 'DOWN';
    return 'NEUTRAL';
  }

  // Signal 4: Volatility expansion direction
  getVolatilitySignal(): Signal {
    if (this.priceHistory.length < 10) return 'NEUTRAL';
    
    const recent = this.priceHistory.slice(-10);
    const first5 = recent.slice(0, 5);
    const last5 = recent.slice(-5);
    
    const avgFirst = first5.reduce((a, b) => a + b, 0) / 5;
    const avgLast = last5.reduce((a, b) => a + b, 0) / 5;
    
    // Direction of average price movement
    if (avgLast > avgFirst * 1.0005) return 'UP';
    if (avgLast < avgFirst * 0.9995) return 'DOWN';
    return 'NEUTRAL';
  }

  getConsensus(currentPrice: number, openPrice: number): { 
    direction: 'UP' | 'DOWN' | null; 
    strength: number;
  } {
    const signals: Signal[] = [
      this.getMomentumSignal(currentPrice, openPrice),
      this.getTrendSignal(),
      this.getRSISignal(),
      this.getVolatilitySignal()
    ];

    let upVotes = 0, downVotes = 0;
    for (const signal of signals) {
      if (signal === 'UP') upVotes++;
      else if (signal === 'DOWN') downVotes++;
    }

    const maxVotes = Math.max(upVotes, downVotes);
    const direction = upVotes > downVotes ? 'UP' : downVotes > upVotes ? 'DOWN' : null;

    return { direction, strength: maxVotes };
  }

  decideBet(
    minutesSinceStart: number,
    currentPrice: number,
    openPrice: number
  ): { side: 'UP' | 'DOWN' | null; amount: number } {
    
    // Only bet in decision windows
    const validWindow = (minutesSinceStart >= 3 && minutesSinceStart <= 5) ||
                        (minutesSinceStart >= 8 && minutesSinceStart <= 10);
    
    if (!validWindow) return { side: null, amount: 0 };

    const consensus = this.getConsensus(currentPrice, openPrice);

    // Need minimum consensus to bet
    if (consensus.strength < this.config.minConsensus || !consensus.direction) {
      return { side: null, amount: 0 };
    }

    const remainingBudget = this.config.sessionBudget - this.totalBet;
    
    // Scale bet by consensus strength
    const betPct = consensus.strength === 4 ? 0.5 : 0.3;
    const betAmount = remainingBudget * betPct;

    this.totalBet += betAmount;

    return { side: consensus.direction, amount: betAmount };
  }

  // Debug method to see all signals
  debugSignals(currentPrice: number, openPrice: number): void {
    console.log('Signals:', {
      momentum: this.getMomentumSignal(currentPrice, openPrice),
      trend: this.getTrendSignal(),
      rsi: this.getRSISignal(),
      volatility: this.getVolatilitySignal(),
      consensus: this.getConsensus(currentPrice, openPrice)
    });
  }
}
```

---

## Comparison Matrix

| Strategy | Complexity | Win Rate | Risk | Best Market Condition |
|----------|-----------|----------|------|---------------------|
| Adaptive Kelly | High | 52-55% | Medium | Trending with clear edge |
| Volatility Regime | Medium | 50-54% | Medium | Volatile markets |
| RSI Divergence | High | 48-52% | High | Exhausted trends |
| Market Arbitrage | High | 53-57% | Medium | Mispriced markets |
| Ensemble Consensus | Medium | 54-58% | Low | Any condition |

## Implementation Priority

1. **Ensemble Consensus** - Most robust, good starting point
2. **Adaptive Kelly** - Best for position sizing optimization
3. **Volatility Regime** - Adds market condition awareness
4. **Market Arbitrage** - For when other strategies are saturated
5. **RSI Divergence** - Specialized for reversal plays

---

## Next Steps

1. Implement each strategy as a TypeScript class
2. Create a strategy selector/switcher
3. Build backtesting framework using historical data
4. Paper trade for 1 week minimum
5. Deploy with minimal bankroll initially
6. Track and compare strategy performance
