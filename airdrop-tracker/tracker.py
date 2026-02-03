#!/usr/bin/env python3
"""
Airdrop Tracker
Monitors potential airdrops and tracks wallet eligibility.
"""

import json
import requests
from datetime import datetime, timezone
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional

DATA_DIR = Path(__file__).parent / "data"
WALLETS_FILE = DATA_DIR / "wallets.json"
AIRDROPS_FILE = DATA_DIR / "airdrops.json"
ACTIVITY_FILE = DATA_DIR / "activity.json"

# Known potential airdrops and their requirements
POTENTIAL_AIRDROPS = [
    {
        "id": "layerzero",
        "name": "LayerZero",
        "status": "potential",
        "chain": "multi",
        "category": "bridge",
        "requirements": [
            "Bridge assets using LayerZero (Stargate, etc.)",
            "Use multiple chains",
            "Volume matters - more = better",
            "Time in ecosystem matters"
        ],
        "links": {
            "stargate": "https://stargate.finance",
            "layerzero": "https://layerzero.network"
        },
        "estimated_value": "$500-5000",
        "confidence": "high",
        "deadline": None,
    },
    {
        "id": "scroll",
        "name": "Scroll",
        "status": "potential", 
        "chain": "scroll",
        "category": "L2",
        "requirements": [
            "Bridge ETH to Scroll",
            "Use DEXs on Scroll (SyncSwap, Ambient)",
            "Provide liquidity",
            "Deploy contracts if developer"
        ],
        "links": {
            "bridge": "https://scroll.io/bridge",
            "syncswap": "https://syncswap.xyz"
        },
        "estimated_value": "$200-2000",
        "confidence": "high",
        "deadline": None,
    },
    {
        "id": "berachain",
        "name": "Berachain",
        "status": "testnet",
        "chain": "berachain",
        "category": "L1",
        "requirements": [
            "Use Berachain testnet",
            "Get testnet tokens from faucet",
            "Swap on BEX",
            "Provide liquidity",
            "Borrow/lend on Bend"
        ],
        "links": {
            "faucet": "https://artio.faucet.berachain.com",
            "bex": "https://artio.bex.berachain.com"
        },
        "estimated_value": "$500-3000",
        "confidence": "high",
        "deadline": None,
    },
    {
        "id": "monad",
        "name": "Monad",
        "status": "pre-testnet",
        "chain": "monad",
        "category": "L1",
        "requirements": [
            "Join Discord",
            "Follow Twitter",
            "Wait for testnet",
            "Early community participation"
        ],
        "links": {
            "discord": "https://discord.gg/monad",
            "twitter": "https://twitter.com/moaboratory"
        },
        "estimated_value": "$1000-10000",
        "confidence": "medium",
        "deadline": None,
    },
    {
        "id": "linea",
        "name": "Linea",
        "status": "potential",
        "chain": "linea",
        "category": "L2",
        "requirements": [
            "Bridge to Linea",
            "Use DEXs (SyncSwap, Velocore)",
            "Complete Linea Voyage quests",
            "Weekly activity"
        ],
        "links": {
            "bridge": "https://bridge.linea.build",
            "voyage": "https://linea.build/voyage"
        },
        "estimated_value": "$200-1500",
        "confidence": "high",
        "deadline": None,
    },
    {
        "id": "zksync",
        "name": "zkSync",
        "status": "completed",
        "chain": "zksync",
        "category": "L2",
        "requirements": [
            "Already distributed - check eligibility"
        ],
        "links": {
            "claim": "https://claim.zknation.io"
        },
        "estimated_value": "$200-2000 (past)",
        "confidence": "confirmed",
        "deadline": "2024-06-24",
    },
    {
        "id": "hyperliquid",
        "name": "Hyperliquid",
        "status": "potential",
        "chain": "hyperliquid",
        "category": "perps",
        "requirements": [
            "Trade on Hyperliquid perps",
            "Volume matters",
            "Hold positions",
            "Use HLP vault"
        ],
        "links": {
            "app": "https://app.hyperliquid.xyz"
        },
        "estimated_value": "$500-5000",
        "confidence": "high",
        "deadline": None,
    },
    {
        "id": "abstract",
        "name": "Abstract",
        "status": "testnet",
        "chain": "abstract",
        "category": "L2",
        "requirements": [
            "Use Abstract testnet",
            "Bridge and swap",
            "Deploy contracts"
        ],
        "links": {
            "bridge": "https://portal.abs.xyz"
        },
        "estimated_value": "$200-2000",
        "confidence": "medium",
        "deadline": None,
    },
    {
        "id": "initia",
        "name": "Initia",
        "status": "testnet",
        "chain": "initia",
        "category": "L1",
        "requirements": [
            "Join Initia testnet",
            "Complete quests",
            "Stake tokens",
            "Use applications"
        ],
        "links": {
            "app": "https://app.testnet.initia.xyz"
        },
        "estimated_value": "$300-2000",
        "confidence": "high",
        "deadline": None,
    },
    {
        "id": "eclipse",
        "name": "Eclipse",
        "status": "mainnet",
        "chain": "eclipse",
        "category": "L2",
        "requirements": [
            "Bridge ETH to Eclipse",
            "Use DEXs on Eclipse",
            "Provide liquidity",
            "Regular activity"
        ],
        "links": {
            "bridge": "https://app.eclipse.xyz"
        },
        "estimated_value": "$500-3000",
        "confidence": "high",
        "deadline": None,
    },
]

