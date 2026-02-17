package engine

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/ehsanjso/polybot/internal/db"
	"github.com/ehsanjso/polybot/internal/notify"
	"github.com/ehsanjso/polybot/internal/polymarket"
	"github.com/ehsanjso/polybot/internal/pricefeed"
	"github.com/ehsanjso/polybot/internal/strategy"
	"github.com/rs/zerolog/log"
)

// Engine is the main trading engine
type Engine struct {
	db         *db.DB
	polyClient *polymarket.Client
	finder     *polymarket.MarketFinder
	tracker    *polymarket.PositionTracker
	telegram   *notify.Telegram
	strategies *strategy.Registry
	priceFeed  *pricefeed.BinanceFeed
	
	// Price tracking
	prices     map[string]float64 // asset -> price
	priceHist  map[string][]PricePoint
	priceMu    sync.RWMutex
	
	// State
	running    bool
	stopCh     chan struct{}
	wg         sync.WaitGroup
	config     *Config
}

// PricePoint with timestamp
type PricePoint struct {
	Price float64
	Time  time.Time
}

// Config for the engine
type Config struct {
	DB             *db.DB
	WalletAddress  string
	RPCEndpoints   []string
	TelegramToken  string
	TelegramChat   string
	PrivateKey     string
	PolymarketKey  string
	Markets        []MarketConfig
	Assets         []string // Assets to track (BTC, ETH, SOL)
}

type MarketConfig struct {
	Asset     string
	Timeframe string
	Enabled   bool
}

// New creates a new trading engine
func New(cfg *Config) *Engine {
	// Default assets if not specified
	if len(cfg.Assets) == 0 {
		cfg.Assets = []string{"BTC"}
	}
	
	// Convert assets to Binance symbols
	binanceSymbols := make([]string, len(cfg.Assets))
	for i, asset := range cfg.Assets {
		binanceSymbols[i] = pricefeed.SymbolToBinance(asset)
	}
	
	e := &Engine{
		db:         cfg.DB,
		telegram:   notify.NewTelegram(cfg.TelegramToken, cfg.TelegramChat),
		strategies: strategy.DefaultRegistry(),
		priceFeed:  pricefeed.NewBinanceFeed(binanceSymbols),
		prices:     make(map[string]float64),
		priceHist:  make(map[string][]PricePoint),
		stopCh:     make(chan struct{}),
		config:     cfg,
	}
	
	// Setup price feed callback
	e.priceFeed.OnPrice(func(symbol string, price float64) {
		e.updatePrice(symbol, price)
	})
	
	return e
}

// Start begins the trading engine
func (e *Engine) Start(ctx context.Context) error {
	if e.running {
		return fmt.Errorf("engine already running")
	}
	e.running = true

	log.Info().Msg("🚀 Starting Polybot V2 Engine...")

	// Initialize Polymarket client if private key available
	if e.config.PrivateKey != "" {
		client, err := polymarket.NewClient(&polymarket.Config{
			PrivateKey: e.config.PrivateKey,
			APIKey:     e.config.PolymarketKey,
		})
		if err != nil {
			log.Warn().Err(err).Msg("⚠️ Polymarket client init failed - running in dry-run mode")
		} else {
			e.polyClient = client
			e.finder = polymarket.NewMarketFinder(client)
			e.tracker = polymarket.NewPositionTracker(client)
			
			// Setup resolution callback
			e.tracker.OnResolution(func(posID string, won bool, payout float64) {
				e.onPositionResolved(posID, won, payout)
			})
			
			log.Info().Str("address", client.Address()).Msg("💳 Polymarket wallet loaded")
		}
	} else {
		log.Warn().Msg("⚠️ No private key configured - running in dry-run mode")
	}

	// Sync wallet balance
	if err := e.syncWallet(ctx); err != nil {
		log.Info().Msgf("⚠️ Wallet sync failed: %v", err)
	}

	// Load enabled strategies from DB
	strategies, err := e.db.ListStrategies()
	if err != nil {
		return fmt.Errorf("load strategies: %w", err)
	}

	enabledCount := 0
	for _, s := range strategies {
		if s.Enabled {
			enabledCount++
			log.Info().Msgf("📊 Strategy '%s' enabled with $%.2f budget", s.ID, s.Budget)
		}
	}

	if enabledCount == 0 {
		return fmt.Errorf("no strategies enabled - use 'polybot strategy add' first")
	}

	// Start Binance price feed
	if err := e.priceFeed.Start(ctx); err != nil {
		log.Warn().Err(err).Msg("⚠️ Binance feed failed, will poll instead")
	}

	// Start market scanner
	e.wg.Add(1)
	go e.runMarketLoop(ctx)

	// Start position resolver
	e.wg.Add(1)
	go e.runResolver(ctx)

	// Send startup notification
	e.telegram.Alert("🚀 Polybot V2 Started", fmt.Sprintf(
		"Strategies: %d enabled\nWallet: $%.2f\nMode: %s",
		enabledCount, e.getWalletBalance(), e.getMode(),
	))

	log.Info().Msg("✅ Engine started successfully")
	return nil
}

