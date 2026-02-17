package db

import (
	"database/sql"
	"fmt"
	"time"

	_ "modernc.org/sqlite"
)

type DB struct {
	conn *sql.DB
}

// Position status constants
const (
	StatusPending  = "PENDING"  // Order sent, waiting for fill
	StatusFilled   = "FILLED"   // Order filled, waiting for resolution
	StatusWon      = "WON"      // Market resolved in our favor
	StatusLost     = "LOST"     // Market resolved against us
	StatusRedeemed = "REDEEMED" // Winnings redeemed
)

type Strategy struct {
	ID        string
	Enabled   bool
	Budget    float64
	Locked    float64
	PnL       float64
	Wins      int
	Losses    int
	CreatedAt time.Time
	UpdatedAt time.Time
}

// Available returns budget minus locked funds
func (s *Strategy) Available() float64 {
	return s.Budget - s.Locked
}

type Position struct {
	ID          int64
	StrategyID  string
	MarketID    string
	TokenID     string
	Side        string // UP or DOWN
	Status      string
	Cost        float64
	Shares      float64
	Payout      float64
	OrderID     string
	CreatedAt   time.Time
	FilledAt    *time.Time
	ResolvedAt  *time.Time
	RedeemedAt  *time.Time
}

type Wallet struct {
	Balance     float64
	Allocated   float64
	Unallocated float64
	LastSync    time.Time
}

func Open(path string) (*DB, error) {
	conn, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open db: %w", err)
	}
	
	db := &DB{conn: conn}
	if err := db.migrate(); err != nil {
		return nil, fmt.Errorf("migrate: %w", err)
	}
	
	return db, nil
}

func (db *DB) Close() error {
	return db.conn.Close()
}

func (db *DB) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS strategies (
		id TEXT PRIMARY KEY,
		enabled BOOLEAN DEFAULT true,
		budget REAL DEFAULT 0,
		locked REAL DEFAULT 0,
		pnl REAL DEFAULT 0,
		wins INTEGER DEFAULT 0,
		losses INTEGER DEFAULT 0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS positions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		strategy_id TEXT NOT NULL,
		market_id TEXT NOT NULL,
		token_id TEXT,
		side TEXT NOT NULL,
		status TEXT DEFAULT 'PENDING',
		cost REAL NOT NULL,
		shares REAL DEFAULT 0,
		payout REAL DEFAULT 0,
		order_id TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		filled_at TIMESTAMP,
		resolved_at TIMESTAMP,
		redeemed_at TIMESTAMP,
		FOREIGN KEY (strategy_id) REFERENCES strategies(id)
	);

	CREATE TABLE IF NOT EXISTS wallet (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		balance REAL DEFAULT 0,
		allocated REAL DEFAULT 0,
		unallocated REAL DEFAULT 0,
		last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- Ensure wallet row exists
	INSERT OR IGNORE INTO wallet (id) VALUES (1);

	CREATE INDEX IF NOT EXISTS idx_positions_strategy ON positions(strategy_id);
	CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
	`
	
	_, err := db.conn.Exec(schema)
	return err
}

// Strategy operations

func (db *DB) GetStrategy(id string) (*Strategy, error) {
	var s Strategy
	err := db.conn.QueryRow(`
		SELECT id, enabled, budget, locked, pnl, wins, losses, created_at, updated_at
		FROM strategies WHERE id = ?
	`, id).Scan(&s.ID, &s.Enabled, &s.Budget, &s.Locked, &s.PnL, &s.Wins, &s.Losses, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &s, err
}

func (db *DB) ListStrategies() ([]Strategy, error) {
	rows, err := db.conn.Query(`
		SELECT id, enabled, budget, locked, pnl, wins, losses, created_at, updated_at
		FROM strategies ORDER BY id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var strategies []Strategy
	for rows.Next() {
		var s Strategy
		if err := rows.Scan(&s.ID, &s.Enabled, &s.Budget, &s.Locked, &s.PnL, &s.Wins, &s.Losses, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		strategies = append(strategies, s)
	}
	return strategies, rows.Err()
}

func (db *DB) UpsertStrategy(s *Strategy) error {
	_, err := db.conn.Exec(`
		INSERT INTO strategies (id, enabled, budget, locked, pnl, wins, losses, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET
			enabled = excluded.enabled,
			budget = excluded.budget,
			locked = excluded.locked,
			pnl = excluded.pnl,
			wins = excluded.wins,
			losses = excluded.losses,
			updated_at = CURRENT_TIMESTAMP
	`, s.ID, s.Enabled, s.Budget, s.Locked, s.PnL, s.Wins, s.Losses)
	return err
}

func (db *DB) DeleteStrategy(id string) error {
	_, err := db.conn.Exec(`DELETE FROM strategies WHERE id = ?`, id)
	return err
}

// Lock funds for a strategy (before placing bet)
func (db *DB) LockFunds(strategyID string, amount float64) error {
	result, err := db.conn.Exec(`
		UPDATE strategies 
		SET locked = locked + ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ? AND (budget - locked) >= ?
	`, amount, strategyID, amount)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("insufficient funds or strategy not found")
	}
	return nil
}

