#!/usr/bin/env node
/**
 * Design Gallery Scraper
 * 
 * Searches top design inspiration websites for references.
 * Used alongside Mobbin for comprehensive design research.
 * 
 * Usage:
 *   node galleries.js search "SaaS dashboard"
 *   node galleries.js search "AI chat interface" --sites awwwards,godly
 *   node galleries.js site-list
 */

const fs = require('fs');
const path = require('path');

const BROWSER_API = 'http://127.0.0.1:18791';
const PROFILE = 'clawd';

// --- Design Inspiration Sites ---

const DESIGN_SITES = {
  // Award sites (highest quality, curated)
  'awwwards': {
    name: 'Awwwards',
    url: 'https://www.awwwards.com',
    searchUrl: 'https://www.awwwards.com/websites/',
    type: 'awards',
    quality: 5,
    categories: {
      'saas': 'business-corporate',
      'ai': 'technology',
      'ecommerce': 'e-commerce-retail',
      'fintech': 'finance',
      'health': 'health-beauty',
      'education': 'education-culture',
      'travel': 'travel',
      'food': 'food-drink',
      'portfolio': 'portfolio',
      'agency': 'agency-studio',
    }
  },
  'godly': {
    name: 'Godly',
    url: 'https://godly.website',
    searchUrl: 'https://godly.website',
    type: 'gallery',
    quality: 5,
    categories: {
      'saas': 'saas',
      'ai': 'ai',
      'startup': 'startup',
      'agency': 'agency',
      'portfolio': 'portfolio',
      'dark': 'dark',
      'light': 'light',
      '3d': '3d',
      'minimal': 'minimal',
    }
  },
  'landbook': {
    name: 'Land-book',
    url: 'https://land-book.com',
    searchUrl: 'https://land-book.com/gallery',
    type: 'gallery',
    quality: 4,
    categories: {
      'saas': 'saas',
      'startup': 'startup',
      'agency': 'agency',
      'ecommerce': 'ecommerce',
      'portfolio': 'portfolio',
    }
  },
  'lapa': {
    name: 'Lapa.ninja',
    url: 'https://www.lapa.ninja',
    searchUrl: 'https://www.lapa.ninja/category/',
    type: 'gallery',
    quality: 4,
    categories: {
      'saas': 'saas',
      'ai': 'ai-ml',
      'fintech': 'fintech',
      'ecommerce': 'e-commerce',
      'health': 'health-fitness',
      'education': 'education',
    }
  },
  'saaslandingpage': {
    name: 'SaaS Landing Page',
    url: 'https://saaslandingpage.com',
    searchUrl: 'https://saaslandingpage.com/category/',
    type: 'gallery',
    quality: 4,
    categories: {
      'ai': 'ai',
      'analytics': 'analytics',
      'devtool': 'developer-tools',
      'productivity': 'productivity',
      'marketing': 'marketing',
    }
  },
  'onepagelove': {
    name: 'One Page Love',
    url: 'https://onepagelove.com',
    searchUrl: 'https://onepagelove.com/gallery/',
    type: 'gallery',
    quality: 4,
    categories: {
      'saas': 'saas',
      'startup': 'startup',
      'agency': 'agency',
      'portfolio': 'portfolio',
    }
  },
  'siteinspire': {
    name: 'Siteinspire',
    url: 'https://www.siteinspire.com',
    searchUrl: 'https://www.siteinspire.com/websites',
    type: 'gallery',
    quality: 4,
    categories: {
      'saas': 'technology',
      'agency': 'agency',
      'ecommerce': 'ecommerce',
      'portfolio': 'portfolio',
    }
  },
  'darkmodedesign': {
    name: 'Dark Mode Design',
    url: 'https://www.darkmodedesign.com',
    searchUrl: 'https://www.darkmodedesign.com',
    type: 'gallery',
    quality: 3,
    categories: {
      'dark': 'all',
      'saas': 'saas',
      'ai': 'ai',
    }
  },
  'minimal': {
    name: 'Minimal Gallery',
    url: 'https://minimal.gallery',
    searchUrl: 'https://minimal.gallery',
    type: 'gallery',
    quality: 4,
    categories: {
      'minimal': 'all',
      'portfolio': 'portfolio',
      'agency': 'agency',
    }
  },
  'pageflows': {
    name: 'Page Flows',
    url: 'https://pageflows.com',
    searchUrl: 'https://pageflows.com/explore',
    type: 'flows',
    quality: 5,
    categories: {
      'onboarding': 'onboarding',
      'signup': 'signup',
      'pricing': 'pricing',
      'checkout': 'checkout',
      'settings': 'settings',
    }
  },
  'screenlane': {
    name: 'Screenlane',
    url: 'https://screenlane.com',
    searchUrl: 'https://screenlane.com',
    type: 'flows',
    quality: 4,
    categories: {
      'saas': 'web-app',
      'mobile': 'mobile-app',
      'dashboard': 'dashboard',
      'onboarding': 'onboarding',
    }
  },
  'refero': {
    name: 'Refero Design',
    url: 'https://refero.design',
    searchUrl: 'https://refero.design',
    type: 'gallery',
    quality: 5,
    categories: {
      'pricing': 'pricing',
      'hero': 'hero',
      'features': 'features',
      'footer': 'footer',
      'testimonials': 'testimonials',
      'cta': 'cta',
    }
  },
  'dribbble': {
    name: 'Dribbble',
    url: 'https://dribbble.com',
    searchUrl: 'https://dribbble.com/search/',
    type: 'community',
    quality: 3,  // Lower because mixed quality
    categories: {
      'all': '',
    }
  },
  'behance': {
    name: 'Behance',
    url: 'https://www.behance.net',
    searchUrl: 'https://www.behance.net/search/projects',
    type: 'community',
    quality: 3,
    categories: {
      'all': '',
    }
  },
};

