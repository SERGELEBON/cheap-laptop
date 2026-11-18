#!/bin/bash
# Génère 10 bannières hero larges (2880x960, ratio 3:1 ≈ conteneur hero) pour Cheap Laptops Ghana
# Style cohérent : bannière e-commerce pro, palette bleu/marine de la marque, sans texte
OUT="/home/z/my-project/public/images/cl"
TMP="/tmp/hero-gen"
mkdir -p "$OUT" "$TMP"

STYLE="professional e-commerce hero banner photography, wide cinematic composition, main subject placed at center with generous empty space around it, photorealistic, high quality, soft studio lighting, blue and navy color palette accents, clean modern look, absolutely no text, no letters, no words, no watermark, no logo, no people"

declare -A PROMPTS
PROMPTS[banner-open]="modern laptop computer showroom interior grand opening, rows of open laptops neatly displayed on white tables, bright welcoming store, blue accent lighting"
PROMPTS[banner-gaming]="powerful gaming laptop with glowing RGB backlit keyboard and colorful screen, dark navy background with neon blue light streaks, dramatic mood"
PROMPTS[banner-ultrabook]="ultra-thin silver ultrabook laptop half open on a minimalist white desk, light blue gradient background, elegant and slim design emphasized"
PROMPTS[banner-macbook]="sleek silver aluminum laptop slightly open floating over a clean minimalist workspace, soft white and light blue background, premium look"
PROMPTS[banner-student]="student laptop open on a study desk with notebooks, a school backpack and a coffee mug, bright friendly daylight scene, light blue wall"
PROMPTS[banner-2in1]="convertible 2-in-1 touchscreen laptop in tent mode with a detached stylus pen beside it, clean light background with blue gradient accents"
PROMPTS[banner-accessories]="flat lay of laptop accessories, backpack, wireless mouse, headphones, USB hub and chargers neatly arranged on a light blue surface, top view"
PROMPTS[banner-scooter]="modern teal electric scooter parked on a sunny African city street, clean composition, blue sky, urban mobility feel"
PROMPTS[banner-desktop]="desktop computer setup with PC tower and large monitor on a tidy office desk, clean cable management, light blue and white tones"
PROMPTS[banner-monitor]="widescreen external computer monitor with slim bezels on an ergonomic desk, clean minimal workspace, soft blue ambient lighting"

for key in banner-open banner-gaming banner-ultrabook banner-macbook banner-student banner-2in1 banner-accessories banner-scooter banner-desktop banner-monitor; do
  f="$OUT/$key.jpg"
  t="$TMP/$key.png"
  if [ -s "$f" ]; then echo "SKIP $key (existe)"; continue; fi
  echo "GEN  $key ..."
  if z-ai image -p "${PROMPTS[$key]}, $STYLE" -o "$t" -s 2880x960; then
    python3 -c "from PIL import Image; im=Image.open('$t').convert('RGB'); im.save('$f', 'JPEG', quality=82, optimize=True)" && echo "OK   $key" || echo "FAIL conv $key"
  else
    echo "FAIL $key"
  fi
done

echo "--- Dimensions ---"
cd "$OUT" && for f in banner-*.jpg; do python3 -c "from PIL import Image; import os; im=Image.open('$f'); print('$f', im.size, str(round(os.path.getsize('$f')/1024))+' KB')"; done
