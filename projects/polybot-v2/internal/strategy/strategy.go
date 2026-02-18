package strategy

import (
	"time"
)

// Signal represents a trading signal from a strategy
type Signal struct {
	Side       string  // "UP" or "DOWN"
	Confidence float64 // 0.0 to 1.0
	Amount     float64 // Suggested bet amount
	Reason     string  // Human-readable reason
}

// MarketInfo contains current market state
type MarketInfo struct {
	ID              string
	Asset           string    // BTC, ETH, SOL
	Timeframe       string    // 5min, 15min, etc
	StartTime       time.Time
	EndTime         time.Time
	OpenPrice       float64
	CurrentPrice    float64
	TargetPrice     float64   // Polymarket threshold price
	YesPrice        float64   // Price of YES token (0-1)
	NoPrice         float64   // Price of NO token (0-1)
	UpProbability   float64
	DownProbability float64
	UpTokenID       string
	DownTokenID     string
}

// PriceHistory for strategy analysis
type PriceHistory struct {
	Prices    []float64
	Times     []time.Time
	High      float64
	Low       float64
	Open      float64
	Current   float64
}

// Strategy interface - all strategies must implement this
type Strategy interface {
	// ID returns unique identifier
	ID() string
	
	// Name returns human-readable name
	Name() string
	
	// Decide analyzes market and returns a signal (or nil to skip)
	Decide(market *MarketInfo, prices *PriceHistory) *Signal
	
	// MinConfidence returns minimum confidence to act on
	MinConfidence() float64
}

// Registry holds all available strategies
type Registry struct {
	strategies map[string]Strategy
}

func NewRegistry() *Registry {
	return &Registry{
		strategies: make(map[string]Strategy),
	}
}

func (r *Registry) Register(s Strategy) {
	r.strategies[s.ID()] = s
}

func (r *Registry) Get(id string) Strategy {
	return r.strategies[id]
}

func (r *Registry) List() []Strategy {
	var list []Strategy
	for _, s := range r.strategies {
		list = append(list, s)
	}
	return list
}

// DefaultRegistry with built-in strategies
func DefaultRegistry() *Registry {
	r := NewRegistry()
	r.Register(NewEnsembleStrategy())
	r.Register(NewSimpleStrategy())
	return r
}
