import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

// ─── Enums ───────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["SUPER_ADMIN", "STAFF", "CLIENT", "GATEKEEPER"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED"]);
export const tierEnum = pgEnum("tier", ["IVORY", "GILDED", "ROYAL_SEAL"]);
export const packageEnum = pgEnum("package_type", ["ATELIER", "CONCIERGE"]);
export const accountStatusEnum = pgEnum("account_status", ["ACTIVE", "SUSPENDED"]);
export const eventTypeEnum = pgEnum("event_type", ["ENGAGEMENT", "WEDDING", "RECEPTION", "HENNA", "OTHER"]);
export const eventStatusEnum = pgEnum("event_status", ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]);
export const mediaKindEnum = pgEnum("media_kind", ["IMAGE", "AUDIO"]);
export const guestSideEnum = pgEnum("guest_side", ["BRIDE", "GROOM", "BOTH", "OTHER"]);
export const rsvpStatusEnum = pgEnum("rsvp_status", ["ATTENDING", "DECLINED"]);

// ─── Identity ────────────────────────────────────────────
export const users = pgTable("users", {
  id: id(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull(),
  status: userStatusEnum("status").notNull().default("ACTIVE"),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  totpSecretEnc: text("totp_secret_enc"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  totpLastCounter: integer("totp_last_counter"),
  recoveryCodeHashes: jsonb("recovery_code_hashes").$type<string[]>().notNull().default([]),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  accountId: text("account_id").references(() => clientAccounts.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }), // gatekeeper logins expire
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("users_username_uq").on(sql`lower(${t.username})`), index("users_account_idx").on(t.accountId)]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256(token)
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  mfaPassed: boolean("mfa_passed").notNull().default(false),
  actingAsAccountId: text("acting_as_account_id").references(() => clientAccounts.id, { onDelete: "set null" }),
  actingUntil: timestamp("acting_until", { withTimezone: true }),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

// ─── Commercial ──────────────────────────────────────────
export const plans = pgTable("plans", {
  id: id(),
  code: text("code").notNull().unique(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  tier: tierEnum("tier").notNull(),
  package: packageEnum("package").notNull(),
  entitlements: jsonb("entitlements").notNull(),
  priceOmr: text("price_omr"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const clientAccounts = pgTable("client_accounts", {
  id: id(),
  displayName: text("display_name").notNull(),
  contactName: text("contact_name"),
  contactPhoneEnc: text("contact_phone_enc"),
  status: accountStatusEnum("status").notNull().default("ACTIVE"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  planId: text("plan_id").notNull().references(() => plans.id),
  entitlementOverrides: jsonb("entitlement_overrides").notNull().default({}),
  internalNotes: text("internal_notes"),
  createdById: text("created_by_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ─── Themes & media ──────────────────────────────────────
export const themes = pgTable("themes", {
  slug: text("slug").primaryKey(), // matches src/themes/catalog.ts
  tier: tierEnum("tier").notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  art: jsonb("art").$type<Record<string, string>>().notNull().default({}), // slot → media asset id
  updatedAt: updatedAt(),
});

export const mediaAssets = pgTable("media_assets", {
  id: id(),
  accountId: text("account_id").references(() => clientAccounts.id, { onDelete: "cascade" }), // null = platform library
  kind: mediaKindEnum("kind").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  mime: text("mime").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  originalName: text("original_name"),
  createdAt: createdAt(),
}, (t) => [index("media_account_idx").on(t.accountId)]);

export const musicTracks = pgTable("music_tracks", {
  id: id(),
  titleEn: text("title_en").notNull(),
  titleAr: text("title_ar").notNull(),
  mood: text("mood"),
  minTier: tierEnum("min_tier").notNull().default("GILDED"),
  licence: text("licence").notNull(),
  assetId: text("asset_id").references(() => mediaAssets.id, { onDelete: "cascade" }), // null = built-in synthesised melody
  builtin: text("builtin"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const musicTrials = pgTable("music_trials", {
  accountId: text("account_id").notNull().references(() => clientAccounts.id, { onDelete: "cascade" }),
  trackId: text("track_id").notNull(), // library track id or "asset:<id>" for own upload
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.accountId, t.trackId] })]);

// ─── Invitation ──────────────────────────────────────────
export const events = pgTable("events", {
  id: id(),
  accountId: text("account_id").notNull().references(() => clientAccounts.id, { onDelete: "cascade" }),
  themeSlug: text("theme_slug").notNull(),
  type: eventTypeEnum("type").notNull().default("WEDDING"),
  status: eventStatusEnum("status").notNull().default("DRAFT"),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  timezone: text("timezone").notNull().default("Asia/Muscat"),
  content: jsonb("content").notNull(),
  rsvpConfig: jsonb("rsvp_config").notNull(),
  openLinkEnabled: boolean("open_link_enabled").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  privateAfter: timestamp("private_after", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("events_account_idx").on(t.accountId)]);

export const guests = pgTable("guests", {
  id: id(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  phoneEnc: text("phone_enc"),
  side: guestSideEnum("side").notNull().default("OTHER"),
  group: text("group_name"),
  allowedCompanions: integer("allowed_companions").notNull().default(0),
  keyHash: text("key_hash").notNull().unique(),
  keyEnc: text("key_enc").notNull(),
  linkSentAt: timestamp("link_sent_at", { withTimezone: true }),
  firstOpenedAt: timestamp("first_opened_at", { withTimezone: true }),
  openCount: integer("open_count").notNull().default(0),
  createdAt: createdAt(),
}, (t) => [index("guests_event_idx").on(t.eventId)]);

export const rsvps = pgTable("rsvps", {
  id: id(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  guestId: text("guest_id").references(() => guests.id, { onDelete: "set null" }),
  status: rsvpStatusEnum("status").notNull(),
  name: text("name"),
  phoneEnc: text("phone_enc"),
  companions: integer("companions").notNull().default(0),
  note: text("note"),
  answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
  acknowledged: jsonb("acknowledged").$type<string[]>().notNull().default([]),
  locale: text("locale"),
  ipHash: text("ip_hash"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAt(),
}, (t) => [uniqueIndex("rsvps_guest_uq").on(t.guestId), index("rsvps_event_idx").on(t.eventId, t.status)]);

export const passes = pgTable("passes", {
  id: id(),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  rsvpId: text("rsvp_id").notNull().unique().references(() => rsvps.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  keyEnc: text("key_enc").notNull(),
  admitCount: integer("admit_count").notNull(),
  admittedTotal: integer("admitted_total").notNull().default(0),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("passes_event_idx").on(t.eventId)]);

export const checkIns = pgTable("check_ins", {
  id: id(),
  passId: text("pass_id").notNull().references(() => passes.id, { onDelete: "cascade" }),
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  admitted: integer("admitted").notNull(),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("checkins_event_idx").on(t.eventId, t.scannedAt)]);

export const eventGatekeepers = pgTable("event_gatekeepers", {
  eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.eventId, t.userId] })]);

// ─── Ops ─────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: id(),
  actorId: text("actor_id"),
  actorName: text("actor_name"),
  actingAsAccountId: text("acting_as_account_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  ipHash: text("ip_hash"),
  createdAt: createdAt(),
}, (t) => [index("audit_created_idx").on(t.createdAt), index("audit_entity_idx").on(t.entity, t.entityId)]);

export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});
