import base64
from pathlib import Path

root = Path(__file__).resolve().parent.parent
img_path = root / 'public' / 'images' / 'interpredict-icon.png'
if not img_path.exists():
    raise FileNotFoundError(img_path)
img_b64 = base64.b64encode(img_path.read_bytes()).decode('ascii')
svg = f'''<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="circle-clip">
      <circle cx="90" cy="90" r="90" />
    </clipPath>
  </defs>
  <g clip-path="url(#circle-clip)">
    <image href="data:image/png;base64,{img_b64}" width="180" height="180" preserveAspectRatio="xMidYMid slice" />
  </g>
</svg>'''
for path in [root / 'public' / 'favicon.svg', root / 'public' / 'icon.svg']:
    path.write_text(svg, encoding='utf-8')
print('wrote', path)
