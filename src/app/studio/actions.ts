"use server";
import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EntitlementError } from "@/lib/entitlements";
import { UserError, type ActionState } from "@/lib/errors";
import { parseCsv } from "@/lib/csv";
import { muscatLocalToDate } from "@/lib/format";
import { FIELD_STATES, NOTICE_KINDS, NOTICE_MODES, parseContent, parseRsvpConfig, type RsvpConfig } from "@/lib/event-content";
import { actorOf, assertWritable, requireStudio } from "@/server/auth/context";
import { getDb, schema } from "@/server/db";
import { oneTimePassword, randomKey } from "@/server/crypto";
import { hashPassword } from "@/server/auth/password";
import { audit } from "@/server/audit";
import { bool, num, run, str } from "@/server/action";
import { createEvent, saveContent, saveRsvpConfig, setStatus, tierOk } from "@/server/repo/events";
import { addGuests, deleteGuest, GuestInputSchema, markSent } from "@/server/repo/guests";
import { deleteAsset, saveUpload } from "@/server/storage";
import { writableEvent } from "@/server/studio";

const EVENT_TYPES = ["ENGAGEMENT", "WEDDING", "RECEPTION", "HENNA", "OTHER"] as const;
const bi = (fd: FormData, k: string) => ({ en: str(fd, `${k}.en`).trim().slice(0, 400), ar: str(fd, `${k}.ar`).trim().slice(0, 400) });
const back = (id: string, tab = "") => revalidatePath(`/studio/events/${id}${tab}`);

export async function createEventAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await run(async () => {
    const ctx = await requireStudio();
    assertWritable(ctx);
    const input = z.object({
      p1en: z.string().trim().min(1, "First name is required").max(40), p2en: z.string().trim().min(1, "Second name is required").max(40),
      p1ar: z.string().trim().max(40), p2ar: z.string().trim().max(40),
      type: z.enum(EVENT_TYPES), startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose the date and time"), themeSlug: z.string().min(2),
    }).parse(Object.fromEntries(fd));
    const typeLabel = { ENGAGEMENT: "Engagement", WEDDING: "Wedding", RECEPTION: "Reception", HENNA: "Henna night", OTHER: "Celebration" }[input.type];
    const ev = await createEvent(actorOf(ctx), ctx.account.id, ctx.ent, { ...input, title: `${input.p1en} & ${input.p2en} · ${typeLabel}`, startsAt: muscatLocalToDate(input.startsAt) });
    return { ok: "Created", data: { id: ev.id } };
  });
  if (res?.data?.id) redirect(`/studio/events/${res.data.id}/content`);
  return res;
}

export async function saveDesignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
    const content = parseContent(ev.content);
    const accent = str(fd, "accent");
    content.accent = !bool(fd, "accentDefault") && /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : null;
    await saveContent(actor, ev, ctx.ent, content, { themeSlug: str(fd, "themeSlug") || ev.themeSlug });
    back(ev.id, "/design");
    return { ok: "Design saved" };
  });
}

