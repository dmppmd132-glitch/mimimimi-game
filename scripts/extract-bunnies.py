from pathlib import Path
from PIL import Image
import numpy as np
from collections import Counter

src = Path('/home/ubuntu/upload/pasted_file_YU5VWk_image.png')
out = Path('/home/ubuntu/mimimimi/public/characters')
out.mkdir(parents=True, exist_ok=True)
boxes = [
    ('stick', (88, 72, 251, 199)), ('good-morning', (369, 72, 531, 199)),
    ('faceless', (651, 72, 814, 199)), ('eat', (932, 72, 1094, 199)),
    ('sleep', (88, 276, 251, 410)), ('flop', (369, 276, 531, 410)),
    ('mimi', (651, 276, 814, 410)), ('handsome', (932, 276, 1094, 410)),
]

im = Image.open(src).convert('RGB')
for slug, box in boxes:
    crop = im.crop(box)
    arr = np.asarray(crop).copy()
    h, w, _ = arr.shape
    flat = arr.reshape(-1, 3)
    # The tile backgrounds are the dominant colors. Remove pixels close to the
    # dominant pastel palette globally, including the tile area surrounded by a dark gutter.
    counts = Counter(map(tuple, flat.tolist()))
    palette = np.array([c for c, n in counts.most_common(18) if n >= 30], dtype=np.float32)
    pixels = arr.astype(np.float32)
    d = np.min(np.linalg.norm(pixels[:,:,None,:] - palette[None,None,:,:], axis=3), axis=2)
    # Remove flat/anti-aliased background colors; keep outlines and rabbit colors.
    alpha = np.where(d < 30, 0, 255).astype(np.uint8)
    # Also remove the dark gray gutter that can be present at the crop edge.
    dark = np.max(arr, axis=2) < 105
    alpha[dark] = 0
    # Clean tiny isolated opaque specks with a simple neighborhood rule.
    for _ in range(2):
        neighbors = sum(np.roll(np.roll(alpha > 0, dy, 0), dx, 1)
                        for dy, dx in ((-1,0),(1,0),(0,-1),(0,1)))
        alpha[(alpha > 0) & (neighbors == 0)] = 0
    rgba = np.dstack([arr, alpha])
    ys, xs = np.where(alpha > 0)
    if len(xs):
        pad = 5
        x0, x1 = max(0, xs.min()-pad), min(w, xs.max()+pad+1)
        y0, y1 = max(0, ys.min()-pad), min(h, ys.max()+pad+1)
        rgba = rgba[y0:y1, x0:x1]
    Image.fromarray(rgba, 'RGBA').save(out / f'{slug}.png', optimize=True)
    print(f'{slug}: {rgba.shape[1]}x{rgba.shape[0]} transparent={(rgba[:,:,3]==0).sum()}')
