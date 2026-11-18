#!/usr/bin/env python3
"""Copy em_images -> public/images with downscaling of large page images"""
import os, shutil, sys
from PIL import Image

SRC = '/home/z/my-project/download/em_images'
DST = '/home/z/my-project/public/images'

total = 0
for sub in ['p', 'c', 'b', 'misc', 'pg']:
    os.makedirs(f'{DST}/{sub}', exist_ok=True)
    files = os.listdir(f'{SRC}/{sub}')
    n = 0
    for f in files:
        src = f'{SRC}/{sub}/{f}'
        dst = f'{DST}/{sub}/{f}'
        size = os.path.getsize(src)
        try:
            if sub == 'pg' and size > 250_000:
                im = Image.open(src)
                if im.mode in ('RGBA', 'P'):
                    im = im.convert('RGB')
                w, h = im.size
                maxw = 900
                if w > maxw:
                    im = im.resize((maxw, int(h * maxw / w)), Image.LANCZOS)
                im.save(dst, 'JPEG' if f.lower().endswith(('.jpg', '.jpeg')) else im.format, quality=72, optimize=True)
            else:
                shutil.copy2(src, dst)
            n += 1
        except Exception as e:
            shutil.copy2(src, dst)  # fallback raw copy
            n += 1
    sz = sum(os.path.getsize(f'{DST}/{sub}/{f}') for f in os.listdir(f'{DST}/{sub}'))
    print(f'{sub}: {n} files, {sz/1024/1024:.1f} MB')
    total += sz
print(f'TOTAL: {total/1024/1024:.1f} MB')
