# Polymarket Crypto Candle Bot

Automated trading bot for Polymarket's crypto candle markets (BTC, ETH, multiple timeframes).

## 🆕 Multi-Asset Mode

Now supports:
- **Multiple assets**: BTC, ETH (extensible to SOL, etc.)
- **Multiple timeframes**: 5min, 15min, 1hr, 4hr, 1day
- **News research**: Uses Tavily AI to analyze market sentiment
- **Parallel sessions**: Trade multiple markets simultaneously

### Quick Start (Multi-Asset)

```bash
# BTC + ETH, all timeframes (dry run)
npm run multi:all

# Just BTC 15-minute markets
npm run multi:btc

# Custom configuration
npx tsx src/start-multi.ts --assets BTC,ETH --timeframes 5min,15min --live
```

---

## Original BTC 15-Minute Bot

Automated trading bot for Polymarket's 15-minute BTC up/down markets.

## Strategy

Every 15 minutes, Polymarket asks: "Will BTC be up or down from the open?"

### Entry Logic
- ~60 seconds into the market, pick UP or DOWN based on:
  - BTC price movement from open
  - Market odds (probability)
- Once locked, no flipping

### Scaling In
Spread $40 across 4 timed bets:
| Minute | Amount | Condition |
|--------|--------|-----------|
| 1      | $5     | Prob ≥ 60% |
| 4      | $10    | Prob ≥ 60% |
| 7      | $15    | Prob ≥ 60% |
| 10     | $10    | Prob ≥ 60% |

### Edge
- All orders are **maker** (zero fees)
- Takers pay ~1.5%

## Example Trade

```
BTC drops $20 in first minute → pick DOWN
Buy 8 shares at $0.62 = $5.00
Market stays below open → fills #2, #3, #4 fire
Total: 65 shares for $38

BTC closes below open ✅
65 shares × $1 = $65 payout
Profit: +$27

(If BTC reversed → $0 payout → -$38 loss)
```

## Historical Results
- 47 markets, 14 hours
- **77% win rate**
- **+$170 P&L** on $1,460 wagered

## Setup

```bash
cp .env.example .env
# Add your private key and configure

npm install
```

## Finding Markets

The 15-minute BTC candle markets may not appear in the standard API. To find them:

### 1. Search existing markets
```bash
npx tsx src/find-markets.ts
```

### 2. Check Polymarket directly
Visit [polymarket.com](https://polymarket.com) and search for:
- "BTC up or down"
- "Bitcoin minute"
- "BTC candle"

### 3. Get token IDs from URL
When you find a market, the token IDs are in the market details or URL parameters.

## Usage

### Auto Mode (searches for markets)
```bash
npm start
```

### Manual Mode (with specific token IDs)
```bash
npx tsx src/manual-trade.ts <UP_TOKEN_ID> <DOWN_TOKEN_ID>
```

Example:
```bash
npx tsx src/manual-trade.ts \
  "12345678901234567890123456789012345678901234567890" \
  "09876543210987654321098765432109876543210987654321"
```

## Configuration

```env
PRIVATE_KEY=your_polygon_wallet_private_key
TOTAL_BUDGET=40
MIN_PROBABILITY=0.60
DRY_RUN=true
```

| Variable | Default | Description |
|----------|---------|-------------|
| PRIVATE_KEY | - | Your Polygon wallet private key |
| TOTAL_BUDGET | 40 | Total $ to wager per market |
| MIN_PROBABILITY | 0.60 | Minimum probability to bet |
| BET_MINUTE_1 | 5 | Amount for minute 1 bet |
| BET_MINUTE_4 | 10 | Amount for minute 4 bet |
| BET_MINUTE_7 | 15 | Amount for minute 7 bet |
| BET_MINUTE_10 | 10 | Amount for minute 10 bet |
| DRY_RUN | true | Set to 'false' for live trading |

## Files

```
src/
├── index.ts        # Entry point
├── bot.ts          # Main bot logic
├── polymarket.ts   # Polymarket CLOB client
├── btc-price.ts    # Real-time BTC price tracking
├── strategy.ts     # Trading strategy
├── types.ts        # TypeScript types
├── find-markets.ts # Market discovery utility
└── manual-trade.ts # Manual trading with token IDs
```

## API Reference

### Polymarket APIs Used
- **Gamma API**: Market discovery (`https://gamma-api.polymarket.com`)
- **CLOB API**: Trading (`https://clob.polymarket.com`)
- **RTDS**: Real-time BTC prices (`wss://rtds.polymarket.com`)

### SDK
Uses `@polymarket/clob-client` for authenticated trading.

## Risk Warning

⚠️ **This is experimental software for educational purposes.**

- Trading prediction markets involves significant risk
- Past performance doesn't guarantee future results
- The 77% win rate was from a specific time period
- Always start with DRY_RUN=true
- Never trade more than you can afford to lose
