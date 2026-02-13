# 📈 Manifold Markets Paper Trading Bot

A paper trading bot for [Manifold Markets](https://manifold.markets) prediction markets. Scans markets, generates trading signals, manages a simulated portfolio with mana (M$), and tracks performance over time.

**⚠️ This is a simulation tool for learning and strategy testing. No real mana is involved.**

## Features

- **Market Scanner** — Find markets close to resolution with volume/category filters
- **Signal Generation** — Automated signals based on confidence thresholds and edge detection
- **Kelly Criterion Sizing** — Position sizing using fractional Kelly for risk management
- **Portfolio Tracking** — Track paper trades, mana balance, P&L, and win rate
- **Auto-Resolution** — Resolves pending bets when markets close

## Installation

```bash
cd manifold-bot
python3 -m venv venv
source venv/bin/activate
pip install requests
```

## Usage

### Scan Markets
```bash
./mfbot scan                      # Quick scan of top markets
./mfbot scan --limit 50           # Scan more markets
./mfbot scan --max-days 7         # Markets resolving within 7 days
./mfbot scan --min-volume 100     # Minimum volume filter
./mfbot scan --sort volume        # Sort by volume
./mfbot scan --json               # JSON output
```

### Generate Trading Signals
```bash
./mfbot signals                   # Generate signals based on current strategy
./mfbot signals --dry-run         # Preview without prompting to execute
./mfbot signals --max-bet 0.10    # Max 10% of bankroll per bet
./mfbot signals --json            # JSON output
```

### Place a Bet
```bash
./mfbot bet --market-id <id> --side YES --amount 50 --probability 0.65
./mfbot bet --market-id <id> --side NO --amount 25 --probability 0.30 --notes "Political edge"
```

### Portfolio Management
```bash
./mfbot status                    # View current positions and P&L
./mfbot history                   # View resolved trade history
./mfbot reset --yes               # Reset portfolio (fresh start)
```

### Resolve Pending Bets
```bash
./mfbot resolve                   # Check and resolve any completed markets
```

## Project Structure

```
manifold-bot/
├── mfbot            # CLI entry point (wrapper script)
├── bot.py           # Main bot logic and CLI commands
├── scanner.py       # Market scanning and API integration
├── strategy.py      # Signal generation and Kelly sizing
├── portfolio.py     # Portfolio state management
├── resolver.py      # Bet resolution logic
└── data/
    ├── portfolio.json    # Current positions and cash
    └── history.json      # Resolved trade history
```

## API

Uses the public [Manifold Markets API](https://docs.manifold.markets/api) — no authentication required for reading.

## Strategy Overview

The default strategy:
1. Scans for binary markets resolving soon (configurable window)
2. Identifies markets with potential edge (price vs estimated probability)
3. Sizes bets using quarter-Kelly for conservative risk management
4. Tracks all positions and auto-resolves when markets close

## Differences from Polymarket Bot

| Feature | Manifold | Polymarket |
|---------|----------|------------|
| Currency | Mana (M$) | Simulated USD |
| Markets | User-created, diverse | Curated, political/crypto focus |
| Resolution | Creator or automated | Official sources |
| Starting balance | M$1000 | $10,000 |

## Example Session

```bash
# Start fresh
./mfbot reset --yes

# Scan for opportunities
./mfbot scan --max-days 14

# Generate and optionally execute signals
./mfbot signals

# Check portfolio
./mfbot status

# Later: resolve completed bets
./mfbot resolve
./mfbot history
```

## License

MIT
