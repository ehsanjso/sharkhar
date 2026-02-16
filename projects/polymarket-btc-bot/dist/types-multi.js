/**
 * Multi-asset, multi-timeframe types for Polymarket candle trading
 */
// Default configurations
export const DEFAULT_PRICE_FEEDS = [
    {
        asset: 'BTC',
        wsUrl: 'wss://stream.binance.com:9443/ws/btcusdt@trade',
        restUrl: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT'
    },
    {
        asset: 'ETH',
        wsUrl: 'wss://stream.binance.com:9443/ws/ethusdt@trade',
        restUrl: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT'
    },
    {
        asset: 'SOL',
        wsUrl: 'wss://stream.binance.com:9443/ws/solusdt@trade',
        restUrl: 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT'
    }
];
export const DEFAULT_BET_SCHEDULES = {
    '5min': [
        { pctTime: 0.2, pctBudget: 0.25 }, // 1 min in
        { pctTime: 0.5, pctBudget: 0.35 }, // 2.5 min in
        { pctTime: 0.8, pctBudget: 0.40 }, // 4 min in
    ],
    '15min': [
        { pctTime: 0.07, pctBudget: 0.125 }, // 1 min in
        { pctTime: 0.27, pctBudget: 0.25 }, // 4 min in  
        { pctTime: 0.47, pctBudget: 0.375 }, // 7 min in
        { pctTime: 0.67, pctBudget: 0.25 }, // 10 min in
    ],
    '1hr': [
        { pctTime: 0.08, pctBudget: 0.15 }, // 5 min in
        { pctTime: 0.25, pctBudget: 0.25 }, // 15 min in
        { pctTime: 0.50, pctBudget: 0.35 }, // 30 min in
        { pctTime: 0.75, pctBudget: 0.25 }, // 45 min in
    ],
    '4hr': [
        { pctTime: 0.06, pctBudget: 0.15 }, // 15 min in
        { pctTime: 0.25, pctBudget: 0.25 }, // 1 hr in
        { pctTime: 0.50, pctBudget: 0.35 }, // 2 hr in
        { pctTime: 0.75, pctBudget: 0.25 }, // 3 hr in
    ],
    '1day': [
        { pctTime: 0.04, pctBudget: 0.15 }, // 1 hr in
        { pctTime: 0.17, pctBudget: 0.25 }, // 4 hr in
        { pctTime: 0.50, pctBudget: 0.35 }, // 12 hr in
        { pctTime: 0.75, pctBudget: 0.25 }, // 18 hr in
    ],
};
export const DEFAULT_BUDGETS = {
    '5min': 25, // $25 per market
    '15min': 25,
    '1hr': 25,
    '4hr': 25,
    '1day': 25,
};
export function timeframeToDuration(tf) {
    const map = {
        '5min': 5,
        '15min': 15,
        '1hr': 60,
        '4hr': 240,
        '1day': 1440,
    };
    return map[tf];
}
export function createDefaultConfig(dryRun = true) {
    return {
        assets: ['BTC', 'ETH'],
        timeframes: ['5min', '15min', '1hr'],
        budgetPerMarket: DEFAULT_BUDGETS,
        betSchedules: DEFAULT_BET_SCHEDULES,
        minProbability: 0.55,
        useNewsResearch: true,
        dryRun,
        manualMarkets: [],
    };
}
//# sourceMappingURL=types-multi.js.map