---
description: >
  Framework explaining stock returns via exposure to common factors (market, size, value, momentum). Use this to build fundamental-driven strategies or understand why your portfolio performed as it did.
source:
  chapters: [7]
  key-insight: "Factor returns have momentum — assuming they stay constant from one period to next enables prediction. But regime shifts (value → growth preference) cause steep drawdowns."
---

# Factor Models

Factor models (also called Arbitrage Pricing Theory or APT) decompose stock returns into common drivers (factors) plus stock-specific noise. The book covers this in Section 7.4 as both a strategy framework and risk management tool.

## Core Equation

**R = Xb + u**

Where:
- R = N×1 vector of excess returns for N stocks
- X = N×F matrix of factor exposures (loadings)
- b = F×1 vector of factor returns
- u = N×1 vector of specific returns (idiosyncratic)

**Factor exposures:** Stock's sensitivity to each factor (beta to market, sensitivity to size, etc.)
**Factor returns:** Common drivers affecting all stocks
**Specific returns:** Stock-specific component (noise within APT framework)

Each stock's specific return assumed uncorrelated with others.

## Fama-French Three-Factor Model

Book's main example: The famous Fama-French model postulates three factors:

**1. Market factor:** Stock's beta (sensitivity to overall market)
**2. Size factor:** Market capitalization
**3. Value factor:** Book-to-price ratio

Higher book-to-price (value stocks) typically have positive factor return. Smaller market cap also positive factor return.

The book notes empirical findings:
- Small-cap stocks usually outperform large-cap (negative size factor return)
- Value stocks usually outperform growth (positive book-to-price factor return)

But "usually" ≠ "always" — see regime shifts below.

## How to Use Factor Models

**1. Calculate factor exposures for each stock:**
- Beta: Regression of stock returns against market returns
- Market cap: Observable (normalize to mean=0, std=1 across universe)
- Book-to-price: From fundamentals (normalize)

**2. Run multivariate regression:**
Fit returns R against exposures X across all stocks at time t to infer factor returns b.

**3. Predict next period:**
**Assumption:** Factor returns have **momentum** — they remain constant from period t to t+1.

Then predicted returns: **R(t+1) = X(t+1) × b(t)**

**4. Trade:**
- Buy stocks with highest predicted returns
- Short stocks with lowest predicted returns

## Example: Principal Component Analysis (PCA)

Book Example 7.4 shows PCA as factor model variant:

Instead of economic factors, use mathematical factors:
- Factors = eigenvectors of return covariance matrix
- Factor exposures = constant (time-independent)
- Factor returns = uncorrelated by construction

**Strategy:**
- Optimize on days 1-252
- Trade days 253-275 based on those factors
- Re-optimize on days 2-253
- Repeat...

**Result on S&P 600 small-caps:**
- Average return: **-1.8%** (negative!)

Book's interpretation: Factor returns likely don't have sufficient momentum, or specific returns too large.

## The Momentum Assumption

Critical weakness: Factor models **only work if factor returns have momentum**.

Book: "Factor returns are more stable than individual stock returns. In other words, they have momentum. You can therefore assume their values remain unchanged from current period to next."

When true: Works beautifully. Factor model explains returns, enables prediction.

When false: Disaster. You're betting on pattern continuation that doesn't exist.

## Regime Shifts

Book identifies major risk: "Factor models that are dominated by fundamental and macroeconomic factors have one major drawback — they depend on fact that investors persist in using same metric to value companies."

**Example:** Value factor usually positive (value outperforms growth).

**But:** During Internet bubble (late 1990s) and August/December 2007, investors preferred growth stocks.

Result: Value factor turned negative → factor model strategies suffered "steep drawdown."

Book quotes The Economist: One reason was "price premium over value stocks has narrowed significantly." Another: slowing economy → investors wanted earnings growth, not cheap valuations.

## Practical Limitations

**Data cost:** 
Book lists factor data vendors:
- Capital IQ, Compustat: Expensive ($thousands annually)
- MSCI Barra, Northfield: Even more expensive
- Quantitative Services Group: Institutional pricing

For independent traders: "Not very practical."

**Model risk:**
R² of good factor model with 1,000 stocks and 50 factors: 30-40% per the book.

Meaning: 60-70% of returns are **specific** (not explained by factors). Factor models don't predict most of return variance.

**Drawdown tolerance:**
Even successful factor models experience multi-month drawdowns during regime shifts. Book notes this is "common to practically any trading model that holds stocks overnight."

## When to Use Factor Models

**Portfolio risk management:**
Decompose your portfolio's performance:
- How much came from market exposure?
- How much from size/value tilts?
- How much from specific stock selection?

**Strategy construction (if you have data access):**
- Identify stocks with high expected returns based on factor exposures
- Build portfolios exploiting factor momentum
- Hedge out unwanted factor exposures

**Institutional traders:**
Factor models dominate institutional quant funds. But require:
- Expensive data
- Large teams
- Willingness to endure regime-shift drawdowns

**Independent traders:**
Book's implicit guidance: Skip factor models unless you have deep pockets. Focus on simpler strategies ([[pair-trading]], [[mean-reversion]]) with lower data costs.

## Related Skills

Alternative approaches:
- [[pair-trading]] — Simpler, no fundamental data needed
- [[mean-reversion]] — Technical-driven, not fundamental
- [[momentum-strategies]] — Can be technical or fundamental

Conceptual foundation:
- [[cointegration]] — Statistical alternative to fundamental factors
- [[regime-switching]] — Why factor models periodically fail

Data requirements:
- [[historical-data-sourcing]] — Factor data is expensive

The book's verdict: Factor models are powerful but impractical for independent traders due to data costs and regime-shift risk. Institutions use them extensively, accepting occasional steep drawdowns as cost of deploying billions in systematic strategies.

For small traders, stick to strategies that don't require expensive fundamental data subscriptions.
