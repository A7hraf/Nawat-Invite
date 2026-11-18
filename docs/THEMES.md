# Themes

The launch collection has **10 original themes**, defined in [`src/themes/catalog.ts`](../src/themes/catalog.ts). Each theme sets a palette (dark and light surfaces, an accent metal, contrast-checked text colours), a pair of display fonts (Latin + Arabic), an ornament, and one of four real-time 3D openings.

| Theme | Tier | Opening | Direction |
|---|---|---|---|
| Mocha & Champagne · موكا وشمبانيا | Ivory | Envelope | 2026 forecast palette: mocha, champagne, warm ivory |
| Vellum Garden · حديقة الرق | Ivory | Envelope | Sage green, vellum, botanical |
| Muscat Sea · بحر مسقط | Ivory | Envelope | Omani coast: deep blue, white plaster, silver waves |
| Bab Al Noor · باب النور | Gilded | Palace doors | Carved Omani doors opening onto golden light |
| Dana Pearl · دانة | Gilded | Jewel box | Gulf pearling heritage, blush and silver, iridescent pearl |
| Layali · ليالي | Gilded | Velvet curtain | Midnight navy velvet with gold stars |
| Desert Rose · وردة الصحراء | Gilded | Palace doors | Terracotta, sand and sunset rose |
| Majlis Velvet · مخمل المجلس | Royal Seal | Envelope | Signature look: wax seal, embossed ivory, wine lining |
| Emerald Deco · زمرد آرت ديكو | Royal Seal | Jewel box | Emerald lacquer, Art Deco gold |
| Noir Monogram · مونوغرام نوار | Royal Seal | Velvet curtain | Black velvet, silver, editorial type |

Research directions (2026): editorial typography, tactile and embossed papers, vellum overlays, the mocha / champagne / ivory palette, navy and gold, jewel tones, and Gulf palace-arch styling with full Arabic RTL support.

## Theme engine v2: artwork and tactile moments

Every theme now has a **script font** (for the ampersand, signatures and closing line) and a **photo interaction**. The page sections below work for every theme, with or without artwork.

| Moment | What the guest does | Uses artwork | Without artwork |
|---|---|---|---|
| Opening | Press and hold the wax seal / untie the ribbon / open the gatefold / part the curtain | `cover`, `reveal`, `texture` (curtain) | The 3D opening above |
| Hero | Names in editorial type over a slow-moving scene | `reveal` | Glow and drifting gold sparks |
| The letter | Scroll, and a velvet curtain parts to reveal a personal letter | `texture` | Velvet drawn in code |
| Save the date | Press and hold a wax seal; it breaks and the date appears | none | (seal is always drawn) |
| The venue | Move a finger to light a dark hall like a torch | `venue` | Code-drawn hall of arches and lanterns |
| Dress code | Palette swatches and outfit inspiration | `dressHer`, `dressHim` | Swatches only |
| Kindly note | Swipe through notice cards | none | |
| Questions | Accordion | none | |
| Closing | Arched photo, "With love," and the couple's names | the couple's photo or `closing` | Wax-seal monogram |

The guest gets a floating **Kindly reply** button once they scroll past the hero. Every gesture has a keyboard and screen-reader path (Enter completes a hold), and `prefers-reduced-motion` turns animation off.

### Artwork slots (Control Room → Themes → Artwork)

| Slot | Format | Brief for the designer |
|---|---|---|
| `cover` | Portrait 9:16, 1440×2560 | The closed invitation photographed from above: sealed envelope, velvet box, carved doors or a curtain. Keep the centre clear for the seal or bow. |
| `reveal` | Portrait 9:16 | What lies behind it: a hall with chandeliers, a garden, a palace courtyard. Darker at the top and bottom so the names stay readable. |
| `texture` | Square, seamless | Velvet, silk, linen or marble. It tiles horizontally across the curtains. |
| `venue` | Landscape 4:3 | A hall or table setting in warm light. It starts dark and the guest lights it. |
| `closing` | Portrait 4:5 | The last image when the couple has not uploaded a photo. |
| `dressHer`, `dressHim` | Portrait 3:4 | Outfit inspiration in the theme's palette. |

Uploads are re-encoded to WebP at up to 2400 px, with metadata removed. The artwork is shared by every invitation using that theme. Clients can upload their own closing photo in Studio → Photos.

## Adding a theme

1. Add an entry to `THEMES` in `src/themes/catalog.ts`. Pick an `opening` (`envelope`, `doors`, `curtain`, `box`) and colours for its `scene`.
2. Run `npm run db:seed` (it registers new slugs; existing settings are kept).
3. Preview it at `/preview/<slug>`, then set its tier and visibility in Control Room → Themes.

New opening styles live in `src/components/invitation/openings/` and share the stage, lighting, dust and timing helpers in `common.ts`.

## Performance and accessibility

- The 3D code loads only after the page appears. Rendering stops once the card is revealed.
- When WebGL is not available, a tappable seal is shown instead.
- `prefers-reduced-motion` shortens the animation and removes idle motion.
- Music starts only from the guest's tap (browser rule), and there is always a mute button.
