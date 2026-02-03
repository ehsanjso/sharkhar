#!/usr/bin/env python3
"""
Manifold Markets Betting Strategy Engine
Generates signals and determines position sizing.
"""

import json
import requests
from dataclasses import dataclass
from typing import Optional
from scanner import fetch_markets, get_time_until_close

MANIFOLD_API = "https://api.manifold.markets/v0"

@dataclass
class Signal:
    market_id: str
    question: str
    side: str  # YES or NO
    probability: float
    confidence: float  # 0-1, how confident we are
    edge: float  # Expected edge percentage
    reason: str
    suggested_amount: float
    url: str

def kelly_fraction(win_prob: float, odds: float, fraction: float = 0.25) -> float:
    """
    Calculate Kelly Criterion bet size (fractional).
    """
    if win_prob <= 0 or win_prob >= 1 or odds <= 1:
        return 0
    
    b = odds - 1
    p = win_prob
    q = 1 - p
    
    kelly = (b * p - q) / b
    return max(0, kelly * fraction)

def analyze_high_confidence_market(market: dict) -> Optional[Signal]:
    """
    Strategy 1: High Confidence Markets
    
    Markets with high probability outcomes (>75%) are likely to resolve
    as expected. We bet with the crowd on these.
    """
    if market.get('outcomeType') != 'BINARY':
        return None
    
    if market.get('isResolved'):
        return None
    
    probability = float(market.get('probability', 0.5))
    
    # Only bet on confident markets (>75% or <25%)
    if probability < 0.75 and probability > 0.25:
        return None
    
    # Determine which side to bet
    if probability >= 0.75:
        side = "YES"
        effective_price = probability
    else:
        side = "NO"
        effective_price = 1 - probability
    
    # Calculate expected return
    expected_return = (1 - effective_price) / effective_price
    
    # Must have decent volume
    volume = float(market.get('volume', 0) or 0)
    if volume < 2000:
        return None
    
    # Check time
    close_time = market.get('closeTime')
    time_left, seconds_left = get_time_until_close(close_time)
    
    if seconds_left <= 0 or seconds_left > 60 * 24 * 3600:
        return None
    
    # Confidence based on volume and probability strength
    vol_factor = min(1, volume / 50000)
    prob_factor = abs(probability - 0.5) * 2
    confidence = (vol_factor + prob_factor) / 2
    
    return Signal(
        market_id=market.get('id', ''),
        question=market.get('question', ''),
        side=side,
        probability=probability,
        confidence=confidence,
        edge=expected_return,
        reason=f"{effective_price*100:.0f}% consensus, M${volume:,.0f} volume. Ends {time_left}.",
        suggested_amount=0,
        url=market.get('url', ''),
    )

def analyze_high_volume_market(market: dict) -> Optional[Signal]:
    """
    Strategy 2: High Volume/Liquidity Markets
    
    Trust the wisdom of the crowd on high-activity markets.
    """
    if market.get('outcomeType') != 'BINARY':
        return None
    
    if market.get('isResolved'):
        return None
    
    volume = float(market.get('volume', 0) or 0)
    liquidity = float(market.get('totalLiquidity', 0) or 0)
    bettors = int(market.get('uniqueBettorCount', 0) or 0)
    
    # Need some activity
    if volume < 10000 or bettors < 20:
        return None
    
    probability = float(market.get('probability', 0.5))
    
    # Need some signal (not 50/50)
    if 0.30 < probability < 0.70:
        return None
    
    # Check time
    close_time = market.get('closeTime')
    time_left, seconds_left = get_time_until_close(close_time)
    
    if seconds_left <= 0 or seconds_left > 60 * 24 * 3600:
        return None
    
    # Determine side
    if probability >= 0.70:
        side = "YES"
        effective_price = probability
    else:
        side = "NO"
        effective_price = 1 - probability
    
    expected_return = (1 - effective_price) / effective_price
    confidence = min(0.75, (volume / 200000) + (bettors / 200))
    
    return Signal(
        market_id=market.get('id', ''),
        question=market.get('question', ''),
        side=side,
        probability=probability,
        confidence=confidence,
        edge=expected_return,
        reason=f"High volume M${volume:,.0f}, {bettors} bettors, {effective_price*100:.0f}% consensus.",
        suggested_amount=0,
        url=market.get('url', ''),
    )

