/* Builds CHEAP LAPTOPS catalog: products seed, static catalog, brand SVGs, logo */
import fs from "fs";
import path from "path";

const PUB = "/home/z/my-project/public";

/* ---------------- helpers ---------------- */
const fmt = (n) => "GH\u20B5 " + n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ---------------- categories ---------------- */
const CATS = [
  { slug: "laptops", name: "Laptops", parent: 0 },
  { slug: "laptops/gaming-laptops", name: "Gaming Laptops", parent: "laptops" },
  { slug: "laptops/business-laptops", name: "Business Laptops", parent: "laptops" },
  { slug: "laptops/student-laptops", name: "Student Laptops", parent: "laptops" },
  { slug: "laptops/ultrabooks", name: "Ultrabooks", parent: "laptops" },
  { slug: "laptops/2-in-1-detachable", name: "2-in-1 & Detachable", parent: "laptops" },
  { slug: "laptops/chromebooks", name: "Chromebooks", parent: "laptops" },
  { slug: "macbooks", name: "MacBooks", parent: 0 },
  { slug: "macbooks/macbook-air", name: "MacBook Air", parent: "macbooks" },
  { slug: "macbooks/macbook-pro", name: "MacBook Pro", parent: "macbooks" },
  { slug: "computers", name: "Computers", parent: 0 },
  { slug: "computers/desktops", name: "Desktops", parent: "computers" },
  { slug: "computers/monitors", name: "Monitors", parent: "computers" },
  { slug: "accessories", name: "Accessories", parent: 0 },
  { slug: "accessories/bags", name: "Laptop Bags", parent: "accessories" },
  { slug: "accessories/mice", name: "Mice", parent: "accessories" },
  { slug: "accessories/headsets", name: "Headsets", parent: "accessories" },
  { slug: "scooters", name: "Electric Bikes & Scooters", parent: 0 },
  { slug: "scooters/electric-scooters", name: "Electric Scooters", parent: "scooters" },
];
const catIds = {};
CATS.forEach((c, i) => (catIds[c.slug] = i + 1));

/* ---------------- brands ---------------- */
const BRANDS = [
  { slug: "hp", name: "HP", color: "#0096D6" },
  { slug: "dell", name: "Dell", color: "#007DB8" },
  { slug: "lenovo", name: "Lenovo", color: "#E2231A" },
  { slug: "apple", name: "Apple", color: "#1d1d1f" },
  { slug: "microsoft", name: "Microsoft", color: "#5E5E5E" },
  { slug: "asus", name: "ASUS", color: "#00539B" },
  { slug: "acer", name: "Acer", color: "#83B81A" },
  { slug: "msi", name: "MSI", color: "#D0021B" },
  { slug: "lg", name: "LG", color: "#A50034" },
  { slug: "samsung", name: "Samsung", color: "#1428A0" },
  { slug: "oraimo", name: "Oraimo", color: "#0B7A3E" },
  { slug: "logitech", name: "Logitech", color: "#00B8A9" },
];
const brandMap = Object.fromEntries(BRANDS.map((b) => [b.slug, b]));

/* ---------------- product data ----------------
   [name, brandSlug|null, price, regular|null, image, catSlug, blurb, rating, reviews, stock, featured]  */
