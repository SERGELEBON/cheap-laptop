#!/usr/bin/env node
/* Harvest electromart.com.gh data via public JSON APIs (JSON content-type bypasses the HTML challenge) */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'emdata');
fs.mkdirSync(OUT, { recursive: true });

const BASE = 'https://www.electromart.com.gh';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

async function jget(url, label) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      if (ct.includes('html')) throw new Error('challenge html');
      return JSON.parse(text);
    } catch (e) {
      console.log(`  retry ${attempt} ${label}: ${e.message}`);
      await new Promise(r => setTimeout(r, 1500 * attempt));
      if (attempt === 4) throw e;
    }
  }
}

function headersOf(res) { return { total: res.headers.get('x-wp-total'), pages: res.headers.get('x-wp-totalpages') }; }

(async () => {
  // ---------- 1. Store products (with prices, images, categories, brands, attributes) ----------
  let allProducts = [];
  {
    const first = await fetch(`${BASE}/wp-json/wc/store/v1/products?per_page=100&page=1`, { headers: { 'User-Agent': UA } });
    const totalPages = parseInt(first.headers.get('x-wp-totalpages') || '1', 10);
    const j = await first.json();
    allProducts = allProducts.concat(j);
    console.log(`products page 1/${totalPages} -> ${j.length}`);
    for (let p = 2; p <= totalPages; p++) {
      const arr = await jget(`${BASE}/wp-json/wc/store/v1/products?per_page=100&page=${p}`, `products p${p}`);
      allProducts = allProducts.concat(arr);
      console.log(`products page ${p}/${totalPages} -> ${arr.length} (cum ${allProducts.length})`);
      await new Promise(r => setTimeout(r, 800));
    }
  }
  fs.writeFileSync(path.join(OUT, 'products_store.json'), JSON.stringify(allProducts));
  console.log('TOTAL products:', allProducts.length);

  // ---------- 2. Product descriptions (wp/v2) ----------
  let descs = [];
  try {
    const first = await fetch(`${BASE}/wp-json/wp/v2/product?per_page=100&page=1&_fields=id,slug,content,excerpt`, { headers: { 'User-Agent': UA } });
    const totalPages = parseInt(first.headers.get('x-wp-totalpages') || '1', 10);
    descs = descs.concat(await first.json());
    for (let p = 2; p <= Math.min(totalPages, 15); p++) {
      try {
        const arr = await jget(`${BASE}/wp-json/wp/v2/product?per_page=100&page=${p}&_fields=id,slug,content,excerpt`, `desc p${p}`);
        descs = descs.concat(arr);
        console.log(`desc page ${p}/${totalPages} (cum ${descs.length})`);
      } catch (e) { console.log(`desc page ${p} failed:`, e.message); break; }
      await new Promise(r => setTimeout(r, 600));
    }
  } catch (e) { console.log('descs failed', e.message); }
  fs.writeFileSync(path.join(OUT, 'product_descs.json'), JSON.stringify(descs));
  console.log('TOTAL descs:', descs.length);

  // ---------- 3. Categories ----------
  const cats = [];
  for (let p = 1; p <= 3; p++) {
    try {
      const arr = await jget(`${BASE}/wp-json/wp/v2/product_cat?per_page=100&page=${p}`, `cats p${p}`);
      cats.push(...arr);
      if (arr.length < 100) break;
    } catch (e) { break; }
  }
  fs.writeFileSync(path.join(OUT, 'categories.json'), JSON.stringify(cats));
  console.log('TOTAL categories:', cats.length);

  // ---------- 4. Brands ----------
  let brands = [];
  try {
    for (let p = 1; p <= 2; p++) {
      const arr = await jget(`${BASE}/wp-json/wp/v2/product_brand?per_page=100&page=${p}`, `brands p${p}`);
      brands.push(...arr);
      if (arr.length < 100) break;
    }
  } catch (e) { console.log('brands fallback'); }
  fs.writeFileSync(path.join(OUT, 'brands.json'), JSON.stringify(brands));
  console.log('TOTAL brands:', brands.length);

  // ---------- 5. Static pages ----------
  const pages = await jget(`${BASE}/wp-json/wp/v2/pages?per_page=100&_fields=id,slug,link,title,content,excerpt`, 'pages');
  fs.writeFileSync(path.join(OUT, 'pages.json'), JSON.stringify(pages));
  console.log('TOTAL pages:', pages.length);

  // ---------- 6. Media searches (logo / sliders / banners) ----------
  const searches = ['logo', 'slider', 'banner', 'Website-Sliders', 'electromart'];
  const media = {};
  for (const s of searches) {
    try {
      const arr = await jget(`${BASE}/wp-json/wp/v2/media?search=${encodeURIComponent(s)}&per_page=100&_fields=id,source_url,alt_text,title,caption,media_details`, `media ${s}`);
      media[s] = arr.map(m => ({ id: m.id, url: m.source_url, title: (m.title && m.title.rendered) || '', alt: m.alt_text || '', w: m.media_details && m.media_details.width, h: m.media_details && m.media_details.height }));
      console.log(`media "${s}": ${media[s].length}`);
    } catch (e) { media[s] = []; console.log(`media ${s} failed`); }
  }
  fs.writeFileSync(path.join(OUT, 'media_search.json'), JSON.stringify(media));

  // ---------- 7. Reviews count not needed; store API covers ratings ----------
  console.log('HARVEST DONE');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
