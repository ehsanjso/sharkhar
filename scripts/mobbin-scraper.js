#!/usr/bin/env node
/**
 * Mobbin Design Scraper v2
 * 
 * Usage:
 *   node mobbin-scraper.js search "fintech"           → list matching apps
 *   node mobbin-scraper.js app-flows <app-url>         → list flows for an app
 *   node mobbin-scraper.js download-flow <app-url> <N> → download Nth flow as zip
 *   node mobbin-scraper.js screens "dashboard"         → download screens matching query
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const BROWSER_API = 'http://127.0.0.1:18791';
const PROFILE = 'clawd';

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
const evalJs = (fn, tid) => api('act', { kind: 'evaluate', fn, ...(tid && { targetId: tid }) });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function upgradeUrl(url) {
  try { const u = new URL(url); u.searchParams.set('w', '1080'); u.searchParams.set('q', '90'); u.searchParams.set('f', 'png'); return u.toString(); } catch { return url; }
}

async function downloadImage(url, dest) {
  try {
    const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(dest, b); return b.length;
  } catch (e) { console.error(`  ⚠ ${e.message}`); return 0; }
}

async function zipDir(dir, zipPath) {
  return new Promise((res, rej) => {
    const o = fs.createWriteStream(zipPath); const a = archiver('zip', { zlib: { level: 6 } });
    o.on('close', () => res(a.pointer())); a.on('error', rej); a.pipe(o);
    a.directory(dir, path.basename(dir)); a.finalize();
  });
}

async function downloadScreens(images, label) {
  const ts = Date.now(), safe = label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const dir = `/tmp/mobbin-${safe}-${ts}`, zip = `${dir}.zip`;
  fs.mkdirSync(dir, { recursive: true });
  
  let ok = 0;
  for (let i = 0; i < images.length; i++) {
    const url = upgradeUrl(images[i]);
    const name = `${String(i+1).padStart(2,'0')}.png`;
    process.stdout.write(`  [${i+1}/${images.length}] `);
    const sz = await downloadImage(url, path.join(dir, name));
    if (sz > 0) { ok++; console.log(`✅ ${(sz/1024).toFixed(0)}KB`); }
  }
  
  if (ok === 0) { fs.rmSync(dir, { recursive: true }); return null; }
  const zs = await zipDir(dir, zip);
  fs.rmSync(dir, { recursive: true });
  console.log(`\n📦 ${ok} screens → ${zip} (${(zs/1024/1024).toFixed(1)}MB)`);
  console.log(`ZIP_PATH:${zip}`);
  return zip;
}

// --- Search apps ---
async function searchApps(query, platform = 'ios') {
  console.log(`🔍 Searching apps: "${query}"`);
  const { targetId } = await nav(`https://mobbin.com/search/apps/${platform}?content_type=apps&q=${encodeURIComponent(query)}`);
  await sleep(4000);
  const r = await evalJs(`() => {
    const apps = [];
    document.querySelectorAll('h3').forEach(h3 => {
      const li = h3.closest('li') || h3.parentElement;
      const link = li?.querySelector('a[href*="/apps/"]');
      const desc = li?.querySelector('p');
      if (link) apps.push({ name: h3.textContent.trim(), desc: desc?.textContent?.trim() || '', url: 'https://mobbin.com' + link.getAttribute('href') });
    });
    return apps.slice(0, 15);
  }`, targetId);
  return r.result || [];
}

// --- Get flows from app page ---
async function getAppFlows(appUrl) {
  const flowsUrl = appUrl.replace(/\/(screens|ui-elements|flows).*$/, '') + '/flows';
  const url = flowsUrl.includes('/flows') ? flowsUrl : appUrl + '/flows';
  console.log(`📱 Loading flows: ${url}`);
  const { targetId } = await nav(url);
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
      if (!groups[fid]) groups[fid] = { id: fid, url: 'https://mobbin.com/flows/' + fid, images: [] };
      if (!groups[fid].images.includes(img.src)) groups[fid].images.push(img.src);
    });
    
    // Get flow names from the page text near each flow strip
    const results = Object.values(groups);
    
    // Try to get names from the sibling text elements
    const strips = document.querySelectorAll('[class*="flow"], [class*="strip"]');
    
    return results;
  }`, targetId);
  
  // Also get flow names from the sidebar tree
  const names = await evalJs(`() => {
    const items = [];
    const btns = document.querySelectorAll('button[aria-expanded]');
    btns.forEach(b => {
      const t = b.textContent.trim();
      if (t && t.length < 60) items.push(t);
    });
    return items;
  }`, targetId);
  
  const flows = r.result || [];
  const flowNames = names.result || [];
  
  // Match names to flows (they appear in order)
  flows.forEach((f, i) => {
    f.name = flowNames[i] || `Flow ${i+1}`;
    f.screenCount = f.images.length;
  });
  
  return flows;
}

// --- Search screens (legacy) ---
async function searchScreens(query, platform = 'ios', limit = 15) {
  console.log(`🔍 Searching screens: "${query}"`);
  const { targetId } = await nav(`https://mobbin.com/search/apps/${platform}?content_type=screens&q=${encodeURIComponent(query)}`);
  await sleep(5000);
  const r = await evalJs(`() => {
    const imgs = [];
    document.querySelectorAll('a[href*="/screens/"]').forEach(link => {
      const img = link.querySelector('img[src*="bytescale"]');
      if (!img || img.src.includes('app_logos') || img.src.includes('dictionary') || img.src.includes('trending_filter')) return;
      if (!imgs.includes(img.src)) imgs.push(img.src);
    });
    return imgs;
  }`, targetId);
  const images = (r.result || []).slice(0, limit);
  if (images.length === 0) { console.log('❌ No screens found.'); return; }
  console.log(`📱 Found ${images.length} screens`);
  return downloadScreens(images, query);
}

// --- Main ---
async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  if (!mode || mode === '--help') {
    console.log('Usage:\n  search <query>\n  app-flows <app-url>\n  download-flow <app-url> [flow-index] [label]\n  screens <query> [--limit N]');
    process.exit(0);
  }

  if (mode === 'search') {
    const apps = await searchApps(rest.join(' '));
    apps.forEach((a, i) => console.log(`  ${i+1}. ${a.name} — ${a.desc}\n     ${a.url}`));
  }
  else if (mode === 'app-flows') {
    const flows = await getAppFlows(rest[0]);
    flows.forEach((f, i) => console.log(`  ${i+1}. ${f.name} (${f.screenCount} screens)\n     ${f.url}`));
  }
  else if (mode === 'download-flow') {
    const appUrl = rest[0];
    const flowIdx = parseInt(rest[1] || '1') - 1;
    const label = rest[2] || 'flow';
    
    const flows = await getAppFlows(appUrl);
    if (flows.length === 0) { console.log('❌ No flows found.'); return; }
    if (flowIdx >= flows.length) { console.log(`❌ Only ${flows.length} flows available.`); return; }
    
    const flow = flows[flowIdx];
    console.log(`\n🎯 Downloading: ${flow.name} (${flow.screenCount} screens)\n`);
    await downloadScreens(flow.images, label || flow.name);
  }
  else if (mode === 'screens') {
    let limit = 15, query = [];
    for (let i = 0; i < rest.length; i++) {
      if (rest[i] === '--limit') limit = parseInt(rest[++i]);
      else query.push(rest[i]);
    }
    await searchScreens(query.join(' '), 'ios', limit);
  }
  else { await searchScreens([mode, ...rest].join(' ')); }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
