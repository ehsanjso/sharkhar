#!/usr/bin/env python3
"""
Congress Trade Backtester
Simulates following Congress trades with a $10k portfolio

Strategy: Buy when Congress buys, sell after X days or when they sell
"""

import json
import urllib.request
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import sqlite3

# Configuration
STARTING_CAPITAL = 10000.0
POSITION_SIZE_PCT = 0.10  # 10% of portfolio per trade
MAX_POSITIONS = 10
HOLD_DAYS = 30  # Default hold period if no sell signal

DB_PATH = Path(__file__).parent / "backtest.db"


def init_backtest_db():
    """Initialize backtesting database"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Portfolio state
    c.execute('''CREATE TABLE IF NOT EXISTS portfolio (
        id INTEGER PRIMARY KEY,
        cash REAL,
        total_value REAL,
        updated_at TEXT
    )''')
    
    # Positions (current holdings)
    c.execute('''CREATE TABLE IF NOT EXISTS positions (
        id INTEGER PRIMARY KEY,
        ticker TEXT,
        shares REAL,
        entry_price REAL,
        entry_date TEXT,
        entry_reason TEXT,
        politician TEXT
    )''')
    
    # Trade history
    c.execute('''CREATE TABLE IF NOT EXISTS trade_history (
        id INTEGER PRIMARY KEY,
        ticker TEXT,
        action TEXT,
        shares REAL,
        price REAL,
        value REAL,
        date TEXT,
        reason TEXT,
        politician TEXT,
        pnl REAL
    )''')
    
    # Daily snapshots
    c.execute('''CREATE TABLE IF NOT EXISTS daily_snapshots (
        id INTEGER PRIMARY KEY,
        date TEXT UNIQUE,
        cash REAL,
        positions_value REAL,
        total_value REAL,
        sp500_value REAL,
        positions_json TEXT
    )''')
    
    # Initialize portfolio if empty
    c.execute("SELECT COUNT(*) FROM portfolio")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO portfolio (cash, total_value, updated_at) VALUES (?, ?, ?)",
                 (STARTING_CAPITAL, STARTING_CAPITAL, datetime.now().isoformat()))
    
    conn.commit()
    conn.close()


def get_stock_price(ticker: str) -> Optional[float]:
    """Get current stock price with rate limiting"""
    try:
        from rate_limiter import fetch_stock_price
        return fetch_stock_price(ticker)
    except ImportError:
        # Fallback if rate_limiter not available
        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d"
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0'
            })
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
            
            result = data.get('chart', {}).get('result', [])
            if result:
                meta = result[0].get('meta', {})
                return meta.get('regularMarketPrice')
        except Exception as e:
            print(f"Error fetching price for {ticker}: {e}")
        return None


def get_historical_price(ticker: str, date: str) -> Optional[float]:
    """Get historical stock price for a specific date"""
    try:
        # Convert date to timestamp
        dt = datetime.strptime(date, '%Y-%m-%d')
        start = int((dt - timedelta(days=1)).timestamp())
        end = int((dt + timedelta(days=1)).timestamp())
        
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1={start}&period2={end}&interval=1d"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
        
        result = data.get('chart', {}).get('result', [])
        if result:
            quotes = result[0].get('indicators', {}).get('quote', [{}])[0]
            closes = quotes.get('close', [])
            if closes and closes[0]:
                return closes[0]
    except Exception as e:
        print(f"Error fetching historical price for {ticker} on {date}: {e}")
    return None


def get_portfolio_state() -> Dict:
    """Get current portfolio state"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("SELECT cash, total_value, updated_at FROM portfolio ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    cash = row[0] if row else STARTING_CAPITAL
    
    c.execute("SELECT ticker, shares, entry_price, entry_date, politician FROM positions")
    positions = []
    for row in c.fetchall():
        positions.append({
            'ticker': row[0],
            'shares': row[1],
            'entry_price': row[2],
            'entry_date': row[3],
            'politician': row[4]
        })
    
    conn.close()
    
    return {'cash': cash, 'positions': positions}


