#!/usr/bin/env node
/**
 * Design Research Tool
 * 
 * Full pipeline: URL/description → analyze → find apps → download → package
 * 
 * Usage:
 *   node research.js "https://example.com"
 *   node research.js "AI writing assistant SaaS"
 *   node research.js "two-sided marketplace for local services"
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const BROWSER_API = 'http://127.0.0.1:18791';
const PROFILE = 'clawd';

// --- Product Categories & Flow Mappings ---

const PRODUCT_CATEGORIES = {
  'saas-dashboard': {
    keywords: ['saas', 'dashboard', 'productivity', 'project management', 'team', 'workspace', 'collaboration', 'crm', 'analytics', 'admin'],
    flows: ['onboarding', 'dashboard', 'settings', 'billing', 'team-invite'],
    bestApps: {
      'ui-reference': { name: 'Linear', platform: 'web', why: 'Gold standard for SaaS UI design' },
      'onboarding': { name: 'Linear', platform: 'web', why: 'Best progressive onboarding' },
      'dashboard': { name: 'Shopify', platform: 'web', why: 'Clean business dashboard' },
      'settings': { name: 'Linear', platform: 'web', why: 'Comprehensive settings UX' },
    }
  },
  'ai-tool': {
    keywords: ['ai', 'chat', 'assistant', 'llm', 'gpt', 'claude', 'copilot', 'writing', 'generation', 'bot', 'agent', 'openai', 'anthropic', 'model', 'prompt'],
    flows: ['onboarding', 'chat-interface', 'model-selection', 'history', 'settings'],
    bestApps: {
      'ui-reference': { name: 'Linear', platform: 'web', why: 'Clean, minimal aesthetic' },
      'chat-interface': { name: 'Perplexity', platform: 'web', why: 'Best AI chat UX, sources, follow-ups' },
      'onboarding': { name: 'Perplexity', platform: 'web', why: 'AI-focused onboarding' },
      'billing': { name: 'Perplexity', platform: 'web', why: 'Clean subscription flow' },
    }
  },
  'marketplace': {
    keywords: ['marketplace', 'two-sided', 'gig', 'freelance', 'booking', 'service', 'local', 'creator', 'influencer', 'hire', 'talent'],
    flows: ['onboarding', 'listing-creation', 'search-browse', 'booking', 'reviews', 'messaging'],
    bestApps: {
      'ui-reference': { name: 'Linear', platform: 'web', why: 'Modern SaaS aesthetic' },
      'listing-creation': { name: 'Fiverr', platform: 'ios', why: 'Best gig/listing creation flow' },
      'search-browse': { name: 'Fiverr', platform: 'ios', why: 'Excellent filter & browse UX' },
      'profiles': { name: 'Upwork', platform: 'web', why: 'Comprehensive freelancer profiles' },
      'dashboard': { name: 'Shopify', platform: 'web', why: 'Business management dashboard' },
    }
  },
  'fintech': {
    keywords: ['fintech', 'banking', 'payments', 'money', 'transfer', 'crypto', 'wallet', 'finance', 'invest', 'trading', 'stock'],
    flows: ['onboarding-kyc', 'dashboard', 'transfers', 'cards', 'transactions'],
    bestApps: {
      'ui-reference': { name: 'Revolut', platform: 'ios', why: 'Premium fintech design' },
      'onboarding': { name: 'Revolut', platform: 'ios', why: 'Best fintech onboarding + KYC' },
      'dashboard': { name: 'Revolut', platform: 'ios', why: 'Clean account overview' },
      'transfers': { name: 'Wise', platform: 'ios', why: 'Best money transfer UX' },
    }
  },
  'ecommerce': {
    keywords: ['ecommerce', 'shop', 'store', 'cart', 'checkout', 'products', 'orders', 'retail', 'buy', 'sell'],
    flows: ['product-page', 'cart', 'checkout', 'order-tracking', 'dashboard'],
    bestApps: {
      'ui-reference': { name: 'Shopify', platform: 'web', why: 'E-commerce standard' },
      'checkout': { name: 'Shopify', platform: 'web', why: 'Optimized checkout flow' },
      'dashboard': { name: 'Shopify', platform: 'web', why: 'Merchant dashboard' },
      'product-browse': { name: 'Airbnb', platform: 'web', why: 'Beautiful browse/filter UX' },
    }
  },
  'social': {
    keywords: ['social', 'feed', 'posts', 'followers', 'profile', 'content', 'creator', 'community', 'share'],
    flows: ['feed', 'profile', 'create-post', 'notifications', 'settings'],
    bestApps: {
      'ui-reference': { name: 'Linear', platform: 'web', why: 'Clean, modern aesthetic' },
      'feed': { name: 'Instagram', platform: 'ios', why: 'Best content feed UX' },
      'create-post': { name: 'Instagram', platform: 'ios', why: 'Content creation flow' },
      'profile': { name: 'Instagram', platform: 'ios', why: 'Creator profile design' },
    }
  },
  'devtool': {
    keywords: ['developer', 'api', 'sdk', 'code', 'deploy', 'infrastructure', 'devops', 'hosting', 'ci', 'cd', 'git'],
    flows: ['onboarding', 'dashboard', 'deploy', 'logs', 'settings'],
    bestApps: {
      'ui-reference': { name: 'Linear', platform: 'web', why: 'Developer-focused minimal design' },
      'dashboard': { name: 'Shopify', platform: 'web', why: 'Clean overview dashboard' },
      'onboarding': { name: 'Linear', platform: 'web', why: 'Developer onboarding' },
    }
  },
  'health': {
    keywords: ['health', 'fitness', 'wellness', 'meditation', 'sleep', 'workout', 'nutrition', 'mental', 'therapy'],
    flows: ['onboarding', 'dashboard', 'tracking', 'programs', 'settings'],
    bestApps: {
      'ui-reference': { name: 'Headspace', platform: 'ios', why: 'Calming, wellness-focused design' },
      'onboarding': { name: 'Headspace', platform: 'ios', why: 'Best wellness onboarding' },
      'dashboard': { name: 'Headspace', platform: 'ios', why: 'Progress and tracking UI' },
    }
  },
  'education': {
    keywords: ['education', 'learning', 'course', 'lesson', 'tutorial', 'teach', 'study', 'quiz'],
    flows: ['onboarding', 'dashboard', 'course-view', 'progress', 'settings'],
    bestApps: {
      'ui-reference': { name: 'Duolingo', platform: 'ios', why: 'Engaging, gamified education design' },
      'onboarding': { name: 'Duolingo', platform: 'ios', why: 'Best education onboarding' },
      'progress': { name: 'Duolingo', platform: 'ios', why: 'Gamified progress tracking' },
    }
  },
  // --- NEW CATEGORIES ---
  'travel': {
    keywords: ['travel', 'hotel', 'flight', 'vacation', 'trip', 'airbnb', 'booking', 'accommodation', 'tourism', 'destination', 'itinerary'],
    flows: ['search', 'listing-detail', 'booking', 'checkout', 'trip-management'],
    bestApps: {
      'ui-reference': { name: 'Airbnb', platform: 'web', why: 'Best-in-class travel UX' },
      'search': { name: 'Airbnb', platform: 'web', why: 'Excellent search + map integration' },
      'listing-detail': { name: 'Airbnb', platform: 'ios', why: 'Rich property pages with photos/reviews' },
      'booking': { name: 'Airbnb', platform: 'ios', why: 'Smooth booking flow' },
      'checkout': { name: 'Hopper', platform: 'ios', why: 'Price prediction + clear checkout' },
    }
  },
  'food-delivery': {
    keywords: ['food', 'delivery', 'restaurant', 'order', 'meal', 'takeout', 'uber eats', 'doordash', 'grubhub', 'grocery', 'instacart'],
    flows: ['browse-restaurants', 'menu', 'cart', 'checkout', 'order-tracking'],
    bestApps: {
      'ui-reference': { name: 'DoorDash', platform: 'ios', why: 'Clean food delivery design' },
      'browse': { name: 'DoorDash', platform: 'ios', why: 'Category browsing + filters' },
      'menu': { name: 'Uber Eats', platform: 'ios', why: 'Best menu/item customization UX' },
      'checkout': { name: 'DoorDash', platform: 'ios', why: 'Fast checkout flow' },
      'tracking': { name: 'Uber Eats', platform: 'ios', why: 'Real-time order tracking' },
    }
  },
  'real-estate': {
    keywords: ['real estate', 'property', 'home', 'house', 'apartment', 'rent', 'buy', 'mortgage', 'zillow', 'redfin', 'listing'],
    flows: ['search', 'property-detail', 'saved-homes', 'contact-agent', 'mortgage-calculator'],
    bestApps: {
      'ui-reference': { name: 'Zillow', platform: 'ios', why: 'Standard for real estate apps' },
      'search': { name: 'Zillow', platform: 'ios', why: 'Map + list search with filters' },
      'property-detail': { name: 'Redfin', platform: 'ios', why: 'Rich property pages' },
      'saved-homes': { name: 'Zillow', platform: 'ios', why: 'Collections and saved searches' },
    }
  },
  'dating': {
    keywords: ['dating', 'match', 'swipe', 'tinder', 'hinge', 'bumble', 'relationship', 'single', 'profile', 'connection'],
    flows: ['onboarding', 'profile-creation', 'discovery', 'matching', 'messaging'],
    bestApps: {
      'ui-reference': { name: 'Hinge', platform: 'ios', why: 'Thoughtful dating app design' },
      'onboarding': { name: 'Hinge', platform: 'ios', why: 'Best profile-building onboarding' },
      'discovery': { name: 'Tinder', platform: 'ios', why: 'Iconic card-swipe UX' },
      'profile': { name: 'Hinge', platform: 'ios', why: 'Rich profile with prompts' },
      'messaging': { name: 'Bumble', platform: 'ios', why: 'Clean chat interface' },
    }
  },
  'notes-pkm': {
    keywords: ['notes', 'notion', 'obsidian', 'roam', 'pkm', 'knowledge', 'wiki', 'docs', 'writing', 'journal', 'second brain', 'zettelkasten'],
    flows: ['editor', 'navigation', 'search', 'templates', 'sharing'],
    bestApps: {
      'ui-reference': { name: 'Notion', platform: 'web', why: 'Best-in-class docs/notes design' },
      'editor': { name: 'Notion', platform: 'web', why: 'Block-based editor excellence' },
      'navigation': { name: 'Notion', platform: 'web', why: 'Sidebar + breadcrumb navigation' },
      'templates': { name: 'Notion', platform: 'web', why: 'Template gallery UX' },
    }
  },
  'music-audio': {
    keywords: ['music', 'audio', 'spotify', 'podcast', 'playlist', 'streaming', 'song', 'album', 'artist', 'soundcloud'],
    flows: ['home', 'player', 'library', 'search', 'playlist-creation'],
    bestApps: {
      'ui-reference': { name: 'Spotify', platform: 'ios', why: 'Gold standard for music apps' },
      'player': { name: 'Spotify', platform: 'ios', why: 'Best now-playing experience' },
      'library': { name: 'Spotify', platform: 'ios', why: 'Clean library organization' },
      'search': { name: 'Spotify', platform: 'ios', why: 'Excellent search + browse' },
    }
  },
  'video-streaming': {
    keywords: ['video', 'streaming', 'netflix', 'youtube', 'watch', 'movie', 'show', 'series', 'tv', 'twitch', 'live'],
    flows: ['browse', 'player', 'watchlist', 'profiles', 'search'],
    bestApps: {
      'ui-reference': { name: 'Netflix', platform: 'ios', why: 'Premium video streaming design' },
      'browse': { name: 'Netflix', platform: 'ios', why: 'Content discovery + rows' },
      'player': { name: 'Netflix', platform: 'ios', why: 'Immersive video player' },
      'profiles': { name: 'Netflix', platform: 'ios', why: 'Multi-profile management' },
    }
  },
  'communication': {
    keywords: ['slack', 'discord', 'chat', 'messaging', 'team', 'channels', 'dm', 'voice', 'video call', 'meetings', 'zoom'],
    flows: ['channels', 'messaging', 'threads', 'calls', 'settings'],
    bestApps: {
      'ui-reference': { name: 'Slack', platform: 'web', why: 'Standard for team communication' },
      'channels': { name: 'Slack', platform: 'web', why: 'Channel organization + sidebar' },
      'messaging': { name: 'Slack', platform: 'web', why: 'Rich messaging with threads' },
      'threads': { name: 'Discord', platform: 'ios', why: 'Thread and forum UX' },
    }
  },
  'hr-recruiting': {
    keywords: ['hr', 'recruiting', 'hiring', 'jobs', 'career', 'resume', 'applicant', 'linkedin', 'ats', 'candidate', 'interview'],
    flows: ['job-search', 'application', 'profile', 'messaging', 'dashboard'],
    bestApps: {
      'ui-reference': { name: 'LinkedIn', platform: 'web', why: 'Professional network standard' },
      'job-search': { name: 'LinkedIn', platform: 'ios', why: 'Job search + filters' },
      'profile': { name: 'LinkedIn', platform: 'web', why: 'Professional profile design' },
      'application': { name: 'LinkedIn', platform: 'ios', why: 'Easy apply flow' },
    }
  },
  'iot-smarthome': {
    keywords: ['smart home', 'iot', 'home automation', 'ring', 'nest', 'alexa', 'google home', 'devices', 'thermostat', 'camera', 'security'],
    flows: ['dashboard', 'device-control', 'automation', 'notifications', 'settings'],
    bestApps: {
      'ui-reference': { name: 'Google Home', platform: 'ios', why: 'Clean smart home design' },
      'dashboard': { name: 'Google Home', platform: 'ios', why: 'Device overview grid' },
      'device-control': { name: 'Philips Hue', platform: 'ios', why: 'Intuitive device controls' },
      'automation': { name: 'Google Home', platform: 'ios', why: 'Routine/automation builder' },
    }
  },
  'gaming': {
    keywords: ['gaming', 'game', 'steam', 'epic', 'xbox', 'playstation', 'nintendo', 'esports', 'multiplayer', 'achievements'],
    flows: ['store', 'library', 'profile', 'friends', 'achievements'],
    bestApps: {
      'ui-reference': { name: 'Steam', platform: 'web', why: 'Comprehensive gaming platform' },
      'store': { name: 'Steam', platform: 'web', why: 'Game discovery + sales' },
      'library': { name: 'Steam', platform: 'web', why: 'Game library management' },
      'profile': { name: 'Xbox', platform: 'ios', why: 'Gaming profile + achievements' },
    }
  },
  'photography': {
    keywords: ['photo', 'photography', 'camera', 'editing', 'lightroom', 'vsco', 'gallery', 'album', 'filter', 'portrait'],
    flows: ['gallery', 'editor', 'filters', 'export', 'albums'],
    bestApps: {
      'ui-reference': { name: 'VSCO', platform: 'ios', why: 'Beautiful photo app design' },
      'editor': { name: 'Lightroom', platform: 'ios', why: 'Professional editing tools' },
      'filters': { name: 'VSCO', platform: 'ios', why: 'Best preset/filter selection' },
      'gallery': { name: 'VSCO', platform: 'ios', why: 'Clean photo grid' },
    }
  },
  'scheduling': {
    keywords: ['calendar', 'scheduling', 'appointment', 'booking', 'calendly', 'meeting', 'availability', 'time', 'slots'],
    flows: ['calendar-view', 'booking-page', 'availability', 'confirmations', 'integrations'],
    bestApps: {
      'ui-reference': { name: 'Calendly', platform: 'web', why: 'Standard for scheduling tools' },
      'booking-page': { name: 'Calendly', platform: 'web', why: 'Clean public booking page' },
      'availability': { name: 'Calendly', platform: 'web', why: 'Availability management' },
      'calendar': { name: 'Google Calendar', platform: 'web', why: 'Best calendar interface' },
    }
  },
  'legal': {
    keywords: ['legal', 'law', 'contract', 'agreement', 'signature', 'docusign', 'compliance', 'nda', 'terms'],
    flows: ['document-view', 'signing', 'templates', 'dashboard', 'audit-trail'],
    bestApps: {
      'ui-reference': { name: 'DocuSign', platform: 'web', why: 'E-signature standard' },
      'signing': { name: 'DocuSign', platform: 'web', why: 'Document signing flow' },
      'templates': { name: 'DocuSign', platform: 'web', why: 'Template management' },
    }
  },
  'analytics': {
    keywords: ['analytics', 'metrics', 'data', 'charts', 'graphs', 'reporting', 'visualization', 'insights', 'kpi', 'dashboard'],
    flows: ['dashboard', 'reports', 'data-exploration', 'charts', 'exports'],
    bestApps: {
      'ui-reference': { name: 'Amplitude', platform: 'web', why: 'Product analytics standard' },
      'dashboard': { name: 'Amplitude', platform: 'web', why: 'Clean metrics dashboard' },
      'charts': { name: 'Mixpanel', platform: 'web', why: 'Interactive chart exploration' },
    }
  },
};

// --- API Helpers ---

async function api(ep, body = {}) {
  const r = await fetch(`${BROWSER_API}/${ep}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: PROFILE, ...body }),
  });
  return (await r.json());
}

const nav = (url) => api('navigate', { url });
const evalJs = (fn) => api('act', { kind: 'evaluate', fn });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function upgradeUrl(url) {
  try {
    const u = new URL(url);
    u.searchParams.set('w', '1080');
    u.searchParams.set('q', '90');
    u.searchParams.set('f', 'png');
    return u.toString();
  } catch { return url; }
}

async function downloadImage(url, dest) {
  try {
    const r = await fetch(url);
    if (!r.ok) return 0;
    const b = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, b);
    return b.length;
  } catch { return 0; }
}

// --- Product Analysis ---

async function analyzeUrl(url) {
  console.log(`📖 Analyzing: ${url}`);
  
  // Fetch the page content
  let pageText = '';
  try {
    const res = await fetch(url, { timeout: 10000 });
    const html = await res.text();
    // Extract text content (basic)
    pageText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .slice(0, 5000);
  } catch (e) {
    console.log(`  ⚠ Could not fetch URL: ${e.message}`);
  }
  
  return pageText;
}

function categorizeProduct(text) {
  const lower = text.toLowerCase();
  const scores = {};
  
  for (const [category, config] of Object.entries(PRODUCT_CATEGORIES)) {
    scores[category] = config.keywords.filter(kw => lower.includes(kw)).length;
  }
  
  // Get top 2 categories
  const sorted = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);
  
  if (sorted.length === 0) {
    // Default to SaaS dashboard
    return ['saas-dashboard'];
  }
  
  // Return top category, or top 2 if both score well
  if (sorted.length > 1 && sorted[1][1] >= sorted[0][1] * 0.5) {
    return [sorted[0][0], sorted[1][0]];
  }
  return [sorted[0][0]];
}

// --- Mobbin Search ---

async function searchApp(appName, platform) {
  console.log(`  🔍 ${appName} (${platform})`);
  await nav(`https://mobbin.com/discover/apps/${platform}/latest`);
  await sleep(3000);

  // Click search
  await evalJs(`() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Search on'));
    if (btn) btn.click();
  }`);
  await sleep(1000);

  // Switch platform if needed
  if (platform === 'web') {
    await evalJs(`() => {
      const btn = [...document.querySelectorAll('button')].find(b => 
        b.querySelector('[class*="desktop"]') || b.textContent.includes('desktop'));
      if (btn) btn.click();
    }`);
    await sleep(500);
  }

  // Type search
  await evalJs(`() => {
    const input = document.querySelector('[role="combobox"], input[type="text"]');
    if (input) {
      input.focus();
      const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      nativeSet.call(input, '${appName.replace(/'/g, "\\'")}');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }`);
  await sleep(2500);

  // Click first app result (with logo)
  const clicked = await evalJs(`() => {
    const options = document.querySelectorAll('[role="option"]');
    for (const opt of options) {
      const text = opt.textContent.trim();
      const hasLogo = !!opt.querySelector('img[alt*="logo"]') || text.toLowerCase().includes('logo');
      const hasSearch = text.toLowerCase().includes('search icon');
      if (hasLogo && !hasSearch && text.length < 150) {
        opt.click();
        return text.replace(/logo/gi, '').trim().substring(0, 50);
      }
    }
    return null;
  }`);

  if (!clicked.result) {
    console.log(`    ❌ Not found`);
    return null;
  }
  console.log(`    ✅ ${clicked.result}`);
  await sleep(3000);

  const url = await evalJs('() => window.location.href');
  return url.result;
}

async function getFlowImages(appFlowsUrl) {
  await nav(appFlowsUrl);
  await sleep(5000);

  const r = await evalJs(`() => {
    const groups = {};
    document.querySelectorAll('a[href*="/flows/"]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const fid = href.split('/flows/')[1];
      if (!fid) return;
      const img = link.querySelector('img[src*="bytescale"]');
      if (!img || img.src.includes('app_logos')) return;
      if (!groups[fid]) groups[fid] = { id: fid, images: [] };
      if (!groups[fid].images.includes(img.src)) groups[fid].images.push(img.src);
    });
    return Object.values(groups);
  }`);

  // Get flow names from strip labels - improved extraction
  const labels = await evalJs(`() => {
    const labels = [];
    
    // Method 1: Look for "FlowName N screens" pattern
    const text = document.body.innerText;
    const matches = [...text.matchAll(/^([A-Za-z][A-Za-z0-9 _-]+?)\\s+(\\d+)\\s+screens?$/gm)];
    for (const m of matches) {
      let name = m[1]
        .replace(/from$/i, '')
        .replace(/chevron.*icon/gi, '')
        .replace(/arrow.*icon/gi, '')
        .replace(/Latest$/i, '')
        .trim();
      if (name.length > 2 && name.length < 50 && !name.match(/^(Save|Copy|Clear|Filter)$/i)) {
        labels.push({ name, count: parseInt(m[2]) });
      }
    }
    
    // Method 2: Get tree node names from sidebar
    const treeNames = [];
    document.querySelectorAll('li').forEach(li => {
      const btn = li.querySelector(':scope > button');
      if (!btn) return;
      let text = '';
      li.childNodes.forEach(n => {
        if (n.nodeType === 3) text += n.textContent;
      });
      text = text.trim();
      if (text && text.length > 2 && text.length < 50 && !text.match(/(chevron|icon|Save|Copy)/i)) {
        treeNames.push(text);
      }
    });
    
    return { labels, treeNames };
  }`);

  const flows = r.result || [];
  const { labels: flowLabels, treeNames } = labels.result || { labels: [], treeNames: [] };

  // Match names - prefer strip labels, fallback to tree names
  flows.forEach((f, i) => {
    // Try to match by screen count first
    const match = flowLabels.find(l => l.count === f.images.length);
    if (match) {
      f.name = match.name;
      flowLabels.splice(flowLabels.indexOf(match), 1);
    } else if (treeNames[i]) {
      f.name = treeNames[i];
    } else {
      f.name = `Flow ${i + 1}`;
    }
    
    // Clean up common artifacts
    f.name = f.name
      .replace(/chevron\s*down\s*icon/gi, '')
      .replace(/arrow\s*\w+\s*icon/gi, '')
      .replace(/^\s*Latest\s*/i, '')
      .trim() || `Flow ${i + 1}`;
    
    f.screenCount = f.images.length;
  });

  return flows;
}