// --- Keyword to Category Mapping ---

const KEYWORD_CATEGORIES = {
  'saas': ['saas', 'dashboard', 'productivity', 'team', 'workspace', 'b2b', 'software'],
  'ai': ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'llm', 'chat', 'assistant', 'copilot'],
  'startup': ['startup', 'landing', 'launch', 'product'],
  'agency': ['agency', 'studio', 'creative', 'design agency'],
  'ecommerce': ['ecommerce', 'shop', 'store', 'retail', 'commerce'],
  'fintech': ['fintech', 'finance', 'banking', 'payments', 'crypto', 'wallet'],
  'health': ['health', 'fitness', 'wellness', 'medical', 'healthcare'],
  'education': ['education', 'learning', 'course', 'edtech'],
  'portfolio': ['portfolio', 'personal', 'resume'],
  'dark': ['dark', 'dark mode', 'dark theme'],
  'minimal': ['minimal', 'minimalist', 'clean', 'simple'],
  'devtool': ['developer', 'api', 'devtool', 'code', 'infrastructure'],
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
const snap = () => api('screenshot', { fullPage: false });
const evalJs = (fn) => api('act', { kind: 'evaluate', fn });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// --- Site-specific Scrapers ---

async function scrapeAwwwards(category, limit = 5) {
  const sites = [];
  const catSlug = DESIGN_SITES.awwwards.categories[category] || '';
  const url = catSlug 
    ? `https://www.awwwards.com/websites/${catSlug}/`
    : 'https://www.awwwards.com/websites/';
  
  console.log(`  🏆 Awwwards: ${url}`);
  await nav(url);
  await sleep(4000);

  const results = await evalJs(`() => {
    const items = [];
    // Find all site links in the list
    document.querySelectorAll('a[href*="/sites/"]').forEach((link, i) => {
      if (items.length >= ${limit}) return;
      const img = link.querySelector('img');
      const title = img?.alt || link.textContent?.trim() || 'Untitled';
      // Skip if it's a duplicate or has no useful content
      if (!img?.src || items.find(x => x.title === title)) return;
      // Skip tiny images (icons)
      if (img.src.includes('avatar') || img.src.includes('logo')) return;
      items.push({
        url: link.href,
        title: title,
        thumb: img.src,
      });
    });
    return items;
  }`);

  return results.result || [];
}

async function scrapeGodly(category, limit = 6) {
  // Godly doesn't have category URLs anymore, just use main page
  const url = 'https://godly.website';
  
  console.log(`  ✨ Godly: ${url}`);
  await nav(url);
  await sleep(4000);

  const results = await evalJs(`() => {
    const items = [];
    document.querySelectorAll('article').forEach((article, i) => {
      if (items.length >= ${limit}) return;
      // Title is in first generic/div element
      const titleEl = article.querySelector('div, span');
      const title = titleEl?.textContent?.trim() || 'Untitled';
      // External link has the thumbnail
      const extLink = article.querySelector('a[href*="?ref=godly"]');
      const thumb = extLink?.querySelector('img')?.src;
      // Internal link to website page
      const intLink = article.querySelector('a[href*="/website/"]');
      const pageUrl = intLink?.href;
      
      if (thumb && pageUrl && !items.find(x => x.title === title)) {
        // Extract actual site URL from external link
        const siteUrl = extLink?.href?.replace('?ref=godly', '') || null;
        items.push({
          url: pageUrl,
          title: title,
          thumb: thumb,
          siteUrl: siteUrl,
        });
      }
    });
    return items;
  }`);

  return results.result || [];
}