func (e *Engine) getMode() string {
	if e.polyClient != nil {
		return "LIVE"
	}
	return "DRY-RUN"
}

// Stop gracefully stops the engine
func (e *Engine) Stop() {
	if !e.running {
		return
	}
	
	log.Info().Msg("🛑 Stopping engine...")
	close(e.stopCh)
	e.priceFeed.Stop()
	e.wg.Wait()
	e.running = false
	log.Info().Msg("✅ Engine stopped")
}

// Wait blocks until the engine stops
func (e *Engine) Wait() {
	e.wg.Wait()
}

// syncWallet fetches current balance from chain
func (e *Engine) syncWallet(ctx context.Context) error {
	// Get wallet from DB
	w, err := e.db.GetWallet()
	if err != nil {
		return err
	}
	
	// For now, use DB balance (real RPC sync would go here)
	log.Info().Msgf("💰 Wallet balance: $%.2f", w.Balance)
	return nil
}

func (e *Engine) getWalletBalance() float64 {
	w, err := e.db.GetWallet()
	if err != nil {
		return 0
	}
	return w.Balance
}

func (e *Engine) updatePrice(asset string, price float64) {
	e.priceMu.Lock()
	defer e.priceMu.Unlock()
	
	e.prices[asset] = price
	
	// Keep last 120 prices (10 min of 5-sec updates)
	hist := e.priceHist[asset]
	hist = append(hist, PricePoint{Price: price, Time: time.Now()})
	if len(hist) > 120 {
		hist = hist[1:]
	}
	e.priceHist[asset] = hist
}

func (e *Engine) getPrice(asset string) float64 {
	e.priceMu.RLock()
	defer e.priceMu.RUnlock()
	return e.prices[asset]
}

func (e *Engine) getPriceHistory(asset string) *strategy.PriceHistory {
	e.priceMu.RLock()
	defer e.priceMu.RUnlock()
	
	hist := e.priceHist[asset]
	if len(hist) == 0 {
		return nil
	}
	
	prices := make([]float64, len(hist))
	for i, p := range hist {
		prices[i] = p.Price
	}
	
	ph := &strategy.PriceHistory{
		Prices:  prices,
		Current: prices[len(prices)-1],
		Open:    prices[0],
		High:    prices[0],
		Low:     prices[0],
	}
	
	for _, p := range prices {
		if p > ph.High {
			ph.High = p
		}
		if p < ph.Low {
			ph.Low = p
		}
	}
	
	return ph
}

// runMarketLoop scans for new market windows and evaluates strategies
func (e *Engine) runMarketLoop(ctx context.Context) {
	defer e.wg.Done()
	
	log.Info().Msg("📈 Starting market loop...")
	
	// Align to next 5-minute boundary
	now := time.Now()
	next := now.Truncate(5 * time.Minute).Add(5 * time.Minute)
	waitDur := next.Sub(now)
	
	log.Info().Msgf("⏰ Waiting %v for next market window at %s", waitDur.Round(time.Second), next.Format("15:04"))
	
	timer := time.NewTimer(waitDur)
	select {
	case <-ctx.Done():
		timer.Stop()
		return
	case <-e.stopCh:
		timer.Stop()
		return
	case <-timer.C:
	}

	// Now run on 5-minute intervals
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Run immediately for first window
	e.onMarketWindow(ctx)

	for {
		select {
		case <-ctx.Done():
			return
		case <-e.stopCh:
			return
		case <-ticker.C:
			e.onMarketWindow(ctx)
		}
	}
}

