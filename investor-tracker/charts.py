#!/usr/bin/env python3
"""
Chart Generator for Investor Tracker
Uses QuickChart.io API for simple, dependency-free chart generation
"""

import json
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional
import sqlite3

CHART_DIR = Path(__file__).parent / "charts"
DB_PATH = Path(__file__).parent / "backtest.db"


def init_charts():
    """Initialize charts directory"""
    CHART_DIR.mkdir(exist_ok=True)


def generate_quickchart_url(config: dict, width: int = 500, height: int = 300) -> str:
    """Generate QuickChart.io URL for a chart config"""
    base_url = "https://quickchart.io/chart"
    encoded = urllib.parse.quote(json.dumps(config))
    return f"{base_url}?c={encoded}&w={width}&h={height}&bkg=white"


def download_chart(url: str, filename: str) -> Optional[str]:
    """Download chart image and save locally"""
    init_charts()
    filepath = CHART_DIR / filename
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'InvestorTracker/1.0'})
        with urllib.request.urlopen(req, timeout=30) as response:
            with open(filepath, 'wb') as f:
                f.write(response.read())
        return str(filepath)
    except Exception as e:
        print(f"Error downloading chart: {e}")
        return None


def get_portfolio_history() -> List[Dict]:
    """Get portfolio value history from snapshots"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("""SELECT date, total_value, cash, positions_value 
                    FROM daily_snapshots ORDER BY date""")
        rows = c.fetchall()
        conn.close()
        
        return [{'date': r[0], 'total': r[1], 'cash': r[2], 'positions': r[3]} for r in rows]
    except:
        return []


def get_positions_breakdown() -> List[Dict]:
    """Get current positions for pie chart"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT ticker, shares, entry_price FROM positions")
        rows = c.fetchall()
        c.execute("SELECT cash FROM portfolio ORDER BY id DESC LIMIT 1")
        cash = c.fetchone()[0]
        conn.close()
        
        # Get current prices
        from rate_limiter import fetch_stock_price
        positions = []
        for ticker, shares, entry_price in rows:
            price = fetch_stock_price(ticker) or entry_price
            value = shares * price
            positions.append({'ticker': ticker, 'value': round(value, 2)})
        
        positions.append({'ticker': 'Cash', 'value': round(cash, 2)})
        return positions
    except Exception as e:
        print(f"Error getting positions: {e}")
        return []


def get_trade_history_summary() -> Dict:
    """Get trade history for charts"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        
        # Buys and sells by date
        c.execute("""SELECT date(date) as d, action, COUNT(*), SUM(value)
                    FROM trade_history 
                    GROUP BY d, action
                    ORDER BY d""")
        rows = c.fetchall()
        conn.close()
        
        trades_by_date = {}
        for date, action, count, value in rows:
            if date not in trades_by_date:
                trades_by_date[date] = {'buys': 0, 'sells': 0, 'buy_value': 0, 'sell_value': 0}
            if action == 'BUY':
                trades_by_date[date]['buys'] = count
                trades_by_date[date]['buy_value'] = value or 0
            else:
                trades_by_date[date]['sells'] = count
                trades_by_date[date]['sell_value'] = value or 0
        
        return trades_by_date
    except:
        return {}


def create_portfolio_line_chart() -> Optional[str]:
    """Create portfolio value over time line chart"""
    history = get_portfolio_history()
    
    if len(history) < 2:
        # Not enough data - create a simple starting point chart
        today = datetime.now().strftime('%Y-%m-%d')
        history = [
            {'date': today, 'total': 10000}
        ]
    
    labels = [h['date'] for h in history]
    values = [h['total'] for h in history]
    
    # Add starting point if only one data point
    if len(labels) == 1:
        labels = ['Start', labels[0]]
        values = [10000, values[0]]
    
    config = {
        "type": "line",
        "data": {
            "labels": labels,
            "datasets": [{
                "label": "Portfolio Value ($)",
                "data": values,
                "fill": True,
                "borderColor": "#4CAF50",
                "backgroundColor": "rgba(76, 175, 80, 0.1)",
                "tension": 0.3
            }]
        },
        "options": {
            "title": {"display": True, "text": "Portfolio Performance"},
            "plugins": {
                "datalabels": {"display": False}
            }
        }
    }
    
    url = generate_quickchart_url(config, width=600, height=350)
    return download_chart(url, "portfolio_performance.png")


def create_positions_pie_chart() -> Optional[str]:
    """Create pie chart of current positions"""
    positions = get_positions_breakdown()
    
    if not positions:
        return None
    
    labels = [p['ticker'] for p in positions]
    values = [p['value'] for p in positions]
    
    # Generate colors
    colors = [
        '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0',
        '#00BCD4', '#FFEB3B', '#795548', '#607D8B', '#F44336'
    ]
    
    config = {
        "type": "doughnut",
        "data": {
            "labels": labels,
            "datasets": [{
                "data": values,
                "backgroundColor": colors[:len(labels)]
            }]
        },
        "options": {
            "title": {"display": True, "text": "Portfolio Allocation"},
            "plugins": {
                "doughnutlabel": {
                    "labels": [{
                        "text": f"${sum(values):,.0f}",
                        "font": {"size": 20}
                    }]
                }
            }
        }
    }
    
    url = generate_quickchart_url(config, width=400, height=400)
    return download_chart(url, "positions_breakdown.png")


def create_pnl_bar_chart() -> Optional[str]:
    """Create P&L bar chart by position"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT ticker, shares, entry_price FROM positions")
        rows = c.fetchall()
        conn.close()
        
        if not rows:
            return None
        
        from rate_limiter import fetch_stock_price
        
        labels = []
        pnl_values = []
        colors = []
        
        for ticker, shares, entry_price in rows:
            price = fetch_stock_price(ticker) or entry_price
            pnl = (price - entry_price) * shares
            labels.append(ticker)
            pnl_values.append(round(pnl, 2))
            colors.append('#4CAF50' if pnl >= 0 else '#F44336')
        
        config = {
            "type": "bar",
            "data": {
                "labels": labels,
                "datasets": [{
                    "label": "Unrealized P&L ($)",
                    "data": pnl_values,
                    "backgroundColor": colors
                }]
            },
            "options": {
                "title": {"display": True, "text": "Position P&L"},
                "plugins": {
                    "datalabels": {
                        "display": True,
                        "anchor": "end",
                        "align": "top"
                    }
                }
            }
        }
        
        url = generate_quickchart_url(config, width=500, height=300)
        return download_chart(url, "pnl_breakdown.png")
    except Exception as e:
        print(f"Error creating P&L chart: {e}")
        return None


