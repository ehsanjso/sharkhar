#!/usr/bin/env python3
"""
Airdrop Tracker Bot
Main entry point for daily checks and alerts.
"""

import json
from datetime import datetime, timezone
from tracker import (
    load_wallets, get_active_airdrops, check_wallet_activity,
    generate_todo_list, get_summary, print_airdrops, DATA_DIR
)

def run_daily_check() -> dict:
    """
    Run daily check of airdrops and wallet activity.
    Returns summary for notification.
    """
    print(f"\n{'='*60}")
    print(f"AIRDROP TRACKER - DAILY CHECK")
    print(f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print(f"{'='*60}")
    
    # Get summary
    summary = get_summary()
    print(f"\nSummary:")
    print(f"  Wallets: {summary['wallets_tracked']}")
    print(f"  Active airdrops: {summary['active_airdrops']}")
    print(f"  Potential value: {summary['total_potential']}")
    
    # Check wallet activity
    wallets = load_wallets()
    wallet_status = []
    
    if wallets:
        print(f"\nChecking {len(wallets)} wallet(s)...")
        for wallet in wallets:
            activity = check_wallet_activity(wallet.address)
            chains_active = sum(1 for c in activity.get('chains', {}).values() if c.get('has_activity'))
            chains_total = len(activity.get('chains', {}))
            
            status = f"{wallet.name}: {chains_active}/{chains_total} chains active"
            wallet_status.append(status)
            print(f"  {status}")
    else:
        print("\nNo wallets tracked yet. Add one with: airdrop wallet add <address> <name>")
    
    # Get high priority airdrops
    active = get_active_airdrops()
    high_priority = [a for a in active if a['confidence'] == 'high' and a['status'] in ['potential', 'testnet', 'mainnet']]
    
    print(f"\nHigh Priority Airdrops ({len(high_priority)}):")
    for airdrop in high_priority[:5]:
        print(f"  - {airdrop['name']}: {airdrop['estimated_value']}")
    
    # Generate TODOs if we have wallets
    todos = []
    if wallets:
        activity = check_wallet_activity(wallets[0].address)
        todos = generate_todo_list(activity)[:5]
        print(f"\nTop TODOs:")
        for todo in todos:
            print(f"  - {todo}")
    
    result = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "wallets": summary['wallets_tracked'],
        "active_airdrops": summary['active_airdrops'],
        "potential_value": summary['total_potential'],
        "wallet_status": wallet_status,
        "high_priority": [a['name'] for a in high_priority[:5]],
        "top_todos": todos,
    }
    
    # Save last check
    DATA_DIR.mkdir(exist_ok=True)
    with open(DATA_DIR / "last_check.json", 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\n{'='*60}")
    
    return result

def format_report(result: dict) -> str:
    """Format result as a message."""
    lines = [
        "🪂 **Airdrop Tracker Update**",
        "",
        f"**Potential Value:** {result['potential_value']}",
        f"**Active Opportunities:** {result['active_airdrops']}",
        f"**Wallets Tracked:** {result['wallets']}",
    ]
    
    if result['wallet_status']:
        lines.append("")
        lines.append("**Wallet Status:**")
        for status in result['wallet_status']:
            lines.append(f"• {status}")
    
    if result['high_priority']:
        lines.append("")
        lines.append("**High Priority:**")
        for name in result['high_priority'][:3]:
            lines.append(f"• {name}")
    
    if result['top_todos']:
        lines.append("")
        lines.append("**Next Actions:**")
        for todo in result['top_todos'][:3]:
            lines.append(f"• {todo}")
    
    return "\n".join(lines)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Airdrop Tracker Bot")
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    parser.add_argument('--report', action='store_true', help='Output formatted report')
    
    args = parser.parse_args()
    
    result = run_daily_check()
    
    if args.json:
        print(json.dumps(result, indent=2))
    elif args.report:
        print(format_report(result))