def execute_buy(ticker: str, politician: str, reason: str = "congress_buy") -> Dict:
    """Execute a buy order"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get current state
    c.execute("SELECT cash FROM portfolio ORDER BY id DESC LIMIT 1")
    cash = c.fetchone()[0]
    
    # Check if already holding
    c.execute("SELECT COUNT(*) FROM positions WHERE ticker = ?", (ticker,))
    if c.fetchone()[0] > 0:
        conn.close()
        return {'status': 'skipped', 'reason': 'already_holding'}
    
    # Check position count
    c.execute("SELECT COUNT(*) FROM positions")
    if c.fetchone()[0] >= MAX_POSITIONS:
        conn.close()
        return {'status': 'skipped', 'reason': 'max_positions'}
    
    # Get price
    price = get_stock_price(ticker)
    if not price:
        conn.close()
        return {'status': 'error', 'reason': 'no_price'}
    
    # Calculate position size
    position_value = cash * POSITION_SIZE_PCT
    if position_value > cash:
        position_value = cash * 0.9  # Use 90% of remaining cash max
    
    shares = position_value / price
    cost = shares * price
    
    if cost > cash:
        conn.close()
        return {'status': 'skipped', 'reason': 'insufficient_funds'}
    
    # Execute
    new_cash = cash - cost
    now = datetime.now().isoformat()
    
    c.execute("INSERT INTO positions (ticker, shares, entry_price, entry_date, entry_reason, politician) VALUES (?, ?, ?, ?, ?, ?)",
             (ticker, shares, price, now, reason, politician))
    
    c.execute("UPDATE portfolio SET cash = ?, updated_at = ?", (new_cash, now))
    
    c.execute("INSERT INTO trade_history (ticker, action, shares, price, value, date, reason, politician, pnl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
             (ticker, 'BUY', shares, price, cost, now, reason, politician, 0))
    
    conn.commit()
    conn.close()
    
    return {
        'status': 'executed',
        'ticker': ticker,
        'shares': round(shares, 4),
        'price': round(price, 2),
        'cost': round(cost, 2),
        'remaining_cash': round(new_cash, 2)
    }


def execute_sell(ticker: str, reason: str = "take_profit") -> Dict:
    """Execute a sell order"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Get position
    c.execute("SELECT shares, entry_price, entry_date, politician FROM positions WHERE ticker = ?", (ticker,))
    row = c.fetchone()
    if not row:
        conn.close()
        return {'status': 'skipped', 'reason': 'no_position'}
    
    shares, entry_price, entry_date, politician = row
    
    # Get current price
    price = get_stock_price(ticker)
    if not price:
        conn.close()
        return {'status': 'error', 'reason': 'no_price'}
    
    # Calculate P&L
    proceeds = shares * price
    cost_basis = shares * entry_price
    pnl = proceeds - cost_basis
    pnl_pct = (pnl / cost_basis) * 100
    
    # Get current cash
    c.execute("SELECT cash FROM portfolio ORDER BY id DESC LIMIT 1")
    cash = c.fetchone()[0]
    new_cash = cash + proceeds
    
    now = datetime.now().isoformat()
    
    # Remove position
    c.execute("DELETE FROM positions WHERE ticker = ?", (ticker,))
    
    # Update cash
    c.execute("UPDATE portfolio SET cash = ?, updated_at = ?", (new_cash, now))
    
    # Record trade
    c.execute("INSERT INTO trade_history (ticker, action, shares, price, value, date, reason, politician, pnl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
             (ticker, 'SELL', shares, price, proceeds, now, reason, politician, pnl))
    
    conn.commit()
    conn.close()
    
    return {
        'status': 'executed',
        'ticker': ticker,
        'shares': round(shares, 4),
        'price': round(price, 2),
        'proceeds': round(proceeds, 2),
        'pnl': round(pnl, 2),
        'pnl_pct': round(pnl_pct, 2),
        'new_cash': round(new_cash, 2)
    }


