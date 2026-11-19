"use client";
import "./invitation.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pick } from "@/lib/event-content";
import type { InvitationData } from "./types";
import { digits, STRINGS, type Locale } from "./i18n";
import { InvitationMusic } from "./music";
import { Opening } from "./Opening";
import { PhotoOpening } from "./PhotoOpening";
import { StoryCard, StoryOpening, VideoOpening } from "./Storybook";
import { Closing, CurtainLetter, DressCode, Faq, HallArt, LightRoom, SealDate, StickyReply, SwipeNotices } from "./sections";
import { Ornament } from "./Ornament";
import { Rsvp } from "./Rsvp";

const TZ = "Asia/Muscat";

function Countdown({ to, lang, labels }: { to: number; lang: Locale; labels: [string, string, string, string] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const ms = Math.max(0, to - now);
  const parts = [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1e3) % 60];
  return <div className="inv-count reveal" role="timer">{parts.map((v, i) => <div key={i}><b>{digits(String(v).padStart(2, "0"), lang)}</b><small>{labels[i]}</small></div>)}</div>;
}

const NoticeIcon = ({ kind }: { kind: string }) =>
  kind === "photography"
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13.5" r="3.5" /><path d="M3 3l18 18" /></svg>
    : kind === "dress"
      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M9 3h6l-1 5 5 13H5l5-13Z" /></svg>
      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>;

