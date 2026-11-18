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
