import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
/* Builds public/themes/<slug>/*.webp from the licensed source photos (see public/themes/CREDITS.md). */
const RAW = (process.env.THEME_ART_RAW ?? "./.data/theme-art-raw") + "/", OUT = "/home/claude/app/public/themes/";
// theme: [cover|null, reveal, texture|null]
const T = {
  "mocha-champagne": ["mocha-reveal", "champagne-reveal", null],
  "vellum-garden": [null, "vellum-reveal", null],
  "muscat-sea": [null, "muscat-reveal", null],
  "blush-letter": [null, "blush-reveal", null],
  "garden-veil": [null, "garden-reveal", "tex:ivory"],
  "henna-night": [null, "henna-reveal", null],
  "bab-al-noor": ["babnoor-cover", "babnoor-reveal", null],
  "dana-pearl": ["marble-cover", "dana-reveal", null],
  "layali-celestial": [null, "layali-reveal", "tex:navy"],
  "desert-rose": [null, "desertrose-reveal", null],
  "andalus-zellige": ["andalus-cover", "andalus-reveal", null],
  "riad-jasmine": [null, "riad-reveal", null],
  "fanous-lantern": [null, "oud-reveal", null],
  "marble-peony": ["marble-cover", "marble-reveal", null],
  "majlis-velvet": ["velvet-red-tex", "majlis-reveal", "tex:red"],
  "emerald-deco": ["emerald-cover", "emerald-reveal", "tex:emerald"],
  "noir-monogram": [null, "noir-reveal", "noir-cover"],
  "isfahan-mirror": [null, "isfahan-reveal", null],
  "rouge-noir": ["rouge-cover", "candle-reveal", null],
  "blanc-royale": [null, "blanc-reveal", "tex:ivory"],
};
const portrait = (src) => sharp(RAW + src + ".png").resize(1080, 1920, { fit: "cover", position: "attention" }).webp({ quality: 84 });
async function velvet(kind) {
  const base = sharp(RAW + "velvet-red-tex.png").resize(900, 1600, { fit: "cover" });
  if (kind === "red") return base.webp({ quality: 82 });
  // Greyscale luminance, lifted, then multiplied by the fabric colour (keeps every fold of the photo).
  const map = { navy: { color: "#3a55c8", lin: [2.4, 6] }, emerald: { color: "#1fae7e", lin: [2.4, 6] }, ivory: { color: "#f3e7d2", lin: [1.6, 120] } };
  const m = map[kind];
  const lum = await base.clone().greyscale().linear(m.lin[0], m.lin[1]).toColourspace("srgb").png().toBuffer();
  return sharp(lum).composite([{ input: { create: { width: 900, height: 1600, channels: 3, background: m.color } }, blend: "multiply" }]).webp({ quality: 82 });
}
for (const [slug, [cover, reveal, tex]] of Object.entries(T)) {
  const d = OUT + slug + "/"; mkdirSync(d, { recursive: true });
  if (cover) await portrait(cover).toFile(d + "cover.webp");
  await portrait(reveal).toFile(d + "reveal.webp");
  if (tex) await (tex.startsWith("tex:") ? await velvet(tex.slice(4)) : sharp(RAW + tex + ".png").resize(900, 1600, { fit: "cover" }).webp({ quality: 82 })).toFile(d + "texture.webp");
  await sharp(RAW + reveal + ".png").resize(1200, 900, { fit: "cover", position: "attention" }).webp({ quality: 82 }).toFile(d + "venue.webp");
  await sharp(RAW + (cover && !cover.includes("tex") ? cover : reveal) + ".png").resize(960, 1200, { fit: "cover", position: "entropy" }).webp({ quality: 82 }).toFile(d + "closing.webp");
  console.log(slug);
}
