#!/usr/bin/env node
/* Build catalog.json v2 — fixed image mapping via p/ dir index, better brand logos & home sections */
const fs = require('fs');
const path = require('path');

const S = '/home/z/my-project/scripts/emdata';
const IMGROOT = '/home/z/my-project/download/em_images';
const products = JSON.parse(fs.readFileSync(`${S}/products_store.json`));
const descs = JSON.parse(fs.readFileSync(`${S}/product_descs.json`));
const cats = JSON.parse(fs.readFileSync(`${S}/categories.json`));
const brands = JSON.parse(fs.readFileSync(`${S}/brands.json`));
const pages = JSON.parse(fs.readFileSync(`${S}/pages.json`));

// ---------- Index product images by product id ----------
const pDir = path.join(IMGROOT, 'p');
const prodImgs = {}; // id -> { main, gallery[] }
fs.readdirSync(pDir).forEach(f => {
  const m = f.match(/^(\d+)-(\d+)-(.*)$/);
  if (!m) return;
  const [, id, gi] = m;
  (prodImgs[id] = prodImgs[id] || { gallery: [] }).gallery[+gi] = `/images/p/${f}`;
});
Object.values(prodImgs).forEach(v => { v.gallery = (v.gallery || []).filter(Boolean); v.main = v.gallery[0] || null; });

