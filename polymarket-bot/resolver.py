#!/usr/bin/env python3
"""
Polymarket Resolution Checker
Checks if markets have resolved and updates bets accordingly.
"""

import logging
import requests
from requests.exceptions import RequestException, Timeout
from portfolio import get_pending_bets, resolve_bet, Bet, add_to_history

GAMMA_API = "https://gamma-api.polymarket.com"
REQUEST_TIMEOUT = 15  # seconds

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def fetch_market_by_id(market_id: str) -> dict:
    """Fetch a single market by ID."""
    try:
        resp = requests.get(f"{GAMMA_API}/markets/{market_id}", timeout=REQUEST_TIMEOUT)
        if resp.status_code == 404:
            logger.debug(f"Market {market_id} not found (404)")
            return {}
        resp.raise_for_status()
        return resp.json()
    except Timeout:
        logger.warning(f"Timeout fetching market {market_id}")
        return {}
    except RequestException as e:
        logger.warning(f"Failed to fetch market {market_id}: {e}")
        return {}

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
    
    logger.info(f"🔍 Checking {len(pending)} pending bets...")
    
    for bet in pending:
        try:
            is_resolved, winning_outcome, details = check_market_resolution(bet.market_id)
        except Exception as e:
            logger.error(f"Error checking bet {bet.id}: {e}")
            results.append({
                "bet_id": bet.id,
                "status": "error",
                "message": str(e),
            })
            continue
        
        if not is_resolved:
            logger.info(f"  ⏳ {bet.id}: Still open")
            continue
        
        # Determine if bet won
        if not winning_outcome:
            # Market voided - return stake
            logger.info(f"  🚫 {bet.id}: Market voided, returning stake")
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
        logger.info(f"  {status_emoji} {bet.id}: {msg}")
        
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
    logger.info(f"\n{get_resolution_summary(results)}")
