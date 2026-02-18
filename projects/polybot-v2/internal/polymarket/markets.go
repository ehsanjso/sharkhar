package polymarket

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

// BTCMinuteMarket represents a parsed BTC minute market
type BTCMinuteMarket struct {
	ConditionID  string
	Question     string
	TargetPrice  float64
	Direction    string // "up" or "down"
	StartTime    time.Time
	EndTime      time.Time
	UpTokenID    string
	DownTokenID  string
	UpPrice      float64
	DownPrice    float64
	Active       bool
}

// MarketFinder finds and manages minute markets
type MarketFinder struct {
	client  *Client
	markets map[string]*BTCMinuteMarket // conditionID -> market
}

// NewMarketFinder creates a new market finder
func NewMarketFinder(client *Client) *MarketFinder {
	return &MarketFinder{
		client:  client,
		markets: make(map[string]*BTCMinuteMarket),
	}
}

// FindNextMarkets finds upcoming BTC minute markets
func (f *MarketFinder) FindNextMarkets(ctx context.Context) ([]*BTCMinuteMarket, error) {
	// Search for BTC minute markets
	markets, err := f.client.GetBTCMinuteMarkets(ctx)
	if err != nil {
		return nil, fmt.Errorf("search markets: %w", err)
	}
	
	log.Info().Msgf("Found %d BTC minute market results", len(markets))
	
	var results []*BTCMinuteMarket
	now := time.Now()
	
	for _, m := range markets {
		if !m.Active || m.Closed {
			continue
		}
		
		parsed := f.parseMarket(&m)
		if parsed == nil {
			continue
		}
		
		// Only include markets that haven't ended yet
		if parsed.EndTime.After(now) {
			results = append(results, parsed)
			f.markets[m.ConditionID] = parsed
		}
	}
	
	log.Info().Msgf("Filtered to %d active upcoming markets", len(results))
	
	return results, nil
}

// GetMarketForWindow finds the market that corresponds to a specific time window
func (f *MarketFinder) GetMarketForWindow(ctx context.Context, windowStart time.Time) (*BTCMinuteMarket, error) {
	markets, err := f.FindNextMarkets(ctx)
	if err != nil {
		return nil, err
	}
	
	// Find market closest to our window start
	for _, m := range markets {
		// Check if market window overlaps with our target
		if m.StartTime.Before(windowStart.Add(5*time.Minute)) && m.EndTime.After(windowStart) {
			return m, nil
		}
	}
	
	return nil, fmt.Errorf("no market found for window starting at %s", windowStart.Format("15:04"))
}

// parseMarket extracts info from a Polymarket market
func (f *MarketFinder) parseMarket(m *Market) *BTCMinuteMarket {
	// Parse question like "Will BTC be above $97,500 at 3:15 PM ET?"
	// or "BTC >= $97,500 at 15:15 ET?"
	
	priceRe := regexp.MustCompile(`\$?([\d,]+(?:\.\d+)?)`)
	timeRe := regexp.MustCompile(`(\d{1,2}):(\d{2})\s*(AM|PM|ET)?`)
	
	priceMatch := priceRe.FindStringSubmatch(m.Question)
	timeMatch := timeRe.FindStringSubmatch(m.Question)
	
	if priceMatch == nil || timeMatch == nil {
		log.Debug().Str("question", m.Question).Msg("Could not parse market question")
		return nil
	}
	
	// Parse price
	priceStr := strings.ReplaceAll(priceMatch[1], ",", "")
	targetPrice, err := strconv.ParseFloat(priceStr, 64)
	if err != nil {
		return nil
	}
	
	// Parse time
	hour, _ := strconv.Atoi(timeMatch[1])
	minute, _ := strconv.Atoi(timeMatch[2])
	
	// Handle AM/PM
	if len(timeMatch) > 3 && timeMatch[3] == "PM" && hour != 12 {
		hour += 12
	} else if len(timeMatch) > 3 && timeMatch[3] == "AM" && hour == 12 {
		hour = 0
	}
	
	// Build end time (assume today, ET timezone)
	now := time.Now()
	loc, _ := time.LoadLocation("America/New_York")
	endTime := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, loc)
	
	// If end time is in the past, it might be tomorrow's market
	if endTime.Before(now) {
		endTime = endTime.Add(24 * time.Hour)
	}
	
	// Start time is typically 5 minutes before end for minute markets
	startTime := endTime.Add(-5 * time.Minute)
	
	// Determine direction from question
	direction := "up"
	q := strings.ToLower(m.Question)
	if strings.Contains(q, "below") || strings.Contains(q, "<") {
		direction = "down"
	}
	
	// Find Up/Down tokens (BTC markets use "Up"/"Down", others use "Yes"/"No")
	var upTokenID, downTokenID string
	var upPrice, downPrice float64
	
	for _, t := range m.Tokens {
		outcome := strings.ToLower(t.Outcome)
		if outcome == "yes" || outcome == "up" {
			upTokenID = t.TokenID
			upPrice = t.Price
		} else if outcome == "no" || outcome == "down" {
			downTokenID = t.TokenID
			downPrice = t.Price
		}
	}
	
	log.Debug().Str("upToken", upTokenID).Str("downToken", downTokenID).
		Float64("upPrice", upPrice).Float64("downPrice", downPrice).
		Msg("Parsed market tokens")
	
	return &BTCMinuteMarket{
		ConditionID: m.ConditionID,
		Question:    m.Question,
		TargetPrice: targetPrice,
		Direction:   direction,
		StartTime:   startTime,
		EndTime:     endTime,
		UpTokenID:   upTokenID,
		DownTokenID: downTokenID,
		UpPrice:     upPrice,
		DownPrice:   downPrice,
		Active:      m.Active,
	}
}

// Resolution result
type Resolution struct {
	ConditionID string
	Winner      string // "YES" or "NO"
	FinalPrice  float64
	ResolvedAt  time.Time
}

// CheckResolution checks if a market has resolved
func (f *MarketFinder) CheckResolution(ctx context.Context, conditionID string) (*Resolution, error) {
	market, err := f.client.GetMarket(ctx, conditionID)
	if err != nil {
		return nil, err
	}
	
	if !market.Closed {
		return nil, nil // Not resolved yet
	}
	
	var winner string
	for _, t := range market.Tokens {
		if t.Winner {
			winner = t.Outcome
			break
		}
	}
	
	if winner == "" {
		return nil, nil // Resolved but no winner determined yet
	}
	
	return &Resolution{
		ConditionID: conditionID,
		Winner:      winner,
		ResolvedAt:  time.Now(),
	}, nil
}
