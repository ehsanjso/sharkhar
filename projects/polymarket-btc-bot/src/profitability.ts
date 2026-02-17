/**
 * Profitability Calculator
 * 
 * Ensures we only enter markets where expected value > costs
 * Accounts for:
 * - Polygon gas fees (trade + redemption)
 * - Spread/slippage
 * - Minimum bet sizes
 */

export interface CostEstimate {
  gasTradeUSD: number;      // Gas to place trade
  gasRedeemUSD: number;     // Gas to redeem winnings
  spreadPct: number;        // Spread/slippage percentage
  totalFixedUSD: number;    // Total fixed costs
  totalVariablePct: number; // Total variable costs as %
}

export interface ProfitabilityCheck {
  isProfitable: boolean;
  expectedValue: number;
  totalCosts: number;
  netExpectedValue: number;
  requiredWinRate: number;
  actualWinRate: number;
  minBetSize: number;
  reason?: string;
}

// Default cost estimates for Polygon
const DEFAULT_COSTS: CostEstimate = {
  gasTradeUSD: 0.02,      // ~$0.02 per trade on Polygon
  gasRedeemUSD: 0.02,     // ~$0.02 per redemption
  spreadPct: 1.5,         // ~1.5% spread/slippage
  totalFixedUSD: 0.04,    // Trade + redeem gas
  totalVariablePct: 1.5,  // Spread
};

// Minimum bet to keep cost ratio reasonable
const MIN_BET_SIZE = 5.0;

// Minimum edge required (as probability above 50%)
const MIN_EDGE_PCT = 3.0;

// Minimum probability we need on our side
const MIN_PROBABILITY = 0.53;

/**
 * Calculate if a bet is profitable after fees
 */
export function checkProfitability(
  betAmount: number,
  probability: number,  // Our estimated probability of winning (0-1)
  price: number,        // Price we're paying per share (0-1)
  costs: CostEstimate = DEFAULT_COSTS
): ProfitabilityCheck {
  
  // Basic validation
  if (betAmount <= 0) {
    return {
      isProfitable: false,
      expectedValue: 0,
      totalCosts: 0,
      netExpectedValue: 0,
      requiredWinRate: 0,
      actualWinRate: probability * 100,
      minBetSize: MIN_BET_SIZE,
      reason: 'Bet amount must be positive',
    };
  }

  // Calculate costs
  const fixedCosts = costs.totalFixedUSD;
  const variableCosts = betAmount * (costs.totalVariablePct / 100);
  const totalCosts = fixedCosts + variableCosts;

  // Calculate shares we get
  const shares = betAmount / price;
  
  // Expected value calculation
  // If we win: we get $shares (which equals $1 per share)
  // If we lose: we get $0
  // Cost to enter: betAmount + costs
  const winPayout = shares;  // Each share pays $1 if we win
  const expectedWinnings = probability * winPayout;
  const expectedValue = expectedWinnings - betAmount;  // Before costs
  const netExpectedValue = expectedValue - totalCosts;

  // Required win rate to break even
  // probability * winPayout = betAmount + totalCosts
  // probability = (betAmount + totalCosts) / winPayout
  const requiredWinRate = (betAmount + totalCosts) / winPayout;

  // Check profitability conditions
  const reasons: string[] = [];
  
  if (betAmount < MIN_BET_SIZE) {
    reasons.push(`Bet $${betAmount.toFixed(2)} below min $${MIN_BET_SIZE}`);
  }
  
  if (probability < MIN_PROBABILITY) {
    reasons.push(`Probability ${(probability * 100).toFixed(1)}% below min ${MIN_PROBABILITY * 100}%`);
  }
  
  if (netExpectedValue <= 0) {
    reasons.push(`Negative EV after costs: $${netExpectedValue.toFixed(3)}`);
  }
  
  const edge = (probability - 0.5) * 100;
  if (edge < MIN_EDGE_PCT) {
    reasons.push(`Edge ${edge.toFixed(1)}% below min ${MIN_EDGE_PCT}%`);
  }

  const isProfitable = reasons.length === 0;

  return {
    isProfitable,
    expectedValue,
    totalCosts,
    netExpectedValue,
    requiredWinRate: requiredWinRate * 100,
    actualWinRate: probability * 100,
    minBetSize: MIN_BET_SIZE,
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  };
}

