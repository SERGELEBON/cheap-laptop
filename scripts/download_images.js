#!/usr/bin/env node
/* Download all Electromart images locally (products, sliders, logo, category banners, brand logos, page images) */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const S = '/home/z/my-project/scripts/emdata';
const D = '/home/z/my-project/download/em_images';
['p', 'c', 'b', 'pg', 'misc'].forEach(d => fs.mkdirSync(path.join(D, d), { recursive: true }));

const products = JSON.parse(fs.readFileSync(`${S}/products_store.json`));
const pages = JSON.parse(fs.readFileSync(`${S}/pages.json`));
const media = JSON.parse(fs.readFileSync(`${S}/media_search.json`));

const jobs = new Map(); // url -> dest
function add(url, dir, name) {
  if (!url || !url.startsWith('http')) return;
  if (jobs.has(url)) return;
  const ext = (url.match(/\.(png|jpe?g|webp|gif|svg)(\?|$)/i) || [, 'jpg'])[1].toLowerCase();
  jobs.set(url, path.join(dir, name.endsWith('.' + ext) ? name : name + '.' + ext));
}

// 1. Logo (non-scaled preferred)
add('https://www.electromart.com.gh/wp-content/uploads/2025/12/Electromart-website-Logo-PNG.png', `${D}/misc`, 'logo.png');
add('https://www.electromart.com.gh/wp-content/uploads/2025/12/Electromart-website-Logo-PNG-scaled.png', `${D}/misc`, 'logo-scaled.png');
add('https://www.electromart.com.gh/wp-content/uploads/2025/12/Electromart-website-Logo-PNG-white.png', `${D}/misc`, 'logo-white.png');

// 2. Sliders
const sliders = (media['Website-Sliders'] || []).concat(media['slider'] || []);
sliders.forEach(m => add(m.url, `${D}/misc`, 'slider-' + path.basename(m.url)));

// 3. Category banners (from media searches matching Website-Sliders or known list)
media['banner'].forEach(m => {
  const base = path.basename(m.url);
  if (/Website-Sliders|GC\.jpg|LP\.jpg|SA\.jpg|WD\.jpg|Mobile-Accessories|REF/i.test(base)) add(m.url, `${D}/c`, base);
});

// 4. Brand logos from media results (match filenames)
media['logo'].concat(media['banner']).forEach(m => {
  const base = path.basename(m.url);
  if (/logo/i.test(base)) add(m.url, `${D}/b`, base);
});

// 5. Product images: pick variant closest to 600w from srcset
function pickVariant(img) {
  if (img.srcset) {
    const parts = img.srcset.split(',').map(s => { const [u, w] = s.trim().split(/\s+/); return { u, w: parseInt(w) || 0 }; }).filter(p => p.w > 0);
    parts.sort((a, b) => Math.abs(a.w - 600) - Math.abs(b.w - 600));
    if (parts.length) return parts[0].u;
  }
  if (img.thumbnail) return img.thumbnail;
  return img.src;
}
let pi = 0;
products.forEach(p => {
  (p.images || []).slice(0, 3).forEach((img, gi) => {
    const url = gi === 0 ? pickVariant(img) : (img.thumbnail || img.src);
    add(url, `${D}/p`, `${p.id}-${gi}-${path.basename(url).replace(/-\d+x\d+(?=\.\w+$)/, '')}`);
  });
  pi++;
});

// 6. Page content images
const pageUrls = new Set();
pages.forEach(pg => {
  const html = (pg.content && pg.content.rendered) || '';
  const re = /https:\/\/www\.electromart\.com\.gh\/wp-content\/uploads\/[^\s"'()<>]+\.(png|jpe?g|webp|gif)/gi;
  let m; while ((m = re.exec(html)) !== null) pageUrls.add(m[0].replace(/-\d+x\d+(?=\.\w+$)/, '') === m[0] ? m[0] : m[0]);
});
let pgI = 0;
pageUrls.forEach(u => add(u, `${D}/pg`, path.basename(u)));

console.log('TOTAL jobs:', jobs.size);
fs.writeFileSync('/home/z/my-project/scripts/dl_manifest.json', JSON.stringify([...jobs.entries()]));

// Download with concurrency
const entries = [...jobs.entries()];
let done = 0, fail = 0;
async function dl([url, dest]) {
  for (let a = 1; a <= 3; a++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) throw new Error('challenge');
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) throw new Error('too small ' + buf.length);
      fs.writeFileSync(dest, buf);
      done++; return;
    } catch (e) { if (a === 3) { fail++; fs.appendFileSync('/home/z/my-project/scripts/dl_errors.log', url + ' :: ' + e.message + '\n'); } await new Promise(r => setTimeout(r, 800)); }
  }
}
(async () => {
  const CONC = 14;
  let idx = 0;
  async function worker() {
    while (idx < entries.length) {
      const my = idx++;
      await dl(entries[my]);
      if ((my % 60) === 0) console.log(`${my}/${entries.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONC }, worker));
  console.log(`DONE ok=${done} fail=${fail} of ${entries.length}`);
})();