// onMarketWindow is called at the start of each trading window
func (e *Engine) onMarketWindow(ctx context.Context) {
	now := time.Now()
	log.Info().Msgf("🎯 New market window: %s", now.Format("15:04"))

	// Sync wallet
	if err := e.syncWallet(ctx); err != nil {
		log.Warn().Msgf("⚠️ Wallet sync error: %v", err)
	}

	// Get enabled strategies
	strategies, err := e.db.ListStrategies()
	if err != nil {
		log.Error().Msgf("❌ Failed to load strategies: %v", err)
		return
	}

	// For each asset we're tracking
	for _, asset := range e.config.Assets {
		price := e.getPrice(asset)
		if price == 0 {
			log.Warn().Msgf("⚠️ No price for %s, skipping", asset)
			continue
		}

		priceHist := e.getPriceHistory(asset)
		if priceHist == nil {
			log.Warn().Msgf("⚠️ No price history for %s, skipping", asset)
			continue
		}
		
		log.Info().Msgf("📊 %s @ $%.2f (range: $%.2f - $%.2f)", asset, price, priceHist.Low, priceHist.High)

		// Find matching Polymarket market
		var market *polymarket.BTCMinuteMarket
		if e.finder != nil {
			var err error
			market, err = e.finder.GetMarketForWindow(ctx, now)
			if err != nil {
				log.Warn().Err(err).Msg("No matching Polymarket market found")
			} else {
				log.Info().Str("question", market.Question).Float64("yesPrice", market.UpPrice).Msg("📍 Found market")
			}
		}

		// Create market info
		marketInfo := &strategy.MarketInfo{
			Asset:        asset,
			Timeframe:    "5min",
			StartTime:    now,
			EndTime:      now.Add(5 * time.Minute),
			OpenPrice:    price,
			CurrentPrice: price,
		}
		
		if market != nil {
			marketInfo.ID = market.ConditionID
			marketInfo.TargetPrice = market.TargetPrice
			marketInfo.YesPrice = market.UpPrice
			marketInfo.NoPrice = market.DownPrice
		}

		// Evaluate each strategy
		for _, dbStrat := range strategies {
			if !dbStrat.Enabled {
				continue
			}

			// Get strategy implementation
			strat := e.strategies.Get(dbStrat.ID)
			if strat == nil {
				continue
			}

			// Check if strategy has available funds
			if dbStrat.Available() < 5 { // Min $5 bet
				log.Warn().Msgf("⚠️ %s: insufficient funds ($%.2f available)", dbStrat.ID, dbStrat.Available())
				continue
			}

			// Get signal
			signal := strat.Decide(marketInfo, priceHist)
			if signal == nil {
				log.Info().Msgf("📊 %s: no signal", dbStrat.ID)
				continue
			}

			// Cap bet to available budget
			betAmount := signal.Amount
			if betAmount > dbStrat.Available() {
				betAmount = dbStrat.Available()
			}

			log.Info().Msgf("📊 %s: signal %s (%.0f%% conf) - $%.2f", 
				dbStrat.ID, signal.Side, signal.Confidence*100, betAmount)

			// Place bet
			if err := e.placeBet(ctx, &dbStrat, marketInfo, market, signal, betAmount); err != nil {
				log.Error().Msgf("❌ %s: bet failed: %v", dbStrat.ID, err)
			}
		}
	}
}

