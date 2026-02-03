#!/usr/bin/env python3
"""
Polymarket Resolution Checker
Checks if markets have resolved and updates bets accordingly.
"""

import requests
from portfolio import get_pending_bets, resolve_bet, Bet, add_to_history

GAMMA_API = "https://gamma-api.polymarket.com"

def fetch_market_by_id(market_id: str) -> dict:
    """Fetch a single market by ID."""
    resp = requests.get(f"{GAMMA_API}/markets/{market_id}")
    if resp.status_code == 404:
        return {}
    resp.raise_for_status()
    return resp.json()

def check_market_resolution(market_id: str) -> tuple[bool, str, str]:
    """
    Check if a market has resolved.
    
    Returns: (is_resolved, winning_outcome, resolution_details)
    """
    market = fetch_market_by_id(market_id)
    
    if not market:
        return False, "", "Market not found"
    
    # Check if closed
    if not market.get('closed'):
        return False, "", "Market still open"
    
    # Get resolution
    winning_outcome = market.get('winningOutcome', '')
    resolution_source = market.get('resolutionSource', '')
    
    if not winning_outcome:
        # Market closed but no winner (void/cancelled?)
        return True, "", f"Market closed without winner: {resolution_source}"
    
    return True, winning_outcome, f"Resolved: {winning_outcome}"

def check_and_resolve_pending_bets() -> list[dict]:
    """
    Check all pending bets and resolve any that are complete.
    
    Returns list of resolution results.
    """
    pending = get_pending_bets()
    results = []
    
    print(f"🔍 Checking {len(pending)} pending bets...")
    
    for bet in pending:
        is_resolved, winning_outcome, details = check_market_resolution(bet.market_id)
        
        if not is_resolved:
            print(f"  ⏳ {bet.id}: Still open")
            continue
        
        # Determine if bet won
        if not winning_outcome:
            # Market voided - return stake
            print(f"  🚫 {bet.id}: Market voided, returning stake")
            # For now, treat as loss but we could handle this differently
            success, msg = resolve_bet(bet.id, won=False, market_outcome="VOIDED")
            results.append({
                "bet_id": bet.id,
                "status": "voided",
                "message": msg,
            })
            continue
        
        # Check if our bet matches the winning outcome
        # We bet on outcome + side (e.g., "Yes" YES or "No" YES)
        # If side is YES and our outcome matches winner, we win
        # If side is NO and our outcome does NOT match winner, we win
        
        if bet.side == "YES":
            won = bet.outcome.lower() == winning_outcome.lower()
        else:  # NO
            won = bet.outcome.lower() != winning_outcome.lower()
        
        success, msg = resolve_bet(bet.id, won=won, market_outcome=winning_outcome)
        
        status_emoji = "✅" if won else "❌"
        print(f"  {status_emoji} {bet.id}: {msg}")
        
        results.append({
            "bet_id": bet.id,
            "status": "won" if won else "lost",
            "winning_outcome": winning_outcome,
            "message": msg,
        })
    
    return results

def get_resolution_summary(results: list[dict]) -> str:
    """Generate summary of resolutions."""
    if not results:
        return "No bets resolved."
    
    won = sum(1 for r in results if r['status'] == 'won')
    lost = sum(1 for r in results if r['status'] == 'lost')
    voided = sum(1 for r in results if r['status'] == 'voided')
    
    summary = f"Resolved {len(results)} bets: {won} won, {lost} lost"
    if voided:
        summary += f", {voided} voided"
    
    return summary

if __name__ == "__main__":
    results = check_and_resolve_pending_bets()
    print(f"\n{get_resolution_summary(results)}")
