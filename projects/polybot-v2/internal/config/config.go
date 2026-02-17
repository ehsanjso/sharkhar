package config

import (
	"fmt"
	"os"

	"github.com/spf13/viper"
)

// Config represents the application configuration
type Config struct {
	// Wallet settings
	Wallet WalletConfig `mapstructure:"wallet"`
	
	// RPC endpoints
	RPC RPCConfig `mapstructure:"rpc"`
	
	// Telegram notifications
	Telegram TelegramConfig `mapstructure:"telegram"`
	
	// Polymarket settings
	Polymarket PolymarketConfig `mapstructure:"polymarket"`
	
	// Trading settings
	Trading TradingConfig `mapstructure:"trading"`
}

type WalletConfig struct {
	Address    string `mapstructure:"address"`
	PrivateKey string `mapstructure:"private_key"`
}

type RPCConfig struct {
	Endpoints []string `mapstructure:"endpoints"`
}

type TelegramConfig struct {
	BotToken string `mapstructure:"bot_token"`
	ChatID   string `mapstructure:"chat_id"`
}

type PolymarketConfig struct {
	APIKey string `mapstructure:"api_key"`
}

type TradingConfig struct {
	Assets      []string `mapstructure:"assets"`
	MinBet      float64  `mapstructure:"min_bet"`
	DryRun      bool     `mapstructure:"dry_run"`
}

// Load loads configuration from file and environment
func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("$HOME/.polybot")
	viper.AddConfigPath("/etc/polybot")
	
	// Environment variable overrides
	viper.SetEnvPrefix("POLYBOT")
	viper.AutomaticEnv()
	
	// Bind env vars
	viper.BindEnv("wallet.private_key", "POLYBOT_PRIVATE_KEY")
	viper.BindEnv("telegram.bot_token", "POLYBOT_TELEGRAM_TOKEN")
	viper.BindEnv("polymarket.api_key", "POLYBOT_POLYMARKET_KEY")
	
	// Defaults
	viper.SetDefault("trading.assets", []string{"BTC"})
	viper.SetDefault("trading.min_bet", 5.0)
	viper.SetDefault("trading.dry_run", false)
	viper.SetDefault("rpc.endpoints", []string{
		"https://polygon-rpc.com",
		"https://rpc-mainnet.matic.quiknode.pro",
		"https://polygon-mainnet.g.alchemy.com/v2/demo",
	})
	
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("read config: %w", err)
		}
	}
	
	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}
	
	return &cfg, nil
}

// Validate checks if required configuration is present
func (c *Config) Validate() error {
	if c.Wallet.Address == "" {
		return fmt.Errorf("wallet.address is required")
	}
	
	// Private key is optional (enables live trading)
	if c.Wallet.PrivateKey == "" {
		fmt.Fprintln(os.Stderr, "⚠️  No private key configured - running in dry-run mode")
	}
	
	return nil
}