const P = [
  // Gaming
  ["HP Victus 15 — Core i5-12450H, 8GB, 512GB SSD, RTX 2050", "hp", 8999, 9999, "p-gaming-black", "laptops/gaming-laptops", "Entry-level gaming powerhouse with 15.6\" FHD display, RTX 2050 graphics and backlit keyboard.", 4.5, 32, 12, 1],
  ["Lenovo LOQ 15 — Core i5-12450H, RTX 3050 6GB, 16GB, 512GB SSD", "lenovo", 9499, null, "p-gaming-red", "laptops/gaming-laptops", "Lenovo LOQ gaming laptop with RTX 3050, 16GB RAM, red backlit keyboard and Legion cooling.", 4.6, 27, 10, 1],
  ["Acer Nitro V 15 — Core i5-13420H, RTX 4050, 16GB, 512GB SSD", "acer", 10999, 11999, "p-gaming-black", "laptops/gaming-laptops", "Acer Nitro V with RTX 4050, dual-fan cooling and 144Hz display for smooth esports play.", 4.5, 21, 8, 0],
  ["ASUS TUF Gaming F15 — Core i7-12700H, RTX 3050 Ti, 16GB", "asus", 11999, null, "p-gaming-red", "laptops/gaming-laptops", "Military-grade durable TUF chassis, RTX 3050 Ti and 144Hz FHD panel.", 4.4, 18, 7, 0],
  ["MSI Katana 15 — Core i7-13620H, RTX 4060, 16GB, 512GB SSD", "msi", 13499, 14499, "p-gaming-black", "laptops/gaming-laptops", "MSI Katana with RTX 4060, Cooler Boost 5 and red gaming keyboard.", 4.6, 15, 6, 0],
  ["Dell G15 5530 — Core i7-13650HX, RTX 4060, 16GB, 1TB SSD", "dell", 13999, null, "p-gaming-red", "laptops/gaming-laptops", "Dell G15 with desktop-class HX processor, RTX 4060 and Game Shift thermal mode.", 4.5, 14, 6, 0],
  ["HP OMEN 16 — Core i7-13700HX, RTX 4060 8GB, 16GB, 1TB SSD", "hp", 16499, 17499, "p-gaming-black", "laptops/gaming-laptops", "OMEN Gaming Hub, RTX 4060 8GB and 165Hz QHD display for competitive gamers.", 4.7, 12, 5, 1],
  ["Lenovo Legion Slim 5 16 — Ryzen 7 7840HS, RTX 4060, 16GB", "lenovo", 15999, null, "p-gaming-red", "laptops/gaming-laptops", "Slim all-metal Legion with RTX 4060, 165Hz WUXGA display and PureSight panel.", 4.8, 10, 4, 0],
  ["Acer Predator Helios Neo 16 — Core i7-13650HX, RTX 4060", "acer", 15499, null, "p-gaming-black", "laptops/gaming-laptops", "Predator Sense, 5th-gen AeroBlade fans and RTX 4060 in a 16-inch WQXGA frame.", 4.5, 9, 4, 0],
  ["ASUS ROG Strix G16 — Core i7-13650HX, RTX 4060, 16GB, 1TB", "asus", 17999, 18999, "p-gaming-red", "laptops/gaming-laptops", "Flagship ROG Strix with ROG Intelligent Cooling, RTX 4060 andMUX switch.", 4.7, 11, 4, 0],
  // Business
  ["HP ProBook 450 G10 — Core i5-1335U, 16GB, 512GB SSD, 15.6\"", "hp", 8499, null, "p-business-hp", "laptops/business-laptops", "Reliable 15.6\" business laptop with numeric keypad, TPM 2.0 and all-day battery.", 4.4, 22, 14, 1],
  ["HP EliteBook 840 G8 — Core i5-1145G7 vPro, 16GB, 512GB SSD", "hp", 11499, 12999, "p-business-hp", "laptops/business-laptops", "Premium aluminium EliteBook with privacy screen option and enterprise security.", 4.7, 16, 8, 0],
  ["Dell Latitude 3540 — Core i5-1335U, 8GB, 256GB SSD, 15.6\"", "dell", 7299, null, "p-business-dell", "laptops/business-laptops", "Dependable Latitude with ExpressSign-in and Dell Optimizer for productivity.", 4.3, 18, 12, 0],
  ["Dell Latitude 5440 — Core i5-1345U, 16GB, 512GB SSD, 14\"", "dell", 11999, null, "p-business-dell", "laptops/business-laptops", "Corporate-ready 14\" Latitude with vPro, smart privacy and rugged build.", 4.6, 9, 7, 0],
  ["Lenovo ThinkPad E16 Gen 1 — Ryzen 5 7530U, 16GB, 512GB SSD", "lenovo", 9999, null, "p-lenovo", "laptops/business-laptops", "Legendary ThinkPad keyboard, 16\" WUXGA display and dual-drive capability.", 4.6, 15, 10, 1],
  ["Lenovo ThinkPad T14 Gen 3 — Core i5-1235U, 16GB, 512GB SSD", "lenovo", 13499, 14499, "p-lenovo", "laptops/business-laptops", "Flagship T-series durability, MIL-STD tested, with privacy shutter and dTPM.", 4.8, 8, 5, 0],
  ["Dell Vostro 3520 — Core i5-1235U, 8GB, 512GB SSD, 15.6\"", "dell", 6299, 6999, "p-business-dell", "laptops/business-laptops", "Small-business favourite with Carbon-neutral options and NumPad.", 4.2, 25, 15, 0],
  ["HP 250 G10 — Core i5-1335U, 8GB, 512GB SSD, 15.6\"", "hp", 5999, null, "p-business-hp", "laptops/business-laptops", "Affordable everyday work laptop with HP Presence collaboration features.", 4.2, 30, 20, 0],
  ["Acer TravelMate P2 15 — Core i5-1335U, 8GB, 512GB SSD", "acer", 6899, null, "p-business-dell", "laptops/business-laptops", "Eco-friendly TravelMate with coral-sea plastic, Wi-Fi 6E and durability certs.", 4.3, 12, 9, 0],
  ["ASUS ExpertBook B1 — Core i5-1235U, 8GB, 512GB SSD, 14\"", "asus", 6599, null, "p-ultrabook-silver", "laptops/business-laptops", "Light 1.45kg business laptop with US Mil-Spec durability and fast charge.", 4.4, 10, 11, 0],
  // Student
  ["HP 15s-FQ5 — Core i3-1215U, 8GB, 256GB SSD, 15.6\"", "hp", 4299, null, "p-ultrabook-silver", "laptops/student-laptops", "Perfect first laptop for school: fast SSD, Full HD display and slim design.", 4.3, 41, 25, 1],
  ["Lenovo IdeaPad Slim 3 15 — Ryzen 5 7520U, 8GB, 256GB SSD", "lenovo", 3999, null, "p-lenovo", "laptops/student-laptops", "Great-value IdeaPad with privacy shutter, Dolby Audio and all-day battery.", 4.4, 35, 22, 0],
  ["Acer Aspire 5 A515 — Core i5-1235U, 8GB, 512GB SSD", "acer", 4699, 5199, "p-business-dell", "laptops/student-laptops", "Aspire 5 with lift-hinge keyboard, FHD IPS display and Alexa built-in.", 4.4, 28, 18, 0],
  ["ASUS Vivobook 15 X1504 — Core i5-1235U, 8GB, 512GB SSD", "asus", 4599, null, "p-lenovo", "laptops/student-laptops", "Vivobook 15 with ErgoLift hinge and backlit keyboard for late-night study.", 4.3, 19, 16, 0],
  ["Dell Inspiron 15 3520 — Core i3-1215U, 8GB, 256GB SSD", "dell", 4299, 4799, "p-business-dell", "laptops/student-laptops", "Everyday Inspiron with ComfortView low-blue-light screen and numeric pad.", 4.2, 24, 20, 0],
  ["HP 14s-DQ5 — Core i3-N305, 8GB, 256GB SSD, 14\"", "hp", 3899, null, "p-ultrabook-silver", "laptops/student-laptops", "Compact 14\" study companion with fast-charge and micro-edge display.", 4.3, 17, 18, 0],
  ["Lenovo IdeaPad 1 15 — Ryzen 3 7320U, 8GB, 256GB SSD", "lenovo", 2999, null, "p-lenovo", "laptops/student-laptops", "Most affordable Ryzen laptop — perfect for browsing, notes and streaming.", 4.1, 44, 30, 1],
  ["Acer Aspire 3 A315 — Ryzen 3 7320U, 8GB, 256GB SSD", "acer", 3199, 3599, "p-business-dell", "laptops/student-laptops", "Budget Aspire 3 with 802.11ax Wi-Fi and PurifiedVoice noise reduction.", 4.1, 21, 24, 0],
  // Chromebooks
  ["HP Chromebook 14a — Intel N200, 4GB, 64GB eMMC, 14\"", "hp", 2899, null, "p-chromebook", "laptops/chromebooks", "Lightweight ChromeOS laptop with 12-hour battery — boots in seconds.", 4.2, 13, 15, 0],
  ["Acer Chromebook 315 — Celeron N4020, 4GB, 64GB, 15.6\"", "acer", 2599, 2899, "p-chromebook", "laptops/chromebooks", "Large 15.6\" Chromebook for shared study and classroom use.", 4.0, 10, 14, 0],
  // Ultrabooks
  ["HP Pavilion Aero 13 — Ryzen 5 7530U, 16GB, 512GB SSD", "hp", 8499, null, "p-ultrabook-silver", "laptops/ultrabooks", "Under 1kg magnesium ultrabook with 13.3\" WUXGA display and B&O audio.", 4.6, 14, 8, 0],
  ["Lenovo Yoga Slim 7 14 — Ryzen 7 7730U, 16GB, 512GB SSD", "lenovo", 9999, null, "p-lenovo", "laptops/ultrabooks", "Premium Yoga with 2.2K display option, 65W fast charge and Dolby Vision.", 4.7, 9, 6, 0],
  ["ASUS ZenBook 14 OLED — Core i5-13500H, 16GB, 512GB SSD", "asus", 10999, 11499, "p-ultrabook-white", "laptops/ultrabooks", "Stunning 2.8K OLED display, NumberPad and ASUS SenseADAPT audio.", 4.8, 7, 5, 1],
  ["Dell XPS 13 9315 — Core i5-1230U, 16GB, 512GB SSD, 13.4\"", "dell", 13499, null, "p-ultrabook-silver", "laptops/ultrabooks", "Iconic XPS with InfinityEdge display, CNC aluminium and 4-sided Gorilla Glass.", 4.7, 6, 4, 0],
  ["LG gram 14 — Core i5-1340P, 16GB, 512GB SSD, 14\"", "lg", 12999, null, "p-ultrabook-white", "laptops/ultrabooks", "Featherweight 999g gram with 72Wh battery for up to 15 hours of work.", 4.6, 8, 5, 0],
  ["HP Spectre x360 14 — Core i7-1355U, 16GB, 1TB SSD", "hp", 12999, 13999, "p-ultrabook-white", "laptops/ultrabooks", "Gem-cut x360 convertible with 3:2 OLED option, HP Pen and AI-enhanced camera.", 4.8, 5, 4, 0],
  // MacBooks
  ["Apple MacBook Air 13\" M1, 8GB, 256GB — Space Grey", "apple", 9999, 10999, "p-macbook-air", "macbooks/macbook-air", "The legendary M1 MacBook Air — silent, fanless, 18-hour battery life.", 4.9, 52, 12, 1],
  ["Apple MacBook Air 13\" M2, 8GB, 256GB — Midnight", "apple", 13499, null, "p-macbook-air", "macbooks/macbook-air", "Redesigned M2 Air with 13.6\" Liquid Retina display, MagSafe and 1080p camera.", 4.9, 38, 10, 1],
  ["Apple MacBook Air 15\" M2, 8GB, 256GB — Starlight", "apple", 15999, 16499, "p-macbook-air", "macbooks/macbook-air", "Large 15.3\" Liquid Retina M2 Air — six-speaker sound system included.", 4.8, 19, 7, 0],
  ["Apple MacBook Air 13\" M3, 8GB, 256GB — Silver", "apple", 14999, null, "p-macbook-air", "macbooks/macbook-air", "Latest M3 Air with hardware ray tracing, Wi-Fi 6E and up to 18 hours battery.", 4.9, 21, 8, 0],
  ["Apple MacBook Pro 14\" M3, 8GB, 512GB — Space Black", "apple", 21999, null, "p-macbook-pro", "macbooks/macbook-pro", "Pro performance with Liquid Retina XDR display, 1200 nits peak and SD card slot.", 5.0, 14, 5, 1],
  ["Apple MacBook Pro 16\" M3 Pro, 18GB, 512GB — Space Black", "apple", 29999, 31499, "p-macbook-pro", "macbooks/macbook-pro", "Ultimate creator laptop — M3 Pro chip, 16\" XDR display and 22-hour battery.", 5.0, 9, 3, 0],
  // 2-in-1
  ["Microsoft Surface Pro 9 — Core i5, 8GB, 256GB + Type Cover", "microsoft", 14999, null, "p-detachable", "laptops/2-in-1-detachable", "13\" PixelSense touchscreen tablet-laptop with Surface Slim Pen support.", 4.7, 18, 6, 1],
  ["Microsoft Surface Laptop Go 3 — Core i5, 8GB, 256GB", "microsoft", 8999, 9499, "p-ultrabook-silver", "laptops/2-in-1-detachable", "12.4\" ultraportable Surface with fingerprint power button and all-day battery.", 4.5, 11, 7, 0],
  ["Lenovo IdeaPad Flex 5 14 — Ryzen 5 7530U, 16GB, 512GB", "lenovo", 7999, null, "p-2in1-red", "laptops/2-in-1-detachable", "360\u00B0 convertible with digital pen included and physical privacy shutter.", 4.4, 13, 9, 0],
  ["HP Pavilion x360 14 — Core i5-1335U, 8GB, 512GB SSD", "hp", 7499, null, "p-2in1-red", "laptops/2-in-1-detachable", "Versatile x360 with pen support, B&O speakers and edge-to-edge glass.", 4.4, 12, 8, 0],
  ["Acer Spin 5 SP513 — Core i5-1335U, 16GB, 512GB SSD", "acer", 9999, 10499, "p-detachable", "laptops/2-in-1-detachable", "Rechargeable Acer Active Stylus with Wacom AES and 2.2K touchscreen.", 4.5, 8, 5, 0],
  ["ASUS Vivobook Flip 14 — Core i3-1215U, 8GB, 256GB", "asus", 5999, null, "p-2in1-red", "laptops/2-in-1-detachable", "Affordable 360\u00B0 flip with NanoEdge touchscreen and pen support.", 4.2, 10, 10, 0],
  // Accessories
  ["Cheap Laptops Padded Laptop Backpack — fits 15.6\"", null, 249, null, "p-bag", "accessories/bags", "Water-resistant backpack with padded laptop sleeve, USB pass-through and rain cover.", 4.5, 33, 40, 0],
  ["Oxford Laptop Backpack 15.6\" — USB Charging Port", null, 199, 249, "p-bag", "accessories/bags", "Durable oxford-fabric backpack with anti-theft back pocket and luggage strap.", 4.3, 26, 35, 0],
  ["Oraimo SmartOffice Wireless Mouse — Silent Clicks", "oraimo", 149, null, "p-mouse", "accessories/mice", "2.4GHz silent-click wireless mouse with 12-month battery life.", 4.6, 45, 50, 0],
  ["Logitech M170 Wireless Mouse", "logitech", 119, 139, "p-mouse", "accessories/mice", "Compact nano-receiver mouse with 12-month battery — plug and play.", 4.7, 51, 60, 1],
  ["HP 220 Wireless Mouse and Keyboard Combo", "hp", 249, 279, "p-mouse", "accessories/mice", "Full-size wireless combo with spill-resistant keyboard and 1600 DPI mouse.", 4.4, 22, 25, 0],
  ["Oraimo BoomPop 2 Wireless Headset", "oraimo", 249, null, "p-headset", "accessories/headsets", "Over-ear Bluetooth headset with ENC mic, 60-hour playtime and low-latency mode.", 4.5, 29, 30, 0],
  ["HP Stereo 3.5mm Headset with Microphone", "hp", 159, null, "p-headset", "accessories/headsets", "Wired office headset with rotate-to-mute mic and leatherette earcups.", 4.3, 18, 28, 0],
  ["Logitech H111 Stereo Headset", "logitech", 139, 159, "p-headset", "accessories/headsets", "Full-bandwidth stereo headset with noise-cancelling boom mic.", 4.4, 24, 32, 0],
  // Scooters
  ["City Rider Electric Scooter — 350W, LED Lights, GH\u20B5 7k Fixed", null, 7000, null, "p-scooter-1", "scooters/electric-scooters", "Luxury seated e-scooter: 350W motor, 25km/h, colorful LED strips, digital display. Fixed price GH\u20B5 7,000 — non-negotiable. Available at our Accra store.", 4.6, 12, 5, 1],
  ["Cruiser Electric Bike Scooter — 500W, 45km Range, GH\u20B5 10k Fixed", null, 10000, null, "p-scooter-2", "scooters/electric-scooters", "Comfortable commuter e-scooter: 500W motor, 35km/h, 45km range, wide cushioned seat. Fixed price GH\u20B5 10,000 — non-negotiable. Visit the Accra store to inspect.", 4.7, 9, 3, 1],
  ["Luxury Max Electric Scooter — 800W, Dual Battery, GH\u20B5 12k Fixed", null, 12000, null, "p-scooter-3", "scooters/electric-scooters", "Premium flagship e-scooter: 800W motor, dual battery, LED headlight, sporty seat. Fixed price GH\u20B5 12,000 — non-negotiable. Available at our Accra store.", 4.8, 7, 2, 1],
  // Monitors
  ["HP P22h G5 21.5\" Full HD IPS Monitor", "hp", 1499, null, "p-monitor", "computers/monitors", "Height-adjustable FHD IPS monitor with HDMI, VGA and low blue-light mode.", 4.5, 15, 12, 0],
  ["Dell SE2422H 24\" Full HD 75Hz Monitor", "dell", 1799, 1999, "p-monitor", "computers/monitors", "24\" VA panel with AMD FreeSync, 75Hz and flicker-free comfort.", 4.5, 18, 10, 0],
  ["LG 24MP400 24\" Full HD IPS Monitor", "lg", 1649, null, "p-monitor", "computers/monitors", "Borderless IPS display with 5ms response and dual 5W built-in speakers.", 4.4, 12, 9, 0],
  ["Samsung T35F 27\" FHD Curved Monitor", "samsung", 2399, null, "p-monitor", "computers/monitors", "Immersive 27\" curved monitor with 75Hz refresh and eye-saver mode.", 4.6, 10, 6, 0],
  // Desktops
  ["HP Desktop Pro A 3000 G3 MT — Athlon, 8GB, 256GB + 21.5\"", "hp", 4999, null, "p-desktop", "computers/desktops", "Complete desktop bundle: tower PC, 21.5\" monitor, keyboard and mouse.", 4.3, 16, 8, 0],
  ["Dell OptiPlex 3000s SFF — Core i5-12500, 8GB, 256GB SSD", "dell", 6499, 6999, "p-desktop", "computers/desktops", "Space-saving small-form-factor OptiPlex with TPM and flexible mounting.", 4.5, 11, 6, 0],
  ["Lenovo ThinkCentre Neo 50t — Core i5-12400, 16GB, 512GB", "lenovo", 7499, null, "p-desktop", "computers/desktops", "Workhorse tower with 12th-gen Core i5, smart USB-C port and 3-year care.", 4.6, 8, 5, 0],
];

