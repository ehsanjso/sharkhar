#!/usr/bin/env node
/**
 * Mobbin Design Scraper
 * Searches Mobbin.com and downloads screen design images.
 * Requires: clawd browser profile logged into Mobbin.
 *
 * Usage:
 *   node mobbin-scraper.js "dashboard"
 *   node mobbin-scraper.js "onboarding" --platform web --limit 20
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const BROWSER_API = 'http://127.0.0.1:18791';
const PROFILE = 'clawd';
const DEFAULT_LIMIT = 15;

async function browserPost(endpoint, body = {}) {
  const res = await fetch(`${BROWSER_API}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile: PROFILE, ...body }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Browser ${endpoint}: ${data.error}`);
  return data;
}

async function navigate(url) {
  return browserPost('navigate', { url });
}

async function evaluate(fn, targetId) {
  const body = { kind: 'evaluate', fn };
  if (targetId) body.targetId = targetId;
  return browserPost('act', body);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function searchMobbin(query, platform, contentType) {
  const searchUrl = `https://mobbin.com/search/apps/${platform}?content_type=${contentType}&q=${encodeURIComponent(query)}`;
  console.log(`🔍 Searching: ${searchUrl}`);

  const nav = await navigate(searchUrl);
  const targetId = nav.targetId;
  await sleep(5000);

  const extractFn = `() => {
    const results = [];
    const seen = new Set();
    const links = document.querySelectorAll('a[href*="/screens/"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const screenId = href.split('/screens/')[1];
      if (!screenId) continue;
      const img = link.querySelector('img[src*="bytescale"]');
      if (!img) continue;
      if (img.src.includes('app_logos') || img.src.includes('dictionary') || img.src.includes('trending_filter')) continue;
      const parent = link.closest('li') || link.parentElement?.parentElement;
      const nameEl = parent?.querySelector('h3') || parent?.querySelector('a[href*="/apps/"]');
      const appName = nameEl ? nameEl.textContent.trim() : 'screen';
      results.push({
        screenId,
        imageUrl: img.src,
        appName: appName.replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 40),
      });
    }
    if (results.length === 0) {
      const imgs = document.querySelectorAll('img[src*="bytescale.mobbin.com"]');
      for (const img of imgs) {
        if (img.src.includes('app_logos') || img.src.includes('dictionary') || img.src.includes('trending_filter')) continue;
        if (img.naturalHeight < 300 || img.naturalWidth < 100) continue;
        const ratio = img.naturalHeight / img.naturalWidth;
        if (ratio < 1.3) continue;
        if (seen.has(img.src)) continue;
        seen.add(img.src);
        results.push({
          screenId: 'img-' + results.length,
          imageUrl: img.src,
          appName: (img.alt || 'screen').replace(' screen', '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 40),
        });
      }
    }
    return results;
  }`;

  const result = await evaluate(extractFn, targetId);
  return { screens: result.result || [], targetId };
}

function upgradeImageUrl(url) {
  try {
    const u = new URL(url);
    u.searchParams.set('w', '1080');
    u.searchParams.set('q', '90');
    u.searchParams.set('f', 'png');
    return u.toString();
  } catch { return url; }
}

async function downloadImage(url, destPath) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buf);
    return buf.length;
  } catch (err) {
    console.error(`  ⚠ Failed: ${err.message}`);
    return 0;
  }
}

async function createZip(sourceDir, zipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });
    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(sourceDir, path.basename(sourceDir));
    archive.finalize();
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help') {
    console.log('Usage: node mobbin-scraper.js <query> [--platform ios|web] [--type screens|flows] [--limit N]');
    process.exit(0);
  }

  let query = args[0];
  let platform = 'ios', contentType = 'screens', limit = DEFAULT_LIMIT;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--platform') platform = args[++i];
    else if (args[i] === '--type') contentType = args[++i];
    else if (args[i] === '--limit') limit = parseInt(args[++i]);
  }

  const ts = Date.now();
  const safeName = query.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const dirName = `mobbin-${safeName}-${ts}`;
  const downloadDir = `/tmp/${dirName}`;
  const zipPath = `/tmp/${dirName}.zip`;

  console.log(`\n🎨 Mobbin Scraper`);
  console.log(`   Query: "${query}" | Platform: ${platform} | Limit: ${limit}\n`);

  const { screens } = await searchMobbin(query, platform, contentType);
  if (screens.length === 0) {
    console.log('❌ No screens found.');
    process.exit(1);
  }

  const toDownload = screens.slice(0, limit);
  console.log(`📱 Found ${screens.length} screens, downloading ${toDownload.length}\n`);
  fs.mkdirSync(downloadDir, { recursive: true });

  let downloaded = 0;
  for (let i = 0; i < toDownload.length; i++) {
    const s = toDownload[i];
    const hiRes = upgradeImageUrl(s.imageUrl);
    const filename = `${String(i + 1).padStart(2, '0')}-${s.appName || 'screen'}.png`;
    const dest = path.join(downloadDir, filename);
    process.stdout.write(`  [${i + 1}/${toDownload.length}] ${s.appName}... `);
    const size = await downloadImage(hiRes, dest);
    if (size > 0) { downloaded++; console.log(`✅ ${(size / 1024).toFixed(0)}KB`); }
  }

  if (downloaded === 0) {
    console.log('\n❌ No images downloaded.');
    fs.rmSync(downloadDir, { recursive: true });
    process.exit(1);
  }

  const zipSize = await createZip(downloadDir, zipPath);
  fs.rmSync(downloadDir, { recursive: true });
  console.log(`\n📦 ${downloaded} screens → ${zipPath} (${(zipSize / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`ZIP_PATH:${zipPath}`);
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
