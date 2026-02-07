"""Data fetchers for investor tracker"""

import json
import re
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import xml.etree.ElementTree as ET

from config import CONGRESS_WATCHLIST, HEDGE_FUND_WATCHLIST, MIN_TRANSACTION_SIZE


# Cache for congress trades (populated via browser scraping or manual update)
CONGRESS_CACHE_FILE = "congress_trades_cache.json"


def fetch_congress_trades_capitol() -> List[Dict]:
    """
    Fetch congress trades. 
    Primary: Load from cache file (populated by browser scraping)
    The cache can be updated by running: python fetchers.py update-congress
    """
    from pathlib import Path
    cache_path = Path(__file__).parent / CONGRESS_CACHE_FILE
    
    if cache_path.exists():
        try:
            with open(cache_path, 'r') as f:
                data = json.load(f)
                print(f"Loaded {len(data)} trades from cache")
                return data
        except Exception as e:
            print(f"Error loading cache: {e}")
    
    print("No congress trade cache found.")
    print("Run 'python fetchers.py scrape-congress' to populate via browser.")
    return []


def save_congress_trades(trades: List[Dict]):
    """Save congress trades to cache file"""
    from pathlib import Path
    cache_path = Path(__file__).parent / CONGRESS_CACHE_FILE
    
    with open(cache_path, 'w') as f:
        json.dump(trades, f, indent=2, default=str)
    print(f"Saved {len(trades)} trades to {cache_path}")


def parse_amount_range(amount_str: str) -> tuple:
    """Parse amount range like '$1,001 - $15,000' into (low, high)"""
    if not amount_str:
        return (0, 0)
    
    # Remove $ and commas
    clean = amount_str.replace('$', '').replace(',', '')
    
    # Check for range
    if ' - ' in clean:
        parts = clean.split(' - ')
        try:
            low = int(parts[0].strip())
            high = int(parts[1].strip()) if len(parts) > 1 else low
            return (low, high)
        except ValueError:
            return (0, 0)
    else:
        try:
            val = int(clean.strip())
            return (val, val)
        except ValueError:
            return (0, 0)


def fetch_13f_summary(cik: str, fund_name: str) -> Dict:
    """Fetch 13F filing summary from SEC EDGAR with rate limiting"""
    try:
        from rate_limiter import fetch_13f_data
        data = fetch_13f_data(cik)
        if not data:
            return None
    except ImportError:
        # Fallback without rate limiter
        try:
            cik_padded = cik.lstrip('0').zfill(10)
            url = f"https://data.sec.gov/submissions/CIK{cik_padded}.json"
            
            req = urllib.request.Request(url, headers={
                'User-Agent': 'InvestorTracker/1.0 (investor.tracker@example.com)',
                'Accept': 'application/json'
            })
            
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode())
        except Exception as e:
            print(f"Error fetching 13F for {fund_name}: {e}")
            return None
    
    # Find most recent 13F-HR filing (runs for both rate_limiter and fallback paths)
    if not data:
        return None
    
    filings = data.get('filings', {}).get('recent', {})
    forms = filings.get('form', [])
    accessions = filings.get('accessionNumber', [])
    dates = filings.get('filingDate', [])
    
    for i, form in enumerate(forms[:20]):
        if form in ['13F-HR', '13F-HR/A']:
            return {
                'fund_name': fund_name,
                'cik': cik,
                'company_name': data.get('name', ''),
                'filing_date': dates[i],
                'accession': accessions[i],
                'form': form,
            }
    
    return None


def fetch_all_13f_summaries() -> List[Dict]:
    """Fetch 13F summaries for all watched hedge funds"""
    summaries = []
    
    print("Fetching 13F filings from SEC EDGAR...")
    for fund_name, cik in HEDGE_FUND_WATCHLIST.items():
        print(f"  {fund_name}...", end=" ")
        summary = fetch_13f_summary(cik, fund_name)
        if summary:
            summaries.append(summary)
            print(f"OK ({summary['filing_date']})")
        else:
            print("FAILED")
        
        # Rate limit - SEC asks for 10 req/sec max
        import time
        time.sleep(0.2)
    
    return summaries