const CAT_NAME = Object.fromEntries(CATS.map((c) => [c.slug, c]));

const products = P.map((row, i) => {
  const [name, brandSlug, price, regular, img, catSlug, blurb, rating, reviews, stock, featured] = row;
  const c = CAT_NAME[catSlug];
  const discount = regular ? Math.round(((regular - price) / regular) * 100) : 0;
  const slug = slugify(name).slice(0, 70);
  const brand = brandSlug ? { id: catIds[brandSlug] || 0, name: brandMap[brandSlug].name, slug: brandSlug } : null;
  const spec = [
    `${name} is available at Cheap Laptops — Home of Affordable Laptops & Computers. Every boxed laptop ships with a FREE bag and mouse.`,
    ``,
    blurb,
    ``,
    `We serve both individual buyers and intermediaries/dealers — call 0240 999979 or 0208 699 988 for wholesale prices.`,
    `Stores: Accra (Haatso, Ecobank area), Kumasi (Asafo Labour), Tamale (Market).`,
  ].join("\n");
  return {
    slug,
    name,
    sku: `CL-${catSlug.split("/").pop().slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`,
    price: Math.round(price * 100),
    regularPrice: regular ? Math.round(regular * 100) : null,
    onSale: discount > 0,
    discount,
    image: `/images/cl/${img}.png`,
    categorySlugs: [catSlug, ...(typeof c.parent === "string" ? [c.parent] : [])].filter(
      (v, idx, a) => a.indexOf(v) === idx
    ),
    brandSlug,
    shortDescription: blurb,
    description: spec,
    averageRating: rating,
    reviewCount: reviews,
    stock,
    featured: !!featured,
  };
});

