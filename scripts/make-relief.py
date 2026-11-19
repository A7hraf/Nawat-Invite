"""Turns a painted scene into an embossed ivory paper relief of the same composition.
usage: python3 make-relief.py in.png out.png [paperHex]"""
import sys, numpy as np, cv2
src, dst = sys.argv[1], sys.argv[2]
paper = sys.argv[3] if len(sys.argv) > 3 else "#efe6d6"
p = np.array([int(paper[i:i+2], 16) for i in (5, 3, 1)], np.float32) / 255  # BGR
img = cv2.imread(src).astype(np.float32) / 255
lum = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
# local contrast so shapes read as raised forms rather than light/dark areas
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
l8 = clahe.apply(cv2.bilateralFilter((lum * 255).astype(np.uint8), 9, 40, 9)).astype(np.float32) / 255
l8 = cv2.edgePreservingFilter((np.dstack([l8]*3) * 255).astype(np.uint8), flags=1, sigma_s=40, sigma_r=0.25)[..., 0].astype(np.float32) / 255
detail = l8 - cv2.GaussianBlur(l8, (0, 0), 18)
h = cv2.GaussianBlur(l8 * 0.55 + detail * 1.4, (0, 0), 1.6)
gx = cv2.Sobel(h, cv2.CV_32F, 1, 0, ksize=3)
gy = cv2.Sobel(h, cv2.CV_32F, 0, 1, ksize=3)
k = 3.2
nx, ny, nz = -gx * k, -gy * k, np.ones_like(h)
n = np.sqrt(nx**2 + ny**2 + nz**2); nx, ny, nz = nx / n, ny / n, nz / n
L = np.array([-0.55, -0.6, 0.58]); L /= np.linalg.norm(L)
shade = nx * L[0] + ny * L[1] + nz * L[2]
shade = (shade - shade.mean()) * 1.25 + 0.5
tone = 0.80 + 0.30 * shade + 0.10 * (cv2.GaussianBlur(l8, (0, 0), 3) - 0.5)
grain = cv2.GaussianBlur(np.random.default_rng(3).normal(0, 1, h.shape).astype(np.float32), (0, 0), 0.8) * 0.018
tone = np.clip(tone + grain, 0, 1.08)
# warm vignette like a real card under soft light
H, W = h.shape; yy, xx = np.mgrid[0:H, 0:W]
vig = 1 - 0.10 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
out = np.clip(tone[..., None] * p[None, None, :] * vig[..., None] * 1.06, 0, 1)
cv2.imwrite(dst, (out * 255).astype(np.uint8))
