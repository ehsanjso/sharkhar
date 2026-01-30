#!/usr/bin/env python3
"""
Auto Trader - Automatically execute trades based on Congress activity
Run daily to process new trades and generate reports
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

from backtester import (
    init_backtest_db, execute_buy, execute_sell, 
    take_daily_snapshot, generate_performance_report,
    get_portfolio_state, update_portfolio_value
)
from config import CONGRESS_WATCHLIST

# Strategy parameters
BUY_ON_WATCHLIST_ONLY = False  # If True, only buy when watchlist members trade
MIN_AMOUNT = 15000  # Minimum trade size to follow ($15k+)
HOLD_DAYS = 30  # Sell after this many days if no sell signal


def load_congress_trades():
    """Load congress trades from cache"""
    cache_path = Path(__file__).parent / "congress_trades_cache.json"
    if cache_path.exists():
        with open(cache_path, 'r') as f:
            return json.load(f)
    return []


def get_processed_trades():
    """Get list of already processed trade IDs"""
    processed_path = Path(__file__).parent / "processed_trades.json"
    if processed_path.exists():
        with open(processed_path, 'r') as f:
            return set(json.load(f))
    return set()


def save_processed_trades(processed: set):
    """Save processed trade IDs"""
    processed_path = Path(__file__).parent / "processed_trades.json"
    with open(processed_path, 'w') as f:
        json.dump(list(processed), f)


def generate_trade_id(trade: dict) -> str:
    """Generate unique ID for a trade"""
    return f"{trade.get('politician', '')}_{trade.get('ticker', '')}_{trade.get('disclosure_date', '')}_{trade.get('transaction_type', '')}"


def is_watchlist_member(politician: str) -> bool:
    """Check if politician is on watchlist"""
    return any(w.lower() in politician.lower() for w in CONGRESS_WATCHLIST)


def process_new_trades() -> dict:
    """Process new congress trades and execute orders"""
    init_backtest_db()
    
    trades = load_congress_trades()
    processed = get_processed_trades()
    
    results = {
        'buys_executed': [],
        'sells_executed': [],
        'skipped': [],
        'errors': []
    }
    
    # Get current positions for sell decisions
    state = get_portfolio_state()
    held_tickers = {p['ticker'] for p in state['positions']}
    
    for trade in trades:
        trade_id = generate_trade_id(trade)
        
        # Skip if already processed
        if trade_id in processed:
            continue
        
        ticker = trade.get('ticker')
        if not ticker:
            processed.add(trade_id)
            continue
        
        politician = trade.get('politician', 'Unknown')
        tx_type = trade.get('transaction_type', '').lower()
        amount_high = trade.get('amount_high', 0) or 0
        
        # Check minimum amount
        if amount_high < MIN_AMOUNT and not is_watchlist_member(politician):
            processed.add(trade_id)
            results['skipped'].append({
                'ticker': ticker,
                'reason': f'below_min_amount (${amount_high})',
                'politician': politician
            })
            continue
        
        # Process buy signals
        if 'purchase' in tx_type:
            # Skip if watchlist-only mode and not on watchlist
            if BUY_ON_WATCHLIST_ONLY and not is_watchlist_member(politician):
                processed.add(trade_id)
                results['skipped'].append({
                    'ticker': ticker,
                    'reason': 'not_on_watchlist',
                    'politician': politician
                })
                continue
            
            result = execute_buy(ticker, politician, reason='congress_buy')
            if result['status'] == 'executed':
                results['buys_executed'].append({
                    'ticker': ticker,
                    'politician': politician,
                    'shares': result['shares'],
                    'price': result['price'],
                    'cost': result['cost']
                })
            else:
                results['skipped'].append({
                    'ticker': ticker,
                    'reason': result.get('reason', 'unknown'),
                    'politician': politician
                })
        
        # Process sell signals
        elif 'sale' in tx_type:
            if ticker in held_tickers:
                result = execute_sell(ticker, reason=f'congress_sell_{politician}')
                if result['status'] == 'executed':
                    results['sells_executed'].append({
                        'ticker': ticker,
                        'politician': politician,
                        'shares': result['shares'],
                        'price': result['price'],
                        'pnl': result['pnl']
                    })
                    held_tickers.discard(ticker)
        
        processed.add(trade_id)
    
    save_processed_trades(processed)
    return results


def check_stop_loss_take_profit():
    """Check positions for stop-loss or take-profit triggers"""
    state = update_portfolio_value()
    
    results = {'sells': []}
    
    for pos in state['positions']:
        pnl_pct = pos['pnl_pct']
        
        # Take profit at +20%
        if pnl_pct >= 20:
            result = execute_sell(pos['ticker'], reason='take_profit_20pct')
            if result['status'] == 'executed':
                results['sells'].append({
                    'ticker': pos['ticker'],
                    'reason': 'take_profit',
                    'pnl_pct': pnl_pct
                })
        
        # Stop loss at -15%
        elif pnl_pct <= -15:
            result = execute_sell(pos['ticker'], reason='stop_loss_15pct')
            if result['status'] == 'executed':
                results['sells'].append({
                    'ticker': pos['ticker'],
                    'reason': 'stop_loss',
                    'pnl_pct': pnl_pct
                })
    
    return results


def generate_daily_report(include_charts: bool = True) -> dict:
    """Generate comprehensive daily report with optional charts"""
    # Process new trades first
    trade_results = process_new_trades()
    
    # Check stop loss / take profit
    sl_tp_results = check_stop_loss_take_profit()
    
    # Take daily snapshot
    take_daily_snapshot()
    
    # Generate performance report
    report = generate_performance_report()
    
    # Generate charts
    chart_paths = {}
    if include_charts:
        try:
            from charts import generate_all_charts
            chart_paths = generate_all_charts()
        except Exception as e:
            print(f"Chart generation error: {e}")
    
    lines = [report, ""]
    
    # Add today's activity
    if trade_results['buys_executed'] or trade_results['sells_executed'] or sl_tp_results['sells']:
        lines.append("**Today's Activity:**")
        
        for buy in trade_results['buys_executed']:
            lines.append(f"- BUY {buy['ticker']} ({buy['politician']}) - ${buy['cost']:.0f}")
        
        for sell in trade_results['sells_executed']:
            pnl_sign = "+" if sell['pnl'] >= 0 else ""
            lines.append(f"- SELL {sell['ticker']} ({sell['politician']}) - P&L: {pnl_sign}${sell['pnl']:.0f}")
        
        for sell in sl_tp_results['sells']:
            lines.append(f"- AUTO SELL {sell['ticker']} ({sell['reason']}) @ {sell['pnl_pct']:+.1f}%")
    
    return {
        'text': "\n".join(lines),
        'charts': chart_paths,
        'trades': trade_results,
        'stops': sl_tp_results
    }


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'run':
        results = process_new_trades()
        print(f"Buys: {len(results['buys_executed'])}")
        print(f"Sells: {len(results['sells_executed'])}")
        print(f"Skipped: {len(results['skipped'])}")
        for b in results['buys_executed']:
            print(f"  BUY {b['ticker']} @ ${b['price']}")
    else:
        result = generate_daily_report()
        print(result['text'])
        if result.get('charts'):
            print("\nCharts generated:")
            for name, path in result['charts'].items():
                print(f"  {name}: {path}")