/* de-dup slugs */
const seen = new Set();
products.forEach((p) => {
  if (seen.has(p.slug)) p.slug = p.slug + "-" + Math.random().toString(36).slice(2, 6);
  seen.add(p.slug);
});

/* ---------------- home sections ---------------- */
const byCat = (slug) => products.filter((p) => p.categorySlugs.includes(slug)).map((p) => p.slug);
const homeSections = [
  { title: "Best Sellers", slug: "best-sellers", products: products.filter((p) => p.featured).slice(0, 8).map((p) => p.slug) },
  { title: "Gaming Laptops", slug: "gaming-laptops", products: byCat("laptops/gaming-laptops").slice(0, 8) },
  { title: "Business Laptops", slug: "business-laptops", products: byCat("laptops/business-laptops").slice(0, 8) },
  { title: "Student Laptops", slug: "student-laptops", products: byCat("laptops/student-laptops").slice(0, 8) },
  { title: "MacBooks", slug: "macbooks", products: byCat("macbooks/macbook-air").concat(byCat("macbooks/macbook-pro")).slice(0, 8) },
  { title: "2-in-1 & Detachable", slug: "2-in-1-detachable", products: byCat("laptops/2-in-1-detachable").slice(0, 8) },
  { title: "Accessories", slug: "accessories", products: byCat("accessories/bags").concat(byCat("accessories/mice"), byCat("accessories/headsets")).slice(0, 8) },
  { title: "Electric Bikes & Scooters", slug: "electric-bikes-scooters", products: byCat("scooters/electric-scooters") },
  { title: "New Arrivals", slug: "new-arrivals", products: byCat("computers/monitors").concat(byCat("computers/desktops")).slice(0, 8) },
];

