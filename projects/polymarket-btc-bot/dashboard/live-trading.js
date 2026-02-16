"use strict";
/**
 * Live Trading Module for Polymarket
 * Handles real order placement on crypto up/down markets
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveTrading = void 0;
var clob_client_1 = require("@polymarket/clob-client");
var ethers = __importStar(require("ethers"));
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '../.env' });
var GAMMA_API = 'https://gamma-api.polymarket.com';
var CLOB_API = 'https://clob.polymarket.com';
var CHAIN_ID = 137; // Polygon mainnet
var LiveTradingClient = /** @class */ (function () {
    function LiveTradingClient() {
        this.client = null;
        this.initialized = false;
        this.privateKey = process.env.PRIVATE_KEY || '';
        this.dryRun = process.env.DRY_RUN === 'true';
        if (!this.privateKey) {
            console.warn('⚠️ No PRIVATE_KEY set - live trading disabled');
        }
    }
    LiveTradingClient.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var provider, signer, tempClient, derived, apiCreds, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.initialized)
                            return [2 /*return*/, true];
                        if (!this.privateKey)
                            return [2 /*return*/, false];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
                        signer = new ethers.Wallet(this.privateKey, provider);
                        tempClient = new clob_client_1.ClobClient(CLOB_API, CHAIN_ID, signer);
                        return [4 /*yield*/, tempClient.deriveApiKey()];
                    case 2:
                        derived = _a.sent();
                        apiCreds = {
                            key: derived.key,
                            secret: derived.secret,
                            passphrase: derived.passphrase,
                        };
                        // Create authenticated client
                        this.client = new clob_client_1.ClobClient(CLOB_API, CHAIN_ID, signer, apiCreds, 0 // signature type
                        );
                        this.initialized = true;
                        console.log('✅ Live trading client initialized');
                        console.log("   Wallet: ".concat(signer.address));
                        console.log("   Mode: ".concat(this.dryRun ? 'DRY RUN' : '🔴 LIVE'));
                        return [2 /*return*/, true];
                    case 3:
                        error_1 = _a.sent();
                        console.error('❌ Failed to initialize live trading:', error_1.message);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    LiveTradingClient.prototype.isDryRun = function () {
        return this.dryRun;
    };
    LiveTradingClient.prototype.setDryRun = function (value) {
        this.dryRun = value;
        console.log("   Mode changed: ".concat(this.dryRun ? 'DRY RUN' : '🔴 LIVE'));
    };
    /**
     * Find active crypto up/down market
     * Markets use slug pattern: {asset}-updown-{timeframe}-{timestamp}
     * e.g., btc-updown-5m-1771223100
     */
    LiveTradingClient.prototype.findMarket = function (asset, timeframe) {
        return __awaiter(this, void 0, void 0, function () {
            var assetLower, tfLabel, now, windowSeconds, windowTimestamp, slug, response, events, nextSlug, nextResponse, nextEvents, event_1, market, tokenIds, outcomes, prices, upIndex, downIndex, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 6, , 7]);
                        assetLower = asset.toLowerCase();
                        tfLabel = timeframe === '5min' ? '5m' : timeframe === '15min' ? '15m' : '5m';
                        now = Math.floor(Date.now() / 1000);
                        windowSeconds = timeframe === '5min' ? 300 : 900;
                        windowTimestamp = now - (now % windowSeconds);
                        slug = "".concat(assetLower, "-updown-").concat(tfLabel, "-").concat(windowTimestamp);
                        console.log("   \uD83D\uDD0D Looking for market: ".concat(slug));
                        return [4 /*yield*/, fetch("".concat(GAMMA_API, "/events?slug=").concat(slug))];
                    case 1:
                        response = _b.sent();
                        return [4 /*yield*/, response.json()];
                    case 2:
                        events = _b.sent();
                        if (!(!events || events.length === 0)) return [3 /*break*/, 5];
                        nextSlug = "".concat(assetLower, "-updown-").concat(tfLabel, "-").concat(windowTimestamp + windowSeconds);
                        console.log("   \uD83D\uDD0D Trying next window: ".concat(nextSlug));
                        return [4 /*yield*/, fetch("".concat(GAMMA_API, "/events?slug=").concat(nextSlug))];
                    case 3:
                        nextResponse = _b.sent();
                        return [4 /*yield*/, nextResponse.json()];
                    case 4:
                        nextEvents = _b.sent();
                        if (!nextEvents || nextEvents.length === 0) {
                            return [2 /*return*/, null];
                        }
                        events.push.apply(events, nextEvents);
                        _b.label = 5;
                    case 5:
                        event_1 = events[0];
                        if (!((_a = event_1 === null || event_1 === void 0 ? void 0 : event_1.markets) === null || _a === void 0 ? void 0 : _a.length))
                            return [2 /*return*/, null];
                        market = event_1.markets[0];
                        tokenIds = JSON.parse(market.clobTokenIds || '[]');
                        outcomes = JSON.parse(market.outcomes || '[]');
                        prices = JSON.parse(market.outcomePrices || '[]');
                        upIndex = outcomes.findIndex(function (o) { return o.toLowerCase() === 'up'; });
                        downIndex = outcomes.findIndex(function (o) { return o.toLowerCase() === 'down'; });
                        if (upIndex < 0 || downIndex < 0 || !tokenIds[upIndex] || !tokenIds[downIndex]) {
                            console.log("   \u26A0\uFE0F Market found but missing token IDs");
                            return [2 /*return*/, null];
                        }
                        console.log("   \u2705 Found market: ".concat(event_1.title));
                        return [2 /*return*/, {
                                eventId: event_1.id,
                                slug: event_1.slug,
                                title: event_1.title,
                                upTokenId: tokenIds[upIndex],
                                downTokenId: tokenIds[downIndex],
                                upPrice: parseFloat(prices[upIndex] || '0.5'),
                                downPrice: parseFloat(prices[downIndex] || '0.5'),
                                endTime: new Date(event_1.endDate || Date.now() + windowSeconds * 1000),
                            }];
                    case 6:
                        error_2 = _b.sent();
                        console.error("Failed to find ".concat(asset, " ").concat(timeframe, " market:"), error_2.message);
                        return [2 /*return*/, null];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Place a real order on Polymarket
     */
    LiveTradingClient.prototype.placeOrder = function (tokenId, side, amount, price) {
        return __awaiter(this, void 0, void 0, function () {
            var shares, response, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.client) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initialize()];
                    case 1:
                        _a.sent();
                        if (!this.client) {
                            return [2 /*return*/, { success: false, error: 'Client not initialized' }];
                        }
                        _a.label = 2;
                    case 2:
                        shares = Math.floor(amount / price);
                        if (this.dryRun) {
                            console.log("\uD83D\uDD38 [DRY RUN] Would buy ".concat(shares, " ").concat(side, " shares @ $").concat(price.toFixed(3)));
                            return [2 /*return*/, {
                                    success: true,
                                    orderId: "dry-".concat(Date.now()),
                                    shares: shares,
                                    price: price,
                                }];
                        }
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        console.log("\uD83D\uDCB0 [LIVE] Placing order: ".concat(shares, " ").concat(side, " shares @ $").concat(price.toFixed(3)));
                        return [4 /*yield*/, this.client.createAndPostOrder({
                                tokenID: tokenId,
                                price: price,
                                size: shares,
                                side: clob_client_1.Side.BUY,
                            })];
                    case 4:
                        response = _a.sent();
                        console.log("\u2705 Order placed: ".concat(response.orderID));
                        return [2 /*return*/, {
                                success: true,
                                orderId: response.orderID,
                                shares: shares,
                                price: price,
                            }];
                    case 5:
                        error_3 = _a.sent();
                        console.error('❌ Order failed:', error_3.message);
                        return [2 /*return*/, {
                                success: false,
                                error: error_3.message,
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get wallet balance (USDC on Polygon)
     */
    LiveTradingClient.prototype.getBalance = function () {
        return __awaiter(this, void 0, void 0, function () {
            var provider, signer;
            return __generator(this, function (_a) {
                if (!this.privateKey)
                    return [2 /*return*/, 0];
                try {
                    provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
                    signer = new ethers.Wallet(this.privateKey, provider);
                    console.log("   Wallet address: ".concat(signer.address));
                    return [2 /*return*/, 0];
                }
                catch (_b) {
                    return [2 /*return*/, 0];
                }
                return [2 /*return*/];
            });
        });
    };
    return LiveTradingClient;
}());
// Singleton instance
exports.liveTrading = new LiveTradingClient();
