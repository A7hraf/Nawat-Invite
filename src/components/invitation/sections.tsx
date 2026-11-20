"use client";
import { useEffect, useRef, useState } from "react";
import type { Bi } from "@/lib/event-content";
import { pick } from "@/lib/event-content";
import type { Locale, Strings } from "./i18n";
import { digits } from "./i18n";
import { HoldRing, WaxSeal } from "./WaxSeal";
import { useHold } from "./useHold";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────────── Letter: a paper card resting over the theme's own painting ───────────── */

export function CurtainLetter({ text, guest, signature, texture, t, lang }: { text: string; guest: string | null; signature: string; texture: string | null; t: Strings; lang: Locale }) {
  return (
    <section className="inv-letter-sec" aria-label={t.letterKicker}>
      {texture && <div className="bg" style={{ backgroundImage: `url(${texture})` }} aria-hidden="true" />}
      <article className="letter reveal">
        <div className="inv-kicker">{t.letterKicker}</div>
        {guest && <div className="dear">{t.dear} {guest},</div>}
        <p>{text}</p>
        <div className="sig" lang={lang}>{signature}</div>
      </article>
    </section>
  );
}

/* ───────────── Save the date, hidden under a wax seal ───────────── */

export function SealDate({ weekday, day, month, year, time, monogram, accent, script, t, children }: {
  weekday: string; day: string; month: string; year: string; time: string; monogram: string; accent: string; script: string; t: Strings; children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const hold = useHold(900, () => setOpen(true));
  useEffect(() => { if (reduced()) setOpen(true); }, []);
  return (
    <div className={`inv-sealdate${open ? " open" : ""}`}>
      <div className="sd-card">
        <div className="inv-date">
          <div className="dside">{weekday}</div>
          <div className="inv-disc"><b>{day}</b><span>{month}</span></div>
          <div className="dside">{year}</div>
        </div>
        <div className="inv-time">{time}</div>
        {!open && (
          <button type="button" className="sd-seal" aria-label={t.revealDate} {...hold.handlers}>
            <HoldRing progress={hold.progress} size={150} />
            <span className="sl"><WaxSeal monogram={monogram} color={accent} script={script} size={118} half="left" /></span>
            <span className="sr"><WaxSeal monogram={monogram} color={accent} script={script} size={118} half="right" /></span>
          </button>
        )}
        {open && <div className="shards" aria-hidden="true"><span className="sl"><WaxSeal monogram={monogram} color={accent} script={script} size={118} half="left" /></span><span className="sr"><WaxSeal monogram={monogram} color={accent} script={script} size={118} half="right" /></span></div>}
      </div>
      <div className="sd-hint" aria-hidden={open}>{open ? "" : hold.holding ? t.keepHolding : t.holdDate}</div>
      <div className="sd-after">{children}</div>
    </div>
  );
}

/* ───────────── The venue, lit by the guest's finger ───────────── */

export function LightRoom({ image, fallback, t, children }: { image: string | null; fallback: React.ReactNode; t: Strings; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const travelled = useRef(0);
  const lastPt = useRef<{ x: number; y: number } | null>(null);
  const [lit, setLit] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (reduced()) setLit(true); }, []);
  const move = (e: React.PointerEvent) => {
    if (lit) return;
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.setProperty("--x", `${x}px`); el.style.setProperty("--y", `${y}px`);
    if (!touched) setTouched(true);
    if (lastPt.current) travelled.current += Math.hypot(x - lastPt.current.x, y - lastPt.current.y);
    lastPt.current = { x, y };
    el.style.setProperty("--r", `${Math.min(70 + travelled.current * 0.12, 260)}px`);
    if (travelled.current > Math.max(900, r.width * 2.6)) setLit(true);
  };
  return (
    <div ref={ref} className={`inv-room${lit ? " lit" : ""}${touched ? " touched" : ""}`} onPointerMove={move} onPointerDown={move} onClick={() => setLit(true)}>
      {image
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={image} alt="" loading="lazy" />
        : fallback}
      <div className="shade" aria-hidden="true" />
      <div className="rm-label">{children}</div>
      <div className="rm-hint" aria-hidden="true">{lit ? "" : t.lightRoom}</div>
    </div>
  );
}

