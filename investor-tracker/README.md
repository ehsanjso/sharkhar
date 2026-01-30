# Investor Tracker

Track Congress trading activity and hedge fund 13F filings for investment research.

## Features

- **Congress Trades**: Scrapes Capitol Trades for recent politician stock trades
- **13F Filings**: Fetches hedge fund holdings from SEC EDGAR
- **Daily Digest**: Generates formatted summaries for Telegram delivery
- **Watchlist Alerts**: Highlights trades by key politicians

## Usage

```bash
# Generate daily digest (prints to stdout and saves to latest_digest.md)
python3 daily_digest.py

# Run the full tracker (fetch + digest)
python3 tracker.py digest

# Test 13F fetching
python3 fetchers.py test-13f
```

## Data Sources

- **Congress Trades**: [Capitol Trades](https://capitoltrades.com) (scraped via browser)
- **13F Filings**: [SEC EDGAR](https://sec.gov/cgi-bin/browse-edgar)

## Files

- `daily_digest.py` - Main digest generator
- `tracker.py` - Full tracker with database support
- `fetchers.py` - Data fetching functions
- `config.py` - Watchlists and configuration
- `database.py` - SQLite database helpers
- `congress_trades_cache.json` - Cached congress trades

## Watchlist

Key politicians tracked (in `config.py`):
- Nancy Pelosi
- Tommy Tuberville
- Dan Crenshaw
- Marjorie Taylor Greene
- Josh Gottheimer
- Michael McCaul

## Updating Congress Data

The congress trade cache is populated via browser scraping. To update:

1. Have Clawdbot open Capitol Trades
2. Extract trade data from the table
3. Save to `congress_trades_cache.json`

## Cron Job

Set up daily digest delivery:
```bash
# Via Clawdbot cron (recommended)
# Runs at 8:00 AM daily
```

## Note

This is for research purposes only. Not financial advice.
