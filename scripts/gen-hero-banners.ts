import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

/* Génère 10 bannières hero 2880x960 (ratio 3:1) via SDK direct (le CLI refuse les tailles hors liste blanche) */
const OUT = "/home/z/my-project/public/images/cl";
const STYLE =
  "professional e-commerce hero banner photography, wide cinematic composition, main subject placed at center with generous empty space around it, photorealistic, high quality, soft studio lighting, blue and navy color palette accents, clean modern look, absolutely no text, no letters, no words, no watermark, no logo, no people";

const BANNERS: { key: string; prompt: string }[] = [
  { key: "banner-open", prompt: "modern laptop computer showroom interior grand opening, rows of open laptops neatly displayed on white tables, bright welcoming store, blue accent lighting" },
  { key: "banner-gaming", prompt: "powerful gaming laptop with glowing RGB backlit keyboard and colorful screen, dark navy background with neon blue light streaks, dramatic mood" },
  { key: "banner-ultrabook", prompt: "ultra-thin silver ultrabook laptop half open on a minimalist white desk, light blue gradient background, elegant and slim design emphasized" },
  { key: "banner-macbook", prompt: "sleek silver aluminum laptop slightly open floating over a clean minimalist workspace, soft white and light blue background, premium look" },
  { key: "banner-student", prompt: "student laptop open on a study desk with notebooks, a school backpack and a coffee mug, bright friendly daylight scene, light blue wall" },
  { key: "banner-2in1", prompt: "convertible 2-in-1 touchscreen laptop in tent mode with a detached stylus pen beside it, clean light background with blue gradient accents" },
  { key: "banner-accessories", prompt: "flat lay of laptop accessories, backpack, wireless mouse, headphones, USB hub and chargers neatly arranged on a light blue surface, top view" },
  { key: "banner-scooter", prompt: "modern teal electric scooter parked on a sunny African city street, clean composition, blue sky, urban mobility feel" },
  { key: "banner-desktop", prompt: "desktop computer setup with PC tower and large monitor on a tidy office desk, clean cable management, light blue and white tones" },
  { key: "banner-monitor", prompt: "widescreen external computer monitor with slim bezels on an ergonomic desk, clean minimal workspace, soft blue ambient lighting" },
];

const SIZE = "2880x960";

async function main() {
  const zai = await ZAI.create();
  const only = process.argv[2]; // clé optionnelle pour régénérer une seule bannière
  let ok = 0, fail = 0;

  for (const b of BANNERS) {
    if (only && b.key !== only) continue;
    const dest = path.join(OUT, `${b.key}.jpg`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10000) { console.log(`SKIP ${b.key}`); ok++; continue; }

    let done = false;
    for (let attempt = 1; attempt <= 3 && !done; attempt++) {
      try {
        const res = await zai.images.generations.create({ prompt: `${b.prompt}, ${STYLE}`, /* l'API accepte toute taille multiple de 32 entre 512 et 2880 ; le typage SDK est périmé */ size: SIZE as never });
        const b64 = res?.data?.[0]?.base64;
        if (!b64) throw new Error("réponse sans image");
        const png = Buffer.from(b64, "base64");
        const tmp = `/tmp/${b.key}.png`;
        fs.writeFileSync(tmp, png);
        // Conversion JPEG (poids page) via PIL en subprocess
        const { execSync } = await import("child_process");
        execSync(`python3 -c "from PIL import Image; im=Image.open('${tmp}').convert('RGB'); im.save('${dest}', 'JPEG', quality=82, optimize=True)"`);
        const kb = Math.round(fs.statSync(dest).size / 1024);
        console.log(`OK   ${b.key} (${kb} KB, essai ${attempt})`);
        ok++; done = true;
      } catch (e: any) {
        console.error(`ERR  ${b.key} essai ${attempt}: ${e?.message?.slice(0, 140)}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt));
        if (attempt === 3) fail++;
      }
    }
  }
  console.log(`\nTerminé: ${ok} OK, ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error("FATAL", e?.message || e); process.exit(1); });
