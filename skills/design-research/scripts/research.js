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

    // Download first flow (usually the main one)
    const flow = flows[0];
    const folderName = `${String(folderIndex).padStart(2, '0')}-${appConfig.flows[0]}-${appConfig.name.toLowerCase()}`;
    const dir = path.join(baseDir, folderName);
    fs.mkdirSync(dir, { recursive: true });

    console.log(`   📥 ${flow.name} (${flow.screenCount} screens)`);
    
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
      purpose: appConfig.flows.join(', '),
      why: appConfig.why,
    });

    folderIndex++;
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
