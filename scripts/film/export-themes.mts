// Prints the theme catalog as JSON for the Blender film renderer.
import { THEMES } from "../../src/themes/catalog.ts";
console.log(JSON.stringify(THEMES.map((t) => ({ slug: t.slug, ornament: t.ornament, opening: t.opening, tone: t.tone, envelope: t.envelope, palette: t.palette, scene: t.scene, art: t.art }))));
