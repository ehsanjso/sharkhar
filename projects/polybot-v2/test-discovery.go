//go:build ignore

package main

import (
	"context"
	"fmt"
	"time"
	
	"polybot-v2/internal/polymarket"
)

func main() {
	cfg := &polymarket.Config{
		PrivateKey: "0x0000000000000000000000000000000000000000000000000000000000000001",
	}
	
	client, err := polymarket.NewClient(cfg)
	if err != nil {
		fmt.Printf("Error creating client: %v\n", err)
		return
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	fmt.Println("Testing BTC 5-min market discovery...")
	markets, err := client.GetBTCMinuteMarkets(ctx)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	
	fmt.Printf("\nFound %d markets:\n", len(markets))
	for _, m := range markets {
		fmt.Printf("\n- %s\n", m.Question)
		fmt.Printf("  Condition: %s\n", m.ConditionID)
		fmt.Printf("  Active: %v, Closed: %v\n", m.Active, m.Closed)
		for _, t := range m.Tokens {
			fmt.Printf("  Token [%s]: %s (price: %.2f)\n", t.Outcome, t.TokenID[:20]+"...", t.Price)
		}
	}
}
