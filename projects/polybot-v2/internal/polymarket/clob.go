package polymarket

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/rs/zerolog/log"
)

const (
	// Polymarket CLOB API endpoints
	CLOBBaseURL     = "https://clob.polymarket.com"
	GammaBaseURL    = "https://gamma-api.polymarket.com"
	
	// Chain IDs
	PolygonMainnet = 137
)

// Client is the Polymarket CLOB API client
type Client struct {
	httpClient  *http.Client
	privateKey  *ecdsa.PrivateKey
	address     common.Address
	apiKey      string // Optional API key for higher rate limits
	funder      common.Address
	chainID     int
}

// Config for creating a new client
type Config struct {
	PrivateKey string // Hex-encoded private key (with or without 0x prefix)
	APIKey     string // Optional API key
}

// NewClient creates a new Polymarket CLOB client
func NewClient(cfg *Config) (*Client, error) {
	// Parse private key
	keyHex := cfg.PrivateKey
	if len(keyHex) >= 2 && keyHex[:2] == "0x" {
		keyHex = keyHex[2:]
	}
	
	privateKey, err := crypto.HexToECDSA(keyHex)
	if err != nil {
		return nil, fmt.Errorf("invalid private key: %w", err)
	}
	
	address := crypto.PubkeyToAddress(privateKey.PublicKey)
	
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		privateKey: privateKey,
		address:    address,
		apiKey:     cfg.APIKey,
		funder:     address, // Self-funded
		chainID:    PolygonMainnet,
	}, nil
}

// Address returns the wallet address
func (c *Client) Address() string {
	return c.address.Hex()
}

// Market represents a Polymarket market
type Market struct {
	ConditionID     string  `json:"condition_id"`
	QuestionID      string  `json:"question_id"`
	Question        string  `json:"question"`
	Description     string  `json:"description"`
	Slug            string  `json:"slug"`
	Active          bool    `json:"active"`
	Closed          bool    `json:"closed"`
	EndDateISO      string  `json:"end_date_iso"`
	GameStartTime   string  `json:"game_start_time,omitempty"`
	Tokens          []Token `json:"tokens"`
	MinimumOrderSize string `json:"minimum_order_size"`
	MinimumTickSize  string `json:"minimum_tick_size"`
}

// Token represents a market token (YES/NO outcome)
type Token struct {
	TokenID  string  `json:"token_id"`
	Outcome  string  `json:"outcome"`
	Price    float64 `json:"price"`
	Winner   bool    `json:"winner"`
}

// OrderRequest for placing orders
type OrderRequest struct {
	TokenID   string  `json:"tokenID"`
	Price     float64 `json:"price"`
	Size      float64 `json:"size"`
	Side      string  `json:"side"` // BUY or SELL
	Type      string  `json:"type"` // FOK, GTC, GTD
	Expiration int64  `json:"expiration,omitempty"`
}

// OrderResponse from placing an order
type OrderResponse struct {
	OrderID      string    `json:"orderID"`
	Status       string    `json:"status"`
	TransactTime time.Time `json:"transactTime"`
	AvgPrice     float64   `json:"avgPrice,omitempty"`
	FilledQty    float64   `json:"filledQty,omitempty"`
	ErrorCode    string    `json:"error_code,omitempty"`
	ErrorMsg     string    `json:"error_msg,omitempty"`
}

// Position represents a user's position
type Position struct {
	Asset      string  `json:"asset"`
	ConditionID string `json:"condition_id"`
	Size       float64 `json:"size"`
	AvgPrice   float64 `json:"avgPrice"`
	Outcome    string  `json:"outcome"`
}

// GetMarket fetches a market by condition ID
func (c *Client) GetMarket(ctx context.Context, conditionID string) (*Market, error) {
	url := fmt.Sprintf("%s/markets/%s", CLOBBaseURL, conditionID)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	c.addHeaders(req)
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}
	
	var market Market
	if err := json.NewDecoder(resp.Body).Decode(&market); err != nil {
		return nil, err
	}
	
	return &market, nil
}

// Event represents a Gamma API event (contains multiple markets)
type Event struct {
	ID          string   `json:"id"`
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Active      bool     `json:"active"`
	Closed      bool     `json:"closed"`
	Markets     []Market `json:"markets"`
}

// SearchMarkets searches for markets by query (legacy - use GetCryptoUpDownMarkets instead)
func (c *Client) SearchMarkets(ctx context.Context, query string, active bool) ([]Market, error) {
	url := fmt.Sprintf("%s/markets?_q=%s&active=%t&_limit=20", GammaBaseURL, query, active)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}
	
	var markets []Market
	if err := json.NewDecoder(resp.Body).Decode(&markets); err != nil {
		return nil, err
	}
	
	return markets, nil
}

