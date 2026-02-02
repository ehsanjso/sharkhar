# 📊 Polymarket Paper Trading Bot

A paper trading bot for Polymarket prediction markets. Scans markets, generates trading signals, manages a simulated portfolio, and tracks performance over time.

**⚠️ This is a simulation tool for learning and strategy testing. No real money is involved.**

## Features

- **Market Scanner** — Find markets close to resolution with configurable filters
- **Signal Generation** — Automated signals based on confidence thresholds and edge detection  
- **Kelly Criterion Sizing** — Position sizing using fractional Kelly for risk management
- **Portfolio Tracking** — Track paper trades, cash balance, P&L, and win rate
- **Auto-Resolution** — Resolves pending bets when markets close

## Installation

```bash
cd polymarket-bot
python3 -m venv venv
source venv/bin/activate
pip install requests
```

## Usage

### Scan Markets
```bash
./polybot scan                    # Quick scan of top markets
./polybot scan --limit 50         # Scan more markets
./polybot scan --max-days 7       # Markets resolving within 7 days
./polybot scan --sort volume      # Sort by volume (default: end_date)
./polybot scan --json             # JSON output
```

### Generate Trading Signals
```bash
./polybot signals                 # Generate signals based on current strategy
./polybot signals --dry-run       # Preview without prompting to execute
./polybot signals --max-bet 0.10  # Max 10% of bankroll per bet
```

### Portfolio Management
```bash
./polybot portfolio               # View current positions and P&L
./polybot history                 # View resolved trade history
./polybot reset --yes             # Reset portfolio (fresh start)
```

### Resolve Pending Bets
```bash
./polybot resolve                 # Check and resolve any completed markets
```

## Project Structure

```
polymarket-bot/
├── polybot          # CLI entry point (wrapper script)
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

Uses the public Polymarket Gamma API (`gamma-api.polymarket.com`) — no authentication required.

## Strategy Overview

The default strategy:
1. Scans for markets resolving soon (configurable window)
2. Identifies markets with potential edge (price vs estimated probability)
3. Sizes bets using quarter-Kelly for conservative risk management
4. Tracks all positions and auto-resolves when markets close

## Example Session

```bash
# Start fresh
./polybot reset --yes

# Scan for opportunities
./polybot scan --max-days 14

# Generate and optionally execute signals
./polybot signals

# Check portfolio
./polybot portfolio

# Later: resolve completed bets
./polybot resolve
./polybot history
```

## License

MIT
