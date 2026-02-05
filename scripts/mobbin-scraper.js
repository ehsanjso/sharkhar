#!/usr/bin/env node
/**
 * Mobbin Design Scraper v3
 *
 * Usage:
 *   node mobbin-scraper.js search "Linear" [--platform web]
 *   node mobbin-scraper.js find-flows "Linear" [--platform web]
 *   node mobbin-scraper.js app-flows <app-url>
 *   node mobbin-scraper.js download-flow <app-url> <N> [label]
 *   node mobbin-scraper.js screens "dashboard" [--platform web] [--limit 15]
 *
 * Platform auto-detection:
 *   "web", "SaaS", "dashboard", "website" → web
 *   "mobile", "iOS", "app store" → ios
 *   Default: ios (larger catalog)
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const BROWSER_API = 'http://127.0.0.1:18791';
const PROFILE = 'clawd';

// --- API helpers ---

async function api(ep, body = {}) {
  const r = await fetch(`${BROWSER_API}/${ep}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: PROFILE, ...body }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`${ep}: ${d.error}`);
  return d;
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
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const b = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, b);
    return b.length;
  } catch (e) { console.error(`⚠ ${e.message}`); return 0; }
}

async function zipDir(dir, zipPath) {
  return new Promise((res, rej) => {
    const o = fs.createWriteStream(zipPath);
    const a = archiver('zip', { zlib: { level: 6 } });
    o.on('close', () => res(a.pointer()));
    a.on('error', rej);
    a.pipe(o);
    a.directory(dir, path.basename(dir));
    a.finalize();
  });
}

async function downloadScreens(images, label) {
  const ts = Date.now();
  const safe = label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().slice(0, 40);
  const dir = `/tmp/mobbin-${safe}-${ts}`;
  const zip = `${dir}.zip`;
  fs.mkdirSync(dir, { recursive: true });

  let ok = 0;
  for (let i = 0; i < images.length; i++) {
    const url = upgradeUrl(images[i]);
    const name = `${String(i + 1).padStart(2, '0')}.png`;
    process.stdout.write(`  [${i + 1}/${images.length}] `);
    const sz = await downloadImage(url, path.join(dir, name));
    if (sz > 0) { ok++; console.log(`✅ ${(sz / 1024).toFixed(0)}KB`); }
    else console.log('⚠');
  }

  if (ok === 0) { fs.rmSync(dir, { recursive: true }); return null; }
  const zs = await zipDir(dir, zip);
  fs.rmSync(dir, { recursive: true });
  console.log(`\n📦 ${ok} screens → ${zip} (${(zs / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`ZIP_PATH:${zip}`);
  return zip;
}

// --- Platform detection ---

const PLATFORM_WEB_WORDS = ['web', 'saas', 'dashboard', 'website', 'webapp', 'web app', 'browser', 'desktop', 'portal'];
const PLATFORM_IOS_WORDS = ['mobile', 'ios', 'iphone', 'app store', 'phone', 'android', 'native app'];

function detectPlatform(query) {
  const q = query.toLowerCase();
  if (PLATFORM_WEB_WORDS.some(k => q.includes(k))) return 'web';
  if (PLATFORM_IOS_WORDS.some(k => q.includes(k))) return 'ios';
  return 'ios';
}

function cleanQuery(query) {
  // Strip platform keywords so we just get the app name for search
  let q = query;
  [...PLATFORM_WEB_WORDS, ...PLATFORM_IOS_WORDS].forEach(kw => {
    q = q.replace(new RegExp(`\\b${kw}\\b`, 'gi'), '');
  });
  return q.replace(/\s+/g, ' ').trim();
}

// --- Search: uses Mobbin's search dialog via DOM manipulation ---

async function searchApp(appName, platform = 'ios') {
  // Navigate to Mobbin discover page for the platform
  console.log(`🔍 Searching for "${appName}" on ${platform}...`);
  await nav(`https://mobbin.com/discover/apps/${platform}/latest`);
  await sleep(3000);

  // Click the search button to open the dialog
  const clicked = await evalJs(`() => {
    const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Search on'));
    if (btn) { btn.click(); return true; }
    return false;
  }`);
  if (!clicked.result) throw new Error('Could not find search button');
  await sleep(1000);

  // Switch platform tab in the dialog if needed
  if (platform === 'web') {
    await evalJs(`() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('desktop icon') || b.querySelector('[class*="desktop"]'));
      if (btn) btn.click();
    }`);
    await sleep(500);
  }

  // Find the combobox and type the app name
  await evalJs(`() => {
    const input = document.querySelector('[role="combobox"], input[type="text"], input[placeholder*="Search"]');
    if (input) {
      input.focus();
      input.value = '';
      const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      nativeSet.call(input, '${appName.replace(/'/g, "\\'")}');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }`);
  await sleep(2500);

  // Get the search results (app options in the listbox)
  const results = await evalJs(`() => {
    const apps = [];
    const options = document.querySelectorAll('[role="option"]');
    for (const opt of options) {
      const text = opt.textContent.trim();
      const hasLogo = !!opt.querySelector('img[alt*="logo"]') || text.toLowerCase().includes('logo');
      const hasSearchIcon = text.toLowerCase().includes('search icon');
      
      // Skip pure search suggestions (no logo) and utility options
      if (hasSearchIcon && !hasLogo) continue;
      if (text.includes('Request app') || text.includes('Text in Screenshot')) continue;
      
      if (text.length > 2 && text.length < 150 && hasLogo) {
        // This is an actual app result
        const parts = text.replace(/logo/gi, '').trim().split(/\\s{2,}|\\n/);
        const name = parts[0].trim();
        const desc = parts.length > 1 ? parts.slice(1).join(' ').trim() : '';
        apps.push({ name, desc, isApp: true, index: [...options].indexOf(opt) });
      }
    }
    return apps;
  }`);

  return results.result || [];
}

async function searchAndNavigate(appName, platform = 'ios') {
  const results = await searchApp(appName, platform);
  
  if (results.length === 0) {
    console.log(`  ❌ No results for "${appName}" on ${platform}`);
    return null;
  }

  // Find the best matching result
  const exactMatch = results.find(r => r.name.toLowerCase() === appName.toLowerCase());
  const target = exactMatch || results[0];
  console.log(`  ✅ Found: ${target.name}`);

  // Click the matching option by its index in the options list
  const clickIdx = target.index;
  await evalJs(`() => {
    const options = document.querySelectorAll('[role="option"]');
    const opt = options[${clickIdx}];
    if (opt) { opt.click(); return true; }
    return false;
  }`);
  await sleep(3000);

  // Get current URL
  const urlResult = await evalJs('() => window.location.href');
  const appUrl = urlResult.result;
  console.log(`  📍 ${appUrl}`);
  return appUrl;
}

// --- Get flows from app page ---

async function getAppFlows(appUrl) {
  let flowsUrl = appUrl;
  if (!flowsUrl.includes('/flows')) {
    flowsUrl = appUrl.replace(/\/(screens|ui-elements)(\/.*)?$/, '/flows');
    if (!flowsUrl.includes('/flows')) flowsUrl = appUrl.replace(/\/?$/, '/flows');
  }

  console.log(`📱 Loading flows: ${flowsUrl}`);
  await nav(flowsUrl);
  await sleep(5000);

  // Extract flow groups
  const r = await evalJs(`() => {
    const groups = {};
    document.querySelectorAll('a[href*="/flows/"]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      const fid = href.split('/flows/')[1];
      if (!fid) return;
      const img = link.querySelector('img[src*="bytescale"]');
      if (!img || img.src.includes('app_logos')) return;
      if (!groups[fid]) groups[fid] = { id: fid, url: 'https://mobbin.com/flows/' + fid, images: [] };
      if (!groups[fid].images.includes(img.src)) groups[fid].images.push(img.src);
    });
    return Object.values(groups);
  }`);

  // Get flow names from strip labels (e.g., "Onboarding 25 screens")
  const labels = await evalJs(`() => {
    const labels = [];
    const allText = document.body.innerText;
    const matches = [...allText.matchAll(/^(.+?)\\s+(\\d+)\\s+screens?$/gm)];
    for (const m of matches) {
      const name = m[1].replace(/from$/, '').trim();
      labels.push({ name, count: parseInt(m[2]) });
    }
    return labels;
  }`);

  // Get category names from sidebar tree
  const treeNames = await evalJs(`() => {
    const names = [];
    document.querySelectorAll('li').forEach(li => {
      const children = li.childNodes;
      let text = '';
      for (const n of children) {
        if (n.nodeType === 3) text += n.textContent;
      }
      text = text.trim();
      if (text && text.length > 2 && text.length < 60) names.push(text);
    });
    return names.slice(0, 50);
  }`);

  const flows = r.result || [];
  const stripLabels = labels.result || [];
  const catNames = treeNames.result || [];

  // Match names to flows
  flows.forEach((f, i) => {
    // Try strip labels first (matched by screen count)
    const match = stripLabels.find(s => s.count === f.images.length);
    if (match) {
      f.name = match.name;
      stripLabels.splice(stripLabels.indexOf(match), 1);
    } else if (catNames[i]) {
      f.name = catNames[i];
    } else {
      f.name = `Flow ${i + 1}`;
    }
    f.name = f.name.replace(/chevron\s*down\s*icon/gi, '').replace(/arrow.*icon/gi, '').trim();
    f.screenCount = f.images.length;
  });

  return flows;
}

// --- Search screens ---

async function searchScreens(query, platform = 'ios', limit = 15) {
  console.log(`🔍 Searching screens: "${query}" on ${platform}`);
  await nav(`https://mobbin.com/search/apps/${platform}?content_type=screens&q=${encodeURIComponent(query)}`);
  await sleep(5000);
  const r = await evalJs(`() => {
    const imgs = [];
    document.querySelectorAll('a[href*="/screens/"]').forEach(link => {
      const img = link.querySelector('img[src*="bytescale"]');
      if (!img || img.src.includes('app_logos') || img.src.includes('dictionary') || img.src.includes('trending_filter')) return;
      if (!imgs.includes(img.src)) imgs.push(img.src);
    });
    return imgs;
  }`);
  const images = (r.result || []).slice(0, limit);
  if (images.length === 0) { console.log('❌ No screens found.'); return; }
  console.log(`📱 Found ${images.length} screens`);
  return downloadScreens(images, query);
}

// --- Parse CLI args ---

function parseArgs(args) {
  const result = { args: [], flags: {} };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      result.flags[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
    } else {
      result.args.push(args[i]);
    }
  }
  return result;
}

// --- Main ---

async function main() {
  const [mode, ...rest] = process.argv.slice(2);

  if (!mode || mode === '--help') {
    console.log(`
Mobbin Scraper v3

  search <app-name> [--platform ios|web]    Find app by name
  find-flows <app-name> [--platform web]    Find app + list its flows
  app-flows <app-url>                       List flows from URL
  download-flow <app-url> <N> [label]       Download Nth flow as zip
  screens <query> [--platform web] [--limit N]  Download matching screens

Platform auto-detected from keywords (web/SaaS → web, mobile/iOS → ios).
`);
    process.exit(0);
  }

  const { args, flags } = parseArgs(rest);
  const platform = flags.platform || null;
  const limit = parseInt(flags.limit || '15');

  if (mode === 'search') {
    const raw = args.join(' ');
    const plat = platform || detectPlatform(raw);
    const query = cleanQuery(raw);
    const appUrl = await searchAndNavigate(query, plat);
    if (appUrl) console.log(`\n✅ ${appUrl}`);
  }
  else if (mode === 'find-flows') {
    const raw = args.join(' ');
    const plat = platform || detectPlatform(raw);
    const query = cleanQuery(raw);
    const appUrl = await searchAndNavigate(query, plat);
    if (!appUrl) return;
    const flows = await getAppFlows(appUrl);
    if (flows.length === 0) { console.log('❌ No flows found.'); return; }
    flows.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${f.screenCount} screens)`));
    console.log(`\n📍 App URL: ${appUrl}`);
  }
  else if (mode === 'app-flows') {
    const flows = await getAppFlows(args[0]);
    if (flows.length === 0) { console.log('❌ No flows found.'); return; }
    flows.forEach((f, i) => console.log(`  ${i + 1}. ${f.name} (${f.screenCount} screens)`));
  }
  else if (mode === 'download-flow') {
    const appUrl = args[0];
    const flowIdx = parseInt(args[1] || '1') - 1;
    const label = args[2] || 'flow';
    const flows = await getAppFlows(appUrl);
    if (flows.length === 0) { console.log('❌ No flows found.'); return; }
    if (flowIdx >= flows.length) { console.log(`❌ Only ${flows.length} flows. Use 1-${flows.length}.`); return; }
    const flow = flows[flowIdx];
    console.log(`\n🎯 ${flow.name} (${flow.screenCount} screens)\n`);
    await downloadScreens(flow.images, label || flow.name);
  }
  else if (mode === 'screens') {
    const query = args.join(' ');
    const plat = platform || detectPlatform(query);
    await searchScreens(query, plat, limit);
  }
  else {
    const query = [mode, ...rest].join(' ');
    const plat = platform || detectPlatform(query);
    await searchScreens(query, plat, limit);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