// --- Flow Matching ---

// Keywords that indicate what a flow is about
const FLOW_KEYWORDS = {
  'onboarding': ['onboard', 'welcome', 'signup', 'sign up', 'sign-up', 'get started', 'intro', 'first', 'setup', 'set up', 'create account'],
  'dashboard': ['dashboard', 'home', 'overview', 'main', 'landing'],
  'settings': ['settings', 'preferences', 'config', 'account', 'profile settings'],
  'billing': ['billing', 'payment', 'subscription', 'pricing', 'upgrade', 'plan', 'checkout'],
  'chat-interface': ['chat', 'message', 'conversation', 'ask', 'query', 'prompt'],
  'search': ['search', 'find', 'discover', 'explore', 'browse'],
  'profile': ['profile', 'account', 'user', 'my '],
  'listing': ['listing', 'create', 'new', 'add', 'post'],
  'checkout': ['checkout', 'payment', 'cart', 'order', 'purchase', 'buy'],
  'editor': ['editor', 'edit', 'compose', 'write', 'create'],
  'player': ['player', 'playing', 'now playing', 'listen', 'watch'],
  'library': ['library', 'collection', 'saved', 'favorites', 'my'],
  'notifications': ['notification', 'alert', 'inbox', 'updates'],
  'messaging': ['message', 'chat', 'dm', 'conversation', 'inbox'],
  'booking': ['book', 'reserve', 'schedule', 'appointment'],
  'tracking': ['track', 'progress', 'status', 'order status'],
};

