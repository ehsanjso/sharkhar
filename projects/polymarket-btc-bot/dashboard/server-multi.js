"use strict";
/**
 * Polymarket Multi-Asset Bot - Multi-Market Server
 * Supports BTC, ETH, SOL with 5min and 15min timeframes
 * Each market runs its own set of strategies
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var ws_1 = require("ws");
var http_1 = __importDefault(require("http"));
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var url_1 = require("url");
var live_trading_js_1 = require("./live-trading.js");
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
var PORT = 8084;
var STATE_FILE = './data/multi-market-state.json';
var OLD_STATE_FILE = './data/multi-strategy-state.json';
// ============ Telegram Alerting Config ============
var TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
var TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '99986888';
var alertConfig = {
    enabled: true,
    gainPercentThreshold: 50, // Alert on +50% gain from last state
    lossPercentThreshold: 30, // Alert on -30% loss from last state
    profitTakeMultiplier: 3, // At 3x, withdraw initial
    alertCooldownMs: 5 * 60 * 1000, // 5 min cooldown per strategy
    withdrawnFunds: 0,
    strategyState: {},
};
// ============ Telegram Functions ============
function sendTelegramAlert(message) {
    return __awaiter(this, void 0, void 0, function () {
        var res, e_1, url, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!TELEGRAM_BOT_TOKEN) return [3 /*break*/, 5];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch('http://localhost:3037/api/send', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                channel: 'telegram',
                                target: TELEGRAM_CHAT_ID,
                                message: message,
                            }),
                        })];
                case 2:
                    res = _a.sent();
                    if (res.ok) {
                        console.log('📨 Alert sent via Clawdbot');
                    }
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    console.log('📨 Alert (no Telegram):', message);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    url = "https://api.telegram.org/bot".concat(TELEGRAM_BOT_TOKEN, "/sendMessage");
                    return [4 /*yield*/, fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: TELEGRAM_CHAT_ID,
                                text: message,
                                parse_mode: 'Markdown',
                            }),
                        })];
                case 6:
                    _a.sent();
                    console.log('📨 Telegram alert sent');
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    console.error('Telegram alert error:', error_1);
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
function checkAlerts() {
    if (!alertConfig.enabled)
        return;
    var now = Date.now();
    // Check each strategy individually (percentage-based)
    for (var _i = 0, _a = state.markets; _i < _a.length; _i++) {
        var market = _a[_i];
        for (var _b = 0, _c = market.strategies; _b < _c.length; _b++) {
            var strategy = _c[_b];
            // Only check live mode strategies OR strategies with significant balance
            if (!strategy.liveMode && strategy.balance < 50)
                continue;
            var key = "".concat(market.key, ":").concat(strategy.id);
            var lastState = alertConfig.strategyState[key] || { lastPnl: 0, lastAlertTime: 0 };
            // Cooldown per strategy
            if (now - lastState.lastAlertTime < alertConfig.alertCooldownMs)
                continue;
            var pnlChange = strategy.totalPnl - lastState.lastPnl;
            var baseAmount = Math.max(strategy.startingBalance, 1); // Avoid division by zero
            var changePercent = (pnlChange / baseAmount) * 100;
            // Check for significant gain
            if (changePercent >= alertConfig.gainPercentThreshold) {
                sendTelegramAlert("\uD83D\uDE80 *".concat(market.key, " ").concat(strategy.name, "*\n\n+").concat(changePercent.toFixed(0), "% gain!\nP&L: $").concat(lastState.lastPnl.toFixed(0), " \u2192 $").concat(strategy.totalPnl.toFixed(0), "\nBalance: $").concat(strategy.balance.toFixed(0)));
                alertConfig.strategyState[key] = { lastPnl: strategy.totalPnl, lastAlertTime: now };
            }
            // Check for significant loss
            if (changePercent <= -alertConfig.lossPercentThreshold) {
                sendTelegramAlert("\uD83D\uDC80 *".concat(market.key, " ").concat(strategy.name, "*\n\n").concat(changePercent.toFixed(0), "% loss!\nP&L: $").concat(lastState.lastPnl.toFixed(0), " \u2192 $").concat(strategy.totalPnl.toFixed(0), "\nBalance: $").concat(strategy.balance.toFixed(0), "\n\nUse `poly pause` to halt."));
                alertConfig.strategyState[key] = { lastPnl: strategy.totalPnl, lastAlertTime: now };
            }
            // Initialize tracking if first time
            if (!alertConfig.strategyState[key]) {
                alertConfig.strategyState[key] = { lastPnl: strategy.totalPnl, lastAlertTime: 0 };
            }
            // Auto profit-taking check
            var multiplier = strategy.balance / strategy.startingBalance;
            if (multiplier >= alertConfig.profitTakeMultiplier && !strategy.profitTaken) {
                strategy.profitTaken = true;
                var withdrawn = strategy.startingBalance;
                alertConfig.withdrawnFunds += withdrawn;
                sendTelegramAlert("\uD83D\uDCB0 *PROFIT LOCK*\n\n".concat(strategy.name, " on ").concat(market.key, " hit ").concat(multiplier.toFixed(1), "x!\n\nInitial $").concat(withdrawn, " \"withdrawn\" to safety.\nTotal safe: $").concat(alertConfig.withdrawnFunds.toFixed(0), "\n\nNow playing with house money! \uD83C\uDFB0"));
            }
        }
    }
}
// ACTIVE MARKETS - Only these will run
// 3 bots: BTC 5min (fast), ETH 15min, SOL 15min (longer plays)
var MARKET_CONFIGS = [
    { asset: 'BTC', timeframe: '5min', durationMs: 5 * 60 * 1000, symbol: 'BTCUSDT' },
    { asset: 'ETH', timeframe: '15min', durationMs: 15 * 60 * 1000, symbol: 'ETHUSDT' },
    { asset: 'SOL', timeframe: '15min', durationMs: 15 * 60 * 1000, symbol: 'SOLUSDT' },
];
var STRATEGIES = [
    // SELECTED STRATEGIES (7 total)
    { id: 'vol-regime', name: 'Volatility Regime', description: 'Momentum: HIGH vol=ride trend, LOW vol=wait', color: '#ec4899', startingBalance: 25 },
    { id: 'rsi-divergence', name: 'RSI Divergence', description: 'Momentum: hunts divergences, follows momentum', color: '#d946ef', startingBalance: 25 },
    { id: 'ensemble', name: 'Ensemble Consensus', description: 'Momentum: combines 4 signals, bets when 3+ agree', color: '#8b5cf6', startingBalance: 25 },
    { id: 'stoikov', name: 'Stoikov Spread', description: 'Anti-momentum: academic market-making', color: '#f97316', startingBalance: 25 },
    { id: 'breakout', name: 'Breakout Confirmation', description: 'Confirmed momentum: trends >70% retained', color: '#22c55e', startingBalance: 25 },
    { id: 'regime', name: 'Regime Detection', description: 'V1 WINNER: adapts to trending vs choppy', color: '#6366f1', startingBalance: 25 },
    { id: 'scaled-betting', name: 'Scaled Betting', description: 'Original V1: timed bets at 1,4,7,10 min', color: '#0ea5e9', startingBalance: 25 },
];
// ============ State ============
var state = {
    connected: false,
    live: false,
    prices: { BTC: 0, ETH: 0, SOL: 0 },
    markets: [],
    selectedMarket: null,
    globalHalt: false,
};
var clients = new Set();
var priceTimer = null;
// ============ Initialize Markets ============
function initializeMarkets() {
    state.markets = MARKET_CONFIGS.map(function (config) { return ({
        key: "".concat(config.asset, "-").concat(config.timeframe),
        asset: config.asset,
        timeframe: config.timeframe,
        durationMs: config.durationMs,
        symbol: config.symbol,
        currentPrice: 0,
        priceHistory: [],
        currentMarket: null,
        strategies: STRATEGIES.map(function (s) { return ({
            id: s.id,
            name: s.name,
            description: s.description,
            color: s.color,
            balance: s.startingBalance,
            startingBalance: s.startingBalance,
            totalPnl: 0,
            totalMarkets: 0,
            deployed: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            roi: 0,
            avgWin: 0,
            avgLoss: 0,
            history: [],
            pnlHistory: [],
            currentMarket: null,
            // Control flags
            liveMode: false, // Start in paper mode
            halted: false,
            stopLossThreshold: Math.floor(s.startingBalance * 0.25), // Stop loss at 25% of initial balance
            logs: [],
        }); }),
        totalPnl: 0,
        totalBalance: STRATEGIES.length * 100,
        tradingTimer: null,
        halted: false,
    }); });
}
// ============ State Persistence ============
function saveState() {
    try {
        var dir = './data';
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        var saveData = {
            globalHalt: state.globalHalt,
            markets: state.markets.map(function (m) { return ({
                key: m.key,
                halted: m.halted,
                strategies: m.strategies.map(function (s) { return ({
                    id: s.id,
                    balance: s.balance,
                    totalPnl: s.totalPnl,
                    totalMarkets: s.totalMarkets,
                    deployed: s.deployed,
                    wins: s.wins,
                    losses: s.losses,
                    winRate: s.winRate,
                    roi: s.roi,
                    history: s.history.slice(0, 50),
                    pnlHistory: s.pnlHistory,
                    // Control flags
                    liveMode: s.liveMode,
                    halted: s.halted,
                    haltedReason: s.haltedReason,
                    stopLossThreshold: s.stopLossThreshold,
                    logs: s.logs.slice(-50), // Save last 50 logs
                }); }),
                totalPnl: m.totalPnl,
                totalBalance: m.totalBalance,
            }); }),
            savedAt: Date.now(),
        };
        fs_1.default.writeFileSync(STATE_FILE, JSON.stringify(saveData, null, 2));
    }
    catch (error) {
        console.error('Failed to save state:', error);
    }
}
function loadState() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
    try {
        // Try new multi-market state file first
        if (fs_1.default.existsSync(STATE_FILE)) {
            var saved = JSON.parse(fs_1.default.readFileSync(STATE_FILE, 'utf-8'));
            // Load global halt state
            state.globalHalt = (_a = saved.globalHalt) !== null && _a !== void 0 ? _a : false;
            if (saved.markets && Array.isArray(saved.markets)) {
                var _loop_1 = function (savedMarket) {
                    var market = state.markets.find(function (m) { return m.key === savedMarket.key; });
                    if (market && savedMarket.strategies) {
                        market.halted = (_b = savedMarket.halted) !== null && _b !== void 0 ? _b : false;
                        var _loop_3 = function (savedStrategy) {
                            var strategy = market.strategies.find(function (s) { return s.id === savedStrategy.id; });
                            if (strategy) {
                                strategy.balance = (_c = savedStrategy.balance) !== null && _c !== void 0 ? _c : strategy.startingBalance;
                                strategy.totalPnl = (_d = savedStrategy.totalPnl) !== null && _d !== void 0 ? _d : 0;
                                strategy.totalMarkets = (_e = savedStrategy.totalMarkets) !== null && _e !== void 0 ? _e : 0;
                                strategy.deployed = (_f = savedStrategy.deployed) !== null && _f !== void 0 ? _f : 0;
                                strategy.wins = (_g = savedStrategy.wins) !== null && _g !== void 0 ? _g : 0;
                                strategy.losses = (_h = savedStrategy.losses) !== null && _h !== void 0 ? _h : 0;
                                strategy.winRate = (_j = savedStrategy.winRate) !== null && _j !== void 0 ? _j : 0;
                                strategy.roi = (_k = savedStrategy.roi) !== null && _k !== void 0 ? _k : 0;
                                strategy.history = (_l = savedStrategy.history) !== null && _l !== void 0 ? _l : [];
                                strategy.pnlHistory = (_m = savedStrategy.pnlHistory) !== null && _m !== void 0 ? _m : [];
                                // Control flags
                                strategy.liveMode = (_o = savedStrategy.liveMode) !== null && _o !== void 0 ? _o : false;
                                strategy.halted = (_p = savedStrategy.halted) !== null && _p !== void 0 ? _p : false;
                                strategy.haltedReason = savedStrategy.haltedReason;
                                strategy.stopLossThreshold = (_q = savedStrategy.stopLossThreshold) !== null && _q !== void 0 ? _q : 25;
                                strategy.logs = (_r = savedStrategy.logs) !== null && _r !== void 0 ? _r : [];
                            }
                        };
                        for (var _8 = 0, _9 = savedMarket.strategies; _8 < _9.length; _8++) {
                            var savedStrategy = _9[_8];
                            _loop_3(savedStrategy);
                        }
                        market.totalPnl = (_s = savedMarket.totalPnl) !== null && _s !== void 0 ? _s : 0;
                        market.totalBalance = (_t = savedMarket.totalBalance) !== null && _t !== void 0 ? _t : STRATEGIES.length * 100;
                    }
                };
                for (var _i = 0, _5 = saved.markets; _i < _5.length; _i++) {
                    var savedMarket = _5[_i];
                    _loop_1(savedMarket);
                }
                console.log('📂 Loaded saved state from multi-market file');
                return true;
            }
        }
        // Try to migrate from old single-market state file
        if (fs_1.default.existsSync(OLD_STATE_FILE)) {
            console.log('📂 Migrating from old single-market state file...');
            var saved = JSON.parse(fs_1.default.readFileSync(OLD_STATE_FILE, 'utf-8'));
            if (saved.strategies && Array.isArray(saved.strategies)) {
                // Apply old data to BTC-15min market
                var btc15Market = state.markets.find(function (m) { return m.key === 'BTC-15min'; });
                if (btc15Market) {
                    var _loop_2 = function (savedStrategy) {
                        var strategy = btc15Market.strategies.find(function (s) { return s.id === savedStrategy.id; });
                        if (strategy) {
                            strategy.balance = (_u = savedStrategy.balance) !== null && _u !== void 0 ? _u : strategy.startingBalance;
                            strategy.totalPnl = (_v = savedStrategy.totalPnl) !== null && _v !== void 0 ? _v : 0;
                            strategy.totalMarkets = (_w = savedStrategy.totalMarkets) !== null && _w !== void 0 ? _w : 0;
                            strategy.deployed = (_x = savedStrategy.deployed) !== null && _x !== void 0 ? _x : 0;
                            strategy.wins = (_y = savedStrategy.wins) !== null && _y !== void 0 ? _y : 0;
                            strategy.losses = (_z = savedStrategy.losses) !== null && _z !== void 0 ? _z : 0;
                            strategy.winRate = (_0 = savedStrategy.winRate) !== null && _0 !== void 0 ? _0 : 0;
                            strategy.roi = (_1 = savedStrategy.roi) !== null && _1 !== void 0 ? _1 : 0;
                            // Migrate history (convert btcOpen/btcClose to assetOpen/assetClose)
                            strategy.history = (savedStrategy.history || []).map(function (h) { return (__assign(__assign({}, h), { assetOpen: h.btcOpen || h.assetOpen, assetClose: h.btcClose || h.assetClose })); });
                            strategy.pnlHistory = (_2 = savedStrategy.pnlHistory) !== null && _2 !== void 0 ? _2 : [];
                        }
                    };
                    for (var _6 = 0, _7 = saved.strategies; _6 < _7.length; _6++) {
                        var savedStrategy = _7[_6];
                        _loop_2(savedStrategy);
                    }
                    btc15Market.totalPnl = (_3 = saved.totalPnl) !== null && _3 !== void 0 ? _3 : 0;
                    btc15Market.totalBalance = (_4 = saved.totalBalance) !== null && _4 !== void 0 ? _4 : STRATEGIES.length * 100;
                    console.log("   \u2705 Migrated BTC-15min: $".concat(btc15Market.totalBalance.toFixed(0), " balance, $").concat(btc15Market.totalPnl.toFixed(0), " P&L"));
                }
                // Save in new format
                saveState();
                console.log('📂 Migration complete, saved in new format');
                return true;
            }
        }
    }
    catch (error) {
        console.error('Failed to load state:', error);
    }
    return false;
}
// ============ Price Fetching ============
function fetchPrices() {
    return __awaiter(this, void 0, void 0, function () {
        var symbols, response, data, _i, data_1, item, price, now, _a, _b, market, error_2;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 3, , 4]);
                    symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
                    return [4 /*yield*/, fetch("https://api.binance.com/api/v3/ticker/price?symbols=".concat(JSON.stringify(symbols)))];
                case 1:
                    response = _c.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    data = _c.sent();
                    for (_i = 0, data_1 = data; _i < data_1.length; _i++) {
                        item = data_1[_i];
                        price = parseFloat(item.price);
                        if (item.symbol === 'BTCUSDT')
                            state.prices.BTC = price;
                        else if (item.symbol === 'ETHUSDT')
                            state.prices.ETH = price;
                        else if (item.symbol === 'SOLUSDT')
                            state.prices.SOL = price;
                    }
                    state.connected = true;
                    state.live = true;
                    now = Date.now();
                    for (_a = 0, _b = state.markets; _a < _b.length; _a++) {
                        market = _b[_a];
                        market.currentPrice = state.prices[market.asset];
                        market.priceHistory.push({ time: now, price: market.currentPrice });
                        if (market.priceHistory.length > 100) {
                            market.priceHistory.shift();
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _c.sent();
                    console.error('Price fetch error:', error_2);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ============ Strategy Logic ============
function getTimeframeMultiplier(timeframe) {
    return timeframe === '5min' ? 5 / 15 : 1; // Scale bet times for 5min markets
}
function getDurationMinutes(timeframe) {
    return timeframe === '5min' ? 5 : 15;
}
// All strategy implementations adapted for multi-asset
function adaptiveKellyStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var changePercent = (priceChange / openPrice) * 100;
    var duration = getDurationMinutes(market.timeframe);
    var mult = getTimeframeMultiplier(market.timeframe);
    var validWindow = (minutesElapsed >= 3 * mult && minutesElapsed <= 5 * mult) ||
        (minutesElapsed >= 8 * mult && minutesElapsed <= 10 * mult);
    if (!strategyMarket.side && minutesElapsed >= 3 * mult && minutesElapsed < 4 * mult) {
        var momentum = Math.tanh(changePercent * 10);
        var upProb = Math.max(0.35, Math.min(0.65, 0.5 + momentum * 0.15));
        var edge = Math.abs(upProb - 0.5);
        if (edge > 0.05) {
            strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
            strategyMarket.decidedAt = Date.now();
        }
    }
    if (strategyMarket.side && validWindow) {
        var betIndex = minutesElapsed < 6 * mult ? 0 : 1;
        if (!((_a = strategyMarket.bets[betIndex]) === null || _a === void 0 ? void 0 : _a.executed)) {
            var edge = Math.abs(changePercent) * 3 / 100;
            var kellyFrac = Math.min(0.25, edge * 0.5);
            var betAmount = Math.max(5, Math.floor(strategy.balance * kellyFrac));
            if (strategy.balance >= betAmount) {
                placeBet(market, strategy, betAmount, 0.55);
            }
        }
    }
}
function volRegimeStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var changePercent = (priceChange / openPrice) * 100;
    var mult = getTimeframeMultiplier(market.timeframe);
    var history = market.priceHistory.slice(-20);
    var returns = [];
    for (var i = 1; i < history.length; i++) {
        returns.push((history[i].price - history[i - 1].price) / history[i - 1].price);
    }
    var variance = returns.length > 0 ? returns.reduce(function (s, r) { return s + r * r; }, 0) / returns.length : 0.0001;
    var volatility = Math.sqrt(variance) * 100;
    var isHighVol = volatility > 0.03;
    var isLowVol = volatility < 0.015;
    if (!strategyMarket.side) {
        if (isHighVol && minutesElapsed >= 4 * mult && minutesElapsed < 5 * mult) {
            strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
            strategyMarket.decidedAt = Date.now();
        }
        else if (isLowVol && minutesElapsed >= 10 * mult && Math.abs(changePercent) > 0.08) {
            strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
            strategyMarket.decidedAt = Date.now();
        }
        else if (!isHighVol && !isLowVol && minutesElapsed >= 5 * mult && minutesElapsed < 6 * mult) {
            strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
            strategyMarket.decidedAt = Date.now();
        }
    }
    if (strategyMarket.side) {
        var schedule = isHighVol ? [{ minute: 4 * mult, pct: 0.5 }, { minute: 8 * mult, pct: 0.3 }]
            : isLowVol ? [{ minute: 10 * mult, pct: 0.7 }]
                : [{ minute: 5 * mult, pct: 0.3 }, { minute: 8 * mult, pct: 0.4 }];
        for (var i = 0; i < schedule.length; i++) {
            if (!((_a = strategyMarket.bets[i]) === null || _a === void 0 ? void 0 : _a.executed) && minutesElapsed >= schedule[i].minute) {
                var amount = Math.floor(strategy.balance * schedule[i].pct);
                if (strategy.balance >= amount && amount >= 3) {
                    placeBet(market, strategy, amount, 0.54);
                }
            }
        }
    }
}
function rsiDivergenceStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (minutesElapsed < 5 * mult || minutesElapsed > 12 * mult)
        return;
    var history = market.priceHistory.slice(-15);
    if (history.length < 8)
        return;
    var gains = 0, losses = 0;
    for (var i = 1; i < history.length; i++) {
        var change = history[i].price - history[i - 1].price;
        if (change > 0)
            gains += change;
        else
            losses -= change;
    }
    var avgGain = gains / history.length;
    var avgLoss = losses / history.length;
    var rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    var rsi = 100 - (100 / (1 + rs));
    if (!strategyMarket.side) {
        if (priceChange > 0 && rsi < 45 && minutesElapsed >= 6 * mult) {
            strategyMarket.side = 'Down';
            strategyMarket.decidedAt = Date.now();
        }
        else if (priceChange < 0 && rsi > 55 && minutesElapsed >= 6 * mult) {
            strategyMarket.side = 'Up';
            strategyMarket.decidedAt = Date.now();
        }
        else if (minutesElapsed >= 7 * mult && !strategyMarket.decidedAt) {
            strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
            strategyMarket.decidedAt = Date.now();
        }
    }
    if (strategyMarket.side && !((_a = strategyMarket.bets[0]) === null || _a === void 0 ? void 0 : _a.executed)) {
        if (strategy.balance >= 12)
            placeBet(market, strategy, 12, 0.52);
    }
}
function marketArbStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var changePercent = (priceChange / openPrice) * 100;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (minutesElapsed < 2 * mult || minutesElapsed > 13 * mult)
        return;
    var history = market.priceHistory.slice(-15);
    var momentum = 0;
    if (history.length >= 5) {
        var recent = history.slice(-5);
        momentum = (recent[4].price - recent[0].price) / recent[0].price * 100;
    }
    var reversion = Math.min(1, Math.abs(changePercent) * 3);
    var upProb = 0.5 + (momentum * 0.03) - (reversion * 0.02 * Math.sign(changePercent));
    upProb = Math.max(0.30, Math.min(0.70, upProb));
    var marketPrice = 0.50;
    var deviation = Math.abs(upProb - marketPrice);
    if (!strategyMarket.side && deviation > 0.10) {
        strategyMarket.side = upProb > 0.5 ? 'Up' : 'Down';
        strategyMarket.decidedAt = Date.now();
    }
    if (strategyMarket.side) {
        var betIndex = strategyMarket.bets.length;
        if (betIndex < 3 && !((_a = strategyMarket.bets[betIndex]) === null || _a === void 0 ? void 0 : _a.executed)) {
            var betPct = deviation > 0.20 ? 0.20 : deviation > 0.15 ? 0.15 : 0.10;
            var betAmount = Math.floor(strategy.balance * betPct);
            if (strategy.balance >= betAmount && betAmount >= 3) {
                placeBet(market, strategy, betAmount, upProb > 0.5 ? upProb : 1 - upProb);
            }
        }
    }
}
function ensembleStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var changePercent = (priceChange / openPrice) * 100;
    var mult = getTimeframeMultiplier(market.timeframe);
    var validWindow = (minutesElapsed >= 3 * mult && minutesElapsed <= 5 * mult) ||
        (minutesElapsed >= 8 * mult && minutesElapsed <= 10 * mult);
    if (!validWindow)
        return;
    var history = market.priceHistory.slice(-15);
    var sig1 = changePercent > 0.08 ? 'Up' : changePercent < -0.08 ? 'Down' : null;
    var upMoves = 0;
    for (var i = 1; i < history.length; i++) {
        if (history[i].price > history[i - 1].price)
            upMoves++;
    }
    var consistency = history.length > 1 ? upMoves / (history.length - 1) : 0.5;
    var sig2 = consistency > 0.6 ? 'Up' : consistency < 0.4 ? 'Down' : null;
    var gains = 0, losses = 0;
    for (var i = 1; i < history.length; i++) {
        var change = history[i].price - history[i - 1].price;
        if (change > 0)
            gains += change;
        else
            losses -= change;
    }
    var rs = losses === 0 ? 100 : gains / losses;
    var rsi = 100 - (100 / (1 + rs));
    var sig3 = rsi > 55 ? 'Up' : rsi < 45 ? 'Down' : null;
    var first5 = history.slice(0, 5);
    var last5 = history.slice(-5);
    var avgFirst = first5.length > 0 ? first5.reduce(function (a, b) { return a + b.price; }, 0) / first5.length : openPrice;
    var avgLast = last5.length > 0 ? last5.reduce(function (a, b) { return a + b.price; }, 0) / last5.length : currentPrice;
    var sig4 = avgLast > avgFirst * 1.0003 ? 'Up' : avgLast < avgFirst * 0.9997 ? 'Down' : null;
    var signals = [sig1, sig2, sig3, sig4];
    var upVotes = 0, downVotes = 0;
    for (var _i = 0, signals_1 = signals; _i < signals_1.length; _i++) {
        var s = signals_1[_i];
        if (s === 'Up')
            upVotes++;
        else if (s === 'Down')
            downVotes++;
    }
    var maxVotes = Math.max(upVotes, downVotes);
    if (!strategyMarket.side && maxVotes >= 3) {
        strategyMarket.side = upVotes > downVotes ? 'Up' : 'Down';
        strategyMarket.decidedAt = Date.now();
    }
    if (strategyMarket.side) {
        var betIndex = minutesElapsed < 6 * mult ? 0 : 1;
        if (!((_a = strategyMarket.bets[betIndex]) === null || _a === void 0 ? void 0 : _a.executed)) {
            var betPct = maxVotes === 4 ? 0.4 : 0.25;
            var betAmount = Math.floor(strategy.balance * betPct);
            if (strategy.balance >= betAmount && betAmount >= 3) {
                placeBet(market, strategy, betAmount, 0.55);
            }
        }
    }
}
function fadeStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var changePercent = (priceChange / openPrice) * 100;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (!strategyMarket.side && minutesElapsed >= 5 * mult) {
        if (Math.abs(changePercent) > 0.12) {
            strategyMarket.side = changePercent > 0 ? 'Down' : 'Up';
            strategyMarket.decidedAt = Date.now();
        }
    }
    if (strategyMarket.side) {
        var schedule = [
            { minute: 5 * mult, amount: 8 },
            { minute: 8 * mult, amount: 10 },
            { minute: 11 * mult, amount: 7 },
        ];
        for (var i = 0; i < schedule.length; i++) {
            if (!((_a = strategyMarket.bets[i]) === null || _a === void 0 ? void 0 : _a.executed) && minutesElapsed >= schedule[i].minute) {
                if (strategy.balance >= schedule[i].amount) {
                    placeBet(market, strategy, schedule[i].amount, 0.55);
                }
            }
        }
    }
}
function stoikovStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var mult = getTimeframeMultiplier(market.timeframe);
    var history = market.priceHistory.slice(-20);
    var returns = [];
    for (var i = 1; i < history.length; i++) {
        returns.push((history[i].price - history[i - 1].price) / history[i - 1].price);
    }
    var variance = returns.length > 0 ? returns.reduce(function (s, r) { return s + r * r; }, 0) / returns.length : 0.0001;
    var gamma = 0.1;
    var inventoryPenalty = 1 / (1 + gamma * variance * 10000);
    if (!strategyMarket.side && minutesElapsed >= 4 * mult && minutesElapsed < 5 * mult) {
        if (variance < 0.001) {
            strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
            strategyMarket.decidedAt = Date.now();
        }
    }
    if (strategyMarket.side) {
        var schedule = [{ minute: 4 * mult }, { minute: 7 * mult }, { minute: 10 * mult }];
        for (var i = 0; i < schedule.length; i++) {
            if (!((_a = strategyMarket.bets[i]) === null || _a === void 0 ? void 0 : _a.executed) && minutesElapsed >= schedule[i].minute) {
                var baseBet = 10;
                var optimalBet = Math.max(4, Math.floor(baseBet * inventoryPenalty));
                if (strategy.balance >= optimalBet) {
                    placeBet(market, strategy, optimalBet, 0.52);
                }
            }
        }
    }
}
function bayesianStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var mult = getTimeframeMultiplier(market.timeframe);
    var history = market.priceHistory.slice(-30);
    if (history.length < 10)
        return;
    var posterior = 0.5;
    var updateFactor = 0.06;
    for (var i = 1; i < history.length; i++) {
        var move = history[i].price - history[i - 1].price;
        if (move > 0)
            posterior = posterior + (1 - posterior) * updateFactor;
        else if (move < 0)
            posterior = posterior - posterior * updateFactor;
    }
    if (!strategyMarket.side && minutesElapsed >= 6 * mult) {
        if (posterior > 0.65) {
            strategyMarket.side = 'Up';
            strategyMarket.decidedAt = Date.now();
        }
        else if (posterior < 0.35) {
            strategyMarket.side = 'Down';
            strategyMarket.decidedAt = Date.now();
        }
        else if (minutesElapsed >= 10 * mult) {
            strategyMarket.decidedAt = Date.now();
        }
    }
    if (strategyMarket.side && !((_a = strategyMarket.bets[0]) === null || _a === void 0 ? void 0 : _a.executed)) {
        var confidence = strategyMarket.side === 'Up' ? posterior : (1 - posterior);
        var betAmount = Math.floor(8 + (confidence - 0.5) * 20);
        if (strategy.balance >= betAmount) {
            placeBet(market, strategy, betAmount, confidence);
        }
    }
}
function timeDecayStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var changePercent = (priceChange / openPrice) * 100;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (minutesElapsed < 8 * mult)
        return;
    if (!strategyMarket.side && Math.abs(changePercent) >= 0.1) {
        strategyMarket.side = changePercent > 0 ? 'Down' : 'Up';
        strategyMarket.decidedAt = Date.now();
    }
    if (strategyMarket.side) {
        var schedule = [
            { minute: 8 * mult, amount: 6 },
            { minute: 11 * mult, amount: 12 },
            { minute: 13 * mult, amount: 18 },
        ];
        for (var i = 0; i < schedule.length; i++) {
            if (!((_a = strategyMarket.bets[i]) === null || _a === void 0 ? void 0 : _a.executed) && minutesElapsed >= schedule[i].minute) {
                if (strategy.balance >= schedule[i].amount) {
                    placeBet(market, strategy, schedule[i].amount, 0.55);
                }
            }
        }
    }
}
function breakoutStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var totalChange = ((currentPrice - openPrice) / openPrice) * 100;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (minutesElapsed < 7 * mult)
        return;
    if (!strategyMarket.side && Math.abs(totalChange) >= 0.15) {
        var history_1 = market.priceHistory.slice(-20);
        if (history_1.length < 10)
            return;
        var midPoint = history_1[Math.floor(history_1.length / 2)].price;
        var earlyChange = ((midPoint - openPrice) / openPrice) * 100;
        var sameDirection = Math.sign(earlyChange) === Math.sign(totalChange);
        var retained = earlyChange !== 0 ? Math.abs(totalChange) / Math.abs(earlyChange) : 0;
        if (sameDirection && retained > 0.7) {
            strategyMarket.side = totalChange >= 0 ? 'Up' : 'Down';
            strategyMarket.decidedAt = Date.now();
        }
        else if (minutesElapsed >= 10 * mult) {
            strategyMarket.decidedAt = Date.now();
        }
    }
    if (strategyMarket.side) {
        var schedule = [{ minute: 7 * mult, amount: 15 }, { minute: 10 * mult, amount: 12 }];
        for (var i = 0; i < schedule.length; i++) {
            if (!((_a = strategyMarket.bets[i]) === null || _a === void 0 ? void 0 : _a.executed) && minutesElapsed >= schedule[i].minute) {
                if (strategy.balance >= schedule[i].amount) {
                    placeBet(market, strategy, schedule[i].amount, 0.58);
                }
            }
        }
    }
}
function kellyStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var changePercent = (priceChange / openPrice) * 100;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (!strategyMarket.side && minutesElapsed >= 4 * mult && minutesElapsed < 5 * mult) {
        var momentum = Math.abs(changePercent);
        var edgeEstimate = Math.min(momentum * 5, 15);
        if (edgeEstimate > 5) {
            strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
            strategyMarket.decidedAt = Date.now();
        }
    }
    if (strategyMarket.side) {
        var momentum = Math.abs(changePercent);
        var edge = Math.min(momentum * 5, 15) / 100;
        var kellyFraction = edge * 0.25;
        var schedule = [{ minute: 4 * mult }, { minute: 7 * mult }, { minute: 10 * mult }];
        for (var i = 0; i < schedule.length; i++) {
            if (!((_a = strategyMarket.bets[i]) === null || _a === void 0 ? void 0 : _a.executed) && minutesElapsed >= schedule[i].minute) {
                var betAmount = Math.max(3, Math.min(10, Math.floor(strategy.balance * kellyFraction)));
                if (strategy.balance >= betAmount) {
                    placeBet(market, strategy, betAmount, 0.55 + edge);
                }
            }
        }
    }
}
function regimeStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var changePercent = (priceChange / openPrice) * 100;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (!strategyMarket.side && minutesElapsed >= 5 * mult) {
        var history_2 = market.priceHistory.slice(-20);
        if (history_2.length >= 10) {
            var sameDir = 0;
            var direction = priceChange >= 0 ? 1 : -1;
            for (var i = 1; i < history_2.length; i++) {
                var move = history_2[i].price - history_2[i - 1].price;
                if (Math.sign(move) === direction)
                    sameDir++;
            }
            var consistency = sameDir / (history_2.length - 1);
            var isTrending = consistency > 0.6;
            var isChoppy = consistency < 0.4;
            if (isTrending) {
                strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
            }
            else if (isChoppy && Math.abs(changePercent) > 0.08) {
                strategyMarket.side = priceChange >= 0 ? 'Down' : 'Up';
            }
            strategyMarket.decidedAt = Date.now();
        }
    }
    if (strategyMarket.side) {
        var schedule = [
            { minute: 5 * mult, amount: 10 },
            { minute: 8 * mult, amount: 10 },
            { minute: 11 * mult, amount: 8 },
        ];
        for (var i = 0; i < schedule.length; i++) {
            if (!((_a = strategyMarket.bets[i]) === null || _a === void 0 ? void 0 : _a.executed) && minutesElapsed >= schedule[i].minute) {
                if (strategy.balance >= schedule[i].amount) {
                    placeBet(market, strategy, schedule[i].amount, 0.55);
                }
            }
        }
    }
}
function evmStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var changePercent = (priceChange / openPrice) * 100;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (!strategyMarket.side && minutesElapsed >= 4 * mult && minutesElapsed < 5 * mult) {
        var momentumStrength = Math.min(Math.abs(changePercent) * 50, 10) / 100;
        var history_3 = market.priceHistory.slice(-15);
        var sameDir = 0;
        var direction = priceChange >= 0 ? 1 : -1;
        for (var i = 1; i < history_3.length; i++) {
            if (Math.sign(history_3[i].price - history_3[i - 1].price) === direction)
                sameDir++;
        }
        var consistency = history_3.length > 1 ? sameDir / (history_3.length - 1) : 0.5;
        var baseProb = 0.50;
        var probBoost = (momentumStrength * 0.15) + (consistency - 0.5) * 0.2;
        var winProb = Math.min(0.70, Math.max(0.35, baseProb + probBoost));
        var potentialBet = 15;
        var ev = (winProb * potentialBet) - ((1 - winProb) * potentialBet);
        if (ev > 1.5) {
            strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
            var betAmount = ev > 3 ? 18 : ev > 2 ? 14 : 10;
            betAmount = Math.min(betAmount, Math.floor(strategy.balance * 0.2));
            strategyMarket.decidedAt = Date.now();
            if (strategy.balance >= betAmount) {
                placeBet(market, strategy, betAmount, winProb);
            }
        }
        else {
            strategyMarket.decidedAt = Date.now();
        }
    }
}
function conservativeStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var changePercent = (priceChange / openPrice) * 100;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (!strategyMarket.side && minutesElapsed >= 12 * mult) {
        if (Math.abs(changePercent) >= 0.2) {
            strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
            strategyMarket.decidedAt = Date.now();
        }
    }
    if (strategyMarket.side && !((_a = strategyMarket.bets[0]) === null || _a === void 0 ? void 0 : _a.executed)) {
        var betAmount = 8;
        if (strategy.balance >= betAmount) {
            placeBet(market, strategy, betAmount, 0.55);
        }
    }
}
function randomStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (!strategyMarket.side && minutesElapsed >= 5 * mult && minutesElapsed < 6 * mult) {
        var random = (Date.now() % 100) / 100;
        strategyMarket.side = random > 0.5 ? 'Up' : 'Down';
        strategyMarket.decidedAt = Date.now();
    }
    if (strategyMarket.side && !((_a = strategyMarket.bets[0]) === null || _a === void 0 ? void 0 : _a.executed) && minutesElapsed >= 5 * mult) {
        if (strategy.balance >= 10) {
            placeBet(market, strategy, 10, 0.50);
        }
    }
}
function scaledBettingStrategy(market, strategy, openPrice, currentPrice, minutesElapsed) {
    var _a;
    var strategyMarket = strategy.currentMarket;
    var priceChange = currentPrice - openPrice;
    var mult = getTimeframeMultiplier(market.timeframe);
    if (!strategyMarket.side && minutesElapsed >= 1 * mult && minutesElapsed < 2 * mult) {
        strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
        strategyMarket.decidedAt = Date.now();
    }
    if (strategyMarket.side) {
        var schedule = [
            { minute: 1 * mult, amount: 5 },
            { minute: 4 * mult, amount: 10 },
            { minute: 7 * mult, amount: 15 },
            { minute: 10 * mult, amount: 10 },
        ];
        for (var i = 0; i < schedule.length; i++) {
            if (!((_a = strategyMarket.bets[i]) === null || _a === void 0 ? void 0 : _a.executed) && minutesElapsed >= schedule[i].minute) {
                var momentum = Math.abs(priceChange / openPrice);
                var probability = Math.min(0.75, 0.55 + momentum * 10);
                if (probability >= 0.60 && strategy.balance >= schedule[i].amount) {
                    placeBet(market, strategy, schedule[i].amount, probability);
                }
                else {
                    strategyMarket.bets.push({ minute: schedule[i].minute, amount: 0, executed: true });
                }
            }
        }
    }
}
function canPlaceBet(marketState, strategy) {
    // Check global halt
    if (state.globalHalt)
        return false;
    // Check market halt
    if (marketState.halted)
        return false;
    // Check strategy halt
    if (strategy.halted)
        return false;
    // Check stop loss - auto halt if balance below threshold
    if (strategy.balance <= strategy.stopLossThreshold) {
        strategy.halted = true;
        strategy.haltedReason = "Stop loss triggered (balance $".concat(strategy.balance.toFixed(0), " <= $").concat(strategy.stopLossThreshold, ")");
        console.log("   \uD83D\uDED1 [".concat(strategy.name, "] STOP LOSS - Balance $").concat(strategy.balance.toFixed(0), " <= $").concat(strategy.stopLossThreshold));
        saveState();
        broadcastState();
        return false;
    }
    return true;
}
// Helper to add log entry to a strategy (keeps last 100 logs)
function addStrategyLog(strategy, type, message, data) {
    var log = {
        time: new Date().toLocaleTimeString(),
        type: type,
        message: message,
        data: data,
    };
    strategy.logs.push(log);
    // Keep only last 100 logs
    if (strategy.logs.length > 100) {
        strategy.logs = strategy.logs.slice(-100);
    }
}
function placeBet(marketState, strategy, amount, probability) {
    return __awaiter(this, void 0, void 0, function () {
        var market, price, shares, liveMarket, side, tokenId, marketPrice, bidPrice, actualShares, result, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Check if we can place bet
                    if (!canPlaceBet(marketState, strategy))
                        return [2 /*return*/];
                    market = strategy.currentMarket;
                    if (strategy.balance < amount) {
                        amount = Math.floor(strategy.balance);
                        if (amount < 1)
                            return [2 /*return*/];
                    }
                    price = Math.max(0.45, probability - 0.03);
                    shares = Math.floor(amount / price);
                    if (!strategy.liveMode) return [3 /*break*/, 6];
                    addStrategyLog(strategy, 'bet', "Placing LIVE bet: $".concat(amount, " @ ").concat((price * 100).toFixed(0), "\u00A2"), { amount: amount, price: price });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    // Find the actual Polymarket market
                    addStrategyLog(strategy, 'clob', "Finding ".concat(marketState.asset, " ").concat(marketState.timeframe, " market on Polymarket..."));
                    return [4 /*yield*/, live_trading_js_1.liveTrading.findMarket(marketState.asset, marketState.timeframe)];
                case 2:
                    liveMarket = _a.sent();
                    if (!liveMarket) {
                        addStrategyLog(strategy, 'error', "No active ".concat(marketState.asset, " ").concat(marketState.timeframe, " market found"));
                        console.log("   \u26A0\uFE0F [LIVE] No active ".concat(marketState.asset, " ").concat(marketState.timeframe, " market found"));
                        return [2 /*return*/];
                    }
                    addStrategyLog(strategy, 'clob', "Found market: ".concat(liveMarket.title || liveMarket.slug, "..."));
                    side = market.side || 'Up';
                    tokenId = side === 'Up' ? liveMarket.upTokenId : liveMarket.downTokenId;
                    marketPrice = side === 'Up' ? liveMarket.upPrice : liveMarket.downPrice;
                    bidPrice = Math.min(0.95, marketPrice + 0.01);
                    addStrategyLog(strategy, 'clob', "Market price: ".concat((marketPrice * 100).toFixed(0), "\u00A2, bidding: ").concat((bidPrice * 100).toFixed(0), "\u00A2"));
                    actualShares = Math.floor(amount / bidPrice);
                    // Place the real order at market price
                    addStrategyLog(strategy, 'clob', "Sending CLOB order: ".concat(side, " $").concat(amount, " @ ").concat((bidPrice * 100).toFixed(0), "\u00A2"));
                    return [4 /*yield*/, live_trading_js_1.liveTrading.placeOrder(tokenId, side, amount, bidPrice)];
                case 3:
                    result = _a.sent();
                    if (result.success) {
                        addStrategyLog(strategy, 'fill', "\u2705 Order filled! ID: ".concat(result.orderId, ", Shares: ").concat(result.shares), { orderId: result.orderId, shares: result.shares });
                        console.log("   \uD83D\uDCB0 [LIVE] ".concat(strategy.name, ": $").concat(amount, " ").concat(side, " @ ").concat((price * 100).toFixed(0), "\u00A2"));
                        console.log("      Order ID: ".concat(result.orderId, ", Shares: ").concat(result.shares));
                        sendTelegramAlert("\uD83D\uDCB0 *LIVE BET*\n\n".concat(marketState.key, " ").concat(strategy.name, "\n$").concat(amount, " on ").concat(side, "\nOrder: ").concat(result.orderId));
                    }
                    else {
                        addStrategyLog(strategy, 'error', "\u274C Order failed: ".concat(result.error), { error: result.error });
                        console.log("   \u274C [LIVE] Order failed: ".concat(result.error));
                        sendTelegramAlert("\u274C *ORDER FAILED*\n\n".concat(marketState.key, " ").concat(strategy.name, "\n$").concat(amount, " ").concat(side, "\nError: ").concat(result.error));
                        return [2 /*return*/]; // Don't deduct balance if order failed
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _a.sent();
                    addStrategyLog(strategy, 'error', "\u274C Exception: ".concat(error_3.message), { error: error_3.message });
                    console.error("   \u274C [LIVE] Error:", error_3.message);
                    return [2 /*return*/];
                case 5: return [3 /*break*/, 7];
                case 6:
                    addStrategyLog(strategy, 'bet', "Paper bet: $".concat(amount, " @ ").concat((price * 100).toFixed(0), "\u00A2 (").concat(shares, " shares)"));
                    _a.label = 7;
                case 7:
                    market.bets.push({
                        minute: Date.now(),
                        amount: amount,
                        executed: true,
                        shares: shares,
                        price: price,
                    });
                    market.costBet += amount;
                    market.shares += shares;
                    market.avgPrice = market.costBet / market.shares;
                    market.fills++;
                    strategy.balance -= amount;
                    strategy.deployed += amount;
                    return [2 /*return*/];
            }
        });
    });
}
// ============ Market Management ============
function startMarket(marketState) {
    var now = Date.now();
    var duration = getDurationMinutes(marketState.timeframe);
    var marketId = "".concat(marketState.key, "-").concat(now);
    marketState.currentMarket = {
        id: marketId,
        title: "".concat(marketState.asset, " ").concat(duration, "min - ").concat(new Date().toLocaleTimeString()),
        startTime: now,
        endTime: now + marketState.durationMs,
        openPrice: marketState.currentPrice,
    };
    // Initialize strategy markets
    for (var _i = 0, _a = marketState.strategies; _i < _a.length; _i++) {
        var strategy = _a[_i];
        strategy.currentMarket = {
            side: null,
            costBet: 0,
            shares: 0,
            avgPrice: 0,
            fills: 0,
            bets: [],
        };
    }
    console.log("\n\uD83C\uDFAF [".concat(marketState.key, "] New market: ").concat(marketState.currentMarket.title));
    console.log("   Open: $".concat(marketState.currentMarket.openPrice.toLocaleString()));
    // Start trading loop
    if (marketState.tradingTimer)
        clearInterval(marketState.tradingTimer);
    marketState.tradingTimer = setInterval(function () { return tradingTick(marketState); }, 5000);
    broadcastState();
}
function tradingTick(marketState) {
    if (!marketState.currentMarket)
        return;
    var now = Date.now();
    var elapsed = now - marketState.currentMarket.startTime;
    var minutesElapsed = elapsed / 60000;
    var duration = getDurationMinutes(marketState.timeframe);
    if (minutesElapsed >= duration) {
        endMarket(marketState);
        return;
    }
    var openPrice = marketState.currentMarket.openPrice;
    var currentPrice = marketState.currentPrice;
    for (var _i = 0, _a = marketState.strategies; _i < _a.length; _i++) {
        var strategy = _a[_i];
        if (!strategy.currentMarket)
            continue;
        switch (strategy.id) {
            case 'adaptive-kelly':
                adaptiveKellyStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'vol-regime':
                volRegimeStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'rsi-divergence':
                rsiDivergenceStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'market-arb':
                marketArbStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'ensemble':
                ensembleStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'fade':
                fadeStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'stoikov':
                stoikovStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'bayesian':
                bayesianStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'time-decay':
                timeDecayStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'breakout':
                breakoutStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'kelly':
                kellyStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'regime':
                regimeStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'evm':
                evmStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'conservative':
                conservativeStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'random':
                randomStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
            case 'scaled-betting':
                scaledBettingStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed);
                break;
        }
    }
    broadcastState();
}
function endMarket(marketState) {
    if (!marketState.currentMarket)
        return;
    if (marketState.tradingTimer) {
        clearInterval(marketState.tradingTimer);
        marketState.tradingTimer = null;
    }
    var openPrice = marketState.currentMarket.openPrice;
    var closePrice = marketState.currentPrice;
    var wentUp = closePrice >= openPrice;
    console.log("\n\uD83D\uDCCA [".concat(marketState.key, "] Ended - ").concat(wentUp ? 'UP' : 'DOWN'));
    console.log("   $".concat(openPrice.toLocaleString(), " \u2192 $").concat(closePrice.toLocaleString()));
    for (var _i = 0, _a = marketState.strategies; _i < _a.length; _i++) {
        var strategy = _a[_i];
        var strategyMarket = strategy.currentMarket;
        if (!strategyMarket || strategyMarket.fills === 0) {
            strategy.currentMarket = null;
            continue;
        }
        var wePickedUp = strategyMarket.side === 'Up';
        var won = wentUp === wePickedUp;
        var payout = won ? strategyMarket.shares : 0;
        var pnl = payout - strategyMarket.costBet;
        // Log market resolution
        addStrategyLog(strategy, 'resolve', "Market resolved: ".concat(wentUp ? 'UP' : 'DOWN', " | Bet: ").concat(strategyMarket.side, " | ").concat(won ? 'WIN' : 'LOSS', " | P&L: $").concat(pnl.toFixed(2)), { wentUp: wentUp, picked: strategyMarket.side, won: won, pnl: pnl, payout: payout, cost: strategyMarket.costBet });
        strategy.totalMarkets++;
        strategy.totalPnl += pnl;
        strategy.balance += payout;
        if (won)
            strategy.wins++;
        else
            strategy.losses++;
        strategy.winRate = strategy.totalMarkets > 0 ? Math.round((strategy.wins / strategy.totalMarkets) * 100) : 0;
        strategy.roi = strategy.deployed > 0 ? (strategy.totalPnl / strategy.deployed) * 100 : 0;
        strategy.history.unshift({
            id: "".concat(marketState.currentMarket.id, "-").concat(strategy.id),
            time: new Date().toLocaleTimeString(),
            marketId: marketState.currentMarket.id,
            side: strategyMarket.side || 'Up',
            shares: strategyMarket.shares,
            cost: strategyMarket.costBet,
            payout: payout,
            pnl: pnl,
            result: won ? 'WIN' : 'LOSS',
            assetOpen: openPrice,
            assetClose: closePrice,
        });
        strategy.history = strategy.history.slice(0, 50);
        var cumulative = strategy.pnlHistory.length > 0
            ? strategy.pnlHistory[strategy.pnlHistory.length - 1].cumulative + pnl
            : pnl;
        strategy.pnlHistory.push({ market: strategy.totalMarkets, pnl: pnl, cumulative: cumulative });
        strategy.currentMarket = null;
    }
    marketState.totalPnl = marketState.strategies.reduce(function (sum, s) { return sum + s.totalPnl; }, 0);
    marketState.totalBalance = marketState.strategies.reduce(function (sum, s) { return sum + s.balance; }, 0);
    console.log("   Total Balance: $".concat(marketState.totalBalance.toFixed(2), " | P&L: ").concat(marketState.totalPnl >= 0 ? '+' : '', "$").concat(marketState.totalPnl.toFixed(2)));
    marketState.currentMarket = null;
    broadcastState();
    saveState();
    // Check for extreme P&L swings and auto profit-taking
    checkAlerts();
    // Start next market after delay (30s for 15min, 15s for 5min)
    var delay = marketState.timeframe === '5min' ? 15000 : 30000;
    setTimeout(function () { return startMarket(marketState); }, delay);
}
// ============ WebSocket ============
function broadcastState() {
    var msg = JSON.stringify({
        type: 'fullState',
        data: {
            connected: state.connected,
            live: state.live,
            prices: state.prices,
            selectedMarket: state.selectedMarket,
            globalHalt: state.globalHalt,
            markets: state.markets.map(function (m) { return ({
                key: m.key,
                asset: m.asset,
                timeframe: m.timeframe,
                currentPrice: m.currentPrice,
                halted: m.halted,
                currentMarket: m.currentMarket ? __assign(__assign({}, m.currentMarket), { elapsed: (Date.now() - m.currentMarket.startTime) / 60000, change: m.currentPrice - m.currentMarket.openPrice, changePercent: ((m.currentPrice - m.currentMarket.openPrice) / m.currentMarket.openPrice) * 100 }) : null,
                strategies: m.strategies.map(function (s) { return (__assign(__assign({}, s), { liveMode: s.liveMode, halted: s.halted, haltedReason: s.haltedReason, stopLossThreshold: s.stopLossThreshold, currentMarket: s.currentMarket ? __assign(__assign({}, s.currentMarket), { livePnl: s.currentMarket.side && m.currentMarket ? calculateLivePnl(m, s) : 0 }) : null })); }),
                totalPnl: m.totalPnl,
                totalBalance: m.totalBalance,
            }); }),
        }
    });
    clients.forEach(function (client) {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(msg);
        }
    });
}
function calculateLivePnl(marketState, strategy) {
    if (!strategy.currentMarket || !marketState.currentMarket)
        return 0;
    var m = strategy.currentMarket;
    var winning = (m.side === 'Up' && marketState.currentPrice >= marketState.currentMarket.openPrice) ||
        (m.side === 'Down' && marketState.currentPrice < marketState.currentMarket.openPrice);
    return winning ? (m.shares - m.costBet) * 0.7 : -m.costBet * 0.7;
}
// ============ HTTP Server ============
var MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};
var server = http_1.default.createServer(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var url, totalPnl, totalBalance, marketSummary, _i, _a, market, mPnl, mBal, _b, _c, strategy, body_1, body_2, body_3, marketKey_1, market, _d, _e, strategy, distDir, filePath, ext, contentType, content;
    return __generator(this, function (_f) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return [2 /*return*/];
        }
        url = req.url || '/';
        if (url === '/api/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                connected: state.connected,
                live: state.live,
                prices: state.prices,
                marketCount: state.markets.length,
            }));
            return [2 /*return*/];
        }
        if (url === '/api/markets') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(state.markets.map(function (m) { return ({
                key: m.key,
                asset: m.asset,
                timeframe: m.timeframe,
                totalPnl: m.totalPnl,
                totalBalance: m.totalBalance,
                active: !!m.currentMarket,
            }); })));
            return [2 /*return*/];
        }
        // ============ POLY CONTROL ENDPOINTS (for Telegram/CLI) ============
        if (url === '/api/poly/pause' && req.method === 'POST') {
            state.globalHalt = true;
            saveState();
            broadcastState();
            sendTelegramAlert('⏸️ *TRADING PAUSED*\n\nAll markets halted via API.\nUse `/poly resume` to continue.');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'All trading paused', globalHalt: true }));
            return [2 /*return*/];
        }
        if (url === '/api/poly/resume' && req.method === 'POST') {
            state.globalHalt = false;
            saveState();
            broadcastState();
            sendTelegramAlert('▶️ *TRADING RESUMED*\n\nAll markets active again.');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Trading resumed', globalHalt: false }));
            return [2 /*return*/];
        }
        if (url === '/api/poly/status') {
            totalPnl = 0;
            totalBalance = 0;
            marketSummary = [];
            for (_i = 0, _a = state.markets; _i < _a.length; _i++) {
                market = _a[_i];
                mPnl = 0, mBal = 0;
                for (_b = 0, _c = market.strategies; _b < _c.length; _b++) {
                    strategy = _c[_b];
                    mPnl += strategy.totalPnl;
                    mBal += strategy.balance;
                }
                totalPnl += mPnl;
                totalBalance += mBal;
                marketSummary.push({ key: market.key, pnl: mPnl, balance: mBal });
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                globalHalt: state.globalHalt,
                totalPnl: totalPnl,
                totalBalance: totalBalance,
                startingBalance: 4800,
                roi: ((totalBalance - 4800) / 4800 * 100).toFixed(1) + '%',
                withdrawnFunds: alertConfig.withdrawnFunds,
                markets: marketSummary.sort(function (a, b) { return b.pnl - a.pnl; }),
                alertsEnabled: alertConfig.enabled,
            }));
            return [2 /*return*/];
        }
        if (url === '/api/poly/alerts' && req.method === 'POST') {
            body_1 = '';
            req.on('data', function (chunk) { return body_1 += chunk; });
            req.on('end', function () {
                try {
                    var data = JSON.parse(body_1);
                    if (typeof data.enabled === 'boolean')
                        alertConfig.enabled = data.enabled;
                    if (typeof data.gainThreshold === 'number')
                        alertConfig.extremeGainThreshold = data.gainThreshold;
                    if (typeof data.lossThreshold === 'number')
                        alertConfig.extremeLossThreshold = data.lossThreshold;
                    if (typeof data.profitTakeMultiplier === 'number')
                        alertConfig.profitTakeMultiplier = data.profitTakeMultiplier;
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, config: alertConfig }));
                }
                catch (e) {
                    res.writeHead(400);
                    res.end('Invalid JSON');
                }
            });
            return [2 /*return*/];
        }
        // Enable/disable live trading for a strategy
        if (url === '/api/poly/live' && req.method === 'POST') {
            body_2 = '';
            req.on('data', function (chunk) { return body_2 += chunk; });
            req.on('end', function () { return __awaiter(void 0, void 0, void 0, function () {
                var data_2, market, strategy, modeStr, e_2;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 3, , 4]);
                            data_2 = JSON.parse(body_2);
                            market = state.markets.find(function (m) { return m.key === data_2.market; });
                            if (!market) {
                                res.writeHead(404);
                                res.end(JSON.stringify({ error: 'Market not found' }));
                                return [2 /*return*/];
                            }
                            strategy = market.strategies.find(function (s) { return s.id === data_2.strategy; });
                            if (!strategy) {
                                res.writeHead(404);
                                res.end(JSON.stringify({ error: 'Strategy not found' }));
                                return [2 /*return*/];
                            }
                            if (!(data_2.live && !live_trading_js_1.liveTrading.isDryRun())) return [3 /*break*/, 2];
                            return [4 /*yield*/, live_trading_js_1.liveTrading.initialize()];
                        case 1:
                            _b.sent();
                            _b.label = 2;
                        case 2:
                            strategy.liveMode = (_a = data_2.live) !== null && _a !== void 0 ? _a : false;
                            // Set funding if provided
                            if (data_2.funding && data_2.live) {
                                strategy.balance = data_2.funding;
                                strategy.startingBalance = data_2.funding;
                                strategy.stopLossThreshold = Math.floor(data_2.funding * 0.25); // 25% of new funding
                                strategy.totalPnl = 0;
                                strategy.deployed = 0;
                                strategy.wins = 0;
                                strategy.losses = 0;
                                strategy.halted = false; // Reset halt status
                                strategy.haltedReason = undefined;
                            }
                            saveState();
                            broadcastState();
                            modeStr = strategy.liveMode ? '🔴 LIVE' : '📄 PAPER';
                            console.log("".concat(modeStr, " ").concat(strategy.name, " on ").concat(market.key, " - $").concat(strategy.balance));
                            sendTelegramAlert("".concat(modeStr, " *").concat(strategy.name, "* on ").concat(market.key, "\nBalance: $").concat(strategy.balance));
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({
                                success: true,
                                market: market.key,
                                strategy: strategy.id,
                                liveMode: strategy.liveMode,
                                balance: strategy.balance,
                            }));
                            return [3 /*break*/, 4];
                        case 3:
                            e_2 = _b.sent();
                            res.writeHead(400);
                            res.end(JSON.stringify({ error: e_2.message }));
                            return [3 /*break*/, 4];
                        case 4: return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        }
        // Set DRY_RUN mode
        if (url === '/api/poly/dryrun' && req.method === 'POST') {
            body_3 = '';
            req.on('data', function (chunk) { return body_3 += chunk; });
            req.on('end', function () {
                var _a;
                try {
                    var data = JSON.parse(body_3);
                    live_trading_js_1.liveTrading.setDryRun((_a = data.dryRun) !== null && _a !== void 0 ? _a : true);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, dryRun: live_trading_js_1.liveTrading.isDryRun() }));
                }
                catch (e) {
                    res.writeHead(400);
                    res.end('Invalid JSON');
                }
            });
            return [2 /*return*/];
        }
        if (url.startsWith('/api/reset/') && req.method === 'POST') {
            marketKey_1 = url.replace('/api/reset/', '');
            market = state.markets.find(function (m) { return m.key === marketKey_1; });
            if (market) {
                for (_d = 0, _e = market.strategies; _d < _e.length; _d++) {
                    strategy = _e[_d];
                    strategy.balance = strategy.startingBalance;
                    strategy.totalPnl = 0;
                    strategy.totalMarkets = 0;
                    strategy.deployed = 0;
                    strategy.wins = 0;
                    strategy.losses = 0;
                    strategy.winRate = 0;
                    strategy.roi = 0;
                    strategy.history = [];
                    strategy.pnlHistory = [];
                }
                market.totalPnl = 0;
                market.totalBalance = STRATEGIES.length * 100;
                saveState();
                broadcastState();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: "".concat(marketKey_1, " reset") }));
            }
            else {
                res.writeHead(404);
                res.end('Market not found');
            }
            return [2 /*return*/];
        }
        distDir = path_1.default.join(__dirname, 'dist');
        filePath = path_1.default.join(distDir, url === '/' ? 'index.html' : url);
        if (!fs_1.default.existsSync(filePath) && !url.startsWith('/api')) {
            filePath = path_1.default.join(distDir, 'index.html');
        }
        try {
            if (fs_1.default.existsSync(filePath) && fs_1.default.statSync(filePath).isFile()) {
                ext = path_1.default.extname(filePath);
                contentType = MIME_TYPES[ext] || 'application/octet-stream';
                content = fs_1.default.readFileSync(filePath);
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
                return [2 /*return*/];
            }
        }
        catch (error) {
            console.error('Error serving file:', error);
        }
        res.writeHead(404);
        res.end('Not found');
        return [2 /*return*/];
    });
}); });
// ============ WebSocket Server ============
var wss = new ws_1.WebSocketServer({ server: server });
wss.on('connection', function (ws) {
    console.log('🔌 Dashboard connected');
    clients.add(ws);
    broadcastState();
    ws.on('message', function (data) {
        var _a;
        try {
            var msg_1 = JSON.parse(data.toString());
            if (msg_1.type === 'selectMarket') {
                state.selectedMarket = msg_1.key;
                broadcastState();
            }
            // ========== HALT CONTROLS ==========
            else if (msg_1.type === 'globalHalt') {
                state.globalHalt = true;
                console.log('🛑 GLOBAL HALT activated');
                saveState();
                broadcastState();
            }
            else if (msg_1.type === 'globalResume') {
                state.globalHalt = false;
                console.log('▶️ GLOBAL RESUME');
                saveState();
                broadcastState();
            }
            else if (msg_1.type === 'haltMarket' && msg_1.key) {
                var market = state.markets.find(function (m) { return m.key === msg_1.key; });
                if (market) {
                    market.halted = true;
                    console.log("\uD83D\uDED1 Market ".concat(msg_1.key, " HALTED"));
                    saveState();
                    broadcastState();
                }
            }
            else if (msg_1.type === 'resumeMarket' && msg_1.key) {
                var market = state.markets.find(function (m) { return m.key === msg_1.key; });
                if (market) {
                    market.halted = false;
                    console.log("\u25B6\uFE0F Market ".concat(msg_1.key, " RESUMED"));
                    saveState();
                    broadcastState();
                }
            }
            else if (msg_1.type === 'haltStrategy' && msg_1.key && msg_1.strategyId) {
                var market = state.markets.find(function (m) { return m.key === msg_1.key; });
                var strategy = market === null || market === void 0 ? void 0 : market.strategies.find(function (s) { return s.id === msg_1.strategyId; });
                if (strategy) {
                    strategy.halted = true;
                    strategy.haltedReason = msg_1.reason || 'Manual halt';
                    console.log("\uD83D\uDED1 Strategy ".concat(strategy.name, " in ").concat(msg_1.key, " HALTED"));
                    saveState();
                    broadcastState();
                }
            }
            else if (msg_1.type === 'resumeStrategy' && msg_1.key && msg_1.strategyId) {
                var market = state.markets.find(function (m) { return m.key === msg_1.key; });
                var strategy = market === null || market === void 0 ? void 0 : market.strategies.find(function (s) { return s.id === msg_1.strategyId; });
                if (strategy) {
                    strategy.halted = false;
                    strategy.haltedReason = undefined;
                    console.log("\u25B6\uFE0F Strategy ".concat(strategy.name, " in ").concat(msg_1.key, " RESUMED"));
                    saveState();
                    broadcastState();
                }
            }
            // ========== LIVE MODE CONTROLS ==========
            else if (msg_1.type === 'setLiveMode' && msg_1.key && msg_1.strategyId) {
                var market = state.markets.find(function (m) { return m.key === msg_1.key; });
                var strategy = market === null || market === void 0 ? void 0 : market.strategies.find(function (s) { return s.id === msg_1.strategyId; });
                if (strategy) {
                    var wasLive = strategy.liveMode;
                    strategy.liveMode = (_a = msg_1.live) !== null && _a !== void 0 ? _a : false;
                    // If switching to live mode, can set initial funding
                    if (strategy.liveMode && msg_1.funding) {
                        strategy.balance = msg_1.funding;
                        strategy.startingBalance = msg_1.funding;
                    }
                    console.log("".concat(strategy.liveMode ? '💰 LIVE' : '📄 PAPER', " ").concat(strategy.name, " in ").concat(msg_1.key));
                    saveState();
                    broadcastState();
                }
            }
            else if (msg_1.type === 'setStopLoss' && msg_1.key && msg_1.strategyId && typeof msg_1.threshold === 'number') {
                var market = state.markets.find(function (m) { return m.key === msg_1.key; });
                var strategy = market === null || market === void 0 ? void 0 : market.strategies.find(function (s) { return s.id === msg_1.strategyId; });
                if (strategy) {
                    strategy.stopLossThreshold = msg_1.threshold;
                    console.log("\uD83D\uDCC9 Stop loss for ".concat(strategy.name, " set to $").concat(msg_1.threshold));
                    saveState();
                    broadcastState();
                }
            }
            // ========== RESET ==========
            else if (msg_1.type === 'reset' && msg_1.key) {
                var market = state.markets.find(function (m) { return m.key === msg_1.key; });
                if (market) {
                    for (var _i = 0, _b = market.strategies; _i < _b.length; _i++) {
                        var strategy = _b[_i];
                        strategy.balance = strategy.startingBalance;
                        strategy.totalPnl = 0;
                        strategy.totalMarkets = 0;
                        strategy.deployed = 0;
                        strategy.wins = 0;
                        strategy.losses = 0;
                        strategy.winRate = 0;
                        strategy.roi = 0;
                        strategy.history = [];
                        strategy.pnlHistory = [];
                        strategy.halted = false;
                        strategy.haltedReason = undefined;
                    }
                    market.totalPnl = 0;
                    market.totalBalance = STRATEGIES.length * 100;
                    market.halted = false;
                    saveState();
                    broadcastState();
                }
            }
        }
        catch (e) {
            console.error('WebSocket message error:', e);
        }
    });
    ws.on('close', function () {
        console.log('🔌 Dashboard disconnected');
        clients.delete(ws);
    });
});
// ============ Start ============
server.listen(PORT, '0.0.0.0', function () {
    console.log("\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551  \uD83E\uDD16 MULTI-MARKET POLYMARKET BOT                            \u2551\n\u2551  BTC 5min + ETH 15min + SOL 15min = 3 Markets              \u2551\n\u2551  7 Strategies \u00D7 $25 Each \u00D7 3 Markets = $525 Total          \u2551\n\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n\n  Dashboard: http://192.168.0.217:".concat(PORT, "\n  \n  Markets:\n").concat(MARKET_CONFIGS.map(function (c) { return "    \u2022 ".concat(c.asset, " ").concat(c.timeframe); }).join('\n'), "\n  "));
    // Initialize markets
    initializeMarkets();
    // Load saved state
    loadState();
    // Start price updates
    priceTimer = setInterval(fetchPrices, 3000);
    fetchPrices();
    // Start all markets with staggered timing
    var delay = 5000;
    var _loop_4 = function (market) {
        setTimeout(function () { return startMarket(market); }, delay);
        delay += 10000; // Stagger by 10 seconds
    };
    for (var _i = 0, _a = state.markets; _i < _a.length; _i++) {
        var market = _a[_i];
        _loop_4(market);
    }
});
// Graceful shutdown
process.on('SIGINT', function () {
    console.log('\n👋 Shutting down...');
    saveState();
    process.exit(0);
});
process.on('SIGTERM', function () {
    console.log('\n👋 Shutting down...');
    saveState();
    process.exit(0);
});
