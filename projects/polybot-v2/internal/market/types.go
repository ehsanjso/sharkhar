package market

import "time"

// Market represents a Polymarket prediction market
type Market struct {
	ID              string    `json:"id"`
	Question        string    `json:"question"`
	Slug            string    `json:"slug"`
	Asset           string    // BTC, ETH, SOL (parsed from question)
	Timeframe       string    // 5min, 15min, etc
	StartTime       time.Time
	EndTime         time.Time
	UpTokenID       string
	DownTokenID     string
	UpPrice         float64
	DownPrice       float64
	Active          bool
}

// OrderSide for placing orders
type OrderSide string

const (
	Buy  OrderSide = "BUY"
	Sell OrderSide = "SELL"
)

// Order represents an order to place
type Order struct {
	TokenID   string
	Side      OrderSide
	Price     float64
	Size      float64 // In shares
	OrderType string  // FOK, GTC, etc
}

// OrderResult from placing an order
type OrderResult struct {
	OrderID   string
	Status    string
	Filled    float64
	AvgPrice  float64
	Timestamp time.Time
}

// Position in a market
type Position struct {
	TokenID string
	Size    float64
	AvgCost float64
}

// PriceUpdate from WebSocket
type PriceUpdate struct {
	Asset     string
	Price     float64
	Timestamp time.Time
}

// MarketWindow represents a trading window (e.g., 5-min candle)
type MarketWindow struct {
	Market    *Market
	OpenPrice float64
	OpenTime  time.Time
	CloseTime time.Time
}
