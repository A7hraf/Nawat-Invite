import type { Tier } from "@/lib/entitlements";

export type OpeningKind = "envelope" | "doors" | "curtain" | "box";
/** How the guest opens a photo-art invitation (used when the theme has cover artwork). */
export type Interaction = "seal" | "ribbon" | "gatefold" | "curtain";
/** Artwork slots an admin can fill per theme (Control Room → Themes). */
export const ART_SLOTS = ["cover", "reveal", "texture", "venue", "closing", "dressHer", "dressHim"] as const;
export type ArtSlot = (typeof ART_SLOTS)[number];
export type ThemeArt = Partial<Record<ArtSlot, string>>; // slot → media asset id
export const ART_SLOT_INFO: Record<ArtSlot, { label: string; hint: string }> = {
  cover: { label: "Opening cover", hint: "Portrait 9:16, e.g. a sealed envelope or velvet box photographed from above. The guest opens it." },
  reveal: { label: "Revealed scene", hint: "Portrait 9:16, the scene behind the cover (hall, garden, palace). Also the hero background." },
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
};

/**
 * Launch collection: 10 original themes.
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
  },
  {
    slug: "vellum-garden", tier: "IVORY",
    name: { en: "Vellum Garden", ar: "حديقة الرق" },
    tagline: { en: "Sage green, translucent vellum and pressed leaves.", ar: "أخضر المريمية وأوراق مضغوطة." },
    inspiration: "Vellum overlays and botanical, garden-party stationery.",
    opening: "envelope",
    palette: { night: "#1F2A22", night2: "#0E1510", glow: "#4F6B55", paper: "#F2F1EA", paper2: "#FAFAF5", ink: "#1F2A22", muted: "#56645A", cream: "#E7EDE2", mutedDark: "#AFC0B1", accent: "#B7C9A8", accentText: "#4A6A4D", onAccent: "#1F2A22" },
    fonts: { display: "Marcellus", arabic: "Noto Naskh Arabic", script: "Italianno" }, interaction: "seal",
    ornament: "leaf",
    scene: { paper: "#EEF0E6", liner: "#6E8C73", linerLine: "#DDE7D2", pattern: "leaves", seal: "#4F6B55", metal: "#D9E3CF" },
  },
  {
    slug: "muscat-sea", tier: "IVORY",
    name: { en: "Muscat Sea", ar: "بحر مسقط" },
    tagline: { en: "Coastal blue, white plaster and silver waves.", ar: "أزرق الساحل وأمواج فضية." },
    inspiration: "Oman's coastline: whitewashed walls, deep sea blue, silver.",
    opening: "envelope",
    palette: { night: "#0F2236", night2: "#07111C", glow: "#2F6690", paper: "#F3F6F8", paper2: "#FFFFFF", ink: "#0F2236", muted: "#4F6377", cream: "#E4EEF5", mutedDark: "#A9BDCD", accent: "#BFD3E2", accentText: "#2B567C", onAccent: "#0F2236" },
    fonts: { display: "Playfair Display", arabic: "El Messiri", script: "Great Vibes" }, interaction: "seal",
    ornament: "wave",
    scene: { paper: "#F4F7FA", liner: "#2F6690", linerLine: "#D6E2EC", pattern: "waves", seal: "#1F4E79", metal: "#D6E2EC" },
  },
  {
    slug: "bab-al-noor", tier: "GILDED",
    name: { en: "Bab Al Noor", ar: "باب النور" },
    tagline: { en: "Carved palace doors open onto golden light.", ar: "أبواب قصر منقوشة تنفتح على النور." },
    inspiration: "Gulf palace architecture and carved Omani doors.",
    opening: "doors",
    palette: { night: "#2A1D12", night2: "#120B06", glow: "#8A6A3A", paper: "#F7F0E3", paper2: "#FFFBF3", ink: "#2A1D12", muted: "#6B5B49", cream: "#F3E6CC", mutedDark: "#C8B596", accent: "#D4AF63", accentText: "#82612A", onAccent: "#2A1D12" },
    fonts: { display: "Marcellus", arabic: "Reem Kufi", script: "Pinyon Script" }, interaction: "gatefold",
    ornament: "arch",
    scene: { surface: "#EADBC0", detail: "#C9A45C", frame: "#D9C6A2", light: "#FFE3A8", metal: "#D4AF63" },
  },
  {
    slug: "dana-pearl", tier: "GILDED",
    name: { en: "Dana Pearl", ar: "دانة" },
    tagline: { en: "A pearl jewel box in blush and silver.", ar: "صندوق لؤلؤ بلون الورد والفضة." },
    inspiration: "Gulf pearling heritage (dana: the finest pearl) and soft blush tones.",
    opening: "box",
    palette: { night: "#2E2629", night2: "#141012", glow: "#8E6E75", paper: "#FBF6F4", paper2: "#FFFFFF", ink: "#2E2629", muted: "#6E6266", cream: "#F6ECEA", mutedDark: "#CDBFC2", accent: "#E3CFCF", accentText: "#85585F", onAccent: "#2E2629" },
    fonts: { display: "Bodoni Moda", arabic: "Amiri", script: "Great Vibes" }, interaction: "ribbon",
    ornament: "pearl",
    scene: { surface: "#F2E7E4", lining: "#E6C9CB", metal: "#D8D8DE", light: "#FFF1EE" },
  },
  {
    slug: "layali-celestial", tier: "GILDED",
    name: { en: "Layali", ar: "ليالي" },
    tagline: { en: "Midnight-blue velvet parts under gold stars.", ar: "مخمل كحلي تحت نجوم ذهبية." },
    inspiration: "Navy and gold, a 2026 favourite for evening celebrations.",
    opening: "curtain",
    palette: { night: "#0E1A33", night2: "#060B17", glow: "#2B3F73", paper: "#F4F1EA", paper2: "#FBF9F4", ink: "#0E1A33", muted: "#535D77", cream: "#E9E3D3", mutedDark: "#AFB6CB", accent: "#D6B26A", accentText: "#7E6127", onAccent: "#0E1A33" },
    fonts: { display: "Cormorant Garamond", arabic: "Aref Ruqaa", script: "Pinyon Script" }, interaction: "curtain",
    ornament: "star",
    scene: { fabric: "#1E2F5E", fabric2: "#0B1530", metal: "#D6B26A", light: "#FFE7B5", stars: true },
  },
  {
    slug: "desert-rose", tier: "GILDED",
    name: { en: "Desert Rose", ar: "وردة الصحراء" },
    tagline: { en: "Terracotta doors, sand and sunset rose.", ar: "أبواب طينية ورمال وغروب وردي." },
    inspiration: "Earthy 2026 tones meet the Wahiba Sands at sunset.",
    opening: "doors",
    palette: { night: "#3A1E19", night2: "#1A0C0A", glow: "#9C5442", paper: "#F6EEE7", paper2: "#FFF9F4", ink: "#3A1E19", muted: "#735549", cream: "#F5E3D6", mutedDark: "#D3B5A6", accent: "#E3A989", accentText: "#944B35", onAccent: "#3A1E19" },
    fonts: { display: "Playfair Display", arabic: "El Messiri", script: "Italianno" }, interaction: "gatefold",
    ornament: "arch",
    scene: { surface: "#B5654F", detail: "#F1C8A8", frame: "#E8D3BE", light: "#FFD2AE", metal: "#F1C8A8" },
  },
  {
    slug: "majlis-velvet", tier: "ROYAL_SEAL",
    name: { en: "Majlis Velvet", ar: "مخمل المجلس" },
    tagline: { en: "Ivory envelope, wine lining, a broken wax seal.", ar: "ظرف عاجي وبطانة عنابية وختم شمعي." },
    inspiration: "The signature Nawat look: wax seal, embossed paper, wine and gold.",
    opening: "envelope",
    palette: { night: "#2A0B14", night2: "#120508", glow: "#7A2235", paper: "#F7F2EA", paper2: "#FFFDF9", ink: "#16110F", muted: "#6E6259", cream: "#E9D9B8", mutedDark: "#C9BBA9", accent: "#C9A45C", accentText: "#8A6428", onAccent: "#16110F" },
    fonts: { display: "Gloock", arabic: "Amiri", script: "Pinyon Script" }, interaction: "seal",
    ornament: "diamond",
    scene: { paper: "#F7EFE1", liner: "#7A2235", linerLine: "#D6B26A", pattern: "lattice", seal: "#6E1729", metal: "#C9A45C" },
  },
  {
    slug: "emerald-deco", tier: "ROYAL_SEAL",
    name: { en: "Emerald Deco", ar: "زمرد آرت ديكو" },
    tagline: { en: "An emerald lacquer box with Art Deco gold.", ar: "صندوق زمردي بزخارف ذهبية." },
    inspiration: "Jewel tones and Art Deco geometry, black-tie glamour.",
    opening: "box",
    palette: { night: "#0B2A22", night2: "#04130F", glow: "#1F6B55", paper: "#F3F0E6", paper2: "#FBF9F2", ink: "#0B2A22", muted: "#4F6159", cream: "#E8E0C8", mutedDark: "#A9BFB5", accent: "#D4B062", accentText: "#7A5E23", onAccent: "#0B2A22" },
    fonts: { display: "Italiana", arabic: "Reem Kufi", script: "Italianno" }, interaction: "ribbon",
    ornament: "deco",
    scene: { surface: "#0F4D3C", lining: "#E8E0C8", metal: "#D4B062", light: "#FFF0C8" },
  },
  {
    slug: "noir-monogram", tier: "ROYAL_SEAL",
    name: { en: "Noir Monogram", ar: "مونوغرام نوار" },
    tagline: { en: "Black velvet curtain, silver monogram, editorial type.", ar: "ستار مخملي أسود ومونوغرام فضي." },
    inspiration: "Editorial typography and monochrome black-tie palettes.",
    opening: "curtain",
    palette: { night: "#0C0C0D", night2: "#000000", glow: "#3A3A40", paper: "#F4F2EE", paper2: "#FFFFFF", ink: "#0C0C0D", muted: "#5A5A5F", cream: "#ECEAE4", mutedDark: "#B4B4B8", accent: "#C9C9CE", accentText: "#525258", onAccent: "#0C0C0D" },
    fonts: { display: "Bodoni Moda", arabic: "Noto Naskh Arabic", script: "Great Vibes" }, interaction: "curtain",
    ornament: "deco",
    scene: { fabric: "#1A1A1D", fabric2: "#060607", metal: "#C9C9CE", light: "#F2F2F5" },
  },
];

export const themeBySlug = (slug: string) => THEMES.find((t) => t.slug === slug);

export function googleFontsHref(t: ThemeDef): string {
  const fams = new Set([t.fonts.display, t.fonts.arabic, t.fonts.script, "Manrope", "IBM Plex Sans Arabic"]);
  const spec = [...fams].map((f) => {
    const name = f.replace(/ /g, "+");
    if (f === "Cormorant Garamond") return `family=${name}:ital,wght@0,400;0,500;0,600;1,400;1,500`;
    if (f === "Manrope") return `family=${name}:wght@400;500;600;700`;
    if (f === "IBM Plex Sans Arabic") return `family=${name}:wght@400;500;600`;
    if (["Marcellus", "Italiana", "Pinyon Script", "Great Vibes", "Italianno", "Gloock"].includes(f)) return `family=${name}`;
    if (f === "Aref Ruqaa") return `family=${name}:wght@400;700`;
    return `family=${name}:wght@400;500;600;700`;
  });
  return `https://fonts.googleapis.com/css2?${spec.join("&")}&display=swap`;
}
