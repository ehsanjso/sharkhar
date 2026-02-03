#!/usr/bin/env python3
"""
Polymarket Betting Strategy Engine
Generates signals and determines position sizing.
"""

import json
from dataclasses import dataclass
from typing import Optional
from scanner import scan_markets, fetch_markets, parse_outcomes_and_prices, parse_end_date, get_time_until_resolution

@dataclass
class Signal:
    market_id: str
    question: str
    outcome: str
    side: str  # YES or NO
    price: float
    confidence: float  # 0-1, how confident we are
    edge: float  # Expected edge percentage
    reason: str
    suggested_amount: float
    url: str

def kelly_fraction(win_prob: float, odds: float, fraction: float = 0.25) -> float:
    """
    Calculate Kelly Criterion bet size (fractional).
    
    Args:
        win_prob: Estimated probability of winning (0-1)
        odds: Decimal odds (e.g., 2.0 for even money)
        fraction: Fraction of Kelly to use (0.25 = quarter Kelly for safety)
    
    Returns:
        Fraction of bankroll to bet
    """
    if win_prob <= 0 or win_prob >= 1 or odds <= 1:
        return 0
    
    # Kelly formula: f* = (bp - q) / b
    # where b = odds - 1, p = win probability, q = 1 - p
    b = odds - 1
    p = win_prob
    q = 1 - p
    
    kelly = (b * p - q) / b
    
    # Never bet negative, and use fractional Kelly for safety
    return max(0, kelly * fraction)

def calculate_implied_edge(our_prob: float, market_prob: float) -> float:
    """Calculate our edge vs market price."""
    if market_prob <= 0:
        return 0
    return (our_prob - market_prob) / market_prob

def analyze_close_to_resolution(market: dict) -> Optional[Signal]:
    """
    Strategy 1: Close to Resolution
    
    Markets about to resolve with high probability outcomes are likely
    to pay out. If market is 90% YES and resolves YES, we make 11% return.
    
    Edge: Markets near resolution often have "certain" outcomes priced in.
    """
    end_date = parse_end_date(market.get('endDate'))
    time_left, seconds_left = get_time_until_resolution(end_date)
    
    # Look at markets ending within 14 days
    if seconds_left > 14 * 24 * 3600 or seconds_left < 0:
        return None
    
    prices = parse_outcomes_and_prices(market)
    if not prices:
        return None
    
    # Find the highest probability outcome
    best = max(prices, key=lambda x: x['price'])
    
    # Only bet on confident markets (>75%)
    if best['price'] < 0.75:
        return None
    
    # Our edge: We believe the market is correct
    # Return = (1 - price) / price
    expected_return = (1 - best['price']) / best['price']
    
    # Must have decent volume
    volume = float(market.get('volume', 0) or 0)
    if volume < 5000:
        return None
    
    # Calculate confidence based on price and time
    # Higher price + less time = more confidence
    time_factor = max(0.3, 1 - seconds_left / (14 * 24 * 3600))
    confidence = best['price'] * time_factor
    
    return Signal(
        market_id=market.get('id', ''),
        question=market.get('question', ''),
        outcome=best['name'],
        side="YES",
        price=best['price'],
        confidence=confidence,
        edge=expected_return,
        reason=f"Ends in {time_left}, {best['price']*100:.0f}% probability. {expected_return*100:.1f}% potential return.",
        suggested_amount=0,  # Will be calculated later
        url=f"https://polymarket.com/event/{market.get('slug', '')}",
    )