def fetch_13f_holdings(cik: str, accession: str, fund_name: str, filing_date: str) -> List[Dict]:
    """Fetch actual holdings from 13F filing XML"""
    holdings = []
    cik_clean = cik.lstrip('0')
    accession_clean = accession.replace('-', '')
    
    try:
        # Try to get the infotable.xml file
        url = f"https://www.sec.gov/Archives/edgar/data/{cik_clean}/{accession_clean}/infotable.xml"
        
        req = urllib.request.Request(url, headers={
            'User-Agent': 'InvestorTracker/1.0 (investor.tracker@example.com)'
        })
        
        with urllib.request.urlopen(req, timeout=60) as response:
            xml_content = response.read().decode()
        
        # Parse XML - try multiple namespace patterns
        root = ET.fromstring(xml_content)
        
        # Find all infoTable elements (try various namespace patterns)
        info_tables = (
            root.findall('.//{http://www.sec.gov/edgar/document/thirteenf/informationtable}infoTable') or
            root.findall('.//infoTable') or
            root.findall('.//{*}infoTable')
        )
        
        for info in info_tables[:50]:  # Limit to top 50 holdings
            def get_text(elem, tags):
                for tag in tags:
                    # Try with namespace
                    el = elem.find(f'{{http://www.sec.gov/edgar/document/thirteenf/informationtable}}{tag}')
                    if el is None:
                        el = elem.find(tag)
                    if el is None:
                        el = elem.find(f'{{*}}{tag}')
                    if el is not None and el.text:
                        return el.text.strip()
                return None
            
            company = get_text(info, ['nameOfIssuer'])
            cusip = get_text(info, ['cusip'])
            value = get_text(info, ['value'])
            
            # Get shares from nested element
            shares_el = info.find('.//{*}sshPrnamt') or info.find('.//sshPrnamt')
            shares = shares_el.text if shares_el is not None else None
            
            if company:
                holding = {
                    'fund_name': fund_name,
                    'cik': cik,
                    'company': company,
                    'cusip': cusip or '',
                    'value_usd': int(value) * 1000 if value else 0,
                    'shares': int(shares) if shares else 0,
                    'filing_date': filing_date,
                }
                holdings.append(holding)
        
        # Sort by value
        holdings.sort(key=lambda x: -x['value_usd'])
            
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"    No infotable.xml found for {fund_name}")
        else:
            print(f"    HTTP Error {e.code} fetching holdings for {fund_name}")
    except Exception as e:
        print(f"    Error fetching 13F holdings: {e}")
    
    return holdings


def filter_notable_trades(trades: List[Dict], days: int = 7) -> List[Dict]:
    """Filter trades to notable ones (recent, significant, watchlist)"""
    cutoff = datetime.now() - timedelta(days=days)
    notable = []
    
    for trade in trades:
        # Check date
        disc_date = trade.get('disclosure_date') or trade.get('transaction_date')
        if disc_date:
            try:
                if isinstance(disc_date, str):
                    trade_date = datetime.strptime(disc_date[:10], '%Y-%m-%d')
                else:
                    trade_date = disc_date
                if trade_date < cutoff:
                    continue
            except ValueError:
                pass
        
        # Check amount (must be significant)
        amount_high = trade.get('amount_high', 0) or 0
        if amount_high < MIN_TRANSACTION_SIZE:
            continue
        
        # Prioritize watchlist members
        politician = trade.get('politician', '')
        trade['is_watchlist'] = any(w.lower() in politician.lower() for w in CONGRESS_WATCHLIST)
        
        # Must have a ticker
        if not trade.get('ticker') or trade.get('ticker') == '--':
            continue
            
        notable.append(trade)
    
    # Sort by watchlist status, then amount
    notable.sort(key=lambda x: (not x.get('is_watchlist'), -(x.get('amount_high') or 0)))
    
    return notable


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'test-13f':
        # Test 13F fetching
        summaries = fetch_all_13f_summaries()
        print(f"\nFetched {len(summaries)} fund summaries")
        
        # Get holdings for first fund
        if summaries:
            s = summaries[0]
            print(f"\nFetching holdings for {s['fund_name']}...")
            holdings = fetch_13f_holdings(s['cik'], s['accession'], s['fund_name'], s['filing_date'])
            print(f"Top holdings ({len(holdings)} total):")
            for h in holdings[:10]:
                print(f"  {h['company'][:30]:30} ${h['value_usd']:>15,}")
    else:
        print("Usage:")
        print("  python fetchers.py test-13f    - Test 13F fetching")