async function scrapeLapa(category, limit = 6) {
  const catSlug = DESIGN_SITES.lapa.categories[category] || 'saas';
  const url = `https://www.lapa.ninja/category/${catSlug}/`;
  
  console.log(`  🥷 Lapa.ninja: ${url}`);
  await nav(url);
  await sleep(3000);

  const results = await evalJs(`() => {
    const items = [];
    // Find all links to /post/ pages
    document.querySelectorAll('a[href*="/post/"]').forEach((a, i) => {
      if (items.length >= ${limit}) return;
      // Get the title from link text or nearby heading
      const title = a.textContent?.trim();
      if (!title || title.length < 2 || title.length > 100) return;
      // Skip duplicates
      if (items.find(x => x.title === title)) return;
      
      // Find thumbnail - look for sibling or parent with external link that has an img
      const container = a.closest('div[class]');
      const extLink = container?.querySelector('a[href^="http"]:not([href*="lapa.ninja"])');
      const thumb = extLink?.querySelector('img')?.src || container?.querySelector('img')?.src;
      
      if (thumb && !thumb.includes('logo')) {
        items.push({
          url: 'https://www.lapa.ninja' + a.getAttribute('href'),
          title: title,
          thumb: thumb,
          siteUrl: extLink?.href || null,
        });
      }
    });
    return items;
  }`);

  return results.result || [];
}

async function scrapeLandbook(category, limit = 6) {
  // Land-book main page shows recent designs
  const url = 'https://land-book.com';
  
  console.log(`  📖 Land-book: ${url}`);
  await nav(url);
  await sleep(3000);

  const results = await evalJs(`() => {
    const items = [];
    // Find links to /websites/ pages with images
    document.querySelectorAll('a[href*="/websites/"]').forEach((a, i) => {
      if (items.length >= ${limit}) return;
      const img = a.querySelector('img');
      if (!img?.src) return;
      // Skip logos and small images
      if (img.src.includes('logo') || img.alt?.toLowerCase().includes('logo')) return;
      
      // Get title from img alt or link text
      const title = img.alt?.replace(/ - .* design inspiration$/, '')?.trim() || 
                    a.textContent?.trim() || 'Untitled';
      if (title.length < 2 || title.length > 100) return;
      // Skip duplicates
      if (items.find(x => x.title === title || x.url === a.href)) return;
      
      items.push({
        url: a.href,
        title: title,
        thumb: img.src,
      });
    });
    return items;
  }`);

  return results.result || [];
}

async function scrapeSaasLandingPage(category, limit = 6) {
  const catSlug = DESIGN_SITES.saaslandingpage.categories[category] || '';
  const url = catSlug 
    ? `https://saaslandingpage.com/category/${catSlug}/`
    : 'https://saaslandingpage.com';
  
  console.log(`  🚀 SaaS Landing Page: ${url}`);
  await nav(url);
  await sleep(3000);

  const results = await evalJs(`() => {
    const items = [];
    document.querySelectorAll('article, .post-card, a[href*="/"]').forEach((el, i) => {
      if (i >= ${limit}) return;
      const link = el.tagName === 'A' ? el : el.querySelector('a');
      const img = el.querySelector('img');
      const title = el.querySelector('h2, h3, .title')?.textContent?.trim();
      if (link?.href && img?.src && title) {
        items.push({
          url: link.href,
          title: title,
          thumb: img.src,
        });
      }
    });
    return items;
  }`);

  return results.result || [];
}

async function scrapePageFlows(category, limit = 4) {
  const catSlug = DESIGN_SITES.pageflows.categories[category] || '';
  const url = catSlug 
    ? `https://pageflows.com/explore/${catSlug}`
    : 'https://pageflows.com/explore';
  
  console.log(`  🌊 Page Flows: ${url}`);
  await nav(url);
  await sleep(4000);

  const results = await evalJs(`() => {
    const items = [];
    document.querySelectorAll('a[href*="/flow/"]').forEach((a, i) => {
      if (i >= ${limit}) return;
      const img = a.querySelector('img');
      const title = a.querySelector('h3, .title, span')?.textContent?.trim();
      if (img?.src && title && !items.find(x => x.title === title)) {
        items.push({
          url: a.href,
          title: title,
          thumb: img.src,
        });
      }
    });
    return items;
  }`);

  return results.result || [];
}

// --- Main Functions ---

function detectCategory(query) {
  const lower = query.toLowerCase();
  for (const [cat, keywords] of Object.entries(KEYWORD_CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return cat;
    }
  }
  return 'saas'; // default
}