export function Invitation({ data: d }: { data: InvitationData }) {
  const initialLang: Locale = d.content.locales.includes(d.content.defaultLocale) ? d.content.defaultLocale : d.content.locales[0]!;
  const [lang, setLang] = useState<Locale>(initialLang);
  const [stage, setStage] = useState<"closed" | "open">("closed");
  const [flash, setFlash] = useState(false);
  const [musicOn, setMusicOn] = useState(false);
  const [replay, setReplay] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => { setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  const music = useRef<InvitationMusic | null>(null);
  const t = STRINGS[lang];
  const bilingual = d.content.locales.length > 1;
  const c = d.content;

  useEffect(() => {
    try { const s = localStorage.getItem("nawat-lang"); if ((s === "ar" || s === "en") && d.content.locales.includes(s)) setLang(s); } catch { /* ignore */ }
    return () => music.current?.dispose();
  }, [d.content.locales]);

  const vars = useMemo(() => {
    const p = d.theme.palette;
    return { "--night": p.night, "--night2": p.night2, "--glow": p.glow, "--paper": p.paper, "--paper2": p.paper2, "--ink": p.ink, "--muted": p.muted, "--cream": p.cream, "--mutedDark": p.mutedDark, "--accent": d.accent, "--accentText": p.accentText, "--onAccent": p.onAccent, "--display": `"${d.theme.fonts.display}"`, "--arabic": `"${d.theme.fonts.arabic}"`, "--script": `"${d.theme.fonts.script}"`,
      // All-caps display faces stay on the names; running text uses a readable serif.
      "--msg": ["Cinzel", "Cinzel Decorative", "Poiret One"].includes(d.theme.fonts.display) ? `"Cormorant Garamond"` : `"${d.theme.fonts.display}"` } as React.CSSProperties;
  }, [d.theme, d.accent]);

  const start = new Date(d.startsAt);
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(lang === "ar" ? "ar-OM" : "en-GB", { timeZone: TZ, ...o }).format(start);
  const namesEn = `${pick(c.partner1, "en")} & ${pick(c.partner2, "en")}`;
  const namesAr = c.partner1.ar && c.partner2.ar ? `${c.partner1.ar} و${c.partner2.ar}` : "";
  const mono = `${(c.partner1.en || c.partner1.ar).charAt(0)}&${(c.partner2.en || c.partner2.ar).charAt(0)}`.toUpperCase();
  const dateText = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(start).replace(/\//g, " · ");
  const guestName = d.guest ? { en: d.guest.name, ar: "" } : null;

  const onBegin = useCallback(() => {
    if (d.music && !music.current) music.current = new InvitationMusic(d.music);
    if (music.current) { music.current.start(); setMusicOn(true); }
  }, [d.music]);
  const onStoryDone = useCallback(() => { setStage("open"); window.scrollTo(0, 0); }, []);
  // The opening film cross-fades into the card instead of cutting.
  const [fading, setFading] = useState(false);
  const onFilmDone = useCallback(() => { setFading(true); setStage("open"); window.scrollTo(0, 0); setTimeout(() => setFading(false), 1000); }, []);
  const onDone = useCallback(() => {
    setFlash(true);
    setTimeout(() => { setStage("open"); window.scrollTo(0, 0); setTimeout(() => setFlash(false), 120); }, 650);
  }, []);

  // Reveal sections as they scroll into view.
  useEffect(() => {
    if (stage !== "open") return;
    const els = document.querySelectorAll(".inv .reveal");
    if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("shown")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("shown"); io.unobserve(en.target); } }), { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [stage, lang]);

  const toggleLang = () => { const n: Locale = lang === "ar" ? "en" : "ar"; setLang(n); try { localStorage.setItem("nawat-lang", n); } catch { /* ignore */ } };
  const toggleMusic = () => {
    if (!d.music) return;
    if (!music.current) { music.current = new InvitationMusic(d.music); music.current.start(); setMusicOn(true); return; }
    setMusicOn(music.current.toggle());
  };
  const notices = d.rsvp.notices.filter((n) => n.mode !== "off");
  // Storybook: embossed envelope → relief card → painted colour bloom (every theme with a painted scene).
  const story = !d.art.cover && !!d.art.reveal;
  const relief = d.art.relief ?? d.art.reveal;
  const particles = d.theme.particles !== "none" && <div className={`fx fx-${d.theme.particles}`} aria-hidden="true">{Array.from({ length: d.theme.particles === "stars" ? 28 : 16 }, (_, i) => <i key={i} style={{ left: `${(i * 37 + 11) % 100}%`, top: d.theme.particles === "stars" ? `${(i * 53) % 70}%` : undefined, animationDelay: `${(i * 0.73) % 7}s`, animationDuration: `${8 + (i % 5) * 1.5}s` }} />)}</div>;

  return (
    <div className={`inv${d.mode !== "live" ? " has-banner" : ""}`} dir={lang === "ar" ? "rtl" : "ltr"} lang={lang} style={vars}>
      <div className="inv-bar">
        {bilingual ? <button className="inv-chip" type="button" onClick={toggleLang} aria-label="Language"><span className={lang === "ar" ? "" : "arl"}>{t.lang}</span></button> : <span />}
        {d.music && (
          <button className="inv-chip" type="button" onClick={toggleMusic} aria-pressed={musicOn} aria-label={musicOn ? t.musicOn : t.musicOff}>
            {musicOn
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z" /><path d="m16 9 5 6M21 9l-5 6" /></svg>}
          </button>
        )}
      </div>

      <div className={`inv-stage${stage === "open" ? " gone" : ""}`} role="dialog" aria-modal={stage !== "open"} aria-label="Invitation opening" style={stage === "open" && !fading ? { visibility: "hidden" } : undefined}>
        {story && d.art.video && !reducedMotion
          ? <VideoOpening src={d.art.video} poster={d.art.video.endsWith("/opening.mp4") ? d.art.video.replace(/opening\.mp4$/, "opening-start.webp") : relief!}
              t={t} whoText={d.guest?.name ?? t.ourGuests} onBegin={onBegin} onDone={onFilmDone} />
          : story
          ? <StoryOpening envelope="/themes/_shared/envelope.webp" envelopeTint={d.theme.envelope} liner={`color-mix(in srgb, ${d.theme.envelope} 45%, ${d.theme.palette.night})`}
              relief={relief!} faux={!d.art.relief} tone={d.theme.tone} accent={d.accent} script={d.theme.fonts.script} monogram={mono} t={t} whoText={d.guest?.name ?? t.ourGuests}
              replayToken={replay} reducedMotion={reducedMotion} onBegin={onBegin} onDone={onStoryDone} />
          : d.art.cover
          ? <PhotoOpening interaction={d.theme.interaction} cover={d.art.cover ?? null} reveal={d.art.reveal ?? null} texture={d.art.texture ?? null} accent={d.accent} script={d.theme.fonts.script} monogram={mono}
              t={t} whoText={d.guest?.name ?? t.ourGuests} replayToken={replay} reducedMotion={reducedMotion} onBegin={onBegin} onDone={onDone} />
          : <Opening theme={d.theme} accent={d.accent} monogram={mono} names={{ en: namesEn, ar: namesAr }} guestName={guestName} dateText={dateText}
              t={t} whoText={d.guest?.name ?? t.ourGuests} replayToken={replay} onBegin={onBegin} onDone={onDone} />}
      </div>
      <div className={`inv-flash${flash ? " on" : ""}`} />

      {stage === "open" && (
        <main className="inv-col">
          {story ? (
            <StoryCard relief={relief!} painted={d.art.reveal!} tone={d.theme.tone} bism={c.verse} kicker={t.together}
              n1={pick(c.partner1, lang)} n2={pick(c.partner2, lang)} amp={lang === "ar" ? "و" : "&"}
              alt={bilingual ? (lang === "ar" ? namesEn : namesAr || null) : null}
              message={pick(c.message, lang)} families={pick(c.families, lang)} lang={lang} scrollLabel={t.scroll} fx={particles}
              details={[
                { icon: "date", label: fmt({ weekday: "long" }), value: fmt({ day: "numeric", month: "long", year: "numeric" }) },
                { icon: "time", label: t.timeLabel, value: fmt({ hour: "numeric", minute: "2-digit" }) },
                ...(pick(c.venue.name, lang) ? [{ icon: "place" as const, label: t.venue, value: pick(c.venue.name, lang), href: c.venue.mapUrl || undefined }] : []),
              ]} />
          ) : (
          <section className={`dark inv-hero h-${d.theme.hero}${d.art.reveal ? " art" : ""}`}>
            {d.art.reveal && <div className="bg" style={{ backgroundImage: `url(${d.art.reveal})` }} aria-hidden="true" />}
            {particles}
            <div className="hero-in">
              {c.verse && <div className="inv-bism reveal" lang="ar">بسم الله الرحمن الرحيم</div>}
              <div className="inv-kicker reveal">{t.together}</div>
              <h1 className="inv-names reveal">
                <span className="n1">{pick(c.partner1, lang)}</span><span className="amp">{lang === "ar" ? "و" : "&"}</span><span className="n2">{pick(c.partner2, lang)}</span>
              </h1>
              {bilingual && (lang === "en" ? namesAr : true) && <div className="inv-alt reveal" lang={lang === "ar" ? "en" : "ar"} style={{ fontFamily: lang === "ar" ? "var(--display-font)" : "var(--ar-font)" }}>{lang === "ar" ? namesEn : namesAr}</div>}
              <Ornament kind={d.theme.ornament} />
              <p className="inv-msg reveal">{pick(c.message, lang)}</p>
              {pick(c.families, lang) && <div className="inv-fam reveal">{pick(c.families, lang)}</div>}
            </div>
            <div className="inv-cue" aria-hidden="true"><span>{t.scroll}</span><i /></div>
          </section>
          )}

          {c.sections.letter && pick(c.letter, lang) && (
            <CurtainLetter text={pick(c.letter, lang)} guest={d.guest?.name ?? null} signature={lang === "ar" && namesAr ? namesAr : namesEn} texture={d.art.texture ?? null} t={t} lang={lang} />
          )}

          <section className="light grain">
            <div className="inv-kicker reveal">{t.saveDate}</div>
            <SealDate weekday={fmt({ weekday: "long" })} day={fmt({ day: "numeric" })} month={fmt({ month: "short" }).toUpperCase()} year={fmt({ year: "numeric" })}
              time={fmt({ hour: "numeric", minute: "2-digit" })} monogram={mono} accent={d.accent} script={d.theme.fonts.script} t={t}>
              {c.sections.countdown && <Countdown to={start.getTime()} lang={lang} labels={[t.days, t.hours, t.mins, t.secs]} />}
              <div className="inv-cal reveal">
                <a className="inv-btn line" href={d.calendar.google} target="_blank" rel="noopener noreferrer">{t.gcal}</a>
                <a className="inv-btn line" href={d.calendar.outlook} target="_blank" rel="noopener noreferrer">{t.ocal}</a>
                <a className="inv-btn line" href={d.calendar.ics}>{t.ical}</a>
              </div>
            </SealDate>
          </section>

          {c.sections.schedule && c.schedule.length > 0 && (
            <section className="light2 grain">
              <div className="inv-kicker reveal">{t.evening}</div>
              <div className="inv-sched reveal">
                {c.schedule.map((s, i) => <div key={i} className="row"><div className="t">{digits(s.time, lang)}</div><div className="w"><b>{pick(s.title, lang)}</b><span>{pick(s.detail, lang)}</span></div></div>)}
              </div>
            </section>
          )}

          {c.sections.venue && (pick(c.venue.name, lang) || c.venue.mapUrl) && (
            <section className="dark inv-venue-sec">
              <div className="inv-kicker reveal">{t.venue}</div>
              <LightRoom image={d.art.venue ?? null} fallback={<HallArt accent={d.accent} />} t={t}>
                <div className="inv-venue">{pick(c.venue.name, lang)}</div>
                <div className="addr">{pick(c.venue.address, lang)}</div>
              </LightRoom>
              {c.venue.mapUrl && <a className="inv-btn gold block reveal" href={c.venue.mapUrl} target="_blank" rel="noopener noreferrer">{t.directions}</a>}
            </section>
          )}

          {c.sections.dress && (pick(c.dressCode.title, lang) || c.dressCode.colors.length > 0 || d.art.dressHer || d.art.dressHim) && (
            <section className="light grain">
              <DressCode title={pick(c.dressCode.title, lang)} note={pick(c.dressCode.note, lang)} colors={c.dressCode.colors} her={d.art.dressHer ?? null} him={d.art.dressHim ?? null} t={t} lang={lang} />
            </section>
          )}

          {c.sections.notices && notices.length > 0 && (
            <section className="light2 grain">
              <div className="inv-kicker reveal">{t.kindly}</div>
              <SwipeNotices items={notices.map((n) => ({ id: n.id, icon: <NoticeIcon kind={n.kind} />, text: pick(n.text, lang) }))} t={t} lang={lang} />
            </section>
          )}

          {c.sections.faq && c.faq.length > 0 && (
            <section className="light grain"><Faq items={c.faq} t={t} lang={lang} /></section>
          )}

          {c.sections.gallery && d.gallery.length > 0 && (
            <section className="dark">
              <div className="inv-kicker reveal">{t.gallery}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <div className="inv-gallery">{d.gallery.map((src) => <img key={src} className="reveal" src={src} alt="" loading="lazy" />)}</div>
            </section>
          )}

          {d.rsvp.enabled && (
            <section className="dark inv-rsvp" id="rsvp">
              <Rsvp d={d} t={t} lang={lang} dateLabel={fmt({ weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} />
            </section>
          )}

          {c.sections.closing && (
            <section className="dark">
              <Closing image={d.closingPhoto ?? d.art.closing ?? null} names={lang === "ar" && namesAr ? namesAr : namesEn} monogram={mono} accent={d.accent} script={d.theme.fonts.script} t={t} />
            </section>
          )}
          {d.rsvp.enabled && <StickyReply label={t.kindlyReply} />}

          <footer className="inv-foot">
            <div className="by">{t.crafted}</div>
            <div className="mark"><b>NAWAT</b><i>Invites</i></div>
            <div className="inv-soc">
              <a href={d.footer.website} target="_blank" rel="noopener noreferrer" aria-label="Nawat website"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg></a>
              <a href={d.footer.instagram} target="_blank" rel="noopener noreferrer" aria-label="Nawat on Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".9" fill="currentColor" /></svg></a>
              <a href={`tel:${d.footer.phone.replace(/[^\d+]/g, "")}`} aria-label="Call Nawat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></svg></a>
            </div>
            <div className="txt">
              <a href={d.footer.website} target="_blank" rel="noopener noreferrer">{d.footer.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a> · <a href={d.footer.instagram} target="_blank" rel="noopener noreferrer">@{d.footer.instagram.replace(/\/$/, "").split("/").pop()}</a> · <span dir="ltr">{d.footer.phone}</span>
            </div>
            <button className="inv-replay" type="button" onClick={() => { setStage("closed"); setReplay((r) => r + 1); }}>{t.replay}</button>
          </footer>
        </main>
      )}
      {d.mode !== "live" && <div className="inv-banner">{d.mode === "sample" ? "Theme preview · sample content" : "Preview · only you can see this"}</div>}
    </div>
  );
}
