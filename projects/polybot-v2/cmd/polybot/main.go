package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"text/tabwriter"
	"time"

	"github.com/ehsanjso/polybot/internal/db"
	"github.com/ehsanjso/polybot/internal/engine"
	"github.com/ehsanjso/polybot/internal/strategy"
	"github.com/fatih/color"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var (
	cfgFile  string
	dbPath   string
	database *db.DB

	// Colors
	success = color.New(color.FgGreen).SprintFunc()
	warn    = color.New(color.FgYellow).SprintFunc()
	fail    = color.New(color.FgRed).SprintFunc()
	info    = color.New(color.FgCyan).SprintFunc()
	bold    = color.New(color.Bold).SprintFunc()
)

func main() {
	// Setup pretty console logging
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: "15:04:05"})

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, fail("Error:"), err)
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "polybot",
	Short: "Polymarket trading bot v2",
	Long:  `A modular, strategy-based trading bot for Polymarket prediction markets.`,
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		if cmd.Name() == "help" || cmd.Name() == "version" {
			return nil
		}

		if cfgFile != "" {
			viper.SetConfigFile(cfgFile)
		} else {
			viper.SetConfigName("config")
			viper.SetConfigType("yaml")
			viper.AddConfigPath(".")
			viper.AddConfigPath("$HOME/.polybot")
		}
		viper.AutomaticEnv()

		if err := viper.ReadInConfig(); err != nil {
			if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
				return err
			}
		}

		var err error
		database, err = db.Open(dbPath)
		if err != nil {
			return err
		}

		return nil
	},
	PersistentPostRun: func(cmd *cobra.Command, args []string) {
		if database != nil {
			database.Close()
		}
	},
}

func init() {
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default: ./config.yaml)")
	rootCmd.PersistentFlags().StringVar(&dbPath, "db", "polybot.db", "database file path")

	rootCmd.AddCommand(statusCmd)
	rootCmd.AddCommand(strategyCmd)
	rootCmd.AddCommand(historyCmd)
	rootCmd.AddCommand(startCmd)
	rootCmd.AddCommand(stopCmd)
	rootCmd.AddCommand(versionCmd)
}

// ============ Status Command ============

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show bot status, wallet balance, and strategies",
	RunE: func(cmd *cobra.Command, args []string) error {
		wallet, err := database.GetWallet()
		if err != nil {
			return err
		}

		strategies, err := database.ListStrategies()
		if err != nil {
			return err
		}

		fmt.Println()
		fmt.Println(bold("╔════════════════════════════════════════╗"))
		fmt.Println(bold("║         POLYBOT V2 STATUS              ║"))
		fmt.Println(bold("╚════════════════════════════════════════╝"))
		fmt.Println()

		fmt.Println(bold("💰 WALLET"))
		fmt.Printf("   Balance:     %s\n", info(fmt.Sprintf("$%.2f", wallet.Balance)))
		fmt.Printf("   Allocated:   $%.2f\n", wallet.Allocated)
		fmt.Printf("   Unallocated: $%.2f\n", wallet.Unallocated)
		fmt.Printf("   Last Sync:   %s\n", wallet.LastSync.Format(time.RFC822))
		fmt.Println()

		if len(strategies) == 0 {
			fmt.Println(warn("📊 No strategies configured. Use 'polybot strategy add' to create one."))
			return nil
		}

		fmt.Println(bold("📊 STRATEGIES"))
		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "   ID\tStatus\tBudget\tAvailable\tLocked\tP&L\tW/L")
		fmt.Fprintln(w, "   --\t------\t------\t---------\t------\t---\t---")
		for _, s := range strategies {
			status := success("●")
			if !s.Enabled {
				status = fail("○")
			}
			pnlColor := success
			if s.PnL < 0 {
				pnlColor = fail
			}
			fmt.Fprintf(w, "   %s\t%s\t$%.2f\t$%.2f\t$%.2f\t%s\t%d/%d\n",
				s.ID, status, s.Budget, s.Available(), s.Locked,
				pnlColor(fmt.Sprintf("$%+.2f", s.PnL)), s.Wins, s.Wins+s.Losses)
		}
		w.Flush()
		fmt.Println()

		return nil
	},
}

// ============ Strategy Commands ============

var strategyCmd = &cobra.Command{
	Use:   "strategy",
	Short: "Manage trading strategies",
}

