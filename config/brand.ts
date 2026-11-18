/**
 * Platform brand constants: the single source of truth.
 * The invitation footer is rendered from here and cannot be removed by clients.
 */
export const BRAND = {
  productName: { en: "Nawat Invites", ar: "نوات للدعوات" },
  footer: {
    website: "https://nawat.om/",
    instagram: "https://www.instagram.com/nawattech/",
    // TODO: confirm. Omani numbers have 8 digits after +968; this one has 9.
    phone: "+968923344233",
    phoneDisplay: "+968 923344233",
  },
  tiers: {
    IVORY: { en: "Ivory", ar: "العاجي" },
    GILDED: { en: "Gilded", ar: "المذهّب" },
    ROYAL_SEAL: { en: "Royal Seal", ar: "الختم الملكي" },
  },
  packages: {
    ATELIER: { en: "Atelier", ar: "الأتيليه" },
    CONCIERGE: { en: "Concierge", ar: "الكونسيرج" },
  },
} as const;