/**
 * Calculate minimum bet size to be profitable at given probability
 */
export function getMinProfitableBet(
  probability: number,
  price: number,
  costs: CostEstimate = DEFAULT_COSTS
): number {
  // We need: netEV > 0
  // netEV = probability * (betAmount / price) - betAmount - fixedCosts - betAmount * variablePct
  // Let's solve for betAmount where netEV = 0:
  // probability * betAmount / price = betAmount + fixedCosts + betAmount * variablePct
  // betAmount * (probability / price - 1 - variablePct) = fixedCosts
  // betAmount = fixedCosts / (probability / price - 1 - variablePct)
  
  const variablePct = costs.totalVariablePct / 100;
  const coefficient = (probability / price) - 1 - variablePct;
  
  if (coefficient <= 0) {
    return Infinity; // Not profitable at any bet size
  }
  
  const minBet = costs.totalFixedUSD / coefficient;
  
  // Round up and ensure minimum
  return Math.max(MIN_BET_SIZE, Math.ceil(minBet * 100) / 100);
}

/**
 * Check if we should enter a market
 */
export function shouldEnterMarket(
  probability: number,
  price: number,
  availableBudget: number,
  costs: CostEstimate = DEFAULT_COSTS
): { enter: boolean; suggestedBet: number; reason?: string } {
  
  // Quick checks
  if (probability < MIN_PROBABILITY) {
    return {
      enter: false,
      suggestedBet: 0,
      reason: `Probability ${(probability * 100).toFixed(1)}% too low (need ${MIN_PROBABILITY * 100}%+)`,
    };
  }
  
  // Calculate minimum profitable bet
  const minBet = getMinProfitableBet(probability, price, costs);
  
  if (minBet === Infinity) {
    return {
      enter: false,
      suggestedBet: 0,
      reason: `No profitable bet size exists at ${(probability * 100).toFixed(1)}% probability`,
    };
  }
  
  if (minBet > availableBudget) {
    return {
      enter: false,
      suggestedBet: 0,
      reason: `Min profitable bet $${minBet.toFixed(2)} exceeds budget $${availableBudget.toFixed(2)}`,
    };
  }
  
  // Calculate optimal bet size (Kelly criterion lite)
  // Kelly: f = (bp - q) / b where b = odds, p = prob, q = 1-p
  // Simplified: bet fraction of edge
  const edge = probability - price;  // Our edge
  const kellyFraction = edge / (1 - price);  // Simplified Kelly
  const kellySuggestedBet = availableBudget * Math.min(kellyFraction, 0.25);  // Cap at 25%
  
  // Use the larger of min profitable bet and Kelly suggestion
  const suggestedBet = Math.max(minBet, Math.min(kellySuggestedBet, availableBudget * 0.5));
  
  // Final profitability check
  const check = checkProfitability(suggestedBet, probability, price, costs);
  
  if (!check.isProfitable) {
    return {
      enter: false,
      suggestedBet: 0,
      reason: check.reason,
    };
  }
  
  return {
    enter: true,
    suggestedBet: Math.round(suggestedBet * 100) / 100,
  };
}

/**
 * Log profitability analysis
 */
export function logProfitabilityCheck(
  marketName: string,
  betAmount: number,
  probability: number,
  price: number
): void {
  const check = checkProfitability(betAmount, probability, price);
  
  const status = check.isProfitable ? '✅ PROFITABLE' : '❌ SKIP';
  
  console.log(`\n📊 Profitability Check: ${marketName}`);
  console.log(`   Bet: $${betAmount.toFixed(2)} | Prob: ${(probability * 100).toFixed(1)}% | Price: ${(price * 100).toFixed(1)}%`);
  console.log(`   Costs: $${check.totalCosts.toFixed(3)} | Net EV: $${check.netExpectedValue.toFixed(3)}`);
  console.log(`   Required WR: ${check.requiredWinRate.toFixed(1)}% | Status: ${status}`);
  
  if (check.reason) {
    console.log(`   Reason: ${check.reason}`);
  }
}

// Export defaults for external use
export const PROFITABILITY_DEFAULTS = {
  costs: DEFAULT_COSTS,
  minBetSize: MIN_BET_SIZE,
  minEdgePct: MIN_EDGE_PCT,
  minProbability: MIN_PROBABILITY,
};
