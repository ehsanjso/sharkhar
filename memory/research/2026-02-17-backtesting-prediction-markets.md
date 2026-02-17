---
type: research
tags: [research, backtesting, trading, polymarket, quantitative]
date: 2026-02-17
---
# Research: Backtesting Frameworks for Prediction Markets

## Summary
Backtesting is essential for validating trading strategies before risking real capital. This research compares Python backtesting frameworks and provides a practical guide for applying them to Polymarket strategies—specifically the BTC/ETH/SOL 5-min and 15-min markets Ehsan's bot trades.

## Why This Matters Now
- Bot audit on Feb 17 revealed **vol-regime** (88.5% win rate) and **ensemble** (76.5%) as top performers
- 16 strategies running across 6 markets = 96 strategy-market combinations to validate
- Paper trading takes days/weeks; backtesting takes minutes
- Historical validation would have prevented the $110 loss from over-betting (Feb 16)

## Key Findings

### Framework Comparison

| Framework | Speed | Complexity | Best For | Pi 5 Friendly? |
|-----------|-------|------------|----------|----------------|
| **VectorBT** | ⚡ Fastest | Medium | 10,000+ strategy variants | ⚠️ ~300-500MB RAM |
| **Backtesting.py** | Fast | Low | Quick prototyping | ✅ ~50-100MB |
| **Backtrader** | Moderate | High | Complex event-driven | ✅ ~100-200MB |
| **QSTrader** | Moderate | High | Portfolio rebalancing | ✅ ~100-150MB |
| **bt** | Moderate | Medium | Composable strategies | ✅ ~100-150MB |

### 🏆 Recommendation: VectorBT for Polymarket

**Why VectorBT wins for this use case:**
1. **Vectorized operations** — Test thousands of strategy parameters in seconds
2. **NumPy/Pandas native** — Works with your existing data structures
3. **Parameter optimization** — Built-in grid search across strategy configs
4. **Numba acceleration** — Near-C performance for custom indicators
5. **Interactive plots** — Plotly dashboards for analysis

**Trade-off:** Higher memory usage, but Pi 5 (8GB) can handle it.

### Installing VectorBT on Pi 5

```bash
# Install with minimal dependencies first
pip install vectorbt

# For full features (may take 10-15 min on Pi)
pip install "vectorbt[full]"

# Lightweight alternative if memory is tight
pip install backtesting
```

## Polymarket Data for Backtesting

### Option 1: CLOB API Historical Data

```python
from py_clob_client.client import ClobClient

client = ClobClient("https://clob.polymarket.com")

# Get market info
markets = client.get_simplified_markets()

# Get price history via timeseries endpoint
# Token ID for BTC 5-min Up: find via markets API
token_id = "YOUR_TOKEN_ID"
last_price = client.get_last_trade_price(token_id)
```

### Option 2: Build Your Own Data Collector

Since the bot already tracks prices via `btc-price.ts`, add historical data saving:

```typescript
// In btc-price.ts - add to existing price tracking
interface PriceRecord {
  timestamp: number;
  price: number;
  marketId: string;
  yesPrice: number;
  noPrice: number;
}

async function savePriceHistory(record: PriceRecord) {
  const date = new Date().toISOString().split('T')[0];
  const file = `./data/prices/${record.marketId}/${date}.jsonl`;
  await fs.appendFile(file, JSON.stringify(record) + '\n');
}
```

### Option 3: Subgraph / On-Chain Data

Polymarket provides a subgraph for historical on-chain data:
- Docs: https://docs.polymarket.com/developers/subgraph/overview
- Use for trade history, resolution data, volume

## Building a Backtesting Pipeline

### Step 1: Data Collection Script

```python
import pandas as pd
import json
from pathlib import Path

def load_price_history(market_id: str, date_range: tuple) -> pd.DataFrame:
    """Load historical prices from JSONL files"""
    data_dir = Path(f"./data/prices/{market_id}")
    records = []
    
    for jsonl_file in data_dir.glob("*.jsonl"):
        with open(jsonl_file) as f:
            for line in f:
                records.append(json.loads(line))
    
    df = pd.DataFrame(records)
    df['datetime'] = pd.to_datetime(df['timestamp'], unit='ms')
    df.set_index('datetime', inplace=True)
    return df.sort_index()
```

### Step 2: Strategy Backtest with VectorBT

```python
import vectorbt as vbt
import numpy as np

# Load data
prices = load_price_history("btc-5min-up", ("2026-01-01", "2026-02-17"))

# Vol-Regime Strategy backtest
def vol_regime_signals(prices, vol_window=20, vol_threshold=1.5):
    """
    Replicate the vol-regime strategy logic:
    - Calculate rolling volatility
    - Bet AGAINST when vol > threshold (mean reversion)
    - Bet WITH when vol < threshold (trend following)
    """
    returns = prices.pct_change()
    vol = returns.rolling(vol_window).std()
    
    # High vol → mean reversion (fade moves)
    entries_fade = vol > vol.mean() * vol_threshold
    
    # Low vol → trend follow
    entries_trend = vol < vol.mean() / vol_threshold
    
    return entries_fade, entries_trend

# Run backtest across multiple parameter combinations
windows = [10, 15, 20, 30]
thresholds = [1.2, 1.5, 1.8, 2.0]

results = []
for w in windows:
    for t in thresholds:
        entries, exits = vol_regime_signals(prices['yesPrice'], w, t)
        pf = vbt.Portfolio.from_signals(
            prices['yesPrice'],
            entries=entries,
            exits=exits,
            init_cash=100,
            fees=0.015,  # 1.5% spread
            freq='5T'    # 5-minute bars
        )
        results.append({
            'window': w,
            'threshold': t,
            'total_return': pf.total_return(),
            'sharpe': pf.sharpe_ratio(),
            'win_rate': pf.trades.win_rate(),
            'max_drawdown': pf.max_drawdown()
        })

results_df = pd.DataFrame(results)
print(results_df.sort_values('total_return', ascending=False))
```