func init() {
	strategyCmd.AddCommand(strategyListCmd)
	strategyCmd.AddCommand(strategyAddCmd)
	strategyCmd.AddCommand(strategyRemoveCmd)
	strategyCmd.AddCommand(strategyFundCmd)
	strategyCmd.AddCommand(strategyEnableCmd)
	strategyCmd.AddCommand(strategyDisableCmd)
}

var strategyListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all strategies",
	RunE: func(cmd *cobra.Command, args []string) error {
		strategies, err := database.ListStrategies()
		if err != nil {
			return err
		}

		if len(strategies) == 0 {
			fmt.Println(info("No strategies configured."))
			fmt.Println()
			fmt.Println("Available strategies:")
			for _, s := range strategy.DefaultRegistry().List() {
				fmt.Printf("  • %s: %s\n", info(s.ID()), s.Name())
			}
			fmt.Println()
			fmt.Println("Add one with:", bold("polybot strategy add <id> --budget <amount>"))
			return nil
		}

		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "ID\tEnabled\tBudget\tAvailable\tLocked\tP&L\tWins\tLosses")
		for _, s := range strategies {
			enabled := success("✅")
			if !s.Enabled {
				enabled = fail("❌")
			}
			fmt.Fprintf(w, "%s\t%s\t$%.2f\t$%.2f\t$%.2f\t$%+.2f\t%d\t%d\n",
				s.ID, enabled, s.Budget, s.Available(), s.Locked, s.PnL, s.Wins, s.Losses)
		}
		w.Flush()
		return nil
	},
}

var strategyAddCmd = &cobra.Command{
	Use:   "add <strategy-id>",
	Short: "Add a new strategy",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		id := args[0]
		budget, _ := cmd.Flags().GetFloat64("budget")

		reg := strategy.DefaultRegistry()
		if reg.Get(id) == nil {
			fmt.Println(fail("Unknown strategy:"), id)
			fmt.Println()
			fmt.Println("Available strategies:")
			for _, s := range reg.List() {
				fmt.Printf("  • %s: %s\n", info(s.ID()), s.Name())
			}
			return nil
		}

		existing, err := database.GetStrategy(id)
		if err != nil {
			return err
		}
		if existing != nil {
			fmt.Println(warn("Strategy already exists:"), id)
			return nil
		}

		s := &db.Strategy{
			ID:      id,
			Enabled: true,
			Budget:  budget,
		}

		if err := database.UpsertStrategy(s); err != nil {
			return err
		}

		fmt.Printf("%s Added strategy '%s' with budget $%.2f\n", success("✅"), id, budget)
		return nil
	},
}

func init() {
	strategyAddCmd.Flags().Float64("budget", 0, "Initial budget allocation")
	strategyAddCmd.MarkFlagRequired("budget")
}

var strategyRemoveCmd = &cobra.Command{
	Use:   "remove <strategy-id>",
	Short: "Remove a strategy",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		id := args[0]

		s, err := database.GetStrategy(id)
		if err != nil {
			return err
		}
		if s == nil {
			fmt.Println(fail("Strategy not found:"), id)
			return nil
		}

		if s.Locked > 0 {
			fmt.Printf("%s Cannot remove - $%.2f locked in positions\n", fail("❌"), s.Locked)
			return nil
		}

		if err := database.DeleteStrategy(id); err != nil {
			return err
		}

		fmt.Printf("%s Removed '%s' (returned $%.2f)\n", success("✅"), id, s.Budget)
		return nil
	},
}

var strategyFundCmd = &cobra.Command{
	Use:   "fund <strategy-id> <amount>",
	Short: "Add or remove funds from a strategy",
	Args:  cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		id := args[0]
		var amount float64
		fmt.Sscanf(args[1], "%f", &amount)

		s, err := database.GetStrategy(id)
		if err != nil {
			return err
		}
		if s == nil {
			fmt.Println(fail("Strategy not found:"), id)
			return nil
		}

		if amount < 0 && s.Available() < -amount {
			fmt.Printf("%s Cannot withdraw $%.2f, only $%.2f available\n", fail("❌"), -amount, s.Available())
			return nil
		}

		s.Budget += amount
		if err := database.UpsertStrategy(s); err != nil {
			return err
		}

		if amount > 0 {
			fmt.Printf("%s Added $%.2f to '%s' (new budget: $%.2f)\n", success("✅"), amount, id, s.Budget)
		} else {
			fmt.Printf("%s Withdrew $%.2f from '%s' (new budget: $%.2f)\n", success("✅"), -amount, id, s.Budget)
		}
		return nil
	},
}