def update_portfolio_value() -> Dict:
    """Calculate current portfolio value"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("SELECT cash FROM portfolio ORDER BY id DESC LIMIT 1")
    cash = c.fetchone()[0]
    
    c.execute("SELECT ticker, shares, entry_price FROM positions")
    positions = c.fetchall()
    
    positions_value = 0
    position_details = []
    
    for ticker, shares, entry_price in positions:
        price = get_stock_price(ticker)
        if price:
            value = shares * price
            pnl = value - (shares * entry_price)
            pnl_pct = (pnl / (shares * entry_price)) * 100
            positions_value += value
            position_details.append({
                'ticker': ticker,
                'shares': round(shares, 4),
                'price': round(price, 2),
                'value': round(value, 2),
                'pnl': round(pnl, 2),
                'pnl_pct': round(pnl_pct, 2)
            })
    
    total_value = cash + positions_value
    total_return = ((total_value - STARTING_CAPITAL) / STARTING_CAPITAL) * 100
    
    # Update portfolio
    now = datetime.now().isoformat()
    c.execute("UPDATE portfolio SET total_value = ?, updated_at = ?", (total_value, now))
    conn.commit()
    conn.close()
    
    return {
        'cash': round(cash, 2),
        'positions_value': round(positions_value, 2),
        'total_value': round(total_value, 2),
        'total_return_pct': round(total_return, 2),
        'positions': position_details,
        'updated_at': now
    }


def take_daily_snapshot():
    """Record daily portfolio snapshot"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    state = update_portfolio_value()
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Get S&P 500 for comparison
    sp500_price = get_stock_price('SPY')
    sp500_value = STARTING_CAPITAL  # Would need historical tracking
    
    c.execute('''INSERT OR REPLACE INTO daily_snapshots 
                (date, cash, positions_value, total_value, sp500_value, positions_json)
                VALUES (?, ?, ?, ?, ?, ?)''',
             (today, state['cash'], state['positions_value'], state['total_value'],
              sp500_value, json.dumps(state['positions'])))
    
    conn.commit()
    conn.close()
    
    return state


def get_trade_history(limit: int = 20) -> List[Dict]:
    """Get recent trade history"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    c.execute("""SELECT ticker, action, shares, price, value, date, reason, politician, pnl 
                 FROM trade_history ORDER BY id DESC LIMIT ?""", (limit,))
    
    trades = []
    for row in c.fetchall():
        trades.append({
            'ticker': row[0],
            'action': row[1],
            'shares': round(row[2], 4),
            'price': round(row[3], 2),
            'value': round(row[4], 2),
            'date': row[5],
            'reason': row[6],
            'politician': row[7],
            'pnl': round(row[8], 2) if row[8] else 0
        })
    
    conn.close()
    return trades


def get_performance_summary() -> Dict:
    """Get overall performance summary"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Total trades
    c.execute("SELECT COUNT(*) FROM trade_history WHERE action = 'BUY'")
    total_buys = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM trade_history WHERE action = 'SELL'")
    total_sells = c.fetchone()[0]
    
    # Winning vs losing trades
    c.execute("SELECT COUNT(*) FROM trade_history WHERE action = 'SELL' AND pnl > 0")
    winners = c.fetchone()[0]
    
    c.execute("SELECT COUNT(*) FROM trade_history WHERE action = 'SELL' AND pnl <= 0")
    losers = c.fetchone()[0]
    
    # Total P&L from closed trades
    c.execute("SELECT SUM(pnl) FROM trade_history WHERE action = 'SELL'")
    realized_pnl = c.fetchone()[0] or 0
    
    # Current state
    state = update_portfolio_value()
    
    # Unrealized P&L
    unrealized_pnl = 0
    for pos in state['positions']:
        unrealized_pnl += pos['pnl']
    
    conn.close()
    
    win_rate = (winners / total_sells * 100) if total_sells > 0 else 0
    
    return {
        'starting_capital': STARTING_CAPITAL,
        'current_value': state['total_value'],
        'total_return_pct': state['total_return_pct'],
        'cash': state['cash'],
        'positions_count': len(state['positions']),
        'total_buys': total_buys,
        'total_sells': total_sells,
        'winners': winners,
        'losers': losers,
        'win_rate_pct': round(win_rate, 1),
        'realized_pnl': round(realized_pnl, 2),
        'unrealized_pnl': round(unrealized_pnl, 2),
        'positions': state['positions']
    }


