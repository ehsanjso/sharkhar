#!/usr/bin/env python3
"""
Manifold Markets Resolution Checker
Checks if markets have resolved and updates bets accordingly.
"""

import requests
from portfolio import get_pending_bets, resolve_bet, add_to_history

MANIFOLD_API = "https://api.manifold.markets/v0"

def fetch_market_by_id(market_id: str) -> dict:
    """Fetch a single market by ID."""
    resp = requests.get(f"{MANIFOLD_API}/market/{market_id}")
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
    
    if not market.get('isResolved'):
        return False, "", "Market still open"
    
    resolution = market.get('resolution', '')
    
    if resolution == 'YES':
        return True, "YES", "Resolved YES"
    elif resolution == 'NO':
        return True, "NO", "Resolved NO"
    elif resolution == 'CANCEL':
        return True, "CANCEL", "Market cancelled"
    elif resolution == 'MKT':
        # Partial resolution based on final probability
        prob = market.get('probability', 0.5)
        return True, f"MKT:{prob:.2f}", f"Resolved to market ({prob*100:.0f}%)"
    else:
        return True, resolution, f"Resolved: {resolution}"

def check_and_resolve_pending_bets() -> list[dict]:
    """
    Check all pending bets and resolve any that are complete.
    
    Returns list of resolution results.
    """
    pending = get_pending_bets()
    results = []
    
    print(f"Checking {len(pending)} pending bets...")
    
    for bet in pending:
        is_resolved, winning_outcome, details = check_market_resolution(bet.market_id)
        
        if not is_resolved:
            print(f"  [ ] {bet.id}: Still open")
            continue
        
        # Handle cancellation - return stake
        if winning_outcome == "CANCEL":
            print(f"  [X] {bet.id}: Market cancelled")
            # For simplicity, treat as loss (could handle differently)
            success, msg = resolve_bet(bet.id, won=False, final_resolution="CANCELLED")
            results.append({
                "bet_id": bet.id,
                "status": "cancelled",
                "message": msg,
            })
            continue
        
        # Handle market resolution (MKT)
        if winning_outcome.startswith("MKT:"):
            # Partial payout based on final probability
            final_prob = float(winning_outcome.split(":")[1])
            # Simplify: if we bet YES and final prob > 50%, count as win
            if bet.side == "YES":
                won = final_prob > 0.5
            else:
                won = final_prob < 0.5
            
            success, msg = resolve_bet(bet.id, won=won, final_resolution=winning_outcome)
            status = "won" if won else "lost"
            print(f"  [{'+' if won else '-'}] {bet.id}: {msg}")
            results.append({
                "bet_id": bet.id,
                "status": status,
                "winning_outcome": winning_outcome,
                "message": msg,
            })
            continue
        
        # Standard YES/NO resolution
        won = (bet.side == winning_outcome)
        
        success, msg = resolve_bet(bet.id, won=won, final_resolution=winning_outcome)
        
        status_symbol = "+" if won else "-"
        print(f"  [{status_symbol}] {bet.id}: {msg}")
        
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
    cancelled = sum(1 for r in results if r['status'] == 'cancelled')
    
    summary = f"Resolved {len(results)} bets: {won} won, {lost} lost"
    if cancelled:
        summary += f", {cancelled} cancelled"
    
    return summary

if __name__ == "__main__":
    results = check_and_resolve_pending_bets()
    print(f"\n{get_resolution_summary(results)}")