def analyze_high_volume_movement(market: dict) -> Optional[Signal]:
    """
    Strategy 2: High Volume Markets
    
    Markets with high liquidity and volume are more efficient.
    Trust the crowd on these.
    """
    volume = float(market.get('volume', 0) or 0)
    liquidity = float(market.get('liquidity', 0) or 0)
    
    # Only high volume markets
    if volume < 50000 or liquidity < 5000:
        return None
    
    prices = parse_outcomes_and_prices(market)
    if not prices:
        return None
    
    # Get dominant outcome
    best = max(prices, key=lambda x: x['price'])
    
    # Need strong signal (>65%)
    if best['price'] < 0.65:
        return None
    
    end_date = parse_end_date(market.get('endDate'))
    time_left, seconds_left = get_time_until_resolution(end_date)
    
    # Must resolve within 30 days
    if seconds_left > 30 * 24 * 3600 or seconds_left < 0:
        return None
    
    expected_return = (1 - best['price']) / best['price']
    confidence = min(0.8, (volume / 500000) * best['price'])
    
    return Signal(
        market_id=market.get('id', ''),
        question=market.get('question', ''),
        outcome=best['name'],
        side="YES",
        price=best['price'],
        confidence=confidence,
        edge=expected_return,
        reason=f"High volume (${volume:,.0f}), {best['price']*100:.0f}% consensus. Ends {time_left}.",
        suggested_amount=0,
        url=f"https://polymarket.com/event/{market.get('slug', '')}",
    )

def generate_signals(bankroll: float, max_bet_pct: float = 0.15) -> list[Signal]:
    """
    Generate trading signals based on current markets.
    
    Args:
        bankroll: Current available cash
        max_bet_pct: Maximum percentage of bankroll per bet (default 15%)
    """
    markets = fetch_markets(limit=100)
    signals = []
    
    for market in markets:
        if market.get('closed'):
            continue
        
        # Try each strategy
        signal = analyze_close_to_resolution(market)
        if signal:
            signals.append(signal)
            continue
        
        signal = analyze_high_volume_movement(market)
        if signal:
            signals.append(signal)
    
    # Calculate bet sizes using Kelly
    for signal in signals:
        # Assume our confidence = our probability estimate
        odds = 1 / signal.price  # Convert price to odds
        kelly = kelly_fraction(signal.confidence, odds, fraction=0.25)
        
        # Cap at max_bet_pct of bankroll
        bet_fraction = min(kelly, max_bet_pct)
        signal.suggested_amount = round(bankroll * bet_fraction, 2)
        
        # Minimum bet $1
        if signal.suggested_amount < 1:
            signal.suggested_amount = 0
    
    # Filter out zero-amount signals and sort by edge
    signals = [s for s in signals if s.suggested_amount > 0]
    signals.sort(key=lambda x: x.edge, reverse=True)
    
    return signals

def print_signals(signals: list[Signal]):
    """Pretty print signals."""
    print(f"\n{'='*70}")
    print(f"🎯 TRADING SIGNALS ({len(signals)} opportunities)")
    print(f"{'='*70}\n")
    
    if not signals:
        print("No signals found. Markets may be too uncertain or far from resolution.")
        return
    
    for i, signal in enumerate(signals, 1):
        q = signal.question[:55] + "..." if len(signal.question) > 55 else signal.question
        print(f"{i}. {q}")
        print(f"   📍 {signal.outcome} {signal.side} @ {signal.price:.2%}")
        print(f"   💰 Suggested: ${signal.suggested_amount:.2f} | Edge: {signal.edge*100:.1f}%")
        print(f"   🧠 Confidence: {signal.confidence:.1%}")
        print(f"   📝 {signal.reason}")
        print(f"   🔗 {signal.url}")
        print()

def get_signals_json(bankroll: float) -> str:
    """Get signals as JSON string."""
    signals = generate_signals(bankroll)
    return json.dumps([{
        "market_id": s.market_id,
        "question": s.question,
        "outcome": s.outcome,
        "side": s.side,
        "price": s.price,
        "confidence": s.confidence,
        "edge": s.edge,
        "reason": s.reason,
        "suggested_amount": s.suggested_amount,
        "url": s.url,
    } for s in signals], indent=2)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate Polymarket trading signals")
    parser.add_argument("--bankroll", type=float, default=50.0, help="Available bankroll")
    parser.add_argument("--max-bet", type=float, default=0.15, help="Max bet as fraction of bankroll")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    args = parser.parse_args()
    
    print(f"🔍 Analyzing markets with ${args.bankroll:.2f} bankroll...")
    signals = generate_signals(args.bankroll, args.max_bet)
    
    if args.json:
        print(get_signals_json(args.bankroll))
    else:
        print_signals(signals)
