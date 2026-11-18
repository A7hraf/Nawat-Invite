import type { Bi, FieldState, NoticeMode } from "@/lib/event-content";
import type { ThemeArt, ThemeDef } from "@/themes/catalog";
import type { MusicSource } from "./music";

/** Everything the guest page needs. Contains no data about other guests. */
export type InvitationData = {
  mode: "live" | "preview" | "sample";
  slug: string;
  guestKey: string | null;
  theme: ThemeDef;
  accent: string;
  content: {
    partner1: Bi; partner2: Bi; families: Bi; message: Bi; verse: boolean;
    venue: { name: Bi; address: Bi; mapUrl: string };
    schedule: { time: string; title: Bi; detail: Bi }[];
    sections: { countdown: boolean; schedule: boolean; venue: boolean; notices: boolean; gallery: boolean; letter: boolean; dress: boolean; faq: boolean; closing: boolean };
    locales: ("ar" | "en")[]; defaultLocale: "ar" | "en";
    letter: Bi;
    dressCode: { title: Bi; note: Bi; colors: { name: Bi; hex: string }[] };
    faq: { q: Bi; a: Bi }[];
  };
  /** Theme artwork URLs (admin-uploaded); empty slots fall back to code-drawn art. */
  art: ThemeArt;
  closingPhoto: string | null;
  startsAt: string;
  rsvp: {
    enabled: boolean; closed: boolean; deadline: string | null; allowChange: boolean; qrPass: boolean;
    fields: { name: FieldState; phone: FieldState; companions: FieldState; note: FieldState };
    maxCompanions: number;
    notices: { id: string; kind: string; text: Bi; mode: NoticeMode }[];
    questions: { id: string; label: Bi; required: boolean }[];
  };
  guest: { name: string; allowedCompanions: number } | null;
  reply: { status: "ATTENDING" | "DECLINED"; name: string | null; companions: number; pass: { key: string | null; admitCount: number } | null } | null;
  gallery: string[];
  music: MusicSource;
  footer: { website: string; instagram: string; phone: string };
  appUrl: string;
  calendar: { google: string; outlook: string; ics: string };
};