### Step 3: Optimization Heatmap

```python
# Create heatmap of returns by parameters
fig = results_df.pivot('window', 'threshold', 'total_return').vbt.heatmap(
    trace_kwargs=dict(colorbar=dict(title="Total Return"))
)
fig.write_html("optimization_heatmap.html")
```

## Practical Applications for Ehsan's Bot

### 1. Validate Top Strategies
Before funding `vol-regime` and `ensemble` with real money:
```bash
# Run backtest on historical data
python backtest.py --strategy vol-regime --market btc-5min --days 30
```

### 2. Find Optimal Parameters
- Window sizes for moving averages
- Volatility thresholds
- Bet sizing (Kelly criterion validation)
- Entry/exit timing within the 5/15 min window

### 3. Strategy Selection by Market
Different markets may favor different strategies:
```
BTC-5min: vol-regime, breakout (fast mean reversion)
ETH-15min: ensemble (slower moves, more predictable)
SOL-5min: Maybe needs different approach (higher vol)
```

### 4. Walk-Forward Analysis
Test on rolling windows to avoid overfitting:
```python
# Train on 2 weeks, test on 1 week, roll forward
train_days = 14
test_days = 7
for start in pd.date_range('2026-01-01', '2026-02-01', freq='7D'):
    train = prices[start:start + pd.Timedelta(days=train_days)]
    test = prices[start + pd.Timedelta(days=train_days):
                  start + pd.Timedelta(days=train_days+test_days)]
    # Optimize on train, validate on test
```

## Prediction Market-Specific Considerations

### 1. Binary Outcome Structure
Unlike stocks, prediction markets have binary outcomes (Yes/No pays $0 or $1):
```python
# Custom payoff function for prediction markets
def prediction_market_pnl(entry_price, outcome, size):
    if outcome:  # Yes wins
        return (1.0 - entry_price) * size  # Pay $1 per share
    else:
        return -entry_price * size  # Lose entry cost
```

### 2. Time Decay
Markets have fixed resolution times (5 min, 15 min):
```python
# Factor in time remaining
def time_decay_adjustment(minutes_remaining, total_minutes=15):
    # More confidence needed as time runs out
    return 1 + (1 - minutes_remaining / total_minutes) * 0.5
```

### 3. Resolution Risk
Always account for resolution uncertainty:
- Some markets resolve differently than expected
- Factor in ~1-2% resolution risk

### 4. Fee Structure
Polymarket fees for accurate backtesting:
- Spread: ~1.5% (bid-ask)
- Gas: ~$0.04 per round trip (Polygon)
- Min profitable bet: $5 (per profitability.ts analysis)

## Resources

### Documentation
- VectorBT Docs: https://vectorbt.dev/
- Backtesting.py: https://kernc.github.io/backtesting.py/
- Polymarket CLOB API: https://docs.polymarket.com/
- py-clob-client: https://github.com/Polymarket/py-clob-client

### Tools
- `vectorbt` - Main backtesting engine
- `pandas-ta` - Technical indicators
- `py-clob-client` - Polymarket API access
- `plotly` - Interactive visualization

### Related Research
- Feb 16 research: Market Microstructure & Regime Detection
- Bot file: `src/profitability.ts` - Fee calculations
- Bot file: `src/strategy.ts` - Current strategy implementations

## Next Steps

### Immediate (This Week)
1. **Start collecting historical data** — Modify `btc-price.ts` to save JSONL files
2. **Install VectorBT** — `pip install vectorbt` in a venv
3. **Backtest vol-regime** — Validate the 88.5% win rate claim

### Short-term (2 Weeks)
4. **Parameter optimization** — Find optimal window sizes and thresholds
5. **Cross-market analysis** — Which strategies work for BTC vs ETH vs SOL?
6. **Walk-forward validation** — Ensure strategies aren't overfit

### Medium-term (1 Month)
7. **Build automated pipeline** — Daily backtest reports
8. **Strategy rotation** — Auto-enable best strategies per market regime
9. **Risk-adjusted sizing** — Kelly criterion based on backtest win rates

## Code Snippet: Quick Start

```python
#!/usr/bin/env python3
"""Quick backtest for Polymarket strategy validation"""

import vectorbt as vbt
import pandas as pd
import numpy as np

# Load your price data (modify path)
df = pd.read_json('data/btc-5min-prices.jsonl', lines=True)
df['datetime'] = pd.to_datetime(df['timestamp'], unit='ms')
df.set_index('datetime', inplace=True)
price = df['yesPrice']

# Simple mean reversion (fade the move)
returns = price.pct_change()
entries = returns < -0.02  # Buy dips > 2%
exits = returns > 0.01     # Sell on 1% bounce

# Backtest
pf = vbt.Portfolio.from_signals(
    price, entries, exits,
    init_cash=100,
    fees=0.015,
    freq='5T'
)

# Results
print("=== Backtest Results ===")
print(f"Total Return: {pf.total_return():.1%}")
print(f"Win Rate: {pf.trades.win_rate():.1%}")
print(f"Sharpe Ratio: {pf.sharpe_ratio():.2f}")
print(f"Max Drawdown: {pf.max_drawdown():.1%}")
print(f"Total Trades: {pf.trades.count()}")

# Save plot
pf.plot().write_html('backtest_results.html')
```

---

*Research completed: Feb 17, 2026*
*Time spent: ~30 minutes*
*Confidence: High — frameworks well-documented, practical path clear*
