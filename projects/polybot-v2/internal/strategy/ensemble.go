package strategy

import (
	"fmt"
	"math"
)

// EnsembleStrategy combines multiple signals and bets when majority agree
type EnsembleStrategy struct {
	minConfidence float64
	minSignals    int // Minimum signals that must agree
}

func NewEnsembleStrategy() *EnsembleStrategy {
	return &EnsembleStrategy{
		minConfidence: 0.6,
		minSignals:    3,
	}
}

func (e *EnsembleStrategy) ID() string {
	return "ensemble"
}

func (e *EnsembleStrategy) Name() string {
	return "Ensemble Consensus"
}

func (e *EnsembleStrategy) MinConfidence() float64 {
	return e.minConfidence
}

func (e *EnsembleStrategy) Decide(market *MarketInfo, prices *PriceHistory) *Signal {
	if len(prices.Prices) < 10 {
		return nil // Need enough price history
	}

	// Collect signals from sub-strategies
	signals := []struct {
		name string
		side string
		conf float64
	}{
		e.momentumSignal(prices),
		e.trendSignal(prices),
		e.volatilitySignal(prices),
		e.marketProbSignal(market),
	}

	// Count votes
	upVotes, downVotes := 0, 0
	var totalConf float64
	var reasons []string

	for _, sig := range signals {
		if sig.side == "UP" {
			upVotes++
			totalConf += sig.conf
			reasons = append(reasons, fmt.Sprintf("%s→UP(%.0f%%)", sig.name, sig.conf*100))
		} else if sig.side == "DOWN" {
			downVotes++
			totalConf += sig.conf
			reasons = append(reasons, fmt.Sprintf("%s→DOWN(%.0f%%)", sig.name, sig.conf*100))
		}
	}

	// Need minimum signals agreeing
	var side string
	var votes int
	if upVotes >= e.minSignals {
		side = "UP"
		votes = upVotes
	} else if downVotes >= e.minSignals {
		side = "DOWN"
		votes = downVotes
	} else {
		return nil // No consensus
	}

	// Average confidence
	avgConf := totalConf / float64(votes)
	if avgConf < e.minConfidence {
		return nil
	}

	// Calculate bet size based on confidence
	amount := e.calculateBetSize(avgConf)

	return &Signal{
		Side:       side,
		Confidence: avgConf,
		Amount:     amount,
		Reason:     fmt.Sprintf("%d/%d signals agree: %v", votes, len(signals), reasons),
	}
}

// momentumSignal looks at recent price movement
func (e *EnsembleStrategy) momentumSignal(prices *PriceHistory) struct {
	name string
	side string
	conf float64
} {
	name := "momentum"
	if len(prices.Prices) < 5 {
		return struct {
			name string
			side string
			conf float64
		}{name, "", 0}
	}

	// Compare recent vs earlier prices
	recent := avg(prices.Prices[len(prices.Prices)-3:])
	earlier := avg(prices.Prices[len(prices.Prices)-6 : len(prices.Prices)-3])
	
	change := (recent - earlier) / earlier * 100
	
	var side string
	if change > 0.05 {
		side = "UP"
	} else if change < -0.05 {
		side = "DOWN"
	}
	
	conf := math.Min(math.Abs(change)*10, 1.0)
	
	return struct {
		name string
		side string
		conf float64
	}{name, side, conf}
}

// trendSignal looks at overall trend direction
func (e *EnsembleStrategy) trendSignal(prices *PriceHistory) struct {
	name string
	side string
	conf float64
} {
	name := "trend"
	change := (prices.Current - prices.Open) / prices.Open * 100
	
	var side string
	if change > 0.02 {
		side = "UP"
	} else if change < -0.02 {
		side = "DOWN"
	}
	
	conf := math.Min(math.Abs(change)*5, 1.0)
	
	return struct {
		name string
		side string
		conf float64
	}{name, side, conf}
}

// volatilitySignal checks if price is breaking out
func (e *EnsembleStrategy) volatilitySignal(prices *PriceHistory) struct {
	name string
	side string
	conf float64
} {
	name := "volatility"
	
	// Check if current price is near high/low
	priceRange := prices.High - prices.Low
	if priceRange == 0 {
		return struct {
			name string
			side string
			conf float64
		}{name, "", 0}
	}
	
	positionInRange := (prices.Current - prices.Low) / priceRange
	
	var side string
	var conf float64
	if positionInRange > 0.8 {
		side = "UP"
		conf = positionInRange
	} else if positionInRange < 0.2 {
		side = "DOWN"
		conf = 1 - positionInRange
	}
	
	return struct {
		name string
		side string
		conf float64
	}{name, side, conf}
}

// marketProbSignal uses Polymarket's own probabilities
func (e *EnsembleStrategy) marketProbSignal(market *MarketInfo) struct {
	name string
	side string
	conf float64
} {
	name := "market"
	
	var side string
	var conf float64
	if market.UpProbability > 0.55 {
		side = "UP"
		conf = market.UpProbability
	} else if market.DownProbability > 0.55 {
		side = "DOWN"
		conf = market.DownProbability
	}
	
	return struct {
		name string
		side string
		conf float64
	}{name, side, conf}
}

// calculateBetSize based on confidence (Kelly-inspired)
func (e *EnsembleStrategy) calculateBetSize(confidence float64) float64 {
	// Base bet $5, scale up with confidence
	base := 5.0
	// At 60% confidence: $5, at 80%: $10, at 90%: $15
	multiplier := (confidence - 0.5) * 5 // 0.5 to 1.0 -> 0 to 2.5
	return base + (base * multiplier)
}

// Helper function
func avg(nums []float64) float64 {
	if len(nums) == 0 {
		return 0
	}
	var sum float64
	for _, n := range nums {
		sum += n
	}
	return sum / float64(len(nums))
}
