#!/usr/bin/env node
/* Patch: re-download tiny logos, fix image mapping + brand logos + home sections, regen catalog */
const fs = require('fs');
const path = require('path');

const S = '/home/z/my-project/scripts/emdata';
const IMGROOT = '/home/z/my-project/download/em_images';

// ---- 1. Re-download failed small logos with lower threshold ----
const tinyJobs = [
  'https://www.electromart.com.gh/wp-content/uploads/2024/06/infinix-logo-150x150-1.webp',
  'https://www.electromart.com.gh/wp-content/uploads/2024/06/TCL-LOGO-NEW-1-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/06/infinix-logo.webp',
  'https://www.electromart.com.gh/wp-content/uploads/2025/02/ITEL-LOGO-DESIGNS-1-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/07/BRUHM-LOGO-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/07/SAMSUNG-LOGO-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/07/LG-LOGO-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/07/oraimo-logo-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/07/PHILIPS-LOGO-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/07/BINATONE-LOGO-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/07/NASCO-LOGO-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/07/MIDEA-LOGO-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/07/TAMASHI-LOGO-1.png',
  'https://www.electromart.com.gh/wp-content/uploads/2024/07/HISENSE-LOGO-1.png',
];
(async () => {
  for (const u of tinyJobs) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) { console.log('404', u); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const base = path.basename(u);
      fs.writeFileSync(path.join(IMGROOT, 'b', base), buf);
      console.log('ok', base, buf.length);
    } catch (e) { console.log('err', u, e.message); }
  }
})();
