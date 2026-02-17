package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Telegram struct {
	botToken string
	chatID   string
	client   *http.Client
}

func NewTelegram(botToken, chatID string) *Telegram {
	return &Telegram{
		botToken: botToken,
		chatID:   chatID,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (t *Telegram) Send(message string) error {
	if t.botToken == "" {
		return nil // Silently skip if not configured
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", t.botToken)
	
	payload := map[string]interface{}{
		"chat_id":    t.chatID,
		"text":       message,
		"parse_mode": "Markdown",
	}
	
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := t.client.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram API error: %d", resp.StatusCode)
	}

	return nil
}

// Alert sends a formatted trading alert
func (t *Telegram) Alert(title, message string) error {
	text := fmt.Sprintf("*%s*\n\n%s", title, message)
	return t.Send(text)
}

// TradeAlert sends a trade notification
func (t *Telegram) TradeAlert(strategy, side string, cost float64, reason string) error {
	emoji := "📈"
	if side == "DOWN" {
		emoji = "📉"
	}
	
	text := fmt.Sprintf("%s *BET PLACED*\n\nStrategy: %s\nSide: %s\nCost: $%.2f\n\n_%s_",
		emoji, strategy, side, cost, reason)
	return t.Send(text)
}

// ResultAlert sends a trade result notification
func (t *Telegram) ResultAlert(strategy string, won bool, cost, payout, pnl float64) error {
	var emoji, status string
	if won {
		emoji = "✅"
		status = "WIN"
	} else {
		emoji = "❌"
		status = "LOSS"
	}
	
	text := fmt.Sprintf("%s *%s*\n\nStrategy: %s\nCost: $%.2f\nPayout: $%.2f\nP&L: $%+.2f",
		emoji, status, strategy, cost, payout, pnl)
	return t.Send(text)
}

// StatusAlert sends a periodic status update
func (t *Telegram) StatusAlert(balance float64, strategies map[string]float64, totalPnL float64) error {
	var sb bytes.Buffer
	sb.WriteString("📊 *POLYBOT STATUS*\n\n")
	sb.WriteString(fmt.Sprintf("💰 Balance: $%.2f\n\n", balance))
	
	sb.WriteString("Strategies:\n")
	for id, pnl := range strategies {
		emoji := "🟢"
		if pnl < 0 {
			emoji = "🔴"
		}
		sb.WriteString(fmt.Sprintf("  %s %s: $%+.2f\n", emoji, id, pnl))
	}
	
	sb.WriteString(fmt.Sprintf("\n*Total P&L: $%+.2f*", totalPnL))
	
	return t.Send(sb.String())
}
