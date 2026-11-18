import { z } from "zod";

/** A text in both languages. Empty strings are allowed; the renderer falls back to the other language. */
export const Bi = z.object({ en: z.string().max(400).default(""), ar: z.string().max(400).default("") });
export type Bi = z.infer<typeof Bi>;
const bi = (en = "", ar = "") => ({ en, ar });

export const FIELD_STATES = ["off", "optional", "required"] as const;
export type FieldState = (typeof FIELD_STATES)[number];
export const NOTICE_MODES = ["off", "show", "must"] as const;
export type NoticeMode = (typeof NOTICE_MODES)[number];
export const NOTICE_KINDS = ["children", "photography", "dress", "ladies", "custom"] as const;

export const EventContentSchema = z.object({
  partner1: Bi,
  partner2: Bi,
  families: Bi,
  message: Bi,
  verse: z.boolean().default(true),
  venue: z.object({ name: Bi, address: Bi, mapUrl: z.union([z.literal(""), z.url().max(500)]).default("") }),
  schedule: z.array(z.object({ time: z.string().max(20), title: Bi, detail: Bi })).max(8).default([]),
  sections: z.object({
    countdown: z.boolean().default(true),
    schedule: z.boolean().default(true),
    venue: z.boolean().default(true),
    notices: z.boolean().default(true),
    gallery: z.boolean().default(false),
  }),
  locales: z.array(z.enum(["ar", "en"])).min(1).default(["ar", "en"]),
  defaultLocale: z.enum(["ar", "en"]).default("ar"),
  gallery: z.array(z.string().uuid()).max(60).default([]),
  music: z.object({ trackId: z.string().max(80).nullable().default(null) }).default({ trackId: null }),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null),
});
export type EventContent = z.infer<typeof EventContentSchema>;

export const RsvpConfigSchema = z.object({
  fields: z.object({
    name: z.enum(FIELD_STATES).default("required"),
    phone: z.enum(FIELD_STATES).default("optional"),
    companions: z.enum(FIELD_STATES).default("optional"),
    note: z.enum(FIELD_STATES).default("off"),
  }),
  openLinkMaxCompanions: z.number().int().min(0).max(20).default(2),
  deadline: z.string().max(40).nullable().default(null), // ISO date
  allowChange: z.boolean().default(true),
  notices: z.array(z.object({ id: z.string().max(40), kind: z.enum(NOTICE_KINDS), text: Bi, mode: z.enum(NOTICE_MODES) })).max(8).default([]),
  questions: z.array(z.object({ id: z.string().max(40), label: Bi, required: z.boolean() })).max(10).default([]),
});
export type RsvpConfig = z.infer<typeof RsvpConfigSchema>;

export function defaultContent(names: { p1en: string; p2en: string; p1ar?: string; p2ar?: string }): EventContent {
  return {
    partner1: bi(names.p1en, names.p1ar ?? ""),
    partner2: bi(names.p2en, names.p2ar ?? ""),
    families: bi("", ""),
    message: bi("request the honour of your presence as they begin their life together", "يتشرفان بدعوتكم لمشاركتهما فرحة زفافهما وبداية حياتهما الجديدة"),
    verse: true,
    venue: { name: bi("", ""), address: bi("Muscat, Sultanate of Oman", "مسقط، سلطنة عُمان"), mapUrl: "" },
    schedule: [
      { time: "20:00", title: bi("Arrival of guests", "استقبال الضيوف"), detail: bi("Omani coffee, dates and bukhoor", "القهوة العمانية والتمر والبخور") },
      { time: "21:30", title: bi("The zaffa", "الزفّة"), detail: bi("The bride’s entrance", "دخول العروس") },
      { time: "22:30", title: bi("Dinner", "العشاء"), detail: bi("Served in the main hall", "في القاعة الرئيسية") },
    ],
    sections: { countdown: true, schedule: true, venue: true, notices: true, gallery: false },
    locales: ["ar", "en"],
    defaultLocale: "ar",
    gallery: [],
    music: { trackId: null },
    accent: null,
  };
}

export function defaultRsvpConfig(): RsvpConfig {
  return {
    fields: { name: "required", phone: "optional", companions: "optional", note: "off" },
    openLinkMaxCompanions: 2,
    deadline: null,
    allowChange: true,
    notices: [
      { id: "children", kind: "children", text: bi("An adults-only celebration", "نعتذر عن اصطحاب الأطفال"), mode: "off" },
      { id: "photography", kind: "photography", text: bi("No photography in the ladies’ hall", "يُمنع التصوير في قاعة النساء"), mode: "off" },
      { id: "dress", kind: "dress", text: bi("Evening wear", "لباس السهرة"), mode: "off" },
    ],
    questions: [],
  };
}

/** Parse stored JSON safely; never trust the database blindly. */
export const parseContent = (raw: unknown) => EventContentSchema.parse(raw);
export const parseRsvpConfig = (raw: unknown) => RsvpConfigSchema.parse(raw);

export const pick = (b: Bi, locale: "ar" | "en") => (locale === "ar" ? b.ar || b.en : b.en || b.ar);
