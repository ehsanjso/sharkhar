package pricefeed

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

// BinanceFeed provides real-time prices via WebSocket
type BinanceFeed struct {
	symbols   []string
	conn      *websocket.Conn
	prices    map[string]float64
	callbacks []func(symbol string, price float64)
	mu        sync.RWMutex
	stopCh    chan struct{}
	wg        sync.WaitGroup
}

// BinanceStreamMsg is the message format from Binance
type BinanceStreamMsg struct {
	Stream string          `json:"stream"`
	Data   json.RawMessage `json:"data"`
}

// BinanceMiniTicker is the mini ticker payload
type BinanceMiniTicker struct {
	Symbol    string          `json:"s"`  // Symbol
	Close     string          `json:"c"`  // Close price
	Open      string          `json:"o"`  // Open price
	High      string          `json:"h"`  // High price
	Low       string          `json:"l"`  // Low price
	Volume    string          `json:"v"`  // Total traded base asset volume
	QuoteVol  string          `json:"q"`  // Total traded quote asset volume
	EventTime json.RawMessage `json:"E"`  // Event time (can be string or int)
}

// NewBinanceFeed creates a new Binance price feed
func NewBinanceFeed(symbols []string) *BinanceFeed {
	return &BinanceFeed{
		symbols: symbols,
		prices:  make(map[string]float64),
		stopCh:  make(chan struct{}),
	}
}

// OnPrice registers a callback for price updates
func (f *BinanceFeed) OnPrice(cb func(symbol string, price float64)) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.callbacks = append(f.callbacks, cb)
}

// GetPrice returns the current price for a symbol
func (f *BinanceFeed) GetPrice(symbol string) float64 {
	f.mu.RLock()
	defer f.mu.RUnlock()
	return f.prices[symbol]
}

// Start connects to Binance and begins streaming prices
func (f *BinanceFeed) Start(ctx context.Context) error {
	// Build WebSocket URL for combined streams
	// Format: wss://stream.binance.com:9443/stream?streams=btcusdt@miniTicker/ethusdt@miniTicker
	streams := ""
	for i, sym := range f.symbols {
		if i > 0 {
			streams += "/"
		}
		streams += fmt.Sprintf("%s@miniTicker", sym)
	}
	
	wsURL := fmt.Sprintf("wss://stream.binance.com:9443/stream?streams=%s", streams)
	
	log.Info().Msgf("📡 Connecting to Binance: %s", wsURL)
	
	conn, _, err := websocket.DefaultDialer.DialContext(ctx, wsURL, nil)
	if err != nil {
		return fmt.Errorf("websocket connect: %w", err)
	}
	f.conn = conn
	
	log.Info().Msg("✅ Binance WebSocket connected")
	
	// Start reader goroutine
	f.wg.Add(1)
	go f.readLoop(ctx)
	
	// Start ping goroutine to keep connection alive
	f.wg.Add(1)
	go f.pingLoop(ctx)
	
	return nil
}

// Stop closes the WebSocket connection
func (f *BinanceFeed) Stop() {
	close(f.stopCh)
	if f.conn != nil {
		f.conn.Close()
	}
	f.wg.Wait()
}

func (f *BinanceFeed) readLoop(ctx context.Context) {
	defer f.wg.Done()
	
	for {
		select {
		case <-ctx.Done():
			return
		case <-f.stopCh:
			return
		default:
		}
		
		_, message, err := f.conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				return
			}
			log.Error().Err(err).Msg("WebSocket read error")
			// Try to reconnect
			time.Sleep(5 * time.Second)
			if err := f.reconnect(ctx); err != nil {
				log.Error().Err(err).Msg("Reconnect failed")
			}
			continue
		}
		
		f.handleMessage(message)
	}
}

func (f *BinanceFeed) handleMessage(msg []byte) {
	var stream BinanceStreamMsg
	if err := json.Unmarshal(msg, &stream); err != nil {
		log.Error().Err(err).Msg("Failed to parse stream message")
		return
	}
	
	var ticker BinanceMiniTicker
	if err := json.Unmarshal(stream.Data, &ticker); err != nil {
		log.Error().Err(err).Msg("Failed to parse ticker data")
		return
	}
	
	price, err := strconv.ParseFloat(ticker.Close, 64)
	if err != nil {
		return
	}
	
	// Normalize symbol (BTCUSDT -> BTC)
	symbol := normalizeSymbol(ticker.Symbol)
	
	f.mu.Lock()
	f.prices[symbol] = price
	callbacks := make([]func(string, float64), len(f.callbacks))
	copy(callbacks, f.callbacks)
	f.mu.Unlock()
	
	// Notify callbacks
	for _, cb := range callbacks {
		cb(symbol, price)
	}
}

func (f *BinanceFeed) pingLoop(ctx context.Context) {
	defer f.wg.Done()
	
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			return
		case <-f.stopCh:
			return
		case <-ticker.C:
			if f.conn != nil {
				if err := f.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					log.Error().Err(err).Msg("Ping failed")
				}
			}
		}
	}
}

func (f *BinanceFeed) reconnect(ctx context.Context) error {
	if f.conn != nil {
		f.conn.Close()
	}
	return f.Start(ctx)
}

func normalizeSymbol(binanceSymbol string) string {
	// BTCUSDT -> BTC, ETHUSDT -> ETH
	switch binanceSymbol {
	case "BTCUSDT":
		return "BTC"
	case "ETHUSDT":
		return "ETH"
	case "SOLUSDT":
		return "SOL"
	case "BNBUSDT":
		return "BNB"
	case "XRPUSDT":
		return "XRP"
	default:
		// Strip USDT suffix
		if len(binanceSymbol) > 4 && binanceSymbol[len(binanceSymbol)-4:] == "USDT" {
			return binanceSymbol[:len(binanceSymbol)-4]
		}
		return binanceSymbol
	}
}

// SymbolToBinance converts our asset symbol to Binance format (lowercase required)
func SymbolToBinance(asset string) string {
	return strings.ToLower(asset) + "usdt"
}