/* ---------------- categories with counts ---------------- */
const categories = CATS.map((c, i) => {
  const count = products.filter((p) => p.categorySlugs.includes(c.slug)).length;
  return {
    id: i + 1,
    name: c.name,
    slug: c.slug,
    parent: typeof c.parent === "string" ? catIds[c.parent] : 0,
    count,
    banner: null,
    yoastTitle: `${c.name} in Ghana | Cheap Laptops`,
    yoastDesc: `Buy ${c.name.toLowerCase()} at the best prices in Ghana. Free bag & mouse with boxed laptops. Stores in Accra, Kumasi & Tamale.`,
  };
});

/* ---------------- brands with counts ---------------- */
const brands = BRANDS.map((b, i) => ({
  id: i + 1,
  name: b.name,
  slug: b.slug,
  count: products.filter((p) => p.brandSlug === b.slug).length,
  logo: `/images/brand/${b.slug}.svg`,
}));

/* ---------------- pages ---------------- */
const w = (html) => html;
const pages = [
  {
    slug: "about-us",
    title: "About Us",
    content: w(`
      <h2>Cheap Laptops — Home of Affordable Laptops &amp; Computers</h2>
      <p><b>NOW OPEN!</b> Cheap Laptops is Ghana's home of affordable laptops and computers, serving students, professionals, families, buyers and intermediaries (dealers) across the country.</p>
      <p>We stock genuine boxed laptops from trusted brands — HP, Dell, Lenovo, Apple MacBook, Microsoft Surface, ASUS, Acer and MSI — plus desktops, monitors, accessories and a growing range of luxury electric bikes and scooters at our Accra store.</p>
      <h3>Our Stores</h3>
      <ul>
        <li><b>Accra:</b> Haatso, Ecobank area</li>
        <li><b>Kumasi:</b> Asafo, Labour area</li>
        <li><b>Tamale:</b> Market area</li>
      </ul>
      <h3>Current Promo</h3>
      <p>Buy any boxed laptop and receive a <b>FREE bag and mouse</b> — while stock lasts.</p>
      <h3>For Buyers &amp; Dealers</h3>
      <p>We share laptop information for all buyers and middlemen. Call <b>0240999979</b> or <b>02086999988</b> for retail and wholesale deals, or reach us on our Telegram channel <b>CHEAP LAPTOPS COMPANY</b>.</p>
    `),
  },
  {
    slug: "contact-us",
    title: "Contact Us",
    content: w(`
      <h2>Talk to Cheap Laptops</h2>
      <p>Call or WhatsApp us — we reply fast:</p>
      <ul>
        <li><b>Phone:</b> 0240 999979 / 0208 699 988</li>
        <li><b>Telegram:</b> CHEAP LAPTOPS COMPANY (2,200+ members)</li>
      </ul>
      <h3>Visit a Store</h3>
      <ul>
        <li><b>Accra:</b> Haatso, Ecobank area</li>
        <li><b>Kumasi:</b> Asafo, Labour area</li>
        <li><b>Tamale:</b> Market area</li>
      </ul>
      <p>Kindly tell everyone about us!</p>
    `),
  },
  {
    slug: "customer-help",
    title: "FAQs",
    content: w(`
      <h2>Frequently Asked Questions</h2>
      <h3>Are the laptops new and boxed?</h3>
      <p>Yes — every laptop we sell is genuine and factory-boxed. Each boxed laptop comes with a FREE bag and mouse while the promo lasts.</p>
      <h3>Do you serve dealers and intermediaries?</h3>
      <p>Yes. We provide laptop information for all buyers and middlemen, with attractive wholesale prices. Call 0240999979 or 02086999988.</p>
      <h3>Where are your stores?</h3>
      <p>Accra — Haatso (Ecobank area), Kumasi — Asafo (Labour area), Tamale — Market area.</p>
      <h3>How much are the electric scooters?</h3>
      <p>Luxury electric bikes &amp; scooters are available at our Accra store: GH\u20B5 7,000 / 10,000 / 12,000. Prices are fixed and non-negotiable.</p>
      <h3>How do I pay?</h3>
      <p>Cash on delivery in Accra, Mobile Money, bank transfer or card. See Payment Options for details.</p>
      <h3>Do you deliver outside Accra?</h3>
      <p>Yes — we deliver nationwide to Kumasi, Tamale and everywhere in Ghana.</p>
      <h3>What warranty do I get?</h3>
      <p>Boxed laptops carry their standard brand warranty. Our team also provides after-sale support — call us any time.</p>
    `),
  },
  {
    slug: "locations",
    title: "Our Stores",
    content: w(`
      <h2>Visit Cheap Laptops</h2>
      <table>
        <tr><th>City</th><th>Location</th><th>Highlights</th></tr>
        <tr><td><b>Accra</b></td><td>Haatso, Ecobank area</td><td>Flagship store — laptops, accessories &amp; luxury electric bikes and scooters</td></tr>
        <tr><td><b>Kumasi</b></td><td>Asafo, Labour area</td><td>Affordable laptops &amp; student computers</td></tr>
        <tr><td><b>Tamale</b></td><td>Market area</td><td>Affordable laptops, accessories &amp; support</td></tr>
      </table>
      <p>Call before visiting for stock checks: <b>0240 999979</b> / <b>0208 699 988</b>.</p>
    `),
  },
  {
    slug: "delivery-information",
    title: "Delivery Information",
    content: w(`
      <h2>Nationwide Delivery</h2>
      <p>We deliver across Ghana. Same-day delivery within Accra for orders confirmed before 12 noon (terms apply).</p>
      <ul>
        <li><b>Accra:</b> same-day or next-day doorstep delivery</li>
        <li><b>Kumasi &amp; regional capitals:</b> 1–2 business days</li>
        <li><b>Other towns:</b> 2–4 business days via trusted couriers</li>
      </ul>
      <p>Delivery fee is shown at checkout — orders from GH\u20B5 1,000 qualify for free delivery.</p>
    `),
  },
  {
    slug: "return-policy",
    title: "Return Policy",
    content: w(`
      <h2>Easy 7-Day Returns</h2>
      <p>If a product is faulty on arrival or not as described, contact us within 7 days:</p>
      <ul>
        <li>Products must be unused, in original packaging with all accessories.</li>
        <li>Boxed laptops must retain their factory seal for change-of-mind returns.</li>
        <li>Faulty units are replaced or repaired under the brand warranty.</li>
        <li>Electric scooters are inspected with you at the store before handover.</li>
      </ul>
      <p>Start a return by calling 0240 999979 or visiting the store where you bought the item.</p>
    `),
  },
  {
    slug: "payment-options",
    title: "Payment Options",
    content: w(`
      <h2>Ways to Pay</h2>
      <ul>
        <li><b>Cash on Delivery</b> — available in Accra</li>
        <li><b>Mobile Money</b> — MTN MoMo, Telecel Cash, AirtelTigo Money (pay to the store line we confirm on call)</li>
        <li><b>Bank transfer</b> — details shared by our team when you order</li>
        <li><b>Card</b> — pay by card in our stores</li>
      </ul>
      <p>Electric scooter prices (GH\u20B5 7k / 10k / 12k) are fixed and non-negotiable.</p>
    `),
  },
  {
    slug: "how-it-works",
    title: "How It Works",
    content: w(`
      <h2>How to Order</h2>
      <ol>
        <li>Browse laptops, computers, accessories or scooters and add to cart.</li>
        <li>Checkout with your delivery details — or simply call 0240 999979.</li>
        <li>We confirm stock, price and delivery time with you by phone/WhatsApp.</li>
        <li>Pay by cash on delivery, Mobile Money, bank transfer or card.</li>
        <li>Receive your order — boxed laptops include a FREE bag and mouse!</li>
      </ol>
    `),
  },
  {
    slug: "wholesale-dealers",
    title: "Wholesale & Dealers",
    content: w(`
      <h2>For Buyers &amp; Intermediaries</h2>
      <p>Cheap Laptops supplies individuals, resellers, schools, NGOs and companies. Middlemen are welcome — our dealer prices move fast.</p>
      <ul>
        <li>Bulk laptop pricing for resellers and institutions</li>
        <li>Weekly stock lists shared on our Telegram channel: CHEAP LAPTOPS COMPANY</li>
        <li>Dedicated dealer line: <b>0240999979</b></li>
      </ul>
      <p>Kindly tell everyone about it!</p>
    `),
  },
  {
    slug: "after-sales-service",
    title: "After Sales Service",
    content: w(`
      <h2>After Sales Support</h2>
      <p>Our support does not end at delivery:</p>
      <ul>
        <li>Warranty claims handled with the brand (boxed laptops carry standard brand warranty)</li>
        <li>Software setup, Windows installation and upgrades available at our stores</li>
        <li>Call <b>0240 999979</b> / <b>0208 699 988</b> for any support</li>
      </ul>
    `),
  },
  {
    slug: "terms-conditions",
    title: "Terms & Conditions",
    content: w(`
      <h2>Terms &amp; Conditions</h2>
      <p>By using this website or ordering from Cheap Laptops you agree to:</p>
      <ul>
        <li>Prices are in Ghana cedis (GH\u20B5) and may change without notice; scooter prices are fixed and non-negotiable.</li>
        <li>Orders are confirmed by phone before dispatch; stock availability is subject to change.</li>
        <li>Promo items (free bag &amp; mouse) apply to boxed laptops only, while stock lasts.</li>
        <li>Deliveries outside Accra are handled by third-party couriers.</li>
        <li>Personal data is used only to process and deliver your order.</li>
      </ul>
    `),
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    content: w(`
      <h2>Privacy Policy</h2>
      <p>We respect your privacy. We collect only the details needed to process your order (name, phone, delivery address, optional email).</p>
      <ul>
        <li>Your data is never sold or shared with third parties except our delivery partners for fulfilment.</li>
        <li>Payment details are handled through trusted channels; we do not store card numbers.</li>
        <li>You can request deletion of your data any time by calling 0240 999979.</li>
      </ul>
    `),
  },
  {
    slug: "product-categories",
    title: "Product Categories",
    content: w(`
      <h2>Browse All Categories</h2>
      <ul>
        <li>Laptops — gaming, business, student, ultrabooks, 2-in-1 &amp; detachable, Chromebooks</li>
        <li>MacBooks — MacBook Air &amp; MacBook Pro</li>
        <li>Computers — desktops &amp; monitors</li>
        <li>Accessories — bags, mice, headsets</li>
        <li>Electric Bikes &amp; Scooters — available at our Accra store</li>
      </ul>
    `),
  },
  {
    slug: "brands",
    title: "Our Brands",
    content: w(`
      <h2>Brands We Stock</h2>
      <p>HP, Dell, Lenovo, Apple, Microsoft, ASUS, Acer, MSI, LG, Samsung, Oraimo, Logitech — genuine boxed products only.</p>
    `),
  },
  {
    slug: "feedback",
    title: "Feedback",
    content: w(`
      <h2>We Love Feedback</h2>
      <p>Tell us how we did — or what you want us to stock next. Call 0240 999979, message us on WhatsApp, or use the contact form. Kindly tell everyone about it!</p>
    `),
  },
];