// placeBet places a bet for a strategy
func (e *Engine) placeBet(ctx context.Context, strat *db.Strategy, marketInfo *strategy.MarketInfo, 
	polyMarket *polymarket.BTCMinuteMarket, signal *strategy.Signal, amount float64) error {
	
	// Lock funds first
	if err := e.db.LockFunds(strat.ID, amount); err != nil {
		return fmt.Errorf("lock funds: %w", err)
	}

	// Create position record
	marketID := ""
	if polyMarket != nil {
		marketID = polyMarket.ConditionID
	}
	
	pos := &db.Position{
		StrategyID: strat.ID,
		MarketID:   marketID,
		Side:       signal.Side,
		Status:     db.StatusPending,
		Cost:       amount,
	}

	posID, err := e.db.CreatePosition(pos)
	if err != nil {
		e.db.UnlockFunds(strat.ID, amount)
		return fmt.Errorf("create position: %w", err)
	}

	log.Info().Msgf("✅ Position created: #%d %s %s $%.2f", posID, strat.ID, signal.Side, amount)

	// Send notification
	e.telegram.TradeAlert(strat.ID, signal.Side, amount, signal.Reason)

	// Place order on Polymarket if we have client and market
	if e.polyClient != nil && polyMarket != nil {
		tokenID := polyMarket.UpTokenID
		price := polyMarket.UpPrice
		if signal.Side == "DOWN" {
			tokenID = polyMarket.DownTokenID
			price = polyMarket.DownPrice
		}
		
		shares := polymarket.CalculateShares(amount, price)
		
		order := &polymarket.OrderRequest{
			TokenID: tokenID,
			Price:   price,
			Size:    shares,
			Side:    "BUY",
			Type:    "FOK", // Fill or Kill
		}
		
		result, err := e.polyClient.PlaceOrder(ctx, order)
		if err != nil {
			log.Error().Err(err).Msg("Polymarket order failed")
			// Keep position as pending for manual review
		} else {
			log.Info().Str("orderID", result.OrderID).Str("status", result.Status).Msg("Order placed")
			
			if result.Status == "FILLED" {
				e.db.UpdatePositionStatus(posID, db.StatusFilled, 0)
				
				// Track for resolution
				if e.tracker != nil {
					e.tracker.Track(&polymarket.TrackedPosition{
						ID:          fmt.Sprintf("%d", posID),
						ConditionID: polyMarket.ConditionID,
						TokenID:     tokenID,
						Side:        signal.Side,
						Shares:      shares,
						Cost:        amount,
						PlacedAt:    time.Now(),
						ExpiresAt:   polyMarket.EndTime,
					})
				}
			}
		}
	} else {
		// Dry-run mode: mark as filled immediately
		log.Info().Msg("🔸 DRY-RUN: Order simulated")
		e.db.UpdatePositionStatus(posID, db.StatusFilled, 0)
	}

	return nil
}

// runResolver checks for resolved markets and updates positions
func (e *Engine) runResolver(ctx context.Context) {
	defer e.wg.Done()
	
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-e.stopCh:
			return
		case <-ticker.C:
			e.checkResolutions(ctx)
		}
	}
}

func (e *Engine) checkResolutions(ctx context.Context) {
	if e.tracker == nil {
		return
	}
	
	if err := e.tracker.CheckResolutions(ctx); err != nil {
		log.Error().Err(err).Msg("Resolution check failed")
	}
}

// onPositionResolved handles a resolved position
func (e *Engine) onPositionResolved(posID string, won bool, payout float64) {
	var posIDInt int64
	fmt.Sscanf(posID, "%d", &posIDInt)
	
	// Get position from DB
	pos, err := e.db.GetPosition(posIDInt)
	if err != nil || pos == nil {
		log.Error().Str("posID", posID).Msg("Position not found")
		return
	}
	
	// Update position status
	status := db.StatusLost
	if won {
		status = db.StatusWon
	}
	
	if err := e.db.UpdatePositionStatus(posIDInt, status, payout); err != nil {
		log.Error().Err(err).Msg("Failed to update position")
		return
	}
	
	// Unlock funds and update strategy stats
	e.db.UnlockFunds(pos.StrategyID, pos.Cost)
	
	pnl := payout - pos.Cost
	if err := e.db.UpdateStrategyStats(pos.StrategyID, won, pnl); err != nil {
		log.Error().Err(err).Msg("Failed to update strategy stats")
	}
	
	// Send notification
	e.telegram.ResultAlert(pos.StrategyID, won, pos.Cost, payout, pnl)
	
	log.Info().
		Str("strategy", pos.StrategyID).
		Bool("won", won).
		Float64("cost", pos.Cost).
		Float64("payout", payout).
		Float64("pnl", pnl).
		Msg("Position resolved")
}
