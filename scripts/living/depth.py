"""Depth map for a painted scene with Depth Anything V2 (small, ONNX).
   python3 scripts/living/depth.py in.webp out.png"""
import sys
import numpy as np, onnxruntime as ort
from PIL import Image, ImageFilter
MODEL = "/home/claude/models/depth_anything_v2_vits.onnx"
src = Image.open(sys.argv[1]).convert("RGB"); W, H = src.size
sess = ort.InferenceSession(MODEL)
def run(img):
    x = np.asarray(img.resize((518, 518), Image.BICUBIC), dtype=np.float32) / 255.0
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    return sess.run(None, {"l_x_": x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
# two overlapping square crops (top, bottom) keep the aspect honest, blended in the middle
top = src.crop((0, 0, W, W)); bot = src.crop((0, H - W, W, H))
dt = np.asarray(Image.fromarray(run(top)).resize((W, W), Image.BICUBIC)); db = np.asarray(Image.fromarray(run(bot)).resize((W, W), Image.BICUBIC))
# match scales of the two halves on their overlap
ov0, ov1 = H - W, W
a = dt[ov0:ov1]; b = db[: ov1 - ov0]
k, c = np.polyfit(b.ravel(), a.ravel(), 1); db = db * k + c
out = np.zeros((H, W), np.float32); wsum = np.zeros((H, W), np.float32)
ramp = np.ones(W, np.float32)
wt = np.linspace(1, 0, ov1 - ov0)
wtop = np.ones((W,)); wtop[ov0:] = wt
wbot = np.ones((W,)); wbot[: ov1 - ov0] = 1 - wt
out[:W] += dt * wtop[:, None]; wsum[:W] += wtop[:, None]
out[H - W:] += db * wbot[:, None]; wsum[H - W:] += wbot[:, None]
d = out / np.maximum(wsum, 1e-6)
d = (d - d.min()) / (d.max() - d.min() + 1e-6)
Image.fromarray((d * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)).save(sys.argv[2])