// GetCryptoUpDownMarkets finds active crypto up/down candle markets via events API
func (c *Client) GetCryptoUpDownMarkets(ctx context.Context, asset string, timeframe string) ([]Market, error) {
	// Use events endpoint which has proper market data
	url := fmt.Sprintf("%s/events?active=true&closed=false&limit=500", GammaBaseURL)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}
	
	var events []Event
	if err := json.NewDecoder(resp.Body).Decode(&events); err != nil {
		return nil, err
	}
	
	// Filter for up/down markets matching asset and timeframe
	assetLower := strings.ToLower(asset)
	tfLower := strings.ToLower(timeframe)
	
	// Timeframe labels to match
	tfLabels := map[string][]string{
		"5min":  {"5m", "5min", "5-min"},
		"15min": {"15m", "15min", "15-min"},
		"1hr":   {"1h", "1hr", "hourly"},
		"4hr":   {"4h", "4hr"},
		"1day":  {"1d", "daily", "24h"},
	}
	
	var results []Market
	for _, event := range events {
		slug := strings.ToLower(event.Slug)
		title := strings.ToLower(event.Title)
		
		// Must be an up/down market
		if !strings.Contains(slug, "updown") && !strings.Contains(title, "up or down") {
			continue
		}
		
		// Must match asset
		if !strings.Contains(slug, assetLower) && !strings.Contains(title, assetLower) {
			continue
		}
		
		// Must match timeframe
		matchesTF := false
		labels := tfLabels[tfLower]
		if labels == nil {
			labels = []string{tfLower}
		}
		for _, label := range labels {
			if strings.Contains(slug, label) || strings.Contains(title, label) {
				matchesTF = true
				break
			}
		}
		if !matchesTF {
			continue
		}
		
		// Add all markets from this event
		results = append(results, event.Markets...)
	}
	
	log.Debug().Int("events", len(events)).Int("matching", len(results)).
		Str("asset", asset).Str("timeframe", timeframe).
		Msg("GetCryptoUpDownMarkets filtered results")
	
	return results, nil
}

// GetBTCMinuteMarkets finds active BTC 5-minute up/down markets using hardcoded slug pattern
func (c *Client) GetBTCMinuteMarkets(ctx context.Context) ([]Market, error) {
	return c.GetBTC5MinMarketsBySlug(ctx)
}

// GetBTC5MinMarketsBySlug fetches BTC 5-min markets by constructing expected slugs
// Slug format: btc-updown-5m-{TIMESTAMP}
func (c *Client) GetBTC5MinMarketsBySlug(ctx context.Context) ([]Market, error) {
	loc, _ := time.LoadLocation("America/New_York")
	now := time.Now().In(loc)
	
	// Calculate current and next few 5-minute window timestamps
	// Round down to nearest 5 minutes
	minute := now.Minute()
	roundedMinute := (minute / 5) * 5
	currentWindow := time.Date(now.Year(), now.Month(), now.Day(), now.Hour(), roundedMinute, 0, 0, loc)
	
	// Generate slugs for current and next few windows
	var slugs []string
	for i := -1; i <= 3; i++ { // Check from -5 min to +15 min
		windowTime := currentWindow.Add(time.Duration(i*5) * time.Minute)
		timestamp := windowTime.Unix()
		slug := fmt.Sprintf("btc-updown-5m-%d", timestamp)
		slugs = append(slugs, slug)
	}
	
	log.Debug().Strs("slugs", slugs).Msg("Checking BTC 5-min market slugs")
	
	var results []Market
	for _, slug := range slugs {
		market, err := c.GetEventBySlug(ctx, slug)
		if err != nil {
			log.Debug().Str("slug", slug).Err(err).Msg("Failed to fetch market by slug")
			continue
		}
		if market != nil {
			results = append(results, *market)
		}
	}
	
	log.Info().Int("found", len(results)).Msg("Found BTC 5-min markets by slug")
	return results, nil
}

