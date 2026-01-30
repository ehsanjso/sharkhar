"""Configuration for investor tracker"""

# Notable Congress members to track (historically good performers)
CONGRESS_WATCHLIST = [
    "Nancy Pelosi",
    "Tommy Tuberville", 
    "Dan Crenshaw",
    "Marjorie Taylor Greene",
    "Josh Gottheimer",
    "Michael McCaul",
    "Pat Fallon",
    "Brian Mast",
    "John Curtis",
    "French Hill",
]

# Major hedge funds / investors to track (by CIK for 13F)
HEDGE_FUND_WATCHLIST = {
    "Berkshire Hathaway": "0001067983",
    "Pershing Square (Ackman)": "0001336528", 
    "Bridgewater Associates": "0001350694",
    "Renaissance Technologies": "0001037389",
    "Citadel Advisors": "0001423053",
    "Two Sigma": "0001179392",
    "Tiger Global": "0001167483",
    "Appaloosa Management": "0001656456",
    "Baupost Group": "0001061768",
    "Greenlight Capital": "0001079114",
    "Icahn Enterprises": "0000810958",
    "Soros Fund Management": "0001029160",
    "Third Point": "0001040273",
    "ValueAct Capital": "0001418814",
    "Elliott Management": "0001048445",
}

# Minimum transaction size to alert (USD)
MIN_TRANSACTION_SIZE = 50000

# Database path
DB_PATH = "trades.db"

# API endpoints
QUIVER_CONGRESS_URL = "https://api.quiverquant.com/beta/live/congresstrading"
SEC_EDGAR_BASE = "https://www.sec.gov/cgi-bin/browse-edgar"
HOUSE_DISCLOSURES_URL = "https://disclosures-clerk.house.gov/public_disc/financial-pdfs"