export async function saveContentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
    const content = parseContent(ev.content);
    content.partner1 = bi(fd, "partner1"); content.partner2 = bi(fd, "partner2");
    if (!content.partner1.en && !content.partner1.ar) throw new UserError("Please write the names");
    content.families = bi(fd, "families"); content.message = bi(fd, "message");
    content.verse = bool(fd, "verse");
    content.venue = { name: bi(fd, "venue.name"), address: bi(fd, "venue.address"), mapUrl: str(fd, "venue.mapUrl").trim() };
    if (content.venue.mapUrl && !/^https:\/\//.test(content.venue.mapUrl)) throw new UserError("The map link must start with https://");
    content.schedule = [];
    for (let i = 0; i < 6; i++) {
      const time = str(fd, `s${i}.time`).trim().slice(0, 20);
      const title = bi(fd, `s${i}.title`);
      if (time || title.en || title.ar) content.schedule.push({ time, title, detail: bi(fd, `s${i}.detail`) });
    }
    content.sections = {
      countdown: bool(fd, "sec.countdown"), schedule: bool(fd, "sec.schedule"), venue: bool(fd, "sec.venue"), notices: bool(fd, "sec.notices"), gallery: bool(fd, "sec.gallery"),
      letter: bool(fd, "sec.letter"), dress: bool(fd, "sec.dress"), faq: bool(fd, "sec.faq"), closing: bool(fd, "sec.closing"),
    };
    content.letter = { en: str(fd, "letter.en").trim().slice(0, 900), ar: str(fd, "letter.ar").trim().slice(0, 900) };
    const colors: typeof content.dressCode.colors = [];
    for (let i = 0; i < 6; i++) {
      const hex = str(fd, `dc${i}.hex`).trim();
      const name = bi(fd, `dc${i}.name`);
      if (bool(fd, `dc${i}.on`) && /^#[0-9a-fA-F]{6}$/.test(hex)) colors.push({ hex, name });
    }
    content.dressCode = { title: bi(fd, "dress.title"), note: bi(fd, "dress.note"), colors };
    content.faq = [];
    for (let i = 0; i < 6; i++) {
      const q = bi(fd, `q${i}.q`); const a = bi(fd, `q${i}.a`);
      if ((q.en || q.ar) && (a.en || a.ar)) content.faq.push({ q, a });
    }
    const locales = (["ar", "en"] as const).filter((l) => bool(fd, `loc.${l}`));
    content.locales = locales.length ? locales : ["ar"];
    content.defaultLocale = str(fd, "defaultLocale") === "en" ? "en" : "ar";
    const startsAt = str(fd, "startsAt");
    const type = z.enum(EVENT_TYPES).parse(str(fd, "type"));
    await saveContent(actor, ev, ctx.ent, content, {
      title: z.string().trim().min(2).max(100).parse(str(fd, "title")), type,
      ...(startsAt ? { startsAt: muscatLocalToDate(startsAt) } : {}),
    });
    back(ev.id, "/content");
    return { ok: "Invitation details saved" };
  });
}

export async function saveRsvpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
    const cfg = parseRsvpConfig(ev.rsvpConfig);
    const state = (k: string) => z.enum(FIELD_STATES).catch("off").parse(str(fd, k));
    cfg.fields = { name: state("f.name"), phone: state("f.phone"), companions: state("f.companions"), note: state("f.note") };
    cfg.openLinkMaxCompanions = Math.max(0, Math.min(20, num(fd, "openLinkMaxCompanions", 2)));
    cfg.deadline = /^\d{4}-\d{2}-\d{2}$/.test(str(fd, "deadline")) ? str(fd, "deadline") : null;
    cfg.allowChange = bool(fd, "allowChange");
    const notices: RsvpConfig["notices"] = [];
    for (let i = 0; i < 6; i++) {
      const kind = z.enum(NOTICE_KINDS).safeParse(str(fd, `n${i}.kind`));
      const text = bi(fd, `n${i}.text`);
      if (!kind.success || (!text.en && !text.ar)) continue;
      notices.push({ id: str(fd, `n${i}.id`).replace(/[^a-z0-9-]/gi, "").slice(0, 40) || `n-${randomKey(6)}`, kind: kind.data, text, mode: z.enum(NOTICE_MODES).catch("off").parse(str(fd, `n${i}.mode`)) });
    }
    cfg.notices = notices;
    const questions: RsvpConfig["questions"] = [];
    for (let i = 0; i < 10; i++) {
      const label = bi(fd, `q${i}.label`);
      if (!label.en && !label.ar) continue;
      questions.push({ id: str(fd, `q${i}.id`).replace(/[^a-z0-9-]/gi, "").slice(0, 40) || `q-${randomKey(6)}`, label, required: bool(fd, `q${i}.required`) });
    }
    if (questions.length > ctx.ent.rsvp.customQuestions) throw new EntitlementError("rsvp.customQuestions", `Your plan includes ${ctx.ent.rsvp.customQuestions} custom question(s).`);
    cfg.questions = questions;
    await saveRsvpConfig(actor, ev, ctx.ent, cfg, bool(fd, "openLink"));
    back(ev.id, "/rsvp");
    return { ok: "Reply form saved" };
  });
}

