# Design system

**Live design canvas:** https://claude.ai/artifact/LPFdtbbtRwwrGJ4WtFxXBd (12 screens across 4 pages, some interactive)

## Direction: "Majlis Night"

Ivory paper, ink-dark control surfaces, champagne gold and wine velvet. The look borrows from real stationery (wax seals, deckled cards, embossing) rather than from generic SaaS. Arabic is first-class: every screen is designed for RTL, and the Arabic type is chosen for its own beauty, not as a fallback.

## Tokens

| Token | Value | Use |
|---|---|---|
| `ink` | `#16110F` | Admin chrome, primary buttons, headings |
| `ink-2` | `#201916` / `#2A201C` | Raised dark surfaces, active nav |
| `ivory` | `#F7F2EA` | App background |
| `paper` | `#FFFDF9` | Cards, inputs |
| `line` | `#E7DDCD` | Borders and dividers |
| `gold` | `#C9A45C` | Accents, focus rings, highlights (decorative and on dark backgrounds) |
| `gold-text` | `#8A6428` | Gold text on light backgrounds (4.8:1 on ivory) |
| `wine` | `#7A2235` | Emphasis, the Royal Seal tier |
| `muted` | `#6E6259` | Secondary text (5.3:1 on ivory) |
| `success` | `#2F6B4F` | Attending, toggles on |
| `warning` | `#9A6A12` | Quota warnings |
| `danger` | `#8C2F2F` | Declined, destructive |

All text pairs pass WCAG AA (4.5:1).

**Type**
- Display: **Cormorant Garamond** (Latin) and **Amiri** (Arabic)
- UI: **Manrope**. A Phase 1 option is IBM Plex Sans Arabic for Arabic UI text.
- Scale: 12 / 13 / 14 / 15 / 20 / 26 / 30 / 34 / 46 / 64 / 84

**Shape:** radius 10 (controls), 12–14 (buttons and inputs), 18–22 (cards), 28 (hero). Touch targets ≥ 44 px.

**Motion:** wax-seal pulse, floating envelope, gold sheen. Every effect respects `prefers-reduced-motion`.

## Screen map

| Page | Screens |
|---|---|
| Foundations | Design language and tiers · Sign in |
| Admin · Control Room | Overview · Client account and feature control (interactive) |
| Client · Atelier | Overview · Invitation editor (interactive) · RSVP form builder (interactive) · Guest list |
| Guest & Gate | 3D opening · Invitation page with locked footer · QR entry pass · Entrance scanner (interactive) |

Still to design in Phase 1/2: Admin plans editor, theme catalogue, music library, audit log, reports preview, Concierge read-only view, mobile layouts of the dashboards, and the Arabic (RTL) versions of each dashboard.