async function searchGalleries(query, options = {}) {
  const {
    sites = ['awwwards', 'godly', 'lapa', 'landbook'],
    limit = 5,
    outputDir = '/tmp/design-galleries',
  } = options;

  const category = detectCategory(query);
  console.log(`\n🎨 Design Gallery Search: "${query}"`);
  console.log(`   Category: ${category}`);
  console.log(`   Sites: ${sites.join(', ')}\n`);

  fs.mkdirSync(outputDir, { recursive: true });

  const allResults = [];
  const scrapers = {
    'awwwards': scrapeAwwwards,
    'godly': scrapeGodly,
    'lapa': scrapeLapa,
    'landbook': scrapeLandbook,
    'saaslandingpage': scrapeSaasLandingPage,
    'pageflows': scrapePageFlows,
  };

  for (const site of sites) {
    const scraper = scrapers[site];
    if (!scraper) {
      console.log(`  ⚠ Unknown site: ${site}`);
      continue;
    }

    try {
      const results = await scraper(category, limit);
      console.log(`     Found: ${results.length} results`);
      
      for (const r of results) {
        allResults.push({
          ...r,
          source: site,
          sourceName: DESIGN_SITES[site]?.name || site,
        });
      }
    } catch (e) {
      console.log(`     ❌ Error: ${e.message}`);
    }
  }

  // Download thumbnails
  console.log(`\n📥 Downloading ${allResults.length} thumbnails...`);
  let downloaded = 0;

  for (let i = 0; i < allResults.length; i++) {
    const r = allResults[i];
    if (!r.thumb) continue;

    const filename = `${String(i + 1).padStart(2, '0')}-${r.source}-${r.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
    const filepath = path.join(outputDir, filename);

    try {
      const res = await fetch(r.thumb);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(filepath, buf);
        r.localPath = filepath;
        downloaded++;
      }
    } catch {}
  }

  console.log(`   ✅ Downloaded: ${downloaded}/${allResults.length}`);

  // Write manifest
  const manifest = {
    query,
    category,
    sites,
    results: allResults,
    downloadedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  return allResults;
}

async function takeFullPageScreenshots(results, outputDir, limit = 6) {
  console.log(`\n📸 Taking full-page screenshots (top ${limit})...`);
  
  const screenshotDir = path.join(outputDir, 'full-screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });

  const toShot = results.slice(0, limit).filter(r => r.siteUrl || r.url);
  let taken = 0;

  for (const r of toShot) {
    // Try to get the actual website URL
    let targetUrl = r.siteUrl;
    if (!targetUrl && r.url.includes('godly.website/website/')) {
      targetUrl = r.url.split('/website/')[1]?.replace(/-/g, '.');
    }
    if (!targetUrl) continue;
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;

    console.log(`   📷 ${r.title}: ${targetUrl}`);

    try {
      await nav(targetUrl);
      await sleep(3000);

      const filename = `${String(taken + 1).padStart(2, '0')}-${r.title.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      
      // Take screenshot via browser API
      const screenshot = await api('screenshot', { fullPage: true });
      if (screenshot.result?.path) {
        const dest = path.join(screenshotDir, filename);
        fs.copyFileSync(screenshot.result.path, dest);
        r.fullScreenshot = dest;
        taken++;
        console.log(`      ✅ Saved`);
      }
    } catch (e) {
      console.log(`      ❌ Failed: ${e.message}`);
    }
  }

  console.log(`   Total: ${taken} screenshots`);
  return taken;
}

// --- CLI ---

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'site-list') {
    console.log('\n📚 Available Design Inspiration Sites:\n');
    for (const [id, site] of Object.entries(DESIGN_SITES)) {
      console.log(`  ${id.padEnd(18)} ${site.name.padEnd(20)} (${site.type}, quality: ${'★'.repeat(site.quality)})`);
    }
    console.log('\nCategories:', Object.keys(KEYWORD_CATEGORIES).join(', '));
    return;
  }

  if (cmd === 'search') {
    const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
    if (!query) {
      console.log('Usage: node galleries.js search "query" [--sites awwwards,godly]');
      process.exit(1);
    }

    const sitesArg = args.find(a => a.startsWith('--sites='));
    const sites = sitesArg ? sitesArg.split('=')[1].split(',') : undefined;

    const outputArg = args.find(a => a.startsWith('--output='));
    const outputDir = outputArg ? outputArg.split('=')[1] : undefined;

    const results = await searchGalleries(query, { sites, outputDir });
    console.log(`\n✅ Found ${results.length} design references`);
    return;
  }

  console.log(`
Design Gallery Scraper

Commands:
  node galleries.js search "SaaS dashboard"
  node galleries.js search "AI chat" --sites=awwwards,godly,lapa
  node galleries.js site-list

Searches top design inspiration websites for references.
`);
}

// Export for use in research.js
module.exports = { searchGalleries, takeFullPageScreenshots, DESIGN_SITES, detectCategory };

if (require.main === module) {
  main().catch(e => { console.error('❌', e.message); process.exit(1); });
}
