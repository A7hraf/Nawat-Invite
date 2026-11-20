import type { Tier } from "@/lib/entitlements";

export type OpeningKind = "envelope" | "doors" | "curtain" | "box";
/** How the guest opens a photo-art invitation (used when the theme has cover artwork). */
export type Interaction = "seal" | "ribbon" | "gatefold" | "curtain";
/** Artwork slots an admin can fill per theme (Control Room → Themes). */
export const ART_SLOTS = ["video", "cover", "reveal", "relief", "texture", "venue", "closing", "dressHer", "dressHim"] as const;
export type ArtSlot = (typeof ART_SLOTS)[number];
export type ThemeArt = Partial<Record<ArtSlot, string>>; // slot → media asset id
export const ART_SLOT_INFO: Record<ArtSlot, { label: string; hint: string }> = {
  video: { label: "Opening film (optional)", hint: "MP4 or WebM up to 40 MB, portrait 9:16, 6–20 s: an envelope or doors opening filmed or animated. Plays when the guest taps, then the card appears." },
  cover: { label: "Custom opening (optional)", hint: "Portrait 9:16 photo that replaces the embossed envelope, e.g. a velvet box. The guest opens it with the theme's gesture." },
  reveal: { label: "Painted scene", hint: "Portrait 9:16, the scene on the invitation card (painting or photo). Keep the upper half calm for the names." },
  relief: { label: "Embossed version", hint: "Portrait 9:16, the same scene as ivory embossed paper. It blooms into the painted scene. Bundled themes have one generated." },
  texture: { label: "Texture", hint: "Seamless fabric or paper (velvet, linen, marble) for the curtain and sections." },
  venue: { label: "Venue mood", hint: "Landscape 4:3 of a hall or table setting, lit by the guest’s finger." },
  closing: { label: "Closing image", hint: "Portrait 4:5 shown at the end, unless the couple uploads their own photo." },
  dressHer: { label: "Dress code · her", hint: "Portrait 3:4 outfit inspiration." },
  dressHim: { label: "Dress code · him", hint: "Portrait 3:4 outfit inspiration." },
};
export type Ornament = "diamond" | "star" | "arch" | "leaf" | "wave" | "deco" | "pearl";
export type LinerPattern = "lattice" | "leaves" | "waves" | "stars" | "deco";

export type ThemePalette = {
  night: string; night2: string; glow: string;          // dark sections + opening background
  paper: string; paper2: string;                          // light sections
  ink: string; muted: string;                             // text on light
  cream: string; mutedDark: string;                       // text on dark
  accent: string; accentText: string; onAccent: string;   // metal accent (decor), accent readable on light, text on accent
};

export type ThemeScene = {
  // envelope
  paper?: string; liner?: string; linerLine?: string; pattern?: LinerPattern; seal?: string;
  // doors / box / curtain
  surface?: string; detail?: string; frame?: string; lining?: string; light?: string; fabric?: string; fabric2?: string;
  metal: string;
  stars?: boolean;
};

export type ThemeDef = {
  slug: string;
  tier: Tier;
  name: { en: string; ar: string };
  tagline: { en: string; ar: string };
  inspiration: string;
  opening: OpeningKind;
  palette: ThemePalette;
  fonts: { display: string; arabic: string; script: string };
  interaction: Interaction;
  ornament: Ornament;
  scene: ThemeScene;
  /** Built-in licensed track played when the couple has not chosen one (file in public/music). */
  music: string;
  /** Floating decoration over the hero. */
  particles: Particles;
  /** Hero composition. */
  hero: HeroLayout;
  /** Bundled artwork slots shipped in public/themes/<slug>/ (admin uploads override them). */
  art: ArtSlot[];
  /** Text colour on the card: dark ink on light scenes, cream on dark scenes. */
  tone: "light" | "dark";
  /** Colour the embossed envelope is dyed with (multiplied over ivory paper). */
  envelope: string;
};
export type Particles = "gold" | "petals" | "stars" | "bubbles" | "none";
export type HeroLayout = "classic" | "editorial" | "arch" | "frame";