/** Code-drawn hall of arches and lanterns, used when the theme has no venue artwork. */
export function HallArt({ accent }: { accent: string }) {
  const arches = [0, 1, 2, 3, 4];
  return (
    <svg className="hall" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hall-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: "var(--night2)" }} /><stop offset="1" style={{ stopColor: "var(--night)" }} /></linearGradient>
        <radialGradient id="hall-glow" cx=".5" cy=".35" r=".6"><stop offset="0" style={{ stopColor: accent, stopOpacity: 0.55 }} /><stop offset="1" style={{ stopColor: accent, stopOpacity: 0 }} /></radialGradient>
        <linearGradient id="hall-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: `color-mix(in srgb, ${accent} 30%, var(--night))` }} /><stop offset="1" style={{ stopColor: "var(--night2)" }} /></linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#hall-wall)" />
      <rect width="400" height="300" fill="url(#hall-glow)" />
      {arches.map((i) => {
        const x = 20 + i * 76, w = 56;
        return (
          <g key={i}>
            <path d={`M${x} 230V110a${w / 2} ${w / 2} 0 0 1 ${w} 0v120Z`} style={{ fill: `color-mix(in srgb, ${accent} 18%, var(--night2))` }} />
            <path d={`M${x} 230V110a${w / 2} ${w / 2} 0 0 1 ${w} 0v120`} fill="none" stroke={accent} strokeOpacity=".7" strokeWidth="1.2" />
            <path d={`M${x + 6} 230V112a${w / 2 - 6} ${w / 2 - 6} 0 0 1 ${w - 12} 0v118`} fill="none" stroke={accent} strokeOpacity=".3" strokeWidth=".8" />
            <line x1={x + w / 2} y1="40" x2={x + w / 2} y2="96" stroke={accent} strokeOpacity=".6" strokeWidth=".6" />
            <path d={`M${x + w / 2 - 6} 96h12l-2 16h-8Z`} fill={accent} opacity=".9" />
            <circle cx={x + w / 2} cy="104" r="16" fill={accent} opacity=".16" />
          </g>
        );
      })}
      <rect y="230" width="400" height="70" fill="url(#hall-floor)" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <line key={i} x1={200} y1={230} x2={-200 + i * 115} y2={300} stroke={accent} strokeOpacity=".12" strokeWidth=".8" />)}
      <ellipse cx="200" cy="262" rx="120" ry="14" fill={accent} opacity=".12" />
    </svg>
  );
}

/* ───────────── Notices as a deck of cards the guest swipes through ───────────── */

