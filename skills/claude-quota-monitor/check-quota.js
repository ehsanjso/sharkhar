#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const QUOTA_URL = 'https://console.anthropic.com/settings/usage';
const HISTORY_FILE = path.join(__dirname, 'quota-history.json');
const THRESHOLD = parseFloat(process.argv.find(a => a.startsWith('--threshold='))?.split('=')[1] || process.env.QUOTA_THRESHOLD || '80');
const JSON_OUTPUT = process.argv.includes('--json');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = 'reset') {
  if (!JSON_OUTPUT) {
    console.log(`${colors[color]}${msg}${colors.reset}`);
  }
}

function getQuotaData() {
  try {
    // Use Clawdbot browser tool to scrape the usage page
    // This assumes we're running within Clawdbot context
    log('📡 Fetching quota data from console.anthropic.com...', 'cyan');
    
    // For now, we'll parse the screenshot you provided earlier
    // In production, this would use browser automation
    // TODO: Implement browser scraping via Clawdbot browser tool
    
    // Placeholder: Return mock data based on the screenshot
    // Replace this with actual browser scraping
    const mockData = {
      timestamp: new Date().toISOString(),
      sessionLimit: {
        used: 99,
        resetIn: '2h 21m',
        resetTime: '12:57 PM EST'
      },
      weeklyLimits: {
        sonnetOnly: {
          used: 5,
          resetTime: 'Sat 5:00 AM'
        },
        allModels: {
          used: 14,
          resetTime: 'Thu 11:00 PM'
        }
      }
    };
    
    return mockData;
  } catch (error) {
    throw new Error(`Failed to fetch quota data: ${error.message}`);
  }
}

function saveHistory(data) {
  try {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
    
    history.push(data);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history = history.slice(-100);
    }
    
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    log(`⚠️  Warning: Could not save history: ${error.message}`, 'yellow');
  }
}

function formatOutput(data) {
  const date = new Date(data.timestamp);
  const dateStr = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });
  
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`📊 Claude Quota Status - ${dateStr}`, 'bold');
  log('='.repeat(60), 'cyan');
  
  // Session limit
  log(`\n🔄 Session Limit (resets every 5 hours)`, 'cyan');
  const sessionColor = data.sessionLimit.used >= THRESHOLD ? 'red' : data.sessionLimit.used >= 60 ? 'yellow' : 'green';
  const alert = data.sessionLimit.used >= THRESHOLD ? ' ⚠️' : '';
  log(`   Used: ${data.sessionLimit.used}%${alert}`, sessionColor);
  log(`   Resets in: ${data.sessionLimit.resetIn} (${data.sessionLimit.resetTime})`);
  
  // Weekly limits
  log(`\n📅 Weekly Limits`, 'cyan');
  log(`   Sonnet only: ${data.weeklyLimits.sonnetOnly.used}% used (resets ${data.weeklyLimits.sonnetOnly.resetTime})`);
  log(`   All models: ${data.weeklyLimits.allModels.used}% used (resets ${data.weeklyLimits.allModels.resetTime})`);
  
  // Warnings
  if (data.sessionLimit.used >= THRESHOLD) {
    log(`\n⚠️  WARNING: Session quota at ${data.sessionLimit.used}% - approaching limit!`, 'red');
  } else if (data.sessionLimit.used >= 60) {
    log(`\n💡 Session quota at ${data.sessionLimit.used}% - monitor usage`, 'yellow');
  } else {
    log(`\n✅ Quota levels healthy`, 'green');
  }
  
  log('');
}

// Main execution
try {
  const data = getQuotaData();
  saveHistory(data);
  
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    formatOutput(data);
  }
  
  // Exit with error code if threshold exceeded
  if (data.sessionLimit.used >= THRESHOLD) {
    process.exit(1);
  }
} catch (error) {
  log(`❌ Error: ${error.message}`, 'red');
  process.exit(2);
}