export async function selectMusicAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
    if (!ctx.ent.music.enabled) throw new EntitlementError("music.enabled", "Music is not part of your plan.");
    const trackId = str(fd, "trackId");
    const content = parseContent(ev.content);
    const db = await getDb();
    if (trackId && trackId !== "none") {
      const own = trackId.startsWith("asset:");
      if (own) {
        const asset = await db.query.mediaAssets.findFirst({ where: and(eq(schema.mediaAssets.id, trackId.slice(6)), eq(schema.mediaAssets.accountId, ctx.account.id), eq(schema.mediaAssets.kind, "AUDIO")) });
        if (!asset) throw new UserError("Unknown track");
      } else {
        const t = await db.query.musicTracks.findFirst({ where: and(eq(schema.musicTracks.id, trackId), eq(schema.musicTracks.active, true)) });
        if (!t || !tierOk(ctx.ent, t.minTier)) throw new UserError("This track is not available on your plan");
      }
      const tried = await db.query.musicTrials.findFirst({ where: and(eq(schema.musicTrials.accountId, ctx.account.id), eq(schema.musicTrials.trackId, trackId)) });
      if (!tried) {
        const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(schema.musicTrials).where(eq(schema.musicTrials.accountId, ctx.account.id));
        if (n >= ctx.ent.music.trialLimit) throw new EntitlementError("music.trialLimit", `You have tried ${n} of ${ctx.ent.music.trialLimit} tracks. Choose one you tried before, or ask Nawat for more.`);
        await db.insert(schema.musicTrials).values({ accountId: ctx.account.id, trackId });
      }
      content.music.trackId = trackId;
    } else content.music.trackId = null;
    await saveContent(actor, ev, ctx.ent, content, {});
    back(ev.id, "/music");
    return { ok: content.music.trackId ? "Music set" : "Music turned off" };
  });
}

export async function uploadOwnMusicAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
    if (!ctx.ent.music.enabled || !ctx.ent.music.allowUpload) throw new EntitlementError("music.allowUpload", "Uploading music is not part of your plan.");
    const asset = await saveUpload(fd.get("file") as File, "AUDIO", ctx.account.id, ctx.ent.media.storageMb);
    await audit(actor, "media.upload_audio", "event", ev.id, { asset: asset.id });
    back(ev.id, "/music");
    return { ok: "Uploaded. Select it below to use it." };
  });
}

export async function uploadPhotoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
    const content = parseContent(ev.content);
    if (content.gallery.length >= ctx.ent.media.photos) throw new EntitlementError("media.photos", `Your plan includes ${ctx.ent.media.photos} gallery photo(s).`);
    const asset = await saveUpload(fd.get("file") as File, "IMAGE", ctx.account.id, ctx.ent.media.storageMb);
    content.gallery.push(asset.id);
    content.sections.gallery = true;
    await saveContent(actor, ev, ctx.ent, content, {});
    back(ev.id, "/photos");
    return { ok: "Photo added" };
  });
}

export async function uploadClosingPhotoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
    if (ctx.ent.media.photos === 0) throw new EntitlementError("media.photos", "Your plan does not include photos.");
    const content = parseContent(ev.content);
    const asset = await saveUpload(fd.get("file") as File, "IMAGE", ctx.account.id, ctx.ent.media.storageMb);
    const old = content.closingPhoto;
    content.closingPhoto = asset.id;
    content.sections.closing = true;
    await saveContent(actor, ev, ctx.ent, content, {});
    if (old) await deleteAsset(old, ctx.account.id);
    back(ev.id, "/photos");
    return { ok: "Closing photo saved" };
  });
}

export async function removeClosingPhotoAction(fd: FormData) {
  const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
  const content = parseContent(ev.content);
  const old = content.closingPhoto;
  if (!old) return;
  content.closingPhoto = null;
  await saveContent(actor, ev, ctx.ent, content, {});
  await deleteAsset(old, ctx.account.id);
  back(ev.id, "/photos");
}

export async function removePhotoAction(fd: FormData) {
  const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
  const id = z.string().uuid().parse(str(fd, "assetId"));
  const content = parseContent(ev.content);
  content.gallery = content.gallery.filter((g) => g !== id);
  await saveContent(actor, ev, ctx.ent, content, {});
  await deleteAsset(id, ctx.account.id);
  back(ev.id, "/photos");
}

export async function setEventStatusAction(fd: FormData) {
  const { ev, actor } = await writableEvent(str(fd, "eventId"));
  const status = z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).parse(str(fd, "status"));
  await setStatus(actor, ev, status);
  back(ev.id);
}