export function SwipeNotices({ items, t, lang }: { items: { id: string; icon: React.ReactNode; text: string }[]; t: Strings; lang: Locale }) {
  const [i, setI] = useState(0);
  const [drag, setDrag] = useState<{ x: number; start: number; id: number } | null>(null);
  const [fly, setFly] = useState<number>(0);
  const next = (dir = 1) => { setFly(dir); setTimeout(() => { setFly(0); setI((v) => v + 1); }, 320); };
  const done = i >= items.length;
  return (
    <div className="inv-deck">
      <div className="dk-stack" aria-live="polite">
        {items.map((n, k) => {
          if (k < i) return null;
          const depth = k - i;
          if (depth > 2) return null;
          const top = depth === 0;
          const dx = top ? (fly ? fly * 520 : drag?.x ?? 0) : 0;
          return (
            <div key={n.id} className={`dk-card${top ? " top" : ""}`} aria-hidden={!top}
              style={{ zIndex: 10 - depth, transform: `translate(${dx}px, ${depth * 12}px) rotate(${top ? dx / 18 : (depth % 2 ? 2.5 : -2)}deg) scale(${1 - depth * 0.05})`, transition: drag && top ? "none" : undefined, opacity: top && fly ? 0 : 1 }}
              onPointerDown={top ? (e) => { (e.currentTarget as Element).setPointerCapture(e.pointerId); setDrag({ x: 0, start: e.clientX, id: e.pointerId }); } : undefined}
              onPointerMove={top ? (e) => { if (drag && e.pointerId === drag.id) setDrag({ ...drag, x: e.clientX - drag.start }); } : undefined}
              onPointerUp={top ? () => { if (drag && Math.abs(drag.x) > 80) next(Math.sign(drag.x)); setDrag(null); } : undefined}
              onPointerCancel={top ? () => setDrag(null) : undefined}>
              <div className="ic">{n.icon}</div>
              <p>{n.text}</p>
              <div className="n">{digits(k + 1, lang)} / {digits(items.length, lang)}</div>
            </div>
          );
        })}
        {done && <div className="dk-card end"><p>{t.noticesDone}</p></div>}
      </div>
      <div className="ctl">
        {done
          ? <button type="button" className="inv-btn line" onClick={() => setI(0)}>{t.readAgain}</button>
          : <><span className="dk-hint" aria-hidden="true">{t.swipe}</span><button type="button" className="inv-btn line" onClick={() => next(lang === "ar" ? -1 : 1)}>{t.next}</button></>}
      </div>
    </div>
  );
}

/* ───────────── Dress code ───────────── */

export function DressCode({ title, note, colors, her, him, t, lang }: { title: string; note: string; colors: { name: Bi; hex: string }[]; her: string | null; him: string | null; t: Strings; lang: Locale }) {
  return (
    <div className="inv-dress">
      <div className="inv-kicker reveal">{t.dressCode}</div>
      {title && <h2 className="title reveal">{title}</h2>}
      {note && <p className="note reveal">{note}</p>}
      {(her || him) && (
        <div className="figs reveal">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {her && <figure><img src={her} alt="" loading="lazy" /><figcaption>{t.her}</figcaption></figure>}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {him && <figure><img src={him} alt="" loading="lazy" /><figcaption>{t.him}</figcaption></figure>}
        </div>
      )}
      {colors.length > 0 && (
        <div className="swatches reveal">
          {colors.map((c, k) => <div key={k} className="swatch"><i style={{ background: c.hex }} /><span>{pick(c.name, lang)}</span></div>)}
        </div>
      )}
    </div>
  );
}

/* ───────────── Questions ───────────── */

export function Faq({ items, t, lang }: { items: { q: Bi; a: Bi }[]; t: Strings; lang: Locale }) {
  return (
    <div className="inv-faq">
      <div className="inv-kicker reveal">{t.faq}</div>
      <div className="list">
        {items.map((f, k) => (
          <details key={k} className="reveal">
            <summary><span>{pick(f.q, lang)}</span><i aria-hidden="true" /></summary>
            <p>{pick(f.a, lang)}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Closing ───────────── */

export function Closing({ image, names, monogram, accent, script, t }: { image: string | null; names: string; monogram: string; accent: string; script: string; t: Strings }) {
  return (
    <div className="inv-closing">
      <div className="arch reveal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image ? <img src={image} alt="" loading="lazy" /> : <div className="cl-mono"><WaxSeal monogram={monogram} color={accent} script={script} size={150} /></div>}
      </div>
      <div className="love reveal">{t.withLove}</div>
      <div className="cl-nm reveal">{names}</div>
      <p className="reveal">{t.closingLine}</p>
    </div>
  );
}

/* ───────────── Floating reply button ───────────── */

export function StickyReply({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = document.getElementById("rsvp")?.getBoundingClientRect();
      const rsvpInView = !!r && r.top < window.innerHeight && r.bottom > 0;
      setShow(window.scrollY > window.innerHeight * 0.9 && !rsvpInView);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return <a href="#rsvp" className={`inv-sticky${show ? " on" : ""}`} tabIndex={show ? 0 : -1} aria-hidden={!show}>{label}</a>;
}
