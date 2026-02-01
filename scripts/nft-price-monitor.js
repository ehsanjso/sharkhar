#!/usr/bin/env node
/**
 * NFT Price Monitor for Parallel TCG cards
 * Monitors Ethereum + Base holdings and alerts on price spikes
 */

const fs = require('fs');
const path = require('path');

const WALLET = '0xbea1c2cf052e3c6f59466b7f7188da48a6bc1179';
const STATE_FILE = path.join(__dirname, '../data/nft-price-state.json');

// Alert thresholds by rarity
const THRESHOLDS = {
  'Rare': 0.5,       // 50% gain
  'Uncommon': 1.0,   // 100% gain
  'Common': 2.0,     // 200% gain
  'Promo': 2.0,      // 200% gain
  'default': 1.0     // 100% default
};

// Ensure data directory exists
const dataDir = path.dirname(STATE_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function getNFTs(chain) {
  const baseUrl = chain === 'ethereum' 
    ? 'https://eth-mainnet.g.alchemy.com/nft/v3/demo'
    : 'https://base-mainnet.g.alchemy.com/nft/v3/demo';
  
  const url = `${baseUrl}/getNFTsForOwner?owner=${WALLET}&withMetadata=true&pageSize=100`;
  const data = await fetchJSON(url);
  
  return data.ownedNfts
    .filter(nft => !nft.contract.isSpam)
    .filter(nft => nft.contract.name?.toLowerCase().includes('parallel'))
    .map(nft => {
      const rarity = nft.raw?.metadata?.attributes?.find(a => a.trait_type === 'Rarity')?.value || 'Common';
      return {
        chain,
        contract: nft.contract.address,
        tokenId: nft.tokenId,
        name: nft.name,
        collection: nft.collection?.name || nft.contract.name,
        rarity,
        balance: parseInt(nft.balance) || 1,
        floorPrice: nft.contract.openSeaMetadata?.floorPrice || 0,
        slug: nft.collection?.slug || nft.contract.openSeaMetadata?.collectionSlug
      };
    });
}

async function getCollectionFloor(slug, chain) {
  // Use OpenSea collection stats (public endpoint)
  try {
    const chainParam = chain === 'base' ? 'base' : 'ethereum';
    // Fallback to Alchemy data which we already have
    return null; // Will use cached floor from getNFTs
  } catch (e) {
    return null;
  }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { prices: {}, lastCheck: null };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getThreshold(rarity) {
  return THRESHOLDS[rarity] || THRESHOLDS.default;
}

async function main() {
  const alerts = [];
  const state = loadState();
  const now = new Date().toISOString();
  
  console.log(`[${now}] Checking NFT prices for ${WALLET.slice(0, 10)}...`);
  
  // Fetch NFTs from both chains
  const [ethNFTs, baseNFTs] = await Promise.all([
    getNFTs('ethereum').catch(e => { console.error('ETH fetch error:', e.message); return []; }),
    getNFTs('base').catch(e => { console.error('Base fetch error:', e.message); return []; })
  ]);
  
  const allNFTs = [...ethNFTs, ...baseNFTs];
  console.log(`Found ${allNFTs.length} Parallel NFTs (${ethNFTs.length} ETH, ${baseNFTs.length} Base)`);
  
  // Group by collection for floor tracking
  const collections = {};
  for (const nft of allNFTs) {
    const key = `${nft.chain}:${nft.collection}`;
    if (!collections[key]) {
      collections[key] = {
        chain: nft.chain,
        name: nft.collection,
        slug: nft.slug,
        floor: nft.floorPrice,
        nfts: []
      };
    }
    collections[key].nfts.push(nft);
  }
  
  // Check for price changes
  for (const [key, col] of Object.entries(collections)) {
    const prevFloor = state.prices[key]?.floor || 0;
    const currentFloor = col.floor;
    
    if (prevFloor > 0 && currentFloor > 0) {
      const change = (currentFloor - prevFloor) / prevFloor;
      
      // Check collection-level alerts (300% = 3x for major events)
      if (change >= 3.0) {
        alerts.push({
          type: 'collection',
          collection: col.name,
          chain: col.chain,
          oldPrice: prevFloor,
          newPrice: currentFloor,
          change: change * 100,
          nftCount: col.nfts.length
        });
      }
      
      // Check individual NFT thresholds
      for (const nft of col.nfts) {
        const threshold = getThreshold(nft.rarity);
        if (change >= threshold) {
          alerts.push({
            type: 'nft',
            name: nft.name,
            collection: col.name,
            chain: nft.chain,
            rarity: nft.rarity,
            balance: nft.balance,
            oldPrice: prevFloor,
            newPrice: currentFloor,
            change: change * 100
          });
        }
      }
    }
    
    // Update state
    state.prices[key] = {
      floor: currentFloor,
      nftCount: col.nfts.length,
      updated: now
    };
  }
  
  state.lastCheck = now;
  saveState(state);
  
  // Output results
  if (alerts.length > 0) {
    console.log('\n🚨 ALERTS:');
    const output = alerts.map(a => {
      if (a.type === 'collection') {
        return `📈 ${a.collection} (${a.chain}) floor up ${a.change.toFixed(0)}%! ${a.oldPrice.toFixed(6)} → ${a.newPrice.toFixed(6)} ETH (you have ${a.nftCount} cards)`;
      } else {
        return `🔔 ${a.name} (${a.rarity}) up ${a.change.toFixed(0)}%! Floor: ${a.newPrice.toFixed(6)} ETH x${a.balance}`;
      }
    });
    console.log(output.join('\n'));
    
    // Output for Clawdbot to pick up
    console.log('\n---ALERT_MESSAGE---');
    console.log(`🚨 **NFT Price Alert!**\n\n${output.join('\n')}`);
  } else {
    console.log('No significant price changes detected.');
    
    // Summary
    console.log('\n📊 Current holdings:');
    for (const [key, col] of Object.entries(collections)) {
      const totalValue = col.floor * col.nfts.reduce((sum, n) => sum + n.balance, 0);
      console.log(`  ${col.name} (${col.chain}): ${col.nfts.length} unique, floor ${col.floor.toFixed(6)} ETH, ~${totalValue.toFixed(4)} ETH total`);
    }
  }
  
  return alerts;
}

main().catch(console.error);