def generate_performance_report() -> str:
    """Generate formatted performance report"""
    perf = get_performance_summary()
    
    lines = []
    lines.append("**Congress Trade Portfolio Report**")
    lines.append(f"_{datetime.now().strftime('%B %d, %Y')}_")
    lines.append("")
    
    # Portfolio summary
    direction = "UP" if perf['total_return_pct'] >= 0 else "DOWN"
    lines.append(f"**Portfolio Value: ${perf['current_value']:,.2f}** ({direction})")
    lines.append(f"Return: {perf['total_return_pct']:+.2f}% (from ${STARTING_CAPITAL:,.0f})")
    lines.append("")
    
    # Stats
    lines.append("**Stats:**")
    lines.append(f"- Cash: ${perf['cash']:,.2f}")
    lines.append(f"- Positions: {perf['positions_count']}")
    lines.append(f"- Trades: {perf['total_buys']} buys, {perf['total_sells']} sells")
    if perf['total_sells'] > 0:
        lines.append(f"- Win Rate: {perf['win_rate_pct']}%")
        lines.append(f"- Realized P&L: ${perf['realized_pnl']:+,.2f}")
    lines.append(f"- Unrealized P&L: ${perf['unrealized_pnl']:+,.2f}")
    lines.append("")
    
    # Current positions
    if perf['positions']:
        lines.append("**Current Positions:**")
        for pos in perf['positions']:
            sign = "+" if pos['pnl'] >= 0 else ""
            lines.append(f"- **{pos['ticker']}** ${pos['value']:,.0f} ({sign}{pos['pnl_pct']:.1f}%)")
    
    return "\n".join(lines)


if __name__ == "__main__":
    import sys
    
    init_backtest_db()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python backtester.py status     - Show portfolio status")
        print("  python backtester.py buy TICKER - Buy a stock")
        print("  python backtester.py sell TICKER - Sell a stock")
        print("  python backtester.py report     - Generate report")
        print("  python backtester.py snapshot   - Take daily snapshot")
        sys.exit(0)
    
    cmd = sys.argv[1].lower()
    
    if cmd == 'status':
        state = update_portfolio_value()
        print(f"Cash: ${state['cash']:,.2f}")
        print(f"Positions Value: ${state['positions_value']:,.2f}")
        print(f"Total Value: ${state['total_value']:,.2f}")
        print(f"Return: {state['total_return_pct']:+.2f}%")
        print(f"\nPositions:")
        for p in state['positions']:
            print(f"  {p['ticker']}: {p['shares']:.4f} shares @ ${p['price']:.2f} = ${p['value']:.2f} ({p['pnl_pct']:+.1f}%)")
    
    elif cmd == 'buy' and len(sys.argv) >= 3:
        ticker = sys.argv[2].upper()
        politician = sys.argv[3] if len(sys.argv) > 3 else "manual"
        result = execute_buy(ticker, politician)
        print(json.dumps(result, indent=2))
    
    elif cmd == 'sell' and len(sys.argv) >= 3:
        ticker = sys.argv[2].upper()
        result = execute_sell(ticker)
        print(json.dumps(result, indent=2))
    
    elif cmd == 'report':
        print(generate_performance_report())
    
    elif cmd == 'snapshot':
        state = take_daily_snapshot()
        print(f"Snapshot taken: ${state['total_value']:,.2f}")
    
    elif cmd == 'history':
        trades = get_trade_history()
        for t in trades:
            print(f"{t['date'][:10]} {t['action']} {t['ticker']} {t['shares']:.2f}@${t['price']:.2f} P&L:${t['pnl']:.2f}")
    
    else:
        print(f"Unknown command: {cmd}")
