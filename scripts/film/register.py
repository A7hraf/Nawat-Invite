"""Adds "video" to a theme's art list when public/themes/<slug>/opening.mp4 exists."""
import os, re
root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
p = os.path.join(root, "src/themes/catalog.ts"); s = open(p).read()
for m in list(re.finditer(r'slug: "([a-z-]+)"', s)):
    slug = m.group(1)
    if not os.path.exists(os.path.join(root, "public/themes", slug, "opening.mp4")): continue
    a = s.index("art: [", m.end()); b = s.index("]", a)
    if '"video"' in s[a:b]: continue
    s = s[:a] + 'art: ["video", ' + s[a + 6:]
    print("registered", slug)
open(p, "w").write(s)
