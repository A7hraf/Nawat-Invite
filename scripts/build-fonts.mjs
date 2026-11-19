/**
 * Self-hosts the invitation fonts (all SIL Open Font License) from @fontsource packages.
 *   FONTSOURCE_DIR=/path/to/node_modules/@fontsource node scripts/build-fonts.mjs
 * Writes public/fonts/<id>.css (+ woff2 files). Only latin and arabic subsets are kept.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const SRC = process.env.FONTSOURCE_DIR ?? "node_modules/@fontsource";
const OUT = "public/fonts";
const WEIGHTS = [400, 500, 600, 700];
let total = 0;
for (const id of readdirSync(SRC)) {
  const dir = path.join(SRC, id);
  const meta = JSON.parse(readFileSync(path.join(dir, "metadata.json"), "utf8"));
  const weights = meta.weights.filter((w) => WEIGHTS.includes(w));
  const pick = weights.length ? weights : [meta.weights[0]];
  const css = [];
  const ranges = existsSync(path.join(dir, "unicode.json")) ? JSON.parse(readFileSync(path.join(dir, "unicode.json"), "utf8")) : {};
  mkdirSync(path.join(OUT, id), { recursive: true });
  for (const subset of ["latin", "arabic"].filter((s) => meta.subsets.includes(s))) {
    for (const w of pick) for (const style of meta.styles.includes("italic") && w <= 500 ? ["normal", "italic"] : ["normal"]) {
      const f = path.join(dir, `${subset}-${w}${style === "italic" ? "-italic" : ""}.css`);
      if (!existsSync(f)) continue;
      let block = readFileSync(f, "utf8").replace(/,\s*url\([^)]*\.woff\) format\('woff'\)/g, "");
      block = block.replace(/url\(\.\/files\/([^)]+\.woff2)\)/g, (_, file) => {
        copyFileSync(path.join(dir, "files", file), path.join(OUT, id, file));
        total += 1;
        return `url(/fonts/${id}/${file})`;
      });
      const range = ranges[subset];
      if (range && !block.includes("unicode-range")) block = block.replace(/\}\s*$/, `  unicode-range: ${range};\n}`);
      css.push(block.replace(/\/\*[\s\S]*?\*\//g, "").trim());
    }
  }
  writeFileSync(path.join(OUT, `${id}.css`), css.join("\n") + "\n");
  const lic = path.join(dir, "LICENSE");
  if (existsSync(lic)) copyFileSync(lic, path.join(OUT, id, "LICENSE"));
}
console.log(`✓ ${readdirSync(SRC).length} families, ${total} font files`);
