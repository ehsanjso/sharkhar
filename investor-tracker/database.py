"""Database management for investor tracker"""

import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "trades.db"


def get_connection():
    """Get database connection"""
    return sqlite3.connect(DB_PATH)


def init_db():
    """Initialize database tables"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Congress trades table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS congress_trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            politician TEXT NOT NULL,
            party TEXT,
            chamber TEXT,
            ticker TEXT NOT NULL,
            company TEXT,
            transaction_type TEXT NOT NULL,
            amount_low INTEGER,
            amount_high INTEGER,
            transaction_date DATE,
            disclosure_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(politician, ticker, transaction_date, transaction_type)
        )
    """)
    
    # 13F hedge fund holdings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fund_holdings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fund_name TEXT NOT NULL,
            cik TEXT NOT NULL,
            ticker TEXT,
            company TEXT NOT NULL,
            cusip TEXT,
            shares INTEGER,
            value_usd INTEGER,
            filing_date DATE,
            report_date DATE,
            change_shares INTEGER,
            change_pct REAL,
            is_new_position BOOLEAN DEFAULT FALSE,
            is_sold_out BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(fund_name, cusip, report_date)
        )
    """)
    
    # Alerts sent (to avoid duplicates)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts_sent (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_type TEXT NOT NULL,
            reference_id TEXT NOT NULL,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(alert_type, reference_id)
        )
    """)
    
    # Performance tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entity_type TEXT NOT NULL,
            entity_name TEXT NOT NULL,
            ticker TEXT NOT NULL,
            entry_date DATE,
            entry_price REAL,
            current_price REAL,
            return_pct REAL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()
    print(f"Database initialized at {DB_PATH}")


def insert_congress_trade(trade: dict) -> bool:
    """Insert a congress trade, return True if new"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO congress_trades 
            (politician, party, chamber, ticker, company, transaction_type, 
             amount_low, amount_high, transaction_date, disclosure_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            trade.get('politician'),
            trade.get('party'),
            trade.get('chamber'),
            trade.get('ticker'),
            trade.get('company'),
            trade.get('transaction_type'),
            trade.get('amount_low'),
            trade.get('amount_high'),
            trade.get('transaction_date'),
            trade.get('disclosure_date'),
        ))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def insert_fund_holding(holding: dict) -> bool:
    """Insert a fund holding, return True if new"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO fund_holdings
            (fund_name, cik, ticker, company, cusip, shares, value_usd,
             filing_date, report_date, change_shares, change_pct, 
             is_new_position, is_sold_out)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            holding.get('fund_name'),
            holding.get('cik'),
            holding.get('ticker'),
            holding.get('company'),
            holding.get('cusip'),
            holding.get('shares'),
            holding.get('value_usd'),
            holding.get('filing_date'),
            holding.get('report_date'),
            holding.get('change_shares'),
            holding.get('change_pct'),
            holding.get('is_new_position', False),
            holding.get('is_sold_out', False),
        ))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def mark_alert_sent(alert_type: str, reference_id: str) -> bool:
    """Mark an alert as sent, return True if new"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR IGNORE INTO alerts_sent (alert_type, reference_id)
            VALUES (?, ?)
        """, (alert_type, reference_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_recent_trades(days: int = 7) -> list:
    """Get recent congress trades"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM congress_trades 
        WHERE disclosure_date >= date('now', ?) 
        ORDER BY disclosure_date DESC
    """, (f'-{days} days',))
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    conn.close()
    return [dict(zip(columns, row)) for row in rows]


def get_recent_fund_changes(days: int = 30) -> list:
    """Get recent significant fund position changes"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM fund_holdings 
        WHERE filing_date >= date('now', ?)
        AND (is_new_position = 1 OR is_sold_out = 1 OR ABS(change_pct) > 20)
        ORDER BY filing_date DESC, value_usd DESC
    """, (f'-{days} days',))
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    conn.close()
    return [dict(zip(columns, row)) for row in rows]


if __name__ == "__main__":
    init_db()
