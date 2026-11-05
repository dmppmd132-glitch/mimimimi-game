from pathlib import Path
from PIL import Image
import numpy as np
from collections import deque

src = Path('/home/ubuntu/upload/pasted_file_YU5VWk_image.png')
out = Path('/home/ubuntu/mimimimi/public/characters')
out.mkdir(parents=True, exist_ok=True)

# Tile bounds are deliberately below the captions so the exported characters contain rabbits only.
boxes = [
    ('stick', '貼貼兔', (88, 72, 251, 199)),
    ('good-morning', '早安兔', (369, 72, 531, 199)),
    ('faceless', '沒臉著了兔', (651, 72, 814, 199)),
    ('eat', '好吃兔', (932, 72, 1094, 199)),
    ('sleep', '睡睡兔', (88, 276, 251, 410)),
    ('flop', '撲街兔', (369, 276, 531, 410)),
    ('mimi', '咪咪咪', (651, 276, 814, 410)),
    ('handsome', '好帥兔', (932, 276, 1094, 410)),
]

im = Image.open(src).convert('RGB')
for slug, label, box in boxes:
    crop = im.crop(box)
    arr = np.asarray(crop).copy()
    h, w, _ = arr.shape
    # Estimate the tile background from the four corners, then remove only connected pixels
    # close to that pastel color. This keeps outlines and the rabbit's interior colors intact.
    samples = np.array([arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]], dtype=np.float32)
    bg = samples.mean(axis=0)
    dist = np.linalg.norm(arr.astype(np.float32) - bg, axis=2)
    candidate = dist < 58
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        q.append((0, x)); q.append((h-1, x))
    for y in range(h):
        q.append((y, 0)); q.append((y, w-1))
    while q:
        y, x = q.popleft()
        if y < 0 or y >= h or x < 0 or x >= w or seen[y, x] or not candidate[y, x]:
            continue
        seen[y, x] = True
        q.extend(((y-1,x),(y+1,x),(y,x-1),(y,x+1)))
    rgba = np.dstack([arr, np.where(seen, 0, 255).astype(np.uint8)])
    # Trim only transparent outer margins, retaining a small breathing room.
    alpha = rgba[:,:,3]
    ys, xs = np.where(alpha > 0)
    if len(xs):
        pad = 5
        x0, x1 = max(0, xs.min()-pad), min(w, xs.max()+pad+1)
        y0, y1 = max(0, ys.min()-pad), min(h, ys.max()+pad+1)
        rgba = rgba[y0:y1, x0:x1]
    Image.fromarray(rgba, 'RGBA').save(out / f'{slug}.png', optimize=True)
    print(f'{slug}: {rgba.shape[1]}x{rgba.shape[0]} transparent pixels={(rgba[:,:,3]==0).sum()}')