def create_trade_activity_chart() -> Optional[str]:
    """Create bar chart of trading activity"""
    trades = get_trade_history_summary()
    
    if not trades:
        return None
    
    labels = list(trades.keys())[-14:]  # Last 14 days
    buys = [trades.get(d, {}).get('buys', 0) for d in labels]
    sells = [trades.get(d, {}).get('sells', 0) for d in labels]
    
    # Shorten date labels
    labels = [d[5:] for d in labels]  # MM-DD format
    
    config = {
        "type": "bar",
        "data": {
            "labels": labels,
            "datasets": [
                {
                    "label": "Buys",
                    "data": buys,
                    "backgroundColor": "#4CAF50"
                },
                {
                    "label": "Sells",
                    "data": sells,
                    "backgroundColor": "#F44336"
                }
            ]
        },
        "options": {
            "title": {"display": True, "text": "Trading Activity (Last 14 Days)"},
            "scales": {
                "xAxes": [{"stacked": False}],
                "yAxes": [{"stacked": False, "ticks": {"stepSize": 1}}]
            }
        }
    }
    
    url = generate_quickchart_url(config, width=600, height=300)
    return download_chart(url, "trade_activity.png")


def create_congress_activity_chart(trades: List[Dict]) -> Optional[str]:
    """Create chart showing Congress buy/sell activity by ticker"""
    if not trades:
        return None
    
    # Count buys and sells by ticker
    ticker_activity = {}
    for t in trades:
        ticker = t.get('ticker')
        if not ticker:
            continue
        if ticker not in ticker_activity:
            ticker_activity[ticker] = {'buys': 0, 'sells': 0}
        
        if 'purchase' in t.get('transaction_type', '').lower():
            ticker_activity[ticker]['buys'] += 1
        elif 'sale' in t.get('transaction_type', '').lower():
            ticker_activity[ticker]['sells'] += 1
    
    # Sort by total activity
    sorted_tickers = sorted(ticker_activity.items(), 
                           key=lambda x: x[1]['buys'] + x[1]['sells'], 
                           reverse=True)[:10]
    
    labels = [t[0] for t in sorted_tickers]
    buys = [t[1]['buys'] for t in sorted_tickers]
    sells = [-t[1]['sells'] for t in sorted_tickers]  # Negative for visual effect
    
    config = {
        "type": "bar",
        "data": {
            "labels": labels,
            "datasets": [
                {
                    "label": "Buys",
                    "data": buys,
                    "backgroundColor": "#4CAF50"
                },
                {
                    "label": "Sells",
                    "data": sells,
                    "backgroundColor": "#F44336"
                }
            ]
        },
        "options": {
            "title": {"display": True, "text": "Congress Trading Activity by Ticker"},
            "scales": {
                "xAxes": [{"stacked": True}],
                "yAxes": [{"stacked": True}]
            }
        }
    }
    
    url = generate_quickchart_url(config, width=600, height=350)
    return download_chart(url, "congress_activity.png")


def generate_all_charts() -> Dict[str, str]:
    """Generate all charts and return paths"""
    charts = {}
    
    print("Generating portfolio performance chart...")
    path = create_portfolio_line_chart()
    if path:
        charts['performance'] = path
    
    print("Generating positions breakdown chart...")
    path = create_positions_pie_chart()
    if path:
        charts['positions'] = path
    
    print("Generating P&L chart...")
    path = create_pnl_bar_chart()
    if path:
        charts['pnl'] = path
    
    print("Generating trade activity chart...")
    path = create_trade_activity_chart()
    if path:
        charts['activity'] = path
    
    return charts


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        
        if cmd == 'all':
            charts = generate_all_charts()
            print(f"\nGenerated {len(charts)} charts:")
            for name, path in charts.items():
                print(f"  {name}: {path}")
        
        elif cmd == 'performance':
            path = create_portfolio_line_chart()
            print(f"Chart: {path}")
        
        elif cmd == 'positions':
            path = create_positions_pie_chart()
            print(f"Chart: {path}")
        
        elif cmd == 'pnl':
            path = create_pnl_bar_chart()
            print(f"Chart: {path}")
        
        elif cmd == 'activity':
            path = create_trade_activity_chart()
            print(f"Chart: {path}")
        
        else:
            print(f"Unknown command: {cmd}")
    else:
        print("Usage:")
        print("  python charts.py all         - Generate all charts")
        print("  python charts.py performance - Portfolio performance line chart")
        print("  python charts.py positions   - Positions pie chart")
        print("  python charts.py pnl         - P&L bar chart")
        print("  python charts.py activity    - Trade activity chart")
