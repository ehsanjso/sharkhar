package wallet

import (
	"context"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

// USDC.e on Polygon
const USDCAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

// ERC20 balanceOf ABI
const erc20ABI = `[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}]`

type Wallet struct {
	address  common.Address
	rpcURLs  []string
	client   *ethclient.Client
}

func New(address string, rpcURLs []string) *Wallet {
	return &Wallet{
		address: common.HexToAddress(address),
		rpcURLs: rpcURLs,
	}
}

// Connect tries each RPC endpoint until one works
func (w *Wallet) Connect(ctx context.Context) error {
	var lastErr error
	for _, url := range w.rpcURLs {
		client, err := ethclient.DialContext(ctx, url)
		if err != nil {
			lastErr = err
			continue
		}
		
		// Test connection
		_, err = client.BlockNumber(ctx)
		if err != nil {
			lastErr = err
			client.Close()
			continue
		}
		
		w.client = client
		return nil
	}
	return fmt.Errorf("all RPC endpoints failed: %w", lastErr)
}

// GetBalance returns USDC balance in dollars
func (w *Wallet) GetBalance(ctx context.Context) (float64, error) {
	if w.client == nil {
		if err := w.Connect(ctx); err != nil {
			return 0, err
		}
	}

	// Parse ABI
	parsed, err := abi.JSON(strings.NewReader(erc20ABI))
	if err != nil {
		return 0, fmt.Errorf("parse ABI: %w", err)
	}

	// Encode call
	data, err := parsed.Pack("balanceOf", w.address)
	if err != nil {
		return 0, fmt.Errorf("pack call: %w", err)
	}

	// Call contract
	usdcAddr := common.HexToAddress(USDCAddress)
	result, err := w.client.CallContract(ctx, ethereum.CallMsg{
		To:   &usdcAddr,
		Data: data,
	}, nil)
	if err != nil {
		return 0, fmt.Errorf("call contract: %w", err)
	}

	// Decode result
	var balance *big.Int
	if err := parsed.UnpackIntoInterface(&balance, "balanceOf", result); err != nil {
		return 0, fmt.Errorf("unpack result: %w", err)
	}

	// Convert from 6 decimals to dollars
	balanceFloat := new(big.Float).SetInt(balance)
	divisor := new(big.Float).SetInt64(1_000_000)
	dollars, _ := new(big.Float).Quo(balanceFloat, divisor).Float64()

	return dollars, nil
}

// GetMATICBalance returns native MATIC balance
func (w *Wallet) GetMATICBalance(ctx context.Context) (float64, error) {
	if w.client == nil {
		if err := w.Connect(ctx); err != nil {
			return 0, err
		}
	}

	balance, err := w.client.BalanceAt(ctx, w.address, nil)
	if err != nil {
		return 0, err
	}

	// Convert from wei (18 decimals)
	balanceFloat := new(big.Float).SetInt(balance)
	divisor := new(big.Float).SetInt64(1_000_000_000_000_000_000)
	matic, _ := new(big.Float).Quo(balanceFloat, divisor).Float64()

	return matic, nil
}

// Address returns the wallet address
func (w *Wallet) Address() string {
	return w.address.Hex()
}

// Close closes the RPC connection
func (w *Wallet) Close() {
	if w.client != nil {
		w.client.Close()
	}
}

// Sync fetches current balance with retry
func (w *Wallet) Sync(ctx context.Context) (float64, error) {
	var lastErr error
	for i := 0; i < 3; i++ {
		balance, err := w.GetBalance(ctx)
		if err == nil {
			return balance, nil
		}
		lastErr = err
		
		// Try reconnecting
		w.Close()
		w.client = nil
		time.Sleep(time.Second)
	}
	return 0, lastErr
}