def generate_signals(bankroll: float, max_bet_pct: float = 0.10) -> list[Signal]:
    """
    Generate trading signals based on current markets.
    
    Args:
        bankroll: Current available mana
        max_bet_pct: Maximum percentage of bankroll per bet (default 10%)
    """
    import requests
    
    # Fetch from multiple sources to get variety
    all_markets = []
    
    # High liquidity markets
    all_markets.extend(fetch_markets(limit=50, sort="liquidity"))
    
    # Markets closing soon
    try:
        resp = requests.get(f"{MANIFOLD_API}/search-markets", params={
            'limit': 50,
            'sort': 'close-date',
            'filter': 'open',
        })
        if resp.ok:
            all_markets.extend(resp.json())
    except:
        pass
    
    # High 24h volume
    try:
        resp = requests.get(f"{MANIFOLD_API}/search-markets", params={
            'limit': 50,
            'sort': '24-hour-vol',
            'filter': 'open',
        })
        if resp.ok:
            all_markets.extend(resp.json())
    except:
        pass
    
    signals = []
    seen_ids = set()
    
    for market in all_markets:
        if market.get('id') in seen_ids:
            continue
        
        # Try each strategy
        signal = analyze_high_confidence_market(market)
        if signal:
            signals.append(signal)
            seen_ids.add(market.get('id'))
            continue
        
        signal = analyze_high_volume_market(market)
        if signal:
            signals.append(signal)
            seen_ids.add(market.get('id'))
    
    # Calculate bet sizes - use simplified approach for paper trading
    for signal in signals:
        effective_price = signal.probability if signal.side == "YES" else (1 - signal.probability)
        
        # For paper trading, use confidence-weighted fixed fraction
        # Higher confidence = larger bet
        base_bet = bankroll * max_bet_pct
        confidence_factor = signal.confidence
        
        signal.suggested_amount = round(base_bet * confidence_factor, 0)
        
        # Minimum M$10, maximum based on max_bet_pct
        if signal.suggested_amount < 10:
            signal.suggested_amount = 10
        signal.suggested_amount = min(signal.suggested_amount, bankroll * max_bet_pct)
    
    # Filter and sort
    signals = [s for s in signals if s.suggested_amount > 0]
    signals.sort(key=lambda x: x.edge, reverse=True)
    
    return signals

def print_signals(signals: list[Signal]):
    """Pretty print signals."""
    print(f"\n{'='*70}")
    print(f"MANIFOLD TRADING SIGNALS ({len(signals)} opportunities)")
    print(f"{'='*70}\n")
    
    if not signals:
        print("No signals found.")
        return
    
    for i, signal in enumerate(signals, 1):
        q = signal.question[:55] + "..." if len(signal.question) > 55 else signal.question
        eff_price = signal.probability if signal.side == "YES" else (1 - signal.probability)
        print(f"{i}. {q}")
        print(f"   {signal.side} @ {eff_price:.1%} | Suggested: M${signal.suggested_amount:.0f}")
        print(f"   Confidence: {signal.confidence:.1%} | Edge: {signal.edge*100:.1f}%")
        print(f"   {signal.reason}")
        print(f"   {signal.url}")
        print()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate Manifold trading signals")
    parser.add_argument("--bankroll", type=float, default=500.0, help="Available mana")
    parser.add_argument("--max-bet", type=float, default=0.10, help="Max bet as fraction")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    print(f"Analyzing markets with M${args.bankroll:.0f} bankroll...")
    signals = generate_signals(args.bankroll, args.max_bet)
    
    if args.json:
        print(json.dumps([{
            "market_id": s.market_id,
            "question": s.question,
            "side": s.side,
            "probability": s.probability,
            "confidence": s.confidence,
            "edge": s.edge,
            "reason": s.reason,
            "suggested_amount": s.suggested_amount,
            "url": s.url,
        } for s in signals], indent=2))
    else:
        print_signals(signals)