var strategyEnableCmd = &cobra.Command{
	Use:   "enable <strategy-id>",
	Short: "Enable a strategy",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		id := args[0]
		s, err := database.GetStrategy(id)
		if err != nil {
			return err
		}
		if s == nil {
			fmt.Println(fail("Strategy not found:"), id)
			return nil
		}

		s.Enabled = true
		if err := database.UpsertStrategy(s); err != nil {
			return err
		}

		fmt.Printf("%s Enabled '%s'\n", success("✅"), id)
		return nil
	},
}

var strategyDisableCmd = &cobra.Command{
	Use:   "disable <strategy-id>",
	Short: "Disable a strategy",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		id := args[0]
		s, err := database.GetStrategy(id)
		if err != nil {
			return err
		}
		if s == nil {
			fmt.Println(fail("Strategy not found:"), id)
			return nil
		}

		s.Enabled = false
		if err := database.UpsertStrategy(s); err != nil {
			return err
		}

		fmt.Printf("%s Disabled '%s'\n", success("✅"), id)
		return nil
	},
}

// ============ History Command ============

var historyCmd = &cobra.Command{
	Use:   "history",
	Short: "Show recent trades",
	RunE: func(cmd *cobra.Command, args []string) error {
		limit, _ := cmd.Flags().GetInt("limit")

		positions, err := database.GetRecentPositions(limit)
		if err != nil {
			return err
		}

		if len(positions) == 0 {
			fmt.Println(info("No trade history yet."))
			return nil
		}

		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "Time\tStrategy\tSide\tCost\tStatus\tPayout\tP&L")
		for _, p := range positions {
			var pnl float64
			if p.Status == db.StatusWon || p.Status == db.StatusRedeemed {
				pnl = p.Payout - p.Cost
			} else if p.Status == db.StatusLost {
				pnl = -p.Cost
			}

			icon := map[string]string{
				db.StatusPending:  "⏳",
				db.StatusFilled:   "📝",
				db.StatusWon:      "✅",
				db.StatusLost:     "❌",
				db.StatusRedeemed: "💰",
			}[p.Status]

			pnlStr := fmt.Sprintf("$%+.2f", pnl)
			if pnl > 0 {
				pnlStr = success(pnlStr)
			} else if pnl < 0 {
				pnlStr = fail(pnlStr)
			}

			fmt.Fprintf(w, "%s\t%s\t%s\t$%.2f\t%s %s\t$%.2f\t%s\n",
				p.CreatedAt.Format("15:04"), p.StrategyID, p.Side,
				p.Cost, icon, p.Status, p.Payout, pnlStr)
		}
		w.Flush()
		return nil
	},
}

func init() {
	historyCmd.Flags().Int("limit", 20, "Number of trades to show")
}

// ============ Start/Stop Commands ============

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the trading bot",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println()
		fmt.Println(bold("🚀 POLYBOT V2"))
		fmt.Println()

		// Get assets from config or default to BTC
		assets := viper.GetStringSlice("trading.assets")
		if len(assets) == 0 {
			assets = []string{"BTC"}
		}

		cfg := &engine.Config{
			DB:            database,
			WalletAddress: viper.GetString("wallet.address"),
			RPCEndpoints:  viper.GetStringSlice("rpc.endpoints"),
			TelegramToken: viper.GetString("telegram.bot_token"),
			TelegramChat:  viper.GetString("telegram.chat_id"),
			PrivateKey:    viper.GetString("wallet.private_key"),
			PolymarketKey: viper.GetString("polymarket.api_key"),
			Assets:        assets,
		}

		eng := engine.New(cfg)

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

		go func() {
			<-sigCh
			fmt.Println()
			fmt.Println(warn("⚠️  Interrupt received, shutting down..."))
			eng.Stop()
			cancel()
		}()

		if err := eng.Start(ctx); err != nil {
			return err
		}

		eng.Wait()
		return nil
	},
}

var stopCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stop the trading bot",
	RunE: func(cmd *cobra.Command, args []string) error {
		fmt.Println(info("Stopping Polybot V2..."))
		return nil
	},
}

// ============ Version Command ============

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println(bold("Polybot V2"))
		fmt.Println("Version: 0.1.0")
		fmt.Println("Built for Polymarket BTC/ETH/SOL prediction markets")
	},
}
