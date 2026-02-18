package strategy

import (
	"fmt"
	"math"
)

// SimpleStrategy follows BTC price movement - like v1
type SimpleStrategy struct {
	minMovement float64 // Minimum price movement % to trade
}

func NewSimpleStrategy() *SimpleStrategy {
	return &SimpleStrategy{
		minMovement: 0.02, // 0.02% minimum movement
	}
}

func (s *SimpleStrategy) ID() string {
	return "simple"
}

func (s *SimpleStrategy) Name() string {
	return "Simple Follow Price"
}

func (s *SimpleStrategy) MinConfidence() float64 {
	return 0.5
}

func (s *SimpleStrategy) Decide(market *MarketInfo, prices *PriceHistory) *Signal {
	if prices == nil || len(prices.Prices) < 5 {
		return nil
	}

	// Calculate price change from open
	change := (prices.Current - prices.Open) / prices.Open * 100
	absChange := math.Abs(change)
	
	// Need minimum movement
	if absChange < s.minMovement {
		return nil
	}
	
	// Follow the trend
	var side string
	if change > 0 {
		side = "UP"
	} else {
		side = "DOWN"
	}
	
	// Confidence based on movement strength (cap at 80%)
	confidence := math.Min(0.5 + absChange*5, 0.8)
	
	// Bet $5 (minimum)
	amount := 5.0
	
	return &Signal{
		Side:       side,
		Confidence: confidence,
		Amount:     amount,
		Reason:     fmt.Sprintf("BTC %+.3f%% → %s", change, side),
	}
}
