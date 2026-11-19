/**
 * Licensed music shipped with Nawat (files in public/music, AAC 112 kbps, faded and loudness-normalised).
 * Every recording is CC0 / public-domain dedication. Sources: the SoundSafari CC0-1.0-Music collection
 * (FreePD.com, Free Music Archive, Chosic CC0 sets). See public/music/CREDITS.md.
 */
export type LibraryTrack = { slug: string; en: string; ar: string; mood: string; artist: string; minTier: "IVORY" | "GILDED" | "ROYAL_SEAL" };

export const MUSIC_LIBRARY: LibraryTrack[] = [
  { slug: "canon-in-d", en: "Canon in D (Pachelbel)", ar: "كانون في ري (باخلبل)", mood: "Piano · the classic aisle", artist: "Ava Drumm · CC0", minTier: "IVORY" },
  { slug: "air-on-g", en: "Air on the G String (Bach)", ar: "آريا على وتر صول (باخ)", mood: "Strings · timeless", artist: "The USAF Strings · public domain", minTier: "GILDED" },
  { slug: "goldberg-aria", en: "Goldberg Aria (Bach)", ar: "آريا غولدبرغ (باخ)", mood: "Piano · serene", artist: "Kimiko Ishizaka · CC0", minTier: "GILDED" },
  { slug: "celebrated-minuet", en: "The Celebrated Minuet (Boccherini)", ar: "المينويت الشهير (بوكيريني)", mood: "Strings · graceful", artist: "Rafael Krux · CC0", minTier: "IVORY" },
  { slug: "brandenburg-3", en: "Brandenburg Concerto No. 3 (Bach)", ar: "كونشرتو براندنبورغ ٣ (باخ)", mood: "Baroque · festive", artist: "dogsounds · CC0", minTier: "ROYAL_SEAL" },
  { slug: "romantic-inspiration", en: "Romantic Inspiration", ar: "إلهام رومانسي", mood: "Orchestral · romantic", artist: "FreePD · CC0", minTier: "IVORY" },
  { slug: "lovely-piano", en: "Lovely Piano Song", ar: "لحن بيانو رقيق", mood: "Piano · tender", artist: "FreePD · CC0", minTier: "IVORY" },
  { slug: "royal-coupling", en: "Royal Coupling", ar: "زفاف ملكي", mood: "Orchestral · regal", artist: "Kevin MacLeod · CC0", minTier: "ROYAL_SEAL" },
  { slug: "waltz-for-naseem", en: "A Waltz for Naseem", ar: "فالس لنسيم", mood: "Waltz · elegant", artist: "dogsounds · CC0", minTier: "GILDED" },
  { slug: "nomadic-sunset", en: "Nomadic Sunset", ar: "غروب البادية", mood: "Oriental · warm", artist: "Alexander Nakarada · CC0", minTier: "GILDED" },
  { slug: "the-desert", en: "The Desert", ar: "الصحراء", mood: "Oriental · cinematic", artist: "Alexander Nakarada · CC0", minTier: "IVORY" },
  { slug: "night-in-venice", en: "Night in Venice", ar: "ليلة في البندقية", mood: "Mandolin · evening", artist: "Kevin MacLeod · CC0", minTier: "ROYAL_SEAL" },
  { slug: "hold-me-love-me", en: "Hold Me, Love Me", ar: "ضمّني وأحبّني", mood: "Piano · intimate", artist: "Bryan Teoh · CC0", minTier: "IVORY" },
  { slug: "magic-garden", en: "Magic in the Garden", ar: "سحر الحديقة", mood: "Orchestral · dreamy", artist: "Rafael Krux · CC0", minTier: "IVORY" },
  { slug: "celebration", en: "Celebration", ar: "احتفال", mood: "Orchestral · joyful", artist: "Alexander Nakarada · CC0", minTier: "GILDED" },
  { slug: "neptunian-princess", en: "Neptunian Princess", ar: "أميرة البحر", mood: "Harp · airy", artist: "Bryan Teoh · CC0", minTier: "IVORY" },
  { slug: "alls-fair-in-love", en: "All's Fair in Love", ar: "كل شيء مباح في الحب", mood: "Piano & strings · sweet", artist: "Bryan Teoh · CC0", minTier: "GILDED" },
  { slug: "landras-dream", en: "Landra's Dream", ar: "حلم لاندرا", mood: "Piano · nocturne", artist: "Jason Shaw · CC0", minTier: "GILDED" },
];

export const LIBRARY_PREFIX = "library:";
export const libraryUrl = (slug: string) => `/music/${slug}.m4a`;