// GetEventBySlug fetches a market event by its slug
func (c *Client) GetEventBySlug(ctx context.Context, slug string) (*Market, error) {
	url := fmt.Sprintf("%s/events?slug=%s", GammaBaseURL, slug)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API error %d", resp.StatusCode)
	}
	
	var events []GammaEvent
	if err := json.NewDecoder(resp.Body).Decode(&events); err != nil {
		return nil, err
	}
	
	if len(events) == 0 {
		return nil, nil
	}
	
	event := events[0]
	
	// Convert GammaEvent to Market format
	market := &Market{
		ConditionID: event.ConditionID,
		Question:    event.Title,
		Description: event.Description,
		Slug:        event.Slug,
		Active:      event.Active,
		Closed:      event.Closed,
		EndDateISO:  event.EndDate,
	}
	
	// Extract tokens from markets array
	if len(event.Markets) > 0 {
		m := event.Markets[0] // Use first market
		market.ConditionID = m.ConditionID
		market.Question = m.Question
		
		// Debug: log raw Gamma data
		log.Info().
			Str("outcomes_raw", m.Outcomes).
			Str("prices_raw", m.OutcomePrices).
			Str("tokens_raw", m.ClobTokenIds).
			Msg("Raw GammaMarket data")
		
		market.Tokens = m.ParseTokens()
		log.Info().Int("tokens", len(market.Tokens)).Msg("Using Gamma API prices")
	}
	
	return market, nil
}

// fetchTokenPrice gets best bid price from CLOB order book
func (c *Client) fetchTokenPrice(ctx context.Context, tokenID string) float64 {
	book, err := c.GetOrderBook(ctx, tokenID)
	if err != nil {
		log.Warn().Err(err).Str("token", tokenID[:16]+"...").Msg("Failed to fetch order book")
		return 0
	}
	
	log.Info().Int("asks", len(book.Asks)).Int("bids", len(book.Bids)).Str("token", tokenID[:16]+"...").Msg("Order book fetched")
	
	// Use best ask (lowest sell price) as the market price
	if len(book.Asks) > 0 {
		price, _ := strconv.ParseFloat(book.Asks[0].Price, 64)
		log.Info().Float64("askPrice", price).Msg("Using best ask")
		return price
	}
	
	// Fallback to best bid if no asks
	if len(book.Bids) > 0 {
		price, _ := strconv.ParseFloat(book.Bids[0].Price, 64)
		log.Info().Float64("bidPrice", price).Msg("Using best bid")
		return price
	}
	
	log.Warn().Msg("No asks or bids in order book")
	return 0
}

// GammaEvent represents the event structure from gamma API
type GammaEvent struct {
	ID          string        `json:"id"`
	Slug        string        `json:"slug"`
	Title       string        `json:"title"`
	Description string        `json:"description"`
	Active      bool          `json:"active"`
	Closed      bool          `json:"closed"`
	EndDate     string        `json:"endDate"`
	ConditionID string        `json:"conditionId"`
	Markets     []GammaMarket `json:"markets"`
}

// GammaMarket represents a market within an event
type GammaMarket struct {
	ConditionID   string `json:"conditionId"`
	Question      string `json:"question"`
	ClobTokenIds  string `json:"clobTokenIds"`  // JSON string array
	OutcomePrices string `json:"outcomePrices"` // JSON string array
	Outcomes      string `json:"outcomes"`      // JSON string array
}

// ParseTokens extracts token info from the JSON string fields
func (m *GammaMarket) ParseTokens() []Token {
	var tokenIds, outcomes, prices []string
	
	json.Unmarshal([]byte(m.ClobTokenIds), &tokenIds)
	json.Unmarshal([]byte(m.Outcomes), &outcomes)
	json.Unmarshal([]byte(m.OutcomePrices), &prices)
	
	log.Info().Strs("outcomes", outcomes).Strs("prices", prices).Msg("ParseTokens: Gamma API data")
	
	var tokens []Token
	for i := 0; i < len(tokenIds) && i < len(outcomes); i++ {
		price := 0.0
		if i < len(prices) {
			price, _ = strconv.ParseFloat(prices[i], 64)
		}
		tokens = append(tokens, Token{
			TokenID: tokenIds[i],
			Outcome: outcomes[i],
			Price:   price,
			Winner:  price >= 0.99, // Winner if price is ~1
		})
	}
	return tokens
}

