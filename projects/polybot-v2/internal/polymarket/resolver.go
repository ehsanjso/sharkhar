package polymarket

import (
	"context"
	"time"

	"github.com/rs/zerolog/log"
)

// PositionTracker tracks and resolves positions
type PositionTracker struct {
	client       *Client
	finder       *MarketFinder
	pendingPos   map[string]*TrackedPosition // positionID -> position
	onResolution func(posID string, won bool, payout float64)
}

// TrackedPosition is a position being tracked for resolution
type TrackedPosition struct {
	ID           string
	ConditionID  string
	TokenID      string
	Side         string // "YES" or "NO"
	Shares       float64
	Cost         float64
	PlacedAt     time.Time
	ExpiresAt    time.Time
}

// NewPositionTracker creates a new position tracker
func NewPositionTracker(client *Client) *PositionTracker {
	return &PositionTracker{
		client:     client,
		finder:     NewMarketFinder(client),
		pendingPos: make(map[string]*TrackedPosition),
	}
}

// OnResolution sets the callback for when positions resolve
func (pt *PositionTracker) OnResolution(cb func(posID string, won bool, payout float64)) {
	pt.onResolution = cb
}

// Track adds a position to be tracked
func (pt *PositionTracker) Track(pos *TrackedPosition) {
	pt.pendingPos[pos.ID] = pos
	log.Info().Str("posID", pos.ID).Str("side", pos.Side).Float64("shares", pos.Shares).Msg("Tracking position")
}

// Untrack removes a position from tracking
func (pt *PositionTracker) Untrack(posID string) {
	delete(pt.pendingPos, posID)
}

// CheckResolutions checks all pending positions for resolution
func (pt *PositionTracker) CheckResolutions(ctx context.Context) error {
	if len(pt.pendingPos) == 0 {
		return nil
	}
	
	log.Debug().Int("pending", len(pt.pendingPos)).Msg("Checking position resolutions")
	
	toRemove := []string{}
	
	for posID, pos := range pt.pendingPos {
		// Check if market has resolved
		resolution, err := pt.finder.CheckResolution(ctx, pos.ConditionID)
		if err != nil {
			log.Error().Err(err).Str("posID", posID).Msg("Failed to check resolution")
			continue
		}
		
		if resolution == nil {
			// Not resolved yet - check if expired
			if time.Now().After(pos.ExpiresAt.Add(30 * time.Minute)) {
				log.Warn().Str("posID", posID).Msg("Position expired without resolution")
				toRemove = append(toRemove, posID)
			}
			continue
		}
		
		// Market resolved!
		won := resolution.Winner == pos.Side
		var payout float64
		if won {
			payout = pos.Shares // $1 per share if win
		} else {
			payout = 0
		}
		
		log.Info().
			Str("posID", posID).
			Str("side", pos.Side).
			Str("winner", resolution.Winner).
			Bool("won", won).
			Float64("payout", payout).
			Msg("Position resolved")
		
		// Notify callback
		if pt.onResolution != nil {
			pt.onResolution(posID, won, payout)
		}
		
		toRemove = append(toRemove, posID)
	}
	
	// Clean up resolved positions
	for _, posID := range toRemove {
		delete(pt.pendingPos, posID)
	}
	
	return nil
}

// GetPendingCount returns number of pending positions
func (pt *PositionTracker) GetPendingCount() int {
	return len(pt.pendingPos)
}

// GetPendingPositions returns all pending positions
func (pt *PositionTracker) GetPendingPositions() []*TrackedPosition {
	positions := make([]*TrackedPosition, 0, len(pt.pendingPos))
	for _, pos := range pt.pendingPos {
		positions = append(positions, pos)
	}
	return positions
}