/**
 * The collection: 20 themes. Photography is licensed (Pexels / Unsplash licence, see public/themes/CREDITS.md),
 * fonts are SIL OFL and self-hosted from public/fonts, music is CC0 / public domain (public/music).
 * Directions come from 2026 stationery research (editorial type, tactile papers, vellum,
 * mocha + champagne, navy + gold, jewel tones) and Gulf design language (palace arches,
 * Arabic calligraphy, pearls, the Omani sea and desert).
 */
export const THEMES: ThemeDef[] = [
  {
    slug: "mocha-champagne", tier: "IVORY",
    name: { en: "Mocha & Champagne", ar: "موكا وشمبانيا" },
    tagline: { en: "Warm ivory card, champagne foil, an editorial serif.", ar: "بطاقة عاجية دافئة بلمسة شمبانيا." },
    inspiration: "2026 forecast palette: mocha mousse, champagne and warm ivory.",
    opening: "envelope",
    palette: { night: "#2B1E16", night2: "#140D09", glow: "#6B4F3A", paper: "#F5F0E8", paper2: "#FBF8F2", ink: "#2B1E16", muted: "#6B5B4F", cream: "#F1E4CC", mutedDark: "#C4B39D", accent: "#E8C99A", accentText: "#7A5A30", onAccent: "#2B1E16" },
    fonts: { display: "Cormorant Garamond", arabic: "Amiri", script: "Pinyon Script" }, interaction: "seal",
    ornament: "diamond",
    scene: { paper: "#F3EADB", liner: "#6B4F3A", linerLine: "#E8C99A", pattern: "lattice", seal: "#5A3E2B", metal: "#E8C99A" },
    music: "celebrated-minuet", particles: "bubbles", hero: "classic", tone: "light", envelope: "#efe2cf", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "vellum-garden", tier: "IVORY",
    name: { en: "Vellum Garden", ar: "حديقة الرق" },
    tagline: { en: "Sage green, translucent vellum and pressed leaves.", ar: "أخضر المريمية وأوراق مضغوطة." },
    inspiration: "Vellum overlays and botanical, garden-party stationery.",
    opening: "envelope",
    palette: { night: "#1F2A22", night2: "#0E1510", glow: "#4F6B55", paper: "#F2F1EA", paper2: "#FAFAF5", ink: "#1F2A22", muted: "#56645A", cream: "#E7EDE2", mutedDark: "#AFC0B1", accent: "#B7C9A8", accentText: "#4A6A4D", onAccent: "#1F2A22" },
    fonts: { display: "Fraunces", arabic: "Lateef", script: "Italianno" }, interaction: "seal",
    ornament: "leaf",
    scene: { paper: "#EEF0E6", liner: "#6E8C73", linerLine: "#DDE7D2", pattern: "leaves", seal: "#4F6B55", metal: "#D9E3CF" },
    music: "magic-garden", particles: "petals", hero: "editorial", tone: "light", envelope: "#f6efe6", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "muscat-sea", tier: "IVORY",
    name: { en: "Muscat Sea", ar: "بحر مسقط" },
    tagline: { en: "Coastal blue, white plaster and silver waves.", ar: "أزرق الساحل وأمواج فضية." },
    inspiration: "Oman's coastline: whitewashed walls, deep sea blue, silver.",
    opening: "envelope",
    palette: { night: "#1C3B40", night2: "#0E2226", glow: "#3E8A8C", paper: "#FBF4EE", paper2: "#FFFBF7", ink: "#1C3B40", muted: "#5B6E6E", cream: "#F8E4D6", mutedDark: "#D9C2B4", accent: "#E5A27E", accentText: "#9A4F34", onAccent: "#1C3B40" },
    fonts: { display: "Italiana", arabic: "El Messiri", script: "Great Vibes" }, interaction: "seal",
    ornament: "wave",
    scene: { paper: "#F4F7FA", liner: "#2F6690", linerLine: "#D6E2EC", pattern: "waves", seal: "#1F4E79", metal: "#D6E2EC" },
    music: "neptunian-princess", particles: "none", hero: "frame", tone: "light", envelope: "#e3eef0", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "bab-al-noor", tier: "GILDED",
    name: { en: "Bab Al Noor", ar: "باب النور" },
    tagline: { en: "Carved palace doors open onto golden light.", ar: "أبواب قصر منقوشة تنفتح على النور." },
    inspiration: "Gulf palace architecture and carved Omani doors.",
    opening: "doors",
    palette: { night: "#2A1D12", night2: "#120B06", glow: "#8A6A3A", paper: "#F7F0E3", paper2: "#FFFBF3", ink: "#2A1D12", muted: "#6B5B49", cream: "#F3E6CC", mutedDark: "#C8B596", accent: "#D4AF63", accentText: "#82612A", onAccent: "#2A1D12" },
    fonts: { display: "Cinzel", arabic: "Aref Ruqaa", script: "Pinyon Script" }, interaction: "gatefold",
    ornament: "arch",
    scene: { surface: "#EADBC0", detail: "#C9A45C", frame: "#D9C6A2", light: "#FFE3A8", metal: "#D4AF63" },
    music: "nomadic-sunset", particles: "gold", hero: "frame", tone: "light", envelope: "#f7eadf", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "dana-pearl", tier: "GILDED",
    name: { en: "Dana Pearl", ar: "دانة" },
    tagline: { en: "A pearl jewel box in blush and silver.", ar: "صندوق لؤلؤ بلون الورد والفضة." },
    inspiration: "Gulf pearling heritage (dana: the finest pearl) and soft blush tones.",
    opening: "box",
    palette: { night: "#3A3029", night2: "#1E1814", glow: "#9C8670", paper: "#FBF8F3", paper2: "#FFFFFF", ink: "#3A3029", muted: "#76695C", cream: "#F3EADF", mutedDark: "#D5C8B8", accent: "#D8C3A5", accentText: "#7E6646", onAccent: "#3A3029" },
    fonts: { display: "Bodoni Moda", arabic: "Amiri", script: "Great Vibes" }, interaction: "ribbon",
    ornament: "pearl",
    scene: { surface: "#F2E7E4", lining: "#E6C9CB", metal: "#D8D8DE", light: "#FFF1EE" },
    music: "canon-in-d", particles: "gold", hero: "classic", tone: "light", envelope: "#f4f2f2", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "layali-celestial", tier: "GILDED",
    name: { en: "Layali", ar: "ليالي" },
    tagline: { en: "Midnight-blue velvet parts under gold stars.", ar: "مخمل كحلي تحت نجوم ذهبية." },
    inspiration: "Navy and gold, a 2026 favourite for evening celebrations.",
    opening: "curtain",
    palette: { night: "#0E1A33", night2: "#060B17", glow: "#2B3F73", paper: "#F4F1EA", paper2: "#FBF9F4", ink: "#0E1A33", muted: "#535D77", cream: "#E9E3D3", mutedDark: "#AFB6CB", accent: "#D6B26A", accentText: "#7E6127", onAccent: "#0E1A33" },
    fonts: { display: "Marcellus", arabic: "Reem Kufi", script: "Pinyon Script" }, interaction: "curtain",
    ornament: "star",
    scene: { fabric: "#1E2F5E", fabric2: "#0B1530", metal: "#D6B26A", light: "#FFE7B5", stars: true },
    music: "landras-dream", particles: "stars", hero: "editorial", tone: "dark", envelope: "#7f8fbf", art: ["video", "reveal", "relief", "texture", "venue", "closing"],
  },
  {
    slug: "desert-rose", tier: "GILDED",
    name: { en: "Desert Rose", ar: "وردة الصحراء" },
    tagline: { en: "Terracotta doors, sand and sunset rose.", ar: "أبواب طينية ورمال وغروب وردي." },
    inspiration: "Earthy 2026 tones meet the Wahiba Sands at sunset.",
    opening: "doors",
    palette: { night: "#3A1E19", night2: "#1A0C0A", glow: "#9C5442", paper: "#F6EEE7", paper2: "#FFF9F4", ink: "#3A1E19", muted: "#735549", cream: "#F5E3D6", mutedDark: "#D3B5A6", accent: "#E3A989", accentText: "#944B35", onAccent: "#3A1E19" },
    fonts: { display: "Libre Caslon Display", arabic: "Mirza", script: "Italianno" }, interaction: "gatefold",
    ornament: "arch",
    scene: { surface: "#B5654F", detail: "#F1C8A8", frame: "#E8D3BE", light: "#FFD2AE", metal: "#F1C8A8" },
    music: "the-desert", particles: "gold", hero: "editorial", tone: "light", envelope: "#efcfc3", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "majlis-velvet", tier: "ROYAL_SEAL",
    name: { en: "Majlis Velvet", ar: "مخمل المجلس" },
    tagline: { en: "Ivory envelope, wine lining, a broken wax seal.", ar: "ظرف عاجي وبطانة عنابية وختم شمعي." },
    inspiration: "The signature Nawat look: wax seal, embossed paper, wine and gold.",
    opening: "envelope",
    palette: { night: "#2A0B14", night2: "#120508", glow: "#7A2235", paper: "#F7F2EA", paper2: "#FFFDF9", ink: "#16110F", muted: "#6E6259", cream: "#E9D9B8", mutedDark: "#C9BBA9", accent: "#C9A45C", accentText: "#8A6428", onAccent: "#16110F" },
    fonts: { display: "Gloock", arabic: "Aref Ruqaa", script: "Pinyon Script" }, interaction: "seal",
    ornament: "diamond",
    scene: { paper: "#F7EFE1", liner: "#7A2235", linerLine: "#D6B26A", pattern: "lattice", seal: "#6E1729", metal: "#C9A45C" },
    music: "royal-coupling", particles: "gold", hero: "classic", tone: "dark", envelope: "#b8505d", art: ["video", "reveal", "relief", "texture", "venue", "closing"],
  },
  {
    slug: "emerald-deco", tier: "ROYAL_SEAL",
    name: { en: "Emerald Deco", ar: "زمرد آرت ديكو" },
    tagline: { en: "An emerald lacquer box with Art Deco gold.", ar: "صندوق زمردي بزخارف ذهبية." },
    inspiration: "Jewel tones and Art Deco geometry, black-tie glamour.",
    opening: "box",
    palette: { night: "#0B2A22", night2: "#04130F", glow: "#1F6B55", paper: "#F3F0E6", paper2: "#FBF9F2", ink: "#0B2A22", muted: "#4F6159", cream: "#E8E0C8", mutedDark: "#A9BFB5", accent: "#D4B062", accentText: "#7A5E23", onAccent: "#0B2A22" },
    fonts: { display: "Poiret One", arabic: "Reem Kufi", script: "Italianno" }, interaction: "seal",
    ornament: "deco",
    scene: { surface: "#0F4D3C", lining: "#E8E0C8", metal: "#D4B062", light: "#FFF0C8" },
    music: "brandenburg-3", particles: "gold", hero: "frame", tone: "dark", envelope: "#6fae95", art: ["video", "reveal", "relief", "texture", "venue", "closing"],
  },
  {
    slug: "noir-monogram", tier: "ROYAL_SEAL",
    name: { en: "Noir Monogram", ar: "مونوغرام نوار" },
    tagline: { en: "Black velvet curtain, silver monogram, editorial type.", ar: "ستار مخملي أسود ومونوغرام فضي." },
    inspiration: "Editorial typography and monochrome black-tie palettes.",
    opening: "curtain",
    palette: { night: "#0C0C0D", night2: "#000000", glow: "#3A3A40", paper: "#F4F2EE", paper2: "#FFFFFF", ink: "#0C0C0D", muted: "#5A5A5F", cream: "#ECEAE4", mutedDark: "#B4B4B8", accent: "#C9C9CE", accentText: "#525258", onAccent: "#0C0C0D" },
    fonts: { display: "Playfair Display", arabic: "Noto Kufi Arabic", script: "Luxurious Script" }, interaction: "curtain",
    ornament: "deco",
    scene: { fabric: "#1A1A1D", fabric2: "#060607", metal: "#C9C9CE", light: "#F2F2F5" },
    music: "air-on-g", particles: "none", hero: "editorial", tone: "dark", envelope: "#6c6866", art: ["video", "reveal", "relief", "texture", "venue", "closing"],
  },

  // ── Added in the 20-theme collection ──
  {
    slug: "blush-letter", tier: "IVORY",
    name: { en: "Blush Letter", ar: "رسالة وردية" },
    tagline: { en: "A blush envelope, hellebores and a bronze seal.", ar: "ظرف وردي وزهور وختم برونزي." },
    inspiration: "Soft stationery flat-lays: blush paper, fresh flowers, a hand-pressed seal.",
    opening: "envelope",
    palette: { night: "#3B2A2C", night2: "#1C1314", glow: "#A07E7F", paper: "#FBF5F2", paper2: "#FFFFFF", ink: "#3B2A2C", muted: "#7A6466", cream: "#F7E9E4", mutedDark: "#D6C0BC", accent: "#C99A6E", accentText: "#8A5E3B", onAccent: "#2B1E16" },
    fonts: { display: "Gilda Display", arabic: "Noto Naskh Arabic", script: "Parisienne" }, interaction: "seal",
    ornament: "pearl",
    scene: { paper: "#F7E9E4", liner: "#D9B8B0", linerLine: "#FFFFFF", pattern: "leaves", seal: "#A9764E", metal: "#C99A6E" },
    music: "lovely-piano", particles: "petals", hero: "arch", tone: "light", envelope: "#f6dfdc", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "garden-veil", tier: "IVORY",
    name: { en: "Garden Veil", ar: "طرحة الحديقة" },
    tagline: { en: "Ivory chiffon parts onto a garden ceremony.", ar: "شيفون عاجي ينفتح على حفل في الحديقة." },
    inspiration: "Outdoor ceremonies: draped chiffon arches, green lawns, white flowers.",
    opening: "curtain",
    palette: { night: "#22301F", night2: "#10170E", glow: "#5E7A52", paper: "#F7F6EF", paper2: "#FFFFFF", ink: "#22301F", muted: "#5C6B57", cream: "#EEF1E6", mutedDark: "#B9C6B1", accent: "#CDB88A", accentText: "#6D5A2E", onAccent: "#22301F" },
    fonts: { display: "Bellefair", arabic: "Harmattan", script: "Allura" }, interaction: "curtain",
    ornament: "leaf",
    scene: { fabric: "#EDE4D2", fabric2: "#C9BEA8", metal: "#CDB88A", light: "#FFF8E8" },
    music: "hold-me-love-me", particles: "petals", hero: "classic", tone: "light", envelope: "#edf1e4", art: ["video", "reveal", "relief", "texture", "venue", "closing"],
  },
  {
    slug: "henna-night", tier: "IVORY",
    name: { en: "Henna Night", ar: "ليلة الحناء" },
    tagline: { en: "Henna-traced hands, bangles and warm reds.", ar: "نقش الحناء والأساور ودفء الأحمر." },
    inspiration: "The henna night before the wedding: patterns, gold bangles, saffron and red.",
    opening: "envelope",
    palette: { night: "#0F2E24", night2: "#071A14", glow: "#1F5E46", paper: "#FBF5EA", paper2: "#FFFBF2", ink: "#16241D", muted: "#5C6B5F", cream: "#F6EAD2", mutedDark: "#D8C9A8", accent: "#E2A33A", accentText: "#8A5A12", onAccent: "#16241D" },
    fonts: { display: "Prata", arabic: "Rakkas", script: "Alex Brush" }, interaction: "seal",
    ornament: "arch",
    scene: { paper: "#F7E2CF", liner: "#A0412E", linerLine: "#E0A951", pattern: "lattice", seal: "#7E2418", metal: "#E0A951" },
    music: "the-desert", particles: "gold", hero: "arch", tone: "light", envelope: "#e8b9a0", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "andalus-zellige", tier: "GILDED",
    name: { en: "Andalus", ar: "أندلس" },
    tagline: { en: "A zellige arch opens onto a Moorish court.", ar: "قوس من الزليج ينفتح على صحن أندلسي." },
    inspiration: "Alhambra courts and Moroccan zellige: turquoise, ivory stone, reflecting pools.",
    opening: "doors",
    palette: { night: "#0D2B2E", night2: "#051416", glow: "#2C7A7B", paper: "#F5F1E8", paper2: "#FFFCF5", ink: "#0D2B2E", muted: "#4F6466", cream: "#E6F0EE", mutedDark: "#A8C3C1", accent: "#D7B46A", accentText: "#7C5F22", onAccent: "#0D2B2E" },
    fonts: { display: "Della Respira", arabic: "Scheherazade New", script: "Monsieur La Doulaise" }, interaction: "gatefold",
    ornament: "star",
    scene: { surface: "#2C7A7B", detail: "#F1E6C8", frame: "#E8DCC2", light: "#FFF0C8", metal: "#D7B46A" },
    music: "waltz-for-naseem", particles: "none", hero: "arch", tone: "light", envelope: "#cfe6e2", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "riad-jasmine", tier: "GILDED",
    name: { en: "Riad Jasmine", ar: "ياسمين الرياض" },
    tagline: { en: "A hidden riad: tiles, fountain and deep green.", ar: "رياض خفي: زليج ونافورة وخضرة عميقة." },
    inspiration: "Courtyard houses of Fes and Marrakesh, shaded greenery and a central fountain.",
    opening: "doors",
    palette: { night: "#142218", night2: "#08100A", glow: "#3E5E45", paper: "#F3F1EA", paper2: "#FBFAF5", ink: "#142218", muted: "#55625A", cream: "#E6ECE3", mutedDark: "#A9B9AD", accent: "#C8A96A", accentText: "#6E5728", onAccent: "#142218" },
    fonts: { display: "DM Serif Display", arabic: "Alkalami", script: "Rouge Script" }, interaction: "gatefold",
    ornament: "leaf",
    scene: { surface: "#3E5E45", detail: "#E6D6B0", frame: "#D6C8A6", light: "#FFF1CC", metal: "#C8A96A" },
    music: "romantic-inspiration", particles: "petals", hero: "frame", tone: "light", envelope: "#dde8d8", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "fanous-lantern", tier: "GILDED",
    name: { en: "Fanous", ar: "فانوس" },
    tagline: { en: "A brass lantern scatters stars across the dark.", ar: "فانوس نحاسي ينثر النجوم في العتمة." },
    inspiration: "Pierced brass lanterns, Ramadan nights and warm candlelight.",
    opening: "envelope",
    palette: { night: "#0E1630", night2: "#070B1A", glow: "#C9873A", paper: "#F7F1E6", paper2: "#FFFBF3", ink: "#141A2E", muted: "#5E6378", cream: "#F2E4CC", mutedDark: "#C9B696", accent: "#E3B25A", accentText: "#8A5E1A", onAccent: "#0E1630" },
    fonts: { display: "Forum", arabic: "Katibeh", script: "Mea Culpa" }, interaction: "seal",
    ornament: "star",
    scene: { paper: "#F2E3C4", liner: "#3A2814", linerLine: "#E2B65C", pattern: "stars", seal: "#7A5426", metal: "#E2B65C" },
    music: "nomadic-sunset", particles: "gold", hero: "classic", tone: "dark", envelope: "#d9b98a", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "marble-peony", tier: "GILDED",
    name: { en: "Marble Peony", ar: "رخام وفاوانيا" },
    tagline: { en: "A marble box, a satin bow, one white peony.", ar: "صندوق رخامي وشريطة ساتان وزهرة فاوانيا." },
    inspiration: "Minimal luxury still-lifes: Carrara marble, agate and white peonies.",
    opening: "box",
    palette: { night: "#3B2A2D", night2: "#1F1517", glow: "#C98B93", paper: "#FCF7F5", paper2: "#FFFFFF", ink: "#3B2A2D", muted: "#7A6466", cream: "#F7E7E6", mutedDark: "#DCC4C5", accent: "#E7B8B5", accentText: "#9A4E58", onAccent: "#3B2A2D" },
    fonts: { display: "Cormorant Garamond", arabic: "Noto Kufi Arabic", script: "WindSong" }, interaction: "ribbon",
    ornament: "pearl",
    scene: { surface: "#ECEAE7", lining: "#D8CFC2", metal: "#C6A97A", light: "#FFFFFF" },
    music: "alls-fair-in-love", particles: "petals", hero: "editorial", tone: "light", envelope: "#f0efed", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "isfahan-mirror", tier: "ROYAL_SEAL",
    name: { en: "Isfahan", ar: "أصفهان" },
    tagline: { en: "Muqarnas and lapis tiles under a palace dome.", ar: "مقرنصات وبلاط لازوردي تحت قبة." },
    inspiration: "Persian palace ceilings: lapis blue, saffron gold, honeycomb muqarnas.",
    opening: "doors",
    palette: { night: "#0C1A3A", night2: "#050B1C", glow: "#2B4A8F", paper: "#F4F1E8", paper2: "#FFFCF4", ink: "#0C1A3A", muted: "#505C7A", cream: "#E6E8F2", mutedDark: "#A9B2CC", accent: "#E0B457", accentText: "#80601E", onAccent: "#0C1A3A" },
    fonts: { display: "Cinzel Decorative", arabic: "Kufam", script: "Corinthia" }, interaction: "gatefold",
    ornament: "star",
    scene: { surface: "#1E3A7A", detail: "#E0B457", frame: "#C9D3EA", light: "#FFE8B0", metal: "#E0B457" },
    music: "goldberg-aria", particles: "stars", hero: "arch", tone: "dark", envelope: "#8ea4d6", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "rouge-noir", tier: "ROYAL_SEAL",
    name: { en: "Rouge Noir", ar: "أحمر وأسود" },
    tagline: { en: "A red box, a black satin bow, candlelight.", ar: "صندوق أحمر وشريطة سوداء وضوء الشموع." },
    inspiration: "Evening glamour: lacquer red, black satin and a candlelit supper.",
    opening: "box",
    palette: { night: "#150A0B", night2: "#070304", glow: "#6E1A1F", paper: "#F6F1EC", paper2: "#FFFFFF", ink: "#150A0B", muted: "#6A5A5B", cream: "#F0E3DA", mutedDark: "#C4AFA9", accent: "#D9A866", accentText: "#8A5F28", onAccent: "#150A0B" },
    fonts: { display: "Tenor Sans", arabic: "Gulzar", script: "Imperial Script" }, interaction: "ribbon",
    ornament: "diamond",
    scene: { surface: "#B3121D", lining: "#1A1A1A", metal: "#D9A866", light: "#FFE6C0" },
    music: "night-in-venice", particles: "gold", hero: "editorial", tone: "dark", envelope: "#c4505a", art: ["video", "reveal", "relief", "venue", "closing"],
  },
  {
    slug: "blanc-royale", tier: "ROYAL_SEAL",
    name: { en: "Blanc Royale", ar: "الأبيض الملكي" },
    tagline: { en: "Ivory velvet parts onto a cloud of white roses.", ar: "مخمل عاجي ينفتح على سحابة من الورد الأبيض." },
    inspiration: "All-white couture weddings: ivory velvet, white roses, gypsophila.",
    opening: "curtain",
    palette: { night: "#2B2620", night2: "#14110D", glow: "#8A7C66", paper: "#FAF8F3", paper2: "#FFFFFF", ink: "#2B2620", muted: "#6E665B", cream: "#F4EEE3", mutedDark: "#CFC5B5", accent: "#CBB07A", accentText: "#7A6232", onAccent: "#2B2620" },
    fonts: { display: "Italiana", arabic: "Amiri", script: "Monsieur La Doulaise" }, interaction: "curtain",
    ornament: "pearl",
    scene: { fabric: "#EFE6D4", fabric2: "#CDBFA6", metal: "#CBB07A", light: "#FFFFFF" },
    music: "celebration", particles: "petals", hero: "frame", tone: "light", envelope: "#fbf8f2", art: ["video", "reveal", "relief", "texture", "venue", "closing"],
  },
];

export const themeBySlug = (slug: string) => THEMES.find((t) => t.slug === slug);

const fontId = (family: string) => family.toLowerCase().replace(/ /g, "-");

/** Self-hosted stylesheets for a theme's fonts (public/fonts, SIL Open Font License). */
export function themeFontHrefs(t: ThemeDef): string[] {
  return [...new Set([t.fonts.display, t.fonts.arabic, t.fonts.script, "Manrope", "IBM Plex Sans Arabic"])].map((f) => `/fonts/${fontId(f)}.css`);
}

/** Bundled artwork URLs for a theme (public/themes/<slug>/<slot>.webp). */
export function bundledArt(t: ThemeDef): ThemeArt {
  return Object.fromEntries(t.art.map((slot) => [slot, slot === "video" ? `/themes/${t.slug}/opening.mp4` : `/themes/${t.slug}/${slot}.webp`]));
}

/** Bundled music file for a theme. */
export const themeMusicUrl = (t: ThemeDef) => `/music/${t.music}.m4a`;