func parsePrice(s string) float64 {
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

// PlaceOrder places an order on the CLOB
func (c *Client) PlaceOrder(ctx context.Context, order *OrderRequest) (*OrderResponse, error) {
	// Create the order payload
	payload := map[string]interface{}{
		"tokenID":    order.TokenID,
		"price":      strconv.FormatFloat(order.Price, 'f', 4, 64),
		"size":       strconv.FormatFloat(order.Size, 'f', 2, 64),
		"side":       order.Side,
		"type":       order.Type,
		"feeRateBps": "0",
		"nonce":      strconv.FormatInt(time.Now().UnixMilli(), 10),
	}
	
	if order.Expiration > 0 {
		payload["expiration"] = strconv.FormatInt(order.Expiration, 10)
	}
	
	// Sign the order
	orderHash := c.hashOrder(payload)
	signature, err := c.signHash(orderHash)
	if err != nil {
		return nil, fmt.Errorf("sign order: %w", err)
	}
	
	payload["signature"] = signature
	payload["owner"] = c.address.Hex()
	
	jsonBody, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	
	url := fmt.Sprintf("%s/order", CLOBBaseURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}
	
	c.addHeaders(req)
	req.Header.Set("Content-Type", "application/json")
	
	log.Debug().Str("payload", string(jsonBody)).Msg("Placing order")
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("order failed %d: %s", resp.StatusCode, string(body))
	}
	
	var result OrderResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}
	
	return &result, nil
}

// GetPositions fetches current positions
func (c *Client) GetPositions(ctx context.Context) ([]Position, error) {
	url := fmt.Sprintf("%s/positions?user=%s", CLOBBaseURL, c.address.Hex())
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	c.addHeaders(req)
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}
	
	var positions []Position
	if err := json.NewDecoder(resp.Body).Decode(&positions); err != nil {
		return nil, err
	}
	
	return positions, nil
}

// GetOrderBook fetches the order book for a token
func (c *Client) GetOrderBook(ctx context.Context, tokenID string) (*OrderBook, error) {
	url := fmt.Sprintf("%s/book?token_id=%s", CLOBBaseURL, tokenID)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, err
	}
	
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}
	
	var book OrderBook
	if err := json.NewDecoder(resp.Body).Decode(&book); err != nil {
		return nil, err
	}
	
	return &book, nil
}

// OrderBook represents the order book
type OrderBook struct {
	Market      string       `json:"market"`
	AssetID     string       `json:"asset_id"`
	Bids        []BookLevel  `json:"bids"`
	Asks        []BookLevel  `json:"asks"`
	Timestamp   string       `json:"timestamp"`
}

// BookLevel is a price level in the order book
type BookLevel struct {
	Price string `json:"price"`
	Size  string `json:"size"`
}

func (c *Client) addHeaders(req *http.Request) {
	req.Header.Set("Accept", "application/json")
	if c.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
	}
}

func (c *Client) hashOrder(order map[string]interface{}) []byte {
	// Simplified order hash - in production, follow EIP-712 typed data
	data := fmt.Sprintf("%s:%s:%s:%s:%s",
		order["tokenID"],
		order["price"],
		order["size"],
		order["side"],
		order["nonce"],
	)
	return crypto.Keccak256([]byte(data))
}

func (c *Client) signHash(hash []byte) (string, error) {
	// Ethereum personal sign prefix
	prefixedHash := crypto.Keccak256(
		[]byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d", len(hash))),
		hash,
	)
	
	sig, err := crypto.Sign(prefixedHash, c.privateKey)
	if err != nil {
		return "", err
	}
	
	// Adjust V value for Ethereum
	if sig[64] < 27 {
		sig[64] += 27
	}
	
	return "0x" + common.Bytes2Hex(sig), nil
}

// CalculateShares calculates number of shares for a given USD amount
func CalculateShares(usdAmount, price float64) float64 {
	if price <= 0 || price >= 1 {
		return 0
	}
	// shares = usd / price
	return usdAmount / price
}

// CalculatePayout calculates potential payout
func CalculatePayout(shares, price float64) float64 {
	// If win: shares * $1 = shares
	// Cost: shares * price
	// Profit: shares - (shares * price) = shares * (1 - price)
	return shares
}

// CalculateROI calculates return on investment if the bet wins
func CalculateROI(price float64) float64 {
	if price <= 0 || price >= 1 {
		return 0
	}
	// ROI = (1 - price) / price = 1/price - 1
	return (1 - price) / price * 100
}

// ValidateOrder checks if an order is valid
func ValidateOrder(order *OrderRequest) error {
	if order.TokenID == "" {
		return fmt.Errorf("tokenID required")
	}
	if order.Price <= 0 || order.Price >= 1 {
		return fmt.Errorf("price must be between 0 and 1")
	}
	if order.Size <= 0 {
		return fmt.Errorf("size must be positive")
	}
	if order.Side != "BUY" && order.Side != "SELL" {
		return fmt.Errorf("side must be BUY or SELL")
	}
	return nil
}

// Helper to convert big.Float to float64 (for USDC amounts)
func BigFloatToFloat64(bf *big.Float) float64 {
	f, _ := bf.Float64()
	return f
}