@dataclass
class Wallet:
    address: str
    name: str
    chain: str  # "evm" or "solana"
    added_at: str
    notes: str = ""

def ensure_data_dir():
    DATA_DIR.mkdir(exist_ok=True)

def load_wallets() -> list[Wallet]:
    ensure_data_dir()
    if not WALLETS_FILE.exists():
        return []
    with open(WALLETS_FILE) as f:
        data = json.load(f)
        return [Wallet(**w) for w in data]

def save_wallets(wallets: list[Wallet]):
    ensure_data_dir()
    with open(WALLETS_FILE, 'w') as f:
        json.dump([asdict(w) for w in wallets], f, indent=2)

def add_wallet(address: str, name: str, chain: str = "evm", notes: str = "") -> tuple[bool, str]:
    wallets = load_wallets()
    
    # Check if already exists
    for w in wallets:
        if w.address.lower() == address.lower():
            return False, f"Wallet already exists: {w.name}"
    
    wallet = Wallet(
        address=address,
        name=name,
        chain=chain,
        added_at=datetime.now(timezone.utc).isoformat(),
        notes=notes,
    )
    wallets.append(wallet)
    save_wallets(wallets)
    return True, f"Added wallet: {name} ({address[:8]}...)"

def remove_wallet(address: str) -> tuple[bool, str]:
    wallets = load_wallets()
    for i, w in enumerate(wallets):
        if w.address.lower() == address.lower():
            removed = wallets.pop(i)
            save_wallets(wallets)
            return True, f"Removed wallet: {removed.name}"
    return False, "Wallet not found"

def get_airdrops(status_filter: Optional[str] = None) -> list[dict]:
    """Get all tracked airdrops, optionally filtered by status."""
    airdrops = POTENTIAL_AIRDROPS.copy()
    
    if status_filter:
        airdrops = [a for a in airdrops if a['status'] == status_filter]
    
    return airdrops

def get_active_airdrops() -> list[dict]:
    """Get airdrops that are still farmable."""
    return [a for a in POTENTIAL_AIRDROPS if a['status'] in ['potential', 'testnet', 'mainnet']]

def print_airdrops(airdrops: list[dict]):
    """Pretty print airdrops."""
    print(f"\n{'='*70}")
    print(f"AIRDROP OPPORTUNITIES ({len(airdrops)})")
    print(f"{'='*70}\n")
    
    status_emoji = {
        'potential': '🎯',
        'testnet': '🧪',
        'mainnet': '🚀',
        'completed': '✅',
        'pre-testnet': '⏳',
    }
    
    confidence_emoji = {
        'high': '🟢',
        'medium': '🟡',
        'low': '🔴',
        'confirmed': '✅',
    }
    
    for airdrop in airdrops:
        emoji = status_emoji.get(airdrop['status'], '❓')
        conf = confidence_emoji.get(airdrop['confidence'], '❓')
        
        print(f"{emoji} {airdrop['name']} ({airdrop['category']})")
        print(f"   Status: {airdrop['status']} | Confidence: {conf} {airdrop['confidence']}")
        print(f"   Est. Value: {airdrop['estimated_value']}")
        print(f"   Requirements:")
        for req in airdrop['requirements'][:4]:
            print(f"     - {req}")
        if airdrop['links']:
            print(f"   Links: {list(airdrop['links'].values())[0]}")
        print()