function decodeEnt(s) {
  return (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#8217;/g, '\u2019').replace(/&#8220;/g, '\u201c').replace(/&#8221;/g, '\u201d')
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(parseInt(d)));
}
function cleanHtml(html) {
  if (!html) return '';
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '').replace(/\sstyle="[^"]*"/gi, '').replace(/\sclass="[^"]*"/gi, '').trim();
}
function fmtPrice(v) { return '₵ ' + v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const descMap = new Map(descs.map(d => [d.slug, d]));
const outProducts = products.map(p => {
  const price = parseInt(p.prices?.price || '0', 10) / 100;
  const regular = parseInt(p.prices?.regular_price || '0', 10) / 100;
  const sale = parseInt(p.prices?.sale_price || '0', 10) / 100;
  const d = descMap.get(p.slug);
  const imgv = prodImgs[String(p.id)];
  const discount = regular > 0 && sale > 0 && sale < regular ? Math.round((1 - sale / regular) * 100) : 0;
  return {
    id: p.id, slug: p.slug, name: decodeEnt(p.name), sku: p.sku || '',
    price, regular: regular > price && regular > 0 ? regular : null,
    priceFmt: fmtPrice(price), regularFmt: regular > price && regular > 0 ? fmtPrice(regular) : null,
    onSale: !!p.on_sale, discount,
    image: imgv?.main || null, gallery: imgv?.gallery || [],
    categories: (p.categories || []).map(c => ({ id: c.id, name: decodeEnt(c.name), slug: (c.slug || '').replace(/https?:\/\/.*\/product-category\//, '').replace(/\/$/, '') })),
    brand: (p.brands || []).map(b => ({ id: b.id, name: decodeEnt(b.name), slug: (b.slug || '').replace(/https?:\/\/.*\/brand\//, '').replace(/\/$/, '') }))[0] || null,
    shortDescription: cleanHtml(p.short_description || ''),
    description: cleanHtml((d?.content?.rendered) || p.description || ''),
    averageRating: parseFloat(p.average_rating || '0'), reviewCount: p.review_count || 0,
    inStock: (p.stock_status || 'instock') === 'instock',
  };
});

// ---------- Categories ----------
const catBanners = {
  'air-conditioners': '/images/c/Website-Sliders-AC.jpg', 'audio': '/images/c/Website-Sliders-Audio.jpg',
  'televisions': '/images/c/Website-Sliders-TV.jpg', 'gas-cookers': '/images/c/Website-Sliders-Gas-Cooker.jpg',
  'fan': '/images/c/Website-Sliders-FAN.jpg', 'freezer': '/images/c/Website-Sliders-Chest-Freezer.jpg',
  'refrigerator': '/images/c/Website-Sliders-REF-1.jpg', 'wm': '/images/c/Website-Sliders-Washing-Machine.jpg',
  'computing/laptop': '/images/c/LP.jpg', 'mobile-phones': '/images/c/Mobile-Accessories.jpg',
  'small-home-appliances': '/images/c/SA.jpg', 'water-dispenser': '/images/c/WD.jpg', 'gc': '/images/c/GC.jpg',
};
function catSlugOf(link) { return (link || '').replace(/https?:\/\/[^/]+\/product-category\//, '').replace(/\/$/, ''); }
const outCats = cats.map(c => {
  const slug = catSlugOf(c.link);
  return {
    id: c.id, name: decodeEnt(c.name), slug, parent: c.parent || 0, count: c.count || 0,
    banner: catBanners[slug] || catBanners[slug.split('/')[0]] || null,
    yoastTitle: ((c.yoast_head || '').match(/<title>(.*?)<\/title>/) || [])[1] || '',
    yoastDesc: ((c.yoast_head || '').match(/name="description" content="(.*?)"/) || [])[1] || '',
  };
});

// ---------- Brands with logos ----------
const bDir = path.join(IMGROOT, 'b');
const logoFiles = fs.readdirSync(bDir).map(f => {
  const stem = path.basename(f, path.extname(f)).toUpperCase().replace(/[^A-Z0-9]+/g, '-');
  return { file: `/images/b/${f}`, stem };
});
function brandLogo(name) {
  const tokens = name.toUpperCase().replace(/&amp;/g, 'AND').split(/[^A-Z0-9]+/).filter(t => t.length >= 3);
  const key = tokens[0] || '';
  if (!key) return null;
  // 1. filename whose stem contains the key (or vice versa)
  let hit = logoFiles.find(l => l.stem.replace(/-/g, '').includes(key) || key.includes(l.stem.replace(/-/g, '')));
  if (hit) return hit.file;
  return null;
}
const brandCount = {};
outProducts.forEach(p => { if (p.brand) brandCount[p.brand.name] = (brandCount[p.brand.name] || 0) + 1; });
const outBrands = brands.map(b => {
  const nm = decodeEnt(b.name);
  return {
    id: b.id, name: nm, slug: (b.link || '').replace(/https?:\/\/[^/]+\/brand\//, '').replace(/\/$/, ''),
    count: brandCount[nm] || b.count || 0, logo: brandLogo(nm),
  };
}).sort((a, b) => b.count - a.count);

// ---------- Pages ----------
const pgFiles = new Set(fs.readdirSync(path.join(IMGROOT, 'pg')));
const outPages = pages.map(pg => {
  let html = cleanHtml((pg.content?.rendered) || '');
  html = html.replace(/(https?:\/\/www\.electromart\.com\.gh)?\/wp-content\/uploads\/([^\s"'()<>]+?\.(?:png|jpe?g|webp|gif))/gi, (m, host, p1) => {
    const base = path.basename(p1);
    if (pgFiles.has(base)) return `/images/pg/${base}`;
    const noDim = base.replace(/-\d+x\d+(?=\.\w+$)/, '');
    if (pgFiles.has(noDim)) return `/images/pg/${noDim}`;
    return m;
  });
  return { id: pg.id, slug: pg.slug, title: decodeEnt(pg.title?.rendered || ''), content: html };
});

// ---------- Home sections (exact lists from the original homepage) ----------
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function matchProduct(needle) {
  const n = norm(needle);
  if (!n) return null;
  let p = outProducts.find(p => p.price > 0 && norm(p.name).includes(n));
  if (p) return p;
  // shrink prefix until a product name contains it (handles model numbers & missing words)
  for (let L = Math.floor(n.length * 0.85); L >= 8; L -= 3) {
    const pref = n.slice(0, L);
    p = outProducts.find(q => q.price > 0 && norm(q.name).includes(pref));
    if (p) return p;
  }
  return null;
}
const homeSections = [
  { title: 'Best Sellers', products: ['BRUHM GAS COOKER BGC-5540IB', 'BRUHM 1.5HP SPLIT AC', 'BRUHM SPLIT BAS-18RC3W', 'HAIER CHEST FREEZER HCF-588VS', 'BRUHM TV BTF 100W', 'HAIER 65” QLED GOOGLE TV'] },
  { title: 'Air Conditioners', products: ['LG SPLIT AC S4- Q12JA28J', 'BRUHM SPLIT BAS-12IC3W', 'BRUHM 2.0HP SPLIT BAS-18IC3W', 'BRUHM 1.5HP SPLIT AC BAS-12RC3W', 'BRUHM SPLIT BAS-18RC3W 2.0HP', 'BRUHM SPLIT BAS-24IC3W'] },
  { title: 'Mobile Phones', products: ['HUAWEI Y63', 'TECNO SPARK 40', 'HUAWEI NOVA 13', 'ITEL MOBILE PHONE A200', 'APPLE IPHONE 16 PRO 128GB', 'TECNO MOBILE SPARK 30'] },
  { title: 'Televisions', products: ['LG NANOCELL 86', 'SAMSUNG 43 LED FHD SMART UA43F6000FUXGH', 'LG LED 75NANO80T6A', 'SAMSUNG 43 SMART UHD 4K UA43U8000FUXGH', 'HAIER 65 QLED GOOGLE TV', 'HAIER 75 QLED GOOGLE TV'] },
  { title: 'New Arrivals', products: ['BRUHM 2.5 HP SPLIT WIFI SMART', 'BRUHM WASHING MACHINE-BWF-120G', 'LG 5HP Inverter Floor Standing', 'HAIER REF HRF-668SS', 'BRUHM GAS COOKER BGC-5640SS', 'BRUHM AIRFRYER BFE-571750B'] },
  { title: 'Washing Machines', products: ['LG 22KG T22X2EHHSTP', 'LG 15KG FRONT LOAD WASHER ESSENCE', 'LG 19KG TOP LOAD WASHING MACHINE', 'SAMSUNG WASHING MACHINE WW11CGC04DABSG', 'LG 10.5/7 KG FRONT LOAD F4V5RGP2T', 'LG WM FAM F4V5RYP2T'] },
  { title: 'Refrigerators', products: ['SAMSUNG REF RT35CG5421S9GH', 'BRUHM REF BFQ-592EN', 'BRUHM REF BFQ-510ENG', 'BRUHM REFRIGERATOR BFD-330MD', 'BRUHM REFRIGERATOR BFX-450ENG', 'BRUHM REFRIGERATOR BFC-140MD'] },
  { title: 'Cooking Range', products: ['BRUHM GAS COOKER BGC-5540IB', 'TAMASHI GAS COOKER NG-5540G', 'BRUHM GAS COOKER BGC-5540IF', 'TAMASHI GAS COOKER NG6640G', 'BRUHM GAS COOKER BGC-5540IS', 'BRUHM GAS COOKER BGC-5640SS'] },
  { title: 'Small Appliances', products: ['MIDEA YPJ26A1W STEAM IRON', 'BINATONE BLENDER BL 1505', 'BRUHM DRY IRON BID-1200XU', 'BRUHM AIRFRYER BFM-421500B', 'MIDEA 100L ELECTRIC WATER HEATER', 'BINATONE BLENDER BLG BLS 360'] },
].map(sec => {
  const slugs = [], unmatched = [];
  sec.products.forEach(n => {
    const p = matchProduct(n);
    if (p) { if (!slugs.includes(p.slug)) slugs.push(p.slug); } else unmatched.push(n);
  });
  if (unmatched.length) console.log(`UNMATCHED in "${sec.title}":`, unmatched.join(' | '));
  return { title: sec.title, slug: norm(sec.title), products: slugs };
});

const catalog = {
  generatedAt: new Date().toISOString(),
  products: outProducts, categories: outCats, brands: outBrands, pages: outPages, homeSections,
};
const outPath = '/home/z/my-project/public/data/catalog.json';
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(catalog));
console.log('catalog.json:', (fs.statSync(outPath).size / 1024 / 1024).toFixed(1), 'MB');
console.log('products with images:', outProducts.filter(p => p.image).length, '/', outProducts.length);
console.log('brands with logos:', outBrands.filter(b => b.logo).length, '/', outBrands.length);
console.log('sections:', homeSections.map(s => `${s.slug}:${s.products.length}`).join(' '));