/* ---------------- write files ---------------- */
const catalog = {
  generatedAt: new Date().toISOString(),
  categories,
  brands,
  homeSections,
  pages,
};

fs.mkdirSync(path.join(PUB, "data"), { recursive: true });
fs.writeFileSync(path.join(PUB, "data", "catalog.json"), JSON.stringify(catalog, null, 1));
fs.writeFileSync(path.join(PUB, "data", "products.json"), JSON.stringify(products, null, 1));

/* ---------------- brand SVGs + logo ---------------- */
const brandDir = path.join(PUB, "images", "brand");
fs.mkdirSync(brandDir, { recursive: true });
for (const b of BRANDS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="0 0 500 300"><rect width="500" height="300" fill="#ffffff"/><rect x="8" y="8" width="484" height="284" rx="18" fill="#ffffff" stroke="#e2e6f0" stroke-width="2"/><text x="250" y="150" text-anchor="middle" dominant-baseline="central" font-family="Arial, Helvetica, sans-serif" font-size="66" font-weight="800" letter-spacing="2" fill="${b.color}">${b.name}</text></svg>`;
  fs.writeFileSync(path.join(brandDir, `${b.slug}.svg`), svg);
}

const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="96" viewBox="0 0 420 96">
  <defs>
    <linearGradient id="clg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1D63E8"/><stop offset="1" stop-color="#0E3EA8"/>
    </linearGradient>
  </defs>
  <rect x="2" y="10" width="76" height="76" rx="16" fill="url(#clg)"/>
  <rect x="17" y="30" width="46" height="30" rx="4" fill="#ffffff"/>
  <rect x="21" y="34" width="38" height="22" rx="2" fill="#0E3EA8"/>
  <path d="M36 38l-5 8h4l-3 8 9-11h-4l4-5z" fill="#FFC61A"/>
  <rect x="10" y="62" width="60" height="8" rx="4" fill="#0A2B6B"/>
  <text x="92" y="46" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="900" letter-spacing="1" fill="#0A2B6B">CHEAP</text>
  <text x="92" y="78" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="900" letter-spacing="1" fill="#1D63E8">LAPTOPS<tspan font-size="15" font-weight="700" fill="#0A2B6B"> GH</tspan></text>
</svg>`;
fs.writeFileSync(path.join(PUB, "images", "cl", "logo.svg"), logo);

console.log("products:", products.length, "| categories:", categories.length, "| brands:", brands.length, "| pages:", pages.length);
console.log("sections:", homeSections.map((s) => `${s.title}(${s.products.length})`).join(", "));