def print_wallets():
    """Print tracked wallets."""
    wallets = load_wallets()
    
    print(f"\n{'='*60}")
    print(f"TRACKED WALLETS ({len(wallets)})")
    print(f"{'='*60}\n")
    
    if not wallets:
        print("No wallets tracked. Add one with: airdrop wallet add <address> <name>")
        return
    
    for w in wallets:
        chain_emoji = "⟠" if w.chain == "evm" else "◎"
        print(f"{chain_emoji} {w.name}")
        print(f"   {w.address}")
        if w.notes:
            print(f"   Notes: {w.notes}")
        print()

def check_wallet_activity(address: str) -> dict:
    """Check basic wallet activity on different chains using public APIs."""
    activity = {
        "address": address,
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "chains": {}
    }
    
    # Check Ethereum mainnet
    try:
        resp = requests.get(
            f"https://api.etherscan.io/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc",
            timeout=10
        )
        if resp.ok:
            data = resp.json()
            if data.get('status') == '1':
                txs = data.get('result', [])
                activity['chains']['ethereum'] = {
                    'tx_count': len(txs),
                    'has_activity': len(txs) > 0,
                    'last_tx': txs[0]['timeStamp'] if txs else None,
                }
    except:
        pass
    
    # Check Arbitrum
    try:
        resp = requests.get(
            f"https://api.arbiscan.io/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc",
            timeout=10
        )
        if resp.ok:
            data = resp.json()
            if data.get('status') == '1':
                txs = data.get('result', [])
                activity['chains']['arbitrum'] = {
                    'tx_count': len(txs),
                    'has_activity': len(txs) > 0,
                }
    except:
        pass
    
    # Check Optimism
    try:
        resp = requests.get(
            f"https://api-optimistic.etherscan.io/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc",
            timeout=10
        )
        if resp.ok:
            data = resp.json()
            if data.get('status') == '1':
                txs = data.get('result', [])
                activity['chains']['optimism'] = {
                    'tx_count': len(txs),
                    'has_activity': len(txs) > 0,
                }
    except:
        pass
    
    # Check Base
    try:
        resp = requests.get(
            f"https://api.basescan.org/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc",
            timeout=10
        )
        if resp.ok:
            data = resp.json()
            if data.get('status') == '1':
                txs = data.get('result', [])
                activity['chains']['base'] = {
                    'tx_count': len(txs),
                    'has_activity': len(txs) > 0,
                }
    except:
        pass
    
    return activity

def generate_todo_list(wallet_activity: dict) -> list[str]:
    """Generate a TODO list based on wallet activity."""
    todos = []
    chains = wallet_activity.get('chains', {})
    
    # Check which chains are missing
    important_chains = ['ethereum', 'arbitrum', 'optimism', 'base']
    
    for chain in important_chains:
        if chain not in chains or not chains[chain].get('has_activity'):
            todos.append(f"Bridge to {chain.title()} - needed for LayerZero airdrop")
    
    # Add general recommendations
    if not chains.get('ethereum', {}).get('has_activity'):
        todos.append("Get ETH in wallet on mainnet first")
    
    # Specific airdrop todos
    todos.append("Use Stargate to bridge between chains (LayerZero)")
    todos.append("Bridge to Scroll and use SyncSwap")
    todos.append("Try Berachain testnet faucet + DEX")
    todos.append("Check Linea Voyage for quests")
    todos.append("Trade on Hyperliquid perps if comfortable")
    
    return todos

