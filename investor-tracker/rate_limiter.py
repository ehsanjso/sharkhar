#!/usr/bin/env python3
"""
Rate Limiter & Request Handler
Handles rate limits, retries, caching for all API calls
"""

import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, Callable
import hashlib
import sqlite3

# Configuration
CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DB = CACHE_DIR / "request_cache.db"

# Rate limit settings per domain
RATE_LIMITS = {
    'query1.finance.yahoo.com': {'requests_per_second': 2, 'retry_after': 60},
    'data.sec.gov': {'requests_per_second': 10, 'retry_after': 120},
    'www.sec.gov': {'requests_per_second': 10, 'retry_after': 120},
    'default': {'requests_per_second': 1, 'retry_after': 60}
}

# Retry settings
MAX_RETRIES = 3
INITIAL_BACKOFF = 2  # seconds
MAX_BACKOFF = 120  # seconds

# Cache TTL (seconds)
CACHE_TTL = {
    'price': 300,        # 5 min for current prices
    'price_hist': 86400, # 24h for historical prices
    '13f': 3600,         # 1h for 13F filings
    'default': 1800      # 30 min default
}

# Track last request time per domain
_last_request: Dict[str, float] = {}
_request_counts: Dict[str, int] = {}


def init_cache():
    """Initialize cache directory and database"""
    CACHE_DIR.mkdir(exist_ok=True)
    
    conn = sqlite3.connect(CACHE_DB)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at REAL,
        ttl INTEGER,
        cache_type TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS rate_limit_state (
        domain TEXT PRIMARY KEY,
        blocked_until REAL,
        consecutive_failures INTEGER
    )''')
    conn.commit()
    conn.close()


def get_domain(url: str) -> str:
    """Extract domain from URL"""
    from urllib.parse import urlparse
    return urlparse(url).netloc


def get_cache_key(url: str, params: dict = None) -> str:
    """Generate cache key for a request"""
    key_str = url + (json.dumps(params, sort_keys=True) if params else '')
    return hashlib.md5(key_str.encode()).hexdigest()


def get_cached(key: str) -> Optional[Any]:
    """Get cached response if valid"""
    try:
        conn = sqlite3.connect(CACHE_DB)
        c = conn.cursor()
        c.execute("SELECT value, created_at, ttl FROM cache WHERE key = ?", (key,))
        row = c.fetchone()
        conn.close()
        
        if row:
            value, created_at, ttl = row
            if time.time() - created_at < ttl:
                return json.loads(value)
    except Exception:
        pass
    return None


def set_cached(key: str, value: Any, cache_type: str = 'default'):
    """Cache a response"""
    try:
        ttl = CACHE_TTL.get(cache_type, CACHE_TTL['default'])
        conn = sqlite3.connect(CACHE_DB)
        c = conn.cursor()
        c.execute('''INSERT OR REPLACE INTO cache (key, value, created_at, ttl, cache_type)
                    VALUES (?, ?, ?, ?, ?)''',
                 (key, json.dumps(value), time.time(), ttl, cache_type))
        conn.commit()
        conn.close()
    except Exception:
        pass


def is_rate_limited(domain: str) -> tuple[bool, float]:
    """Check if domain is currently rate limited"""
    try:
        conn = sqlite3.connect(CACHE_DB)
        c = conn.cursor()
        c.execute("SELECT blocked_until FROM rate_limit_state WHERE domain = ?", (domain,))
        row = c.fetchone()
        conn.close()
        
        if row and row[0] > time.time():
            return True, row[0] - time.time()
    except Exception:
        pass
    return False, 0


def set_rate_limited(domain: str, seconds: float):
    """Mark domain as rate limited"""
    try:
        conn = sqlite3.connect(CACHE_DB)
        c = conn.cursor()
        blocked_until = time.time() + seconds
        c.execute('''INSERT OR REPLACE INTO rate_limit_state (domain, blocked_until, consecutive_failures)
                    VALUES (?, ?, COALESCE((SELECT consecutive_failures FROM rate_limit_state WHERE domain = ?), 0) + 1)''',
                 (domain, blocked_until, domain))
        conn.commit()
        conn.close()
    except Exception:
        pass


def clear_rate_limit(domain: str):
    """Clear rate limit for domain after successful request"""
    try:
        conn = sqlite3.connect(CACHE_DB)
        c = conn.cursor()
        c.execute("DELETE FROM rate_limit_state WHERE domain = ?", (domain,))
        conn.commit()
        conn.close()
    except Exception:
        pass


def wait_for_rate_limit(domain: str):
    """Wait to respect rate limits"""
    limits = RATE_LIMITS.get(domain, RATE_LIMITS['default'])
    min_interval = 1.0 / limits['requests_per_second']
    
    last = _last_request.get(domain, 0)
    elapsed = time.time() - last
    
    if elapsed < min_interval:
        sleep_time = min_interval - elapsed
        time.sleep(sleep_time)
    
    _last_request[domain] = time.time()


def fetch_with_retry(
    url: str,
    headers: dict = None,
    cache_type: str = 'default',
    use_cache: bool = True,
    timeout: int = 30
) -> Optional[Dict]:
    """
    Fetch URL with rate limiting, retries, and caching
    
    Returns dict with 'data' or 'error' key
    """
    init_cache()
    domain = get_domain(url)
    cache_key = get_cache_key(url)
    
    # Check cache first
    if use_cache:
        cached = get_cached(cache_key)
        if cached is not None:
            return {'data': cached, 'cached': True}
    
    # Check if rate limited
    is_limited, wait_time = is_rate_limited(domain)
    if is_limited:
        return {
            'error': f'Rate limited. Retry in {wait_time:.0f}s',
            'rate_limited': True,
            'retry_after': wait_time
        }
    
    # Default headers
    if headers is None:
        headers = {}
    if 'User-Agent' not in headers:
        headers['User-Agent'] = 'InvestorTracker/1.0 (github.com/clawdbot)'
    
    # Retry loop with exponential backoff
    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            # Respect rate limit
            wait_for_rate_limit(domain)
            
            req = urllib.request.Request(url, headers=headers)
            
            with urllib.request.urlopen(req, timeout=timeout) as response:
                data = json.loads(response.read().decode())
                
                # Success - cache and return
                clear_rate_limit(domain)
                if use_cache:
                    set_cached(cache_key, data, cache_type)
                
                return {'data': data, 'cached': False}
                
        except urllib.error.HTTPError as e:
            last_error = e
            
            if e.code == 429:  # Too Many Requests
                retry_after = int(e.headers.get('Retry-After', RATE_LIMITS.get(domain, RATE_LIMITS['default'])['retry_after']))
                set_rate_limited(domain, retry_after)
                return {
                    'error': f'Rate limited (429). Retry after {retry_after}s',
                    'rate_limited': True,
                    'retry_after': retry_after
                }
            
            elif e.code == 403:  # Forbidden - might be rate limit or block
                # Exponential backoff
                backoff = min(INITIAL_BACKOFF * (2 ** attempt), MAX_BACKOFF)
                if attempt < MAX_RETRIES - 1:
                    time.sleep(backoff)
                    continue
                else:
                    set_rate_limited(domain, backoff * 2)
                    return {
                        'error': f'Forbidden (403) after {attempt + 1} attempts',
                        'rate_limited': True,
                        'retry_after': backoff * 2
                    }
            
            elif e.code >= 500:  # Server error - retry
                backoff = min(INITIAL_BACKOFF * (2 ** attempt), MAX_BACKOFF)
                if attempt < MAX_RETRIES - 1:
                    time.sleep(backoff)
                    continue
            
            else:
                return {'error': f'HTTP {e.code}: {e.reason}'}
                
        except urllib.error.URLError as e:
            last_error = e
            backoff = min(INITIAL_BACKOFF * (2 ** attempt), MAX_BACKOFF)
            if attempt < MAX_RETRIES - 1:
                time.sleep(backoff)
                continue
        
        except json.JSONDecodeError as e:
            return {'error': f'Invalid JSON response: {e}'}
        
        except Exception as e:
            last_error = e
            backoff = min(INITIAL_BACKOFF * (2 ** attempt), MAX_BACKOFF)
            if attempt < MAX_RETRIES - 1:
                time.sleep(backoff)
                continue
    
    return {'error': f'Failed after {MAX_RETRIES} attempts: {last_error}'}


def fetch_stock_price(ticker: str, use_cache: bool = True) -> Optional[float]:
    """Fetch current stock price with rate limiting"""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d"
    
    result = fetch_with_retry(url, cache_type='price', use_cache=use_cache)
    
    if 'error' in result:
        print(f"Price fetch error for {ticker}: {result['error']}")
        return None
    
    try:
        data = result['data']
        meta = data.get('chart', {}).get('result', [{}])[0].get('meta', {})
        return meta.get('regularMarketPrice')
    except Exception as e:
        print(f"Price parse error for {ticker}: {e}")
        return None


def fetch_13f_data(cik: str, use_cache: bool = True) -> Optional[Dict]:
    """Fetch 13F filing data from SEC with rate limiting"""
    cik_padded = cik.lstrip('0').zfill(10)
    url = f"https://data.sec.gov/submissions/CIK{cik_padded}.json"
    
    result = fetch_with_retry(
        url,
        headers={'Accept': 'application/json'},
        cache_type='13f',
        use_cache=use_cache
    )
    
    if 'error' in result:
        print(f"13F fetch error for CIK {cik}: {result['error']}")
        return None
    
    return result.get('data')


def get_rate_limit_status() -> Dict:
    """Get current rate limit status for all domains"""
    try:
        conn = sqlite3.connect(CACHE_DB)
        c = conn.cursor()
        c.execute("SELECT domain, blocked_until, consecutive_failures FROM rate_limit_state")
        rows = c.fetchall()
        conn.close()
        
        status = {}
        now = time.time()
        for domain, blocked_until, failures in rows:
            remaining = max(0, blocked_until - now)
            status[domain] = {
                'blocked': remaining > 0,
                'remaining_seconds': remaining,
                'consecutive_failures': failures
            }
        return status
    except Exception:
        return {}


def clear_all_rate_limits():
    """Clear all rate limits (use carefully)"""
    try:
        conn = sqlite3.connect(CACHE_DB)
        c = conn.cursor()
        c.execute("DELETE FROM rate_limit_state")
        conn.commit()
        conn.close()
    except Exception:
        pass


def clear_cache(cache_type: str = None):
    """Clear cache (all or by type)"""
    try:
        conn = sqlite3.connect(CACHE_DB)
        c = conn.cursor()
        if cache_type:
            c.execute("DELETE FROM cache WHERE cache_type = ?", (cache_type,))
        else:
            c.execute("DELETE FROM cache")
        conn.commit()
        conn.close()
    except Exception:
        pass


if __name__ == "__main__":
    import sys
    
    init_cache()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python rate_limiter.py status    - Show rate limit status")
        print("  python rate_limiter.py clear     - Clear all rate limits")
        print("  python rate_limiter.py test      - Test price fetching")
        sys.exit(0)
    
    cmd = sys.argv[1]
    
    if cmd == 'status':
        status = get_rate_limit_status()
        if status:
            print("Rate Limit Status:")
            for domain, info in status.items():
                if info['blocked']:
                    print(f"  {domain}: BLOCKED for {info['remaining_seconds']:.0f}s (failures: {info['consecutive_failures']})")
                else:
                    print(f"  {domain}: OK (past failures: {info['consecutive_failures']})")
        else:
            print("No rate limits active")
    
    elif cmd == 'clear':
        clear_all_rate_limits()
        print("Rate limits cleared")
    
    elif cmd == 'test':
        tickers = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'AMZN']
        print("Testing price fetches with rate limiting...")
        for ticker in tickers:
            price = fetch_stock_price(ticker)
            if price:
                print(f"  {ticker}: ${price:.2f}")
            else:
                print(f"  {ticker}: FAILED")
            time.sleep(0.1)  # Small delay between requests
