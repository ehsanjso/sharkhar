# Polymarket Bot Fix Plan

## What Was Wrong

### 1. **Authentication Broken**
We were getting `401: Invalid API key` because:
- We tried to create a new API key each time instead of **deriving** existing one
- We used wrong headers (missing HMAC signature)
- We didn't properly initialize the client with credentials

### 2. **Signature Type Wrong**
Polymarket has 3 signature types:
- `0` = EOA (MetaMask/standard wallet)
- `1` = POLY_PROXY (Magic Link email login - requires exporting PK from Polymarket)
- `2` = GNOSIS_SAFE (most common for new users)

We need to determine which type applies to our wallet.

### 3. **Price Data Issues**
- Gamma API's `outcomePrices` are indicative, not real-time
- CLOB order book has 98% spread (0.01 bid / 0.99 ask) on illiquid markets
- Need to use WebSocket for real-time price updates

### 4. **Funder Address Missing**
The `funder` is the Polymarket Profile Address (proxy wallet), not the signer address.
This is where USDC is actually held.

---

## The Fix

### Step 1: Proper Authentication Flow

```typescript
import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "ethers";

const HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137;
const signer = new Wallet(PRIVATE_KEY);

// Step 1: Create temp client with just L1 (signer)
const tempClient = new ClobClient(HOST, CHAIN_ID, signer);

// Step 2: Derive (don't create!) API credentials
const apiCreds = await tempClient.createOrDeriveApiKey();
// Returns: { apiKey, secret, passphrase }

// Step 3: Create full client with L2 credentials
const signatureType = 0; // or 1 or 2 - need to determine
const funderAddress = "0x..."; // Polymarket proxy wallet address

const client = new ClobClient(
  HOST,
  CHAIN_ID,
  signer,
  apiCreds,
  signatureType,
  funderAddress
);

// Now we can trade!
```

### Step 2: Determine Wallet Type

Need to check if our wallet `0x923C9c79ADF737A878f6fFb4946D7da889d78E1d`:
1. Is an EOA (signatureType 0)
2. Was created via Magic Link (signatureType 1)
3. Is a Gnosis Safe proxy (signatureType 2)

Most likely it's type 1 (POLY_PROXY) since the original bot used Polymarket's login.

### Step 3: Find the Funder/Proxy Address

The signer address != funder address on Polymarket.
When you deposit USDC, it goes to a proxy wallet managed by Polymarket.

Check via API:
```
GET https://clob.polymarket.com/profile?address=0x923C9c79ADF737A878f6fFb4946D7da889d78E1d
```

### Step 4: Use Official SDK

Stop rolling our own HTTP calls. Use the official `@polymarket/clob-client`:

```bash
npm install @polymarket/clob-client ethers@5
```

The SDK handles:
- EIP-712 signatures for L1
- HMAC-SHA256 signatures for L2
- Order building and signing
- Proper header generation

### Step 5: WebSocket for Real-Time Prices

Use WSS endpoint for live order book updates:
```
wss://ws-subscriptions-clob.polymarket.com/ws/market
```

Subscribe to asset IDs (token IDs) to get price updates.

---

## Implementation Plan

### Phase 1: Fix Authentication (1 hour)
1. Use official TypeScript SDK
2. Implement proper `createOrDeriveApiKey()` flow
3. Determine correct signatureType
4. Find funder address

### Phase 2: Test Order Placement (30 min)
1. Place a $0.01 test order on a liquid market
2. Verify order appears in API
3. Cancel order

### Phase 3: WebSocket Integration (1 hour)
1. Connect to WSS endpoint
2. Subscribe to BTC 5-min market tokens
3. Get real-time bid/ask prices

### Phase 4: Bot Logic (1 hour)
1. Use real prices (not Gamma indicative)
2. Simple strategy: follow BTC momentum
3. Place limit orders at mid-price

---

## Questions to Resolve

1. **What is the funder/proxy address for this wallet?**
2. **What signatureType was used when wallet was created?**
3. **Is there sufficient USDC balance in the proxy wallet?**
4. **Are the BTC 5-min markets actually tradeable or too illiquid?**

---

## Resources

- CLOB Auth Docs: https://docs.polymarket.com/developers/CLOB/authentication
- TypeScript SDK: https://github.com/Polymarket/clob-client
- Python SDK: https://github.com/Polymarket/py-clob-client
- Gamma API: https://gamma-api.polymarket.com
- WSS: wss://ws-subscriptions-clob.polymarket.com