// Unlock funds (after resolution)
func (db *DB) UnlockFunds(strategyID string, amount float64) error {
	_, err := db.conn.Exec(`
		UPDATE strategies 
		SET locked = MAX(0, locked - ?), updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, amount, strategyID)
	return err
}

// Position operations

func (db *DB) CreatePosition(p *Position) (int64, error) {
	result, err := db.conn.Exec(`
		INSERT INTO positions (strategy_id, market_id, token_id, side, status, cost, shares, order_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, p.StrategyID, p.MarketID, p.TokenID, p.Side, p.Status, p.Cost, p.Shares, p.OrderID)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (db *DB) GetPosition(id int64) (*Position, error) {
	var p Position
	err := db.conn.QueryRow(`
		SELECT id, strategy_id, market_id, token_id, side, status, cost, shares, payout, order_id,
		       created_at, filled_at, resolved_at, redeemed_at
		FROM positions WHERE id = ?
	`, id).Scan(&p.ID, &p.StrategyID, &p.MarketID, &p.TokenID, &p.Side, &p.Status, &p.Cost, &p.Shares, &p.Payout, &p.OrderID,
		&p.CreatedAt, &p.FilledAt, &p.ResolvedAt, &p.RedeemedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &p, err
}

func (db *DB) GetOpenPositions(strategyID string) ([]Position, error) {
	rows, err := db.conn.Query(`
		SELECT id, strategy_id, market_id, token_id, side, status, cost, shares, payout, order_id,
		       created_at, filled_at, resolved_at, redeemed_at
		FROM positions 
		WHERE strategy_id = ? AND status IN (?, ?)
		ORDER BY created_at DESC
	`, strategyID, StatusPending, StatusFilled)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var positions []Position
	for rows.Next() {
		var p Position
		if err := rows.Scan(&p.ID, &p.StrategyID, &p.MarketID, &p.TokenID, &p.Side, &p.Status, &p.Cost, &p.Shares, &p.Payout, &p.OrderID,
			&p.CreatedAt, &p.FilledAt, &p.ResolvedAt, &p.RedeemedAt); err != nil {
			return nil, err
		}
		positions = append(positions, p)
	}
	return positions, rows.Err()
}

func (db *DB) UpdatePositionStatus(id int64, status string, payout float64) error {
	var timeField string
	switch status {
	case StatusFilled:
		timeField = "filled_at"
	case StatusWon, StatusLost:
		timeField = "resolved_at"
	case StatusRedeemed:
		timeField = "redeemed_at"
	}
	
	query := fmt.Sprintf(`
		UPDATE positions SET status = ?, payout = ?, %s = CURRENT_TIMESTAMP
		WHERE id = ?
	`, timeField)
	
	_, err := db.conn.Exec(query, status, payout, id)
	return err
}

func (db *DB) GetRecentPositions(limit int) ([]Position, error) {
	rows, err := db.conn.Query(`
		SELECT id, strategy_id, market_id, token_id, side, status, cost, shares, payout, order_id,
		       created_at, filled_at, resolved_at, redeemed_at
		FROM positions 
		ORDER BY created_at DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var positions []Position
	for rows.Next() {
		var p Position
		if err := rows.Scan(&p.ID, &p.StrategyID, &p.MarketID, &p.TokenID, &p.Side, &p.Status, &p.Cost, &p.Shares, &p.Payout, &p.OrderID,
			&p.CreatedAt, &p.FilledAt, &p.ResolvedAt, &p.RedeemedAt); err != nil {
			return nil, err
		}
		positions = append(positions, p)
	}
	return positions, rows.Err()
}

// Wallet operations

func (db *DB) GetWallet() (*Wallet, error) {
	var w Wallet
	err := db.conn.QueryRow(`
		SELECT balance, allocated, unallocated, last_sync FROM wallet WHERE id = 1
	`).Scan(&w.Balance, &w.Allocated, &w.Unallocated, &w.LastSync)
	return &w, err
}

func (db *DB) UpdateWalletBalance(balance float64) error {
	// Recalculate allocated from strategies
	_, err := db.conn.Exec(`
		UPDATE wallet SET 
			balance = ?,
			allocated = (SELECT COALESCE(SUM(budget), 0) FROM strategies WHERE enabled = true),
			unallocated = ? - (SELECT COALESCE(SUM(budget), 0) FROM strategies WHERE enabled = true),
			last_sync = CURRENT_TIMESTAMP
		WHERE id = 1
	`, balance, balance)
	return err
}

// Resolve a position and update strategy stats
func (db *DB) ResolvePosition(posID int64, won bool, payout float64) error {
	tx, err := db.conn.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get position details
	var strategyID string
	var cost float64
	err = tx.QueryRow(`SELECT strategy_id, cost FROM positions WHERE id = ?`, posID).Scan(&strategyID, &cost)
	if err != nil {
		return err
	}

	// Update position
	status := StatusLost
	if won {
		status = StatusWon
	}
	_, err = tx.Exec(`
		UPDATE positions SET status = ?, payout = ?, resolved_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, status, payout, posID)
	if err != nil {
		return err
	}

	// Update strategy: unlock funds, adjust budget, update stats
	profit := payout - cost
	if !won {
		profit = -cost
		payout = 0
	}
	
	_, err = tx.Exec(`
		UPDATE strategies SET
			locked = MAX(0, locked - ?),
			budget = budget + ?,
			pnl = pnl + ?,
			wins = wins + ?,
			losses = losses + ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, cost, profit, profit, boolToInt(won), boolToInt(!won), strategyID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// UpdateStrategyStats updates wins/losses and P&L for a strategy
func (db *DB) UpdateStrategyStats(strategyID string, won bool, pnl float64) error {
	winsIncr := 0
	lossesIncr := 0
	if won {
		winsIncr = 1
	} else {
		lossesIncr = 1
	}
	
	_, err := db.conn.Exec(`
		UPDATE strategies SET
			pnl = pnl + ?,
			wins = wins + ?,
			losses = losses + ?,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, pnl, winsIncr, lossesIncr, strategyID)
	return err
}
