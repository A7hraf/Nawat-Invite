# Themes

The collection has **20 themes**, defined in [`src/themes/catalog.ts`](../src/themes/catalog.ts). Each one ships with licensed photography (`public/themes/<slug>/`, see [CREDITS](../public/themes/CREDITS.md)), self-hosted OFL fonts (`public/fonts`) and its own CC0 / public-domain soundtrack (`public/music`, see [CREDITS](../public/music/CREDITS.md)). Themes differ in opening gesture, hero composition (classic, editorial, arch, frame), floating particles (gold dust, petals, stars, bubbles), palette, Latin + script + Arabic type and music.

| Theme | Tier | Opening | Hero | Type (display / script) | Music |
|---|---|---|---|---|---|
| Mocha & Champagne | Ivory | Hold the wax seal | Classic | Cormorant Garamond / Pinyon Script | Celebrated Minuet |
| Vellum Garden | Ivory | Hold the seal (veil) | Editorial | Fraunces / Italianno | Magic in the Garden |
| Muscat Sea | Ivory | Hold the seal (veil) | Frame | Italiana / Great Vibes | Neptunian Princess |
| Blush Letter | Ivory | Hold the seal (veil) | Arch | Gilda Display / Parisienne | Lovely Piano Song |
| Garden Veil | Ivory | Part the chiffon | Classic | Bellefair / Allura | Hold Me, Love Me |
| Henna Night | Ivory | Hold the seal (veil) | Arch | Prata / Alex Brush | The Desert |
| Bab Al Noor | Gilded | Open the studded doors | Frame | Cinzel / Pinyon Script | Nomadic Sunset |
| Dana Pearl | Gilded | Untie the ribbon | Classic | Bodoni Moda / Great Vibes | Canon in D |
| Layali | Gilded | Part the navy velvet | Editorial | Marcellus / Pinyon Script | Landra's Dream |
| Desert Rose | Gilded | Open the gatefold (veil) | Editorial | Libre Caslon Display / Italianno | The Desert |
| Andalus | Gilded | Open the zellige arch | Arch | Della Respira / Monsieur La Doulaise | A Waltz for Naseem |
| Riad Jasmine | Gilded | Open the gatefold (veil) | Frame | DM Serif Display / Rouge Script | Romantic Inspiration |
| Fanous | Gilded | Hold the seal (veil) | Classic | Forum / Mea Culpa | Nomadic Sunset |
| Marble Peony | Gilded | Untie the ribbon | Editorial | Cormorant Garamond / WindSong | All's Fair in Love |
| Majlis Velvet | Royal Seal | Hold the seal on red velvet | Classic | Gloock / Pinyon Script | Royal Coupling |
| Emerald Deco | Royal Seal | Hold the seal on the green envelope | Frame | Poiret One / Italianno | Brandenburg No. 3 |
| Noir Monogram | Royal Seal | Part the black silk | Editorial | Playfair Display / Luxurious Script | Air on the G String |
| Isfahan | Royal Seal | Open the gatefold (veil) | Arch | Cinzel Decorative / Corinthia | Goldberg Aria |
| Rouge Noir | Royal Seal | Untie the ribbon | Editorial | Tenor Sans / Imperial Script | Night in Venice |
| Blanc Royale | Royal Seal | Part the ivory velvet | Frame | Italiana / Monsieur La Doulaise | Celebration |

“Veil” means the theme has no separate cover photo: the guest sees the scene behind frosted glass, and it clears as they open it. Without WebGL or photos, the earlier 3D openings remain as a fallback.

Rebuild the bundled assets with `node scripts/build-theme-art.mjs` (needs the source photos in `.data/theme-art-raw`) and `FONTSOURCE_DIR=… node scripts/build-fonts.mjs`.

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
