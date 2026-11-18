/** Platform defaults. Admins can change these in Control Room → Settings. */
export const BRAND_DEFAULTS = {
  productName: { en: "Nawat Invites", ar: "نوات للدعوات" },
  footer: {
    website: "https://nawat.om/",
    instagram: "https://www.instagram.com/nawattech/",
    // NOTE: Omani numbers have 8 digits after +968; this one has 9. Confirm before launch.
    phone: "+968 923344233",
  },
  tierNames: {
    IVORY: { en: "Ivory", ar: "العاجي" },
    GILDED: { en: "Gilded", ar: "المذهّب" },
    ROYAL_SEAL: { en: "Royal Seal", ar: "الختم الملكي" },
  },
  packageNames: {
    ATELIER: { en: "Atelier", ar: "الأتيليه" },
    CONCIERGE: { en: "Concierge", ar: "الكونسيرج" },
  },
} as const;

export type BrandSettings = {
  footer: { website: string; instagram: string; phone: string };
  tierNames: Record<"IVORY" | "GILDED" | "ROYAL_SEAL", { en: string; ar: string }>;
};
