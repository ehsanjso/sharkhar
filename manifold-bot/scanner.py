#!/usr/bin/env python3
"""
Manifold Markets Scanner
Fetches active markets and identifies betting opportunities.
"""

import json
import requests
from datetime import datetime, timezone
from typing import Optional

MANIFOLD_API = "https://api.manifold.markets/v0"

def fetch_markets(limit: int = 50, sort: str = "liquidity") -> list:
    """Fetch markets from Manifold API."""
    params = {
        "limit": limit,
        "sort": sort,
        "filter": "open",
    }
    
    resp = requests.get(f"{MANIFOLD_API}/search-markets", params=params)
    resp.raise_for_status()
    return resp.json()

def get_time_until_close(close_time_ms: Optional[int]) -> tuple:
    """Get human-readable time until market closes."""
    if not close_time_ms:
        return "Unknown", float('inf')
    
    # Handle absurdly far-out dates
    if close_time_ms > 4102444800000:  # Year 2100
        return "10y+", float('inf')
    
    try:
        now = datetime.now(timezone.utc)
        close = datetime.fromtimestamp(close_time_ms / 1000, tz=timezone.utc)
        diff = close - now
        total_seconds = diff.total_seconds()
    except (ValueError, OSError):
        return "Unknown", float('inf')
    
    if total_seconds < 0:
        return "Closed", -1
    
    days = diff.days
    hours = diff.seconds // 3600
    
    if days > 365:
        return f"{days // 365}y", total_seconds
    elif days > 30:
        return f"{days // 30}mo", total_seconds
    elif days > 0:
        return f"{days}d", total_seconds
    elif hours > 0:
        return f"{hours}h", total_seconds
    else:
        minutes = diff.seconds // 60
        return f"{minutes}m", total_seconds

def calculate_edge_score(probability: float) -> float:
    """
    Calculate edge score based on uncertainty.
    Markets closer to 50% have more uncertainty = more potential edge.
    """
    deviation = abs(probability - 0.5)
    edge_score = max(0, 1 - (deviation * 2))
    return edge_score

def scan_markets(limit: int = 30, sort_by: str = "volume", 
                 max_days: int = 60, min_volume: float = 1000) -> list:
    """
    Scan markets and return ranked opportunities.
    
    Args:
        limit: Number of markets to return
        sort_by: "volume", "liquidity", or "edge"
        max_days: Only show markets closing within this many days
        min_volume: Minimum trading volume
    """
    # Map sort options to API params
    api_sort = "24-hour-vol" if sort_by == "volume" else "liquidity"
    markets = fetch_markets(limit=limit * 3, sort=api_sort)
    
    opportunities = []
    
    for market in markets:
        # Only binary markets for now
        if market.get('outcomeType') != 'BINARY':
            continue
        
        # Skip resolved
        if market.get('isResolved'):
            continue
        
        close_time = market.get('closeTime')
        time_left, seconds_left = get_time_until_close(close_time)
        
        # Skip closed or unknown
        if time_left in ["Closed", "Unknown"]:
            continue
        
        # Skip if too far out
        if seconds_left > max_days * 24 * 3600:
            continue
        
        volume = float(market.get('volume', 0) or 0)
        
        # Skip low volume
        if volume < min_volume:
            continue
        
        probability = float(market.get('probability', 0.5))
        edge_score = calculate_edge_score(probability)
        liquidity = float(market.get('totalLiquidity', 0) or 0)
        
        opp = {
            "id": market.get('id'),
            "question": market.get('question', 'Unknown'),
            "creator": market.get('creatorUsername', 'unknown'),
            "close_time": close_time,
            "seconds_left": seconds_left,
            "time_left": time_left,
            "volume": volume,
            "volume_24h": float(market.get('volume24Hours', 0) or 0),
            "liquidity": liquidity,
            "probability": probability,
            "edge_score": edge_score,
            "unique_bettors": market.get('uniqueBettorCount', 0),
            "slug": market.get('slug', ''),
            "url": market.get('url', ''),
        }
        
        opportunities.append(opp)
    
    # Sort based on preference
    if sort_by == "volume":
        opportunities.sort(key=lambda x: x['volume'], reverse=True)
    elif sort_by == "liquidity":
        opportunities.sort(key=lambda x: x['liquidity'], reverse=True)
    elif sort_by == "edge":
        opportunities.sort(key=lambda x: x['edge_score'], reverse=True)
    elif sort_by == "closing_soon":
        opportunities.sort(key=lambda x: x.get('seconds_left', float('inf')))
    
    return opportunities[:limit]

def print_opportunities(opportunities: list):
    """Pretty print opportunities."""
    print(f"\n{'='*80}")
    print(f"MANIFOLD MARKETS OPPORTUNITIES ({len(opportunities)} markets)")
    print(f"{'='*80}\n")
    
    for i, opp in enumerate(opportunities, 1):
        question = opp['question']
        if len(question) > 65:
            question = question[:62] + "..."
        
        prob = opp['probability']
        bar_len = int(prob * 20)
        bar = '#' * bar_len + '-' * (20 - bar_len)
        
        print(f"{i}. {question}")
        print(f"   Closes: {opp['time_left']} | Vol: M${opp['volume']:,.0f} | Liq: M${opp['liquidity']:,.0f}")
        print(f"   YES [{bar}] {prob*100:.1f}%")
        print(f"   NO  [{'-' * (20 - bar_len) + '#' * bar_len}] {(1-prob)*100:.1f}%")
        print(f"   Edge: {opp['edge_score']:.2f} | Bettors: {opp['unique_bettors']} | {opp['url']}")
        print()

def save_opportunities(opportunities: list, filepath: str):
    """Save opportunities to JSON file."""
    with open(filepath, 'w') as f:
        json.dump(opportunities, f, indent=2, default=str)
    print(f"Saved {len(opportunities)} opportunities to {filepath}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Scan Manifold Markets for betting opportunities")
    parser.add_argument("--limit", type=int, default=15, help="Number of markets to show")
    parser.add_argument("--sort", choices=["volume", "liquidity", "edge", "closing_soon"], default="volume")
    parser.add_argument("--max-days", type=int, default=60, help="Max days until close")
    parser.add_argument("--min-volume", type=float, default=1000, help="Min trading volume")
    parser.add_argument("--output", type=str, help="Save to JSON file")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    print("Scanning Manifold Markets...")
    opportunities = scan_markets(
        limit=args.limit, 
        sort_by=args.sort,
        max_days=args.max_days,
        min_volume=args.min_volume
    )
    
    if args.output:
        save_opportunities(opportunities, args.output)
    elif args.json:
        print(json.dumps(opportunities, indent=2, default=str))
    else:
        print_opportunities(opportunities)