def get_summary() -> dict:
    """Get summary of airdrops and wallets."""
    wallets = load_wallets()
    active = get_active_airdrops()
    
    return {
        "wallets_tracked": len(wallets),
        "active_airdrops": len(active),
        "high_confidence": len([a for a in active if a['confidence'] == 'high']),
        "total_potential": sum_potential_value(active),
    }

def sum_potential_value(airdrops: list[dict]) -> str:
    """Sum up potential value range."""
    min_val = 0
    max_val = 0
    
    for a in airdrops:
        val = a.get('estimated_value', '$0')
        # Parse "$500-5000" format
        try:
            parts = val.replace('$', '').replace(',', '').split('-')
            if len(parts) == 2:
                min_val += int(parts[0])
                max_val += int(parts[1].split()[0])
        except:
            pass
    
    return f"${min_val:,} - ${max_val:,}"

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Airdrop Tracker")
    subparsers = parser.add_subparsers(dest='command', required=True)
    
    # List airdrops
    list_parser = subparsers.add_parser('list', help='List potential airdrops')
    list_parser.add_argument('--status', choices=['potential', 'testnet', 'mainnet', 'completed'])
    
    # Wallet management
    wallet_parser = subparsers.add_parser('wallet', help='Manage wallets')
    wallet_sub = wallet_parser.add_subparsers(dest='wallet_cmd')
    
    wallet_add = wallet_sub.add_parser('add', help='Add wallet')
    wallet_add.add_argument('address', help='Wallet address')
    wallet_add.add_argument('name', help='Wallet name')
    wallet_add.add_argument('--chain', default='evm', choices=['evm', 'solana'])
    wallet_add.add_argument('--notes', default='')
    
    wallet_rm = wallet_sub.add_parser('remove', help='Remove wallet')
    wallet_rm.add_argument('address', help='Wallet address')
    
    wallet_list = wallet_sub.add_parser('list', help='List wallets')
    
    # Check wallet
    check_parser = subparsers.add_parser('check', help='Check wallet activity')
    check_parser.add_argument('address', nargs='?', help='Wallet address (or checks all)')
    
    # Summary
    summary_parser = subparsers.add_parser('summary', help='Show summary')
    
    # TODO
    todo_parser = subparsers.add_parser('todo', help='Generate TODO list')
    todo_parser.add_argument('address', nargs='?', help='Wallet address')
    
    args = parser.parse_args()
    
    if args.command == 'list':
        airdrops = get_airdrops(args.status)
        print_airdrops(airdrops)
        
    elif args.command == 'wallet':
        if args.wallet_cmd == 'add':
            success, msg = add_wallet(args.address, args.name, args.chain, args.notes)
            print(msg)
        elif args.wallet_cmd == 'remove':
            success, msg = remove_wallet(args.address)
            print(msg)
        elif args.wallet_cmd == 'list':
            print_wallets()
        else:
            print_wallets()
            
    elif args.command == 'check':
        if args.address:
            print(f"Checking wallet: {args.address}")
            activity = check_wallet_activity(args.address)
            print(json.dumps(activity, indent=2))
        else:
            wallets = load_wallets()
            for w in wallets:
                print(f"\nChecking {w.name}...")
                activity = check_wallet_activity(w.address)
                for chain, data in activity.get('chains', {}).items():
                    status = "Active" if data.get('has_activity') else "No activity"
                    print(f"  {chain}: {status}")
                    
    elif args.command == 'summary':
        summary = get_summary()
        print(f"\n{'='*50}")
        print(f"AIRDROP TRACKER SUMMARY")
        print(f"{'='*50}")
        print(f"  Wallets tracked: {summary['wallets_tracked']}")
        print(f"  Active airdrops: {summary['active_airdrops']}")
        print(f"  High confidence: {summary['high_confidence']}")
        print(f"  Total potential: {summary['total_potential']}")
        print(f"{'='*50}")
        
    elif args.command == 'todo':
        if args.address:
            activity = check_wallet_activity(args.address)
            todos = generate_todo_list(activity)
        else:
            todos = generate_todo_list({})
        
        print(f"\n{'='*50}")
        print(f"AIRDROP TODO LIST")
        print(f"{'='*50}")
        for i, todo in enumerate(todos, 1):
            print(f"  {i}. {todo}")
        print()
