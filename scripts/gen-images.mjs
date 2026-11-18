/* Generate CHEAP LAPTOPS brand images (heroes, products, promo banner) */
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

const OUT = "/home/z/my-project/public/images/cl";
fs.mkdirSync(OUT, { recursive: true });

const HERO_STYLE =
  ", wide banner composition, cohesive deep blue and white color palette, professional commercial photography, crisp studio lighting, high quality, detailed, no text, no words, no letters";

const JOBS = [
  // ---- Hero banners 1440x720 ----
  { file: "hero-open.png", size: "1440x720", p: "Grand opening of a modern electronics store, shelves stacked full of sealed cardboard laptop boxes, bright blue branded interior walls, glossy floor reflections, welcoming retail atmosphere" + HERO_STYLE },
  { file: "hero-gaming.png", size: "1440x720", p: "High-end gaming laptop with glowing red backlit keyboard and vivid RGB screen, floating on dark navy blue gradient background with subtle circuit light streaks" + HERO_STYLE },
  { file: "hero-ultrabook.png", size: "1440x720", p: "Silver ultra-thin laptop half open, floating at a dynamic angle over a clean white to light blue gradient background with soft shadows" + HERO_STYLE },
  { file: "hero-macbook.png", size: "1440x720", p: "Premium aluminium ultrabook laptop open on a minimalist desk, deep blue gradient studio backdrop, elegant reflections" + HERO_STYLE },
  { file: "hero-student.png", size: "1440x720", p: "Row of affordable colourful student laptops neatly lined up on a bright wooden desk in a sunny study room, blue accents" + HERO_STYLE },
  { file: "hero-2in1.png", size: "1440x720", p: "Convertible 2-in-1 laptop tablet in tent mode with detachable keyboard and stylus, floating over light blue gradient background" + HERO_STYLE },
  { file: "hero-accessories.png", size: "1440x720", p: "Neat flat lay of laptop accessories: grey laptop backpack, wireless mouse, headset and charger on a deep blue background" + HERO_STYLE },
  { file: "hero-scooter.png", size: "1440x720", p: "Three luxury seated electric scooters with colorful LED strip lights and digital displays parked in a modern showroom, dramatic blue lighting" + HERO_STYLE },
  { file: "hero-desktop.png", size: "1440x720", p: "Modern desktop computer setup with slim monitor, white keyboard and compact tower PC on a bright desk, blue gradient backdrop" + HERO_STYLE },
  { file: "hero-monitor.png", size: "1440x720", p: "Slim frameless computer monitors displayed in a neat row on white shelves against a soft blue studio background" + HERO_STYLE },

  // ---- Product shots 1024x1024 ----
  { file: "p-gaming-red.png", size: "1024x1024", p: "Professional product photo of a black gaming laptop with glowing red backlit keyboard, screen showing abstract blue wallpaper, three-quarter view, pure white background" },
  { file: "p-gaming-black.png", size: "1024x1024", p: "Professional product photo of an aggressive matte black gaming laptop with angular design and blue RGB keyboard, screen on, three-quarter view, pure white background" },
  { file: "p-ultrabook-silver.png", size: "1024x1024", p: "Professional product photo of a silver ultra-thin 14 inch laptop, open at an angle, thin bezels, screen showing blue abstract wallpaper, pure white background" },
  { file: "p-ultrabook-white.png", size: "1024x1024", p: "Professional product photo of a light silver-white slim laptop, open facing slightly left, clean minimal design, screen glowing light blue, pure white background" },
  { file: "p-macbook-pro.png", size: "1024x1024", p: "Professional product photo of a premium dark grey aluminium pro laptop with large touchpad and notch display, screen dark blue gradient wallpaper, three-quarter view, pure white background" },
  { file: "p-macbook-air.png", size: "1024x1024", p: "Professional product photo of a thin light-starlight gold fanless ultrabook laptop, open at an angle, minimal design, pure white background" },
  { file: "p-2in1-red.png", size: "1024x1024", p: "Professional product photo of a red convertible 2-in-1 laptop in tent mode with touchscreen interface glowing, fabric-textured keyboard dock beside it, pure white background" },
  { file: "p-detachable.png", size: "1024x1024", p: "Professional product photo of a silver tablet computer with a slim detachable magnetic keyboard and a stylus pen, screen showing blue UI, pure white background" },
  { file: "p-chromebook.png", size: "1024x1024", p: "Professional product photo of a compact 11.6 inch plastic-clad laptop for students, dark grey, screen showing simple blue desktop, three-quarter view, pure white background" },
  { file: "p-business-hp.png", size: "1024x1024", p: "Professional product photo of a silver corporate business laptop with circular logo on lid, security features, screen showing spreadsheet, three-quarter view, pure white background" },
  { file: "p-business-dell.png", size: "1024x1024", p: "Professional product photo of a dark grey matte business laptop, sturdy hinge, screen showing blue desktop, three-quarter view, pure white background" },
  { file: "p-lenovo.png", size: "1024x1024", p: "Professional product photo of a black consumer laptop with silver keyboard deck, screen showing blue gradient wallpaper, three-quarter view, pure white background" },
  { file: "p-bag.png", size: "1024x1024", p: "Professional product photo of a grey padded laptop backpack with multiple zip pockets, standing upright, pure white background" },
  { file: "p-mouse.png", size: "1024x1024", p: "Professional product photo of a sleek black wireless optical mouse with USB nano receiver beside it, pure white background" },
  { file: "p-headset.png", size: "1024x1024", p: "Professional product photo of a black over-ear stereo headset with boom microphone and braided cable, pure white background" },
  { file: "p-scooter-1.png", size: "1024x1024", p: "Professional product photo of a luxury seated electric scooter in teal and black with colorful LED strip accents and digital dashboard, side view, clean light grey studio background" },
  { file: "p-scooter-2.png", size: "1024x1024", p: "Professional product photo of a black seated electric scooter with wide seat and digital display panel, side view, clean light grey studio background" },
  { file: "p-scooter-3.png", size: "1024x1024", p: "Professional product photo of a premium red and black seated electric scooter with LED headlight and sporty design, side view, clean light grey studio background" },
  { file: "p-monitor.png", size: "1024x1024", p: "Professional product photo of a 24 inch slim-bezel computer monitor on a rectangular stand, screen showing blue gradient wallpaper, slight angle, pure white background" },
  { file: "p-desktop.png", size: "1024x1024", p: "Professional product photo of a compact black desktop tower PC next to a monitor with keyboard and mouse, pure white background" },

  // ---- Promo banner 1440x720 ----
  { file: "promo-bagmouse.png", size: "1440x720", p: "E-commerce promo banner composition: sealed retail laptop cardboard box with a grey laptop backpack and black wireless mouse arranged as free gifts, deep blue background with subtle confetti, plenty of empty space on the left side" + HERO_STYLE },
];

async function main() {
  const zai = await ZAI.create();
  const CONC = 2;
  let done = 0;
  const failed = [];

  async function worker(queue) {
    while (queue.length) {
      await new Promise((r) => setTimeout(r, 1000));
      const job = queue.shift();
      const out = path.join(OUT, job.file);
      if (fs.existsSync(out) && fs.statSync(out).size > 20000) { done++; continue; }
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await zai.images.generations.create({ prompt: job.p, size: job.size });
          const b64 = res?.data?.[0]?.base64;
          if (!b64) throw new Error("empty base64");
          fs.writeFileSync(out, Buffer.from(b64, "base64"));
          done++;
          console.log(`ok ${done}/${JOBS.length} ${job.file}`);
          break;
        } catch (e) {
          console.error(`retry ${attempt} ${job.file}: ${e.message}`);
          if (attempt === 3) failed.push(job.file);
          await new Promise((r) => setTimeout(r, 9000 * attempt));
        }
      }
    }
  }

  const queue = [...JOBS];
  await Promise.all(Array.from({ length: CONC }, () => worker(queue)));
  console.log("FAILED:", JSON.stringify(failed));
}

main().catch((e) => { console.error(e); process.exit(1); });