export async function addGuestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
    const g = GuestInputSchema.parse({ name: str(fd, "name"), phone: str(fd, "phone"), side: str(fd, "side") || "OTHER", group: str(fd, "group"), allowedCompanions: str(fd, "allowedCompanions") || 0 });
    await addGuests(actor, ev, ctx.ent, [g]);
    back(ev.id, "/guests");
    return { ok: `${g.name} added` };
  });
}

const SIDES: Record<string, "BRIDE" | "GROOM" | "BOTH" | "OTHER"> = { bride: "BRIDE", groom: "GROOM", both: "BOTH", "العروس": "BRIDE", "العريس": "GROOM" };

export async function importGuestsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
    let text = str(fd, "csv");
    const file = fd.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > 1024 * 1024) throw new UserError("The file is too large (max 1 MB)");
      text = await file.text();
    }
    const rows = parseCsv(text);
    if (rows.length && /name|الاسم/i.test(rows[0]![0] ?? "")) rows.shift();
    if (!rows.length) throw new UserError("No guests found. Use one guest per line: name, phone, side, companions, group");
    if (rows.length > 2000) throw new UserError("Import up to 2,000 guests at a time");
    const guests = rows.map((r, i) => {
      const p = GuestInputSchema.safeParse({ name: r[0] ?? "", phone: r[1] ?? "", side: SIDES[(r[2] ?? "").toLowerCase()] ?? "OTHER", allowedCompanions: r[3] || 0, group: r[4] ?? "" });
      if (!p.success) throw new UserError(`Line ${i + 1}: ${p.error.issues[0]?.message}`);
      return p.data;
    });
    const n = await addGuests(actor, ev, ctx.ent, guests);
    back(ev.id, "/guests");
    return { ok: `${n} guests imported` };
  });
}

export async function deleteGuestAction(fd: FormData) {
  const { ev, actor } = await writableEvent(str(fd, "eventId"));
  await deleteGuest(actor, ev, z.string().uuid().parse(str(fd, "guestId")));
  back(ev.id, "/guests");
}

export async function markSentAction(eventId: string, guestId: string) {
  const { ev } = await writableEvent(eventId);
  await markSent(ev, z.string().uuid().parse(guestId));
  back(ev.id, "/guests");
}

export async function createGatekeeperAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
    if (!ctx.ent.checkin.qrPass) throw new EntitlementError("checkin.qrPass", "QR entry is not part of your plan.");
    const db = await getDb();
    const evIds = (await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.accountId, ctx.account.id))).map((e) => e.id);
    const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(schema.eventGatekeepers).where(inArray(schema.eventGatekeepers.eventId, evIds));
    if (n >= ctx.ent.checkin.gatekeepers) throw new EntitlementError("checkin.gatekeepers", `Your plan includes ${ctx.ent.checkin.gatekeepers} gatekeeper login(s).`);
    const label = z.string().trim().min(2, "Name is required").max(60).parse(str(fd, "name"));
    const username = `gate-${ev.slug.split("-")[0]}-${randomKey(4).toLowerCase()}`;
    const password = oneTimePassword();
    const [u] = await db.insert(schema.users).values({
      username, displayName: label, role: "GATEKEEPER", accountId: ctx.account.id, passwordHash: await hashPassword(password),
      mustChangePassword: false, expiresAt: new Date(ev.startsAt.getTime() + 36 * 3600_000),
    }).returning();
    await db.insert(schema.eventGatekeepers).values({ eventId: ev.id, userId: u!.id });
    await audit(actor, "gatekeeper.create", "event", ev.id, { username });
    back(ev.id, "/entrance");
    return { ok: "Gatekeeper login created", data: { username, password } };
  });
}

export async function removeGatekeeperAction(fd: FormData) {
  const { ctx, ev, actor } = await writableEvent(str(fd, "eventId"));
  const userId = z.string().uuid().parse(str(fd, "userId"));
  const db = await getDb();
  await db.delete(schema.users).where(and(eq(schema.users.id, userId), eq(schema.users.role, "GATEKEEPER"), eq(schema.users.accountId, ctx.account.id)));
  await audit(actor, "gatekeeper.delete", "event", ev.id, { userId });
  back(ev.id, "/entrance");
}