/**
 * Find the best matching flow for a given purpose
 * @param {Array} flows - Array of flow objects with .name
 * @param {string} purpose - What we're looking for (e.g., 'onboarding', 'billing')
 * @returns {Object|null} Best matching flow or null
 */
function findBestFlow(flows, purpose) {
  if (!flows || flows.length === 0) return null;
  
  const keywords = FLOW_KEYWORDS[purpose] || [purpose];
  const purposeLower = purpose.toLowerCase();
  
  // Score each flow
  const scored = flows.map(flow => {
    const nameLower = flow.name.toLowerCase();
    let score = 0;
    
    // Exact match is best
    if (nameLower === purposeLower) {
      score = 100;
    }
    // Check keywords
    else {
      for (const kw of keywords) {
        if (nameLower.includes(kw)) {
          score += 10;
        }
      }
    }
    
    // Prefer flows with more screens (usually more complete)
    score += Math.min(flow.screenCount || 0, 10) * 0.5;
    
    return { flow, score };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Return best match if it has any score, otherwise first flow
  return scored[0].score > 0 ? scored[0].flow : flows[0];
}

// --- Main Research Pipeline ---

async function runResearch(input) {
  const isUrl = input.startsWith('http://') || input.startsWith('https://');
  let productText = input;
  let productName = 'product';
  
  if (isUrl) {
    productText = await analyzeUrl(input);
    // Extract domain as product name
    try {
      const u = new URL(input);
      productName = u.hostname.replace('www.', '').split('.')[0];
    } catch {}
  } else {
    productName = input.split(' ').slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  // Categorize
  const categories = categorizeProduct(productText);
  console.log(`\n📊 Categories: ${categories.join(' + ')}\n`);

  // Collect apps to download
  const appsToDownload = new Map(); // key: "appName-platform", value: { app config }
  
  for (const cat of categories) {
    const config = PRODUCT_CATEGORIES[cat];
    if (!config) continue;
    
    for (const [flowType, appConfig] of Object.entries(config.bestApps)) {
      const key = `${appConfig.name}-${appConfig.platform}`;
      if (!appsToDownload.has(key)) {
        appsToDownload.set(key, {
          ...appConfig,
          flows: [flowType],
          category: cat,
        });
      } else {
        appsToDownload.get(key).flows.push(flowType);
      }
    }
  }

  // Setup output directory
  const ts = Date.now();
  const baseDir = `/tmp/${productName}-design-research-${ts}`;
  fs.mkdirSync(baseDir, { recursive: true });

  const downloadedApps = [];
  let folderIndex = 1;

  // Download each app's flows
  for (const [key, appConfig] of appsToDownload) {
    console.log(`\n📦 ${appConfig.name} (${appConfig.platform})`);
    console.log(`   For: ${appConfig.flows.join(', ')}`);

    // Search for app
    const appUrl = await searchApp(appConfig.name, appConfig.platform);
    if (!appUrl) continue;

    // Get flows
    const flowsUrl = appUrl.replace(/\/(screens|ui-elements)(\/.*)?$/, '/flows');
    const flows = await getFlowImages(flowsUrl);
    if (flows.length === 0) {
      console.log('   ⚠ No flows found');
      continue;
    }

    console.log(`   📋 Available: ${flows.map(f => f.name).join(', ')}`);

    // Download best matching flow for each purpose
    const downloadedFlowIds = new Set();
    
    for (const purpose of appConfig.flows) {
      const flow = findBestFlow(flows, purpose);
      if (!flow) continue;
      
      // Skip if we already downloaded this flow for another purpose
      if (downloadedFlowIds.has(flow.id)) {
        console.log(`   ⏭ ${purpose}: reusing ${flow.name}`);
        continue;
      }
      downloadedFlowIds.add(flow.id);

      const folderName = `${String(folderIndex).padStart(2, '0')}-${purpose}-${appConfig.name.toLowerCase()}`;
      const dir = path.join(baseDir, folderName);
      fs.mkdirSync(dir, { recursive: true });

      console.log(`   📥 ${purpose} → ${flow.name} (${flow.screenCount} screens)`);
      
      let ok = 0;
      for (let i = 0; i < flow.images.length; i++) {
        const sz = await downloadImage(upgradeUrl(flow.images[i]), path.join(dir, `${String(i+1).padStart(2,'0')}.png`));
        if (sz > 0) ok++;
      }
      console.log(`   ✅ ${ok}/${flow.screenCount}`);

      downloadedApps.push({
        folder: folderName,
        app: appConfig.name,
        platform: appConfig.platform,
        flow: flow.name,
        screens: ok,
        purpose: purpose,
        why: appConfig.why,
      });

      folderIndex++;
    }
  }

  // Generate PROMPT.md
  const prompt = generatePrompt(productName, input, categories, downloadedApps);
  fs.writeFileSync(path.join(baseDir, 'PROMPT.md'), prompt);
  console.log('\n📝 PROMPT.md written');

  // Zip
  const zipPath = `/tmp/${productName}-design-research.zip`;
  try { fs.unlinkSync(zipPath); } catch {}
  
  await new Promise((res, rej) => {
    const out = fs.createWriteStream(zipPath);
    const ar = archiver('zip', { zlib: { level: 6 } });
    out.on('close', () => res());
    ar.on('error', rej);
    ar.pipe(out);
    ar.directory(baseDir, `${productName}-design-research`);
    ar.finalize();
  });

  const stat = fs.statSync(zipPath);
  const totalScreens = downloadedApps.reduce((sum, a) => sum + a.screens, 0);
  console.log(`\n📦 Done! ${totalScreens} screens from ${downloadedApps.length} apps`);
  console.log(`   ${(stat.size/1024/1024).toFixed(1)}MB → ${zipPath}`);
  
  return { zipPath, apps: downloadedApps, totalScreens };
}

function generatePrompt(productName, input, categories, apps) {
  const appList = apps.map(a => 
    `### ${a.folder}/\n**${a.app}** (${a.platform}) — ${a.screens} screens\n→ ${a.why}\n→ Use for: ${a.purpose}`
  ).join('\n\n');

  const mappingRows = apps.map(a => 
    `| ${a.purpose} | ${a.app} | ${a.why} |`
  ).join('\n');

  return `# ${productName.charAt(0).toUpperCase() + productName.slice(1)} Design Research

## Product
${input}

## Categories Detected
${categories.join(' + ')}

## Reference Apps

${appList}

## Flow Mapping

| Feature | Reference App | Why |
|---------|--------------|-----|
${mappingRows}

## Prompt for AI Design Agent

> Design a modern web application for "${productName}" based on the reference screenshots provided.
>
> **Visual style:** Follow the UI reference folder's design language — clean, minimal, modern.
>
> **Key patterns to implement:**
${apps.map(a => `> - ${a.purpose}: Reference ${a.app}'s patterns from \`${a.folder}/\``).join('\n')}
>
> **Tech stack:** Next.js 14 (App Router), shadcn/ui, Tailwind CSS, TypeScript.
>
> The screenshots are design references for patterns and layouts — don't copy exactly, but match the quality level and UX patterns.
`;
}

// --- CLI ---

async function main() {
  const input = process.argv.slice(2).join(' ');
  
  if (!input) {
    console.log(`
Design Research Tool

Usage:
  node research.js "https://example.com"
  node research.js "AI writing assistant SaaS"
  node research.js "two-sided marketplace for local services"

Analyzes the input, finds best-of-breed UX patterns from Mobbin, and packages screenshots with a design prompt.
`);
    process.exit(0);
  }

  await runResearch(input);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
