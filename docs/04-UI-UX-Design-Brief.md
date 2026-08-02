# 4. UI/UX Design Brief

> Project: James & Sharon — Wedding Website · Tokens live in `app/globals.css` `@theme` and `lib/constants.ts` `COLORS`.

## Design Principles
- **Mood:** cinematic, romantic, warm — like a wedding film, not a generic card.
- **Feel:** soft florals, gentle motion, champagne-gold accents, blush + sage + cream palette.
- **3 adjectives:** romantic · elegant · cinematic.

## Color Palette (exact tokens)
| Token | Hex | Usage |
|---|---|---|
| `cream` | `#FDF6EC` | Page background |
| `deep-rose` | `#B56576` | Primary text / headings |
| `blush` | `#F4C2C2` | Accents, soft fills |
| `sage` | `#87A878` | Secondary accent (greenery) |
| `champagne` | `#F5E6C8` | Card / surface tints |
| `gold` | `#D4AF37` | Premium accents, wax-seal details |

Body: `background cream`, `color deep-rose`, font body.

## Typography (exact tokens)
| Role | Token | Font |
|---|---|---|
| Headings | `--font-heading` | Playfair Display (serif) |
| Script/display | `--font-script` | Cormorant (serif, elegant) |
| Body | `--font-body` | Inter (sans-serif) |

- Headings use serif for romance; body stays clean/readable (Inter).
- Decorative script used for names and invitation flourishes.

## Spacing & Layout
- **Scale:** Tailwind v4 default scale (4/8/12/16/24/32/48/64).
- **Layout:** full-bleed hero sections, centered single-column content, generous vertical rhythm between phases.
- **Breakpoints:** Tailwind default (`sm`/`md`/`lg`); mobile-first.

## Components & Elements
- **Buttons:** champagne/rose-toned, rounded, hover elevation; primary CTA "OPEN YOUR INVITATION".
- **Forms:** `FirstVisitForm` — name, email, mobile (Indian validation), city with autocomplete dropdown; inline errors.
- **Signature components:** opening rings + aurora blobs + Three.js/PlayCanvas scene; envelope + wax-seal reveal; countdown hero with KB slideshow zoom; GSAP album-book flip; floral float/sway accents; split-text and blur reveals; scroll-line indicator; music-bar animation.
- **3D/WebGL:** `components/webgl` (opening scene, petals); `components/sections` for photo slideshow + gallery.
- **Icons/imagery:** Google Drive photos, YouTube embeds, soft florals.

## Responsive & Accessibility
- **Mobile-first:** hero and gallery optimized for phones (guests reach it via link/WhatsApp).
- **Reduced motion:** reveal/float animations should respect `prefers-reduced-motion` where feasible.
- **Contrast:** deep-rose on cream is the baseline; champagne/gold used decoratively, not for body text.
- **Focus states:** buttons/links need visible focus rings (keyboard + touch).

## Questions to Ask (answered)
1. Reference? → wedding-film aesthetic; no external template.
2. Brand colors/fonts? → palette + fonts defined above; maintained in `@theme`.
3. Animation importance? → high (it's the "wow"), but must stay smooth on mobile.
4. Audience? → wedding guests (both families, all ages) — elegant + legible.
5. Dark/light? → light (cream) only.
