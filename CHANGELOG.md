# Changelog

All notable changes to the wedding website are documented here.

Entries are grouped by deployment target. **Staging** = deployed to the `staging` branch (Vercel preview).
**Production** = merged to `main` and pushed to `origin/main` (Vercel production).

---

## [Unreleased → Staging] — 2026-07-09

> 8 commits ahead of production (`dfc3326`…`57d2028`). Deployed to staging. Pending prod sign-off.

### Added
- **Realistic corner-fold page-turn lightbox** (`c939dc4`, `c8a1f46`)
  - GSAP Observer replaces manual touch/mouse handlers: velocity-aware drag, `lockAxis`, flick-to-complete (>420 px/s threshold)
  - GSAP tweens replace RAF animation loop: `power3.inOut` easing
  - Diagonal fold line: starts as a triangle from the bottom-right corner (or bottom-left for ←) and sweeps diagonally across the image
  - Corner peel triangle: parchment-coloured triangle lifts visually from the corner as drag begins, fades into the main 3D fold leaf
  - Corner hint triangles shown at rest as a subtle peel affordance
  - Parchment paper back face visible during mid-flip (>90°)
  - Prev/Next arrow buttons, keyboard (← →), Escape to close, photo counter

- **Lightbox page-turn (prior vertical-fold version)** (`57d2028`, `93191dd`)
  - Superseded by the corner-fold implementation above

- **Adaptive countdown text colours** (`6e106a2`)
  - Client-side canvas luminance analysis (ITU-R BT.709) of each slideshow backdrop
  - Text colour switches between deep-rose (light backdrops) and white (dark backdrops) with a 1.5 s CSS transition
  - Threshold: luminance > 0.45 = light backdrop

- **Countdown slideshow album priority** (`dfc3326`)
  - CountdownHero now fetches `view=albums&device=…` so photos display in `main → sub1 → sub2 → …` order
  - Shared `lib/album-priority.ts` used by both gallery and slideshow

### Fixed
- **Text readability on countdown** (`50bf7b8`, `cf52dba`)
  - 4-direction 1 px text-shadow outline + glow halo on all text elements (eyebrow, names, date pill, countdown digits/labels, scroll hint)
  - Small text bumped: eyebrow `13 px`, date pill `15 px`, countdown labels `12–13 px`
  - James & Sharon `&` given `0.18 em` side margins to stop it crowding the names

- **Slideshow image brightness** (`b1e85de`)
  - SlideLayer images dimmed to `brightness(0.75)` so text always has contrast over the photo

- **Nav invisible over hero photo** (`64b7684`)
  - Nav text is now white with a drop-shadow when the page is at the top (transparent nav state)
  - Switches to deep-rose on scroll (solid cream background state)
  - Hamburger bars follow the same white/deep-rose logic

- **Letterbox fill on portrait photos** (`2089d8f`, `64b7684`)
  - Blurred background raised to `brightness(0.55)` (was 0.35)
  - Side vignettes fade left/right 18 % edges to dark, hiding the visible letterbox fill without per-image colour matching

---

## [Production] — 2026-07-08  `2d12db9`

### Added
- **Spotlight mosaic gallery** for engagement photos
  - Priority-sorted flat photo list: `main → sub1 → sub2 → … → unknown`
  - Featured tile (2×2) for the first photo; remaining in a uniform grid
  - Hover: dimmed siblings, slight scale on active tile
  - Click opens lightbox
  - Load More pagination (32 photos/page)
  - Gallery uses the general `ENGAGEMENT_FOLDER_ID` (no device param); device-specific folders are CountdownHero-only

- **Shared album priority** (`lib/album-priority.ts`)
  - `albumPriority(name)` returns sort order: `main=0, sub1=1, sub2=2, …, sub=1, unknown=50`
  - Used by `/api/drive-photos` (route sorting) and `Gallery.tsx` (client sort)

- **Wedding album cards + masonry detail view**
  - Album grid with cover photo, hover reveal, photo count
  - Click album → masonry photo grid with back-navigation
  - Masonry column count responsive (2 mobile, 3 desktop)

---

## [Production] — 2026-07-07  `fb25d47`…`eadce04`

### Added
- **Supabase backend** replacing localStorage guest storage
  - `POST /api/register` — creates guest + device fingerprint rows
  - `GET /api/session` — restores session from fingerprint on revisit
  - `/api/drive-photos` gated with session token; returns `403` to unauthenticated requests
  - Admin dashboard: guest list, access logs, breach flags, owner toggle

- **Rate-limit & breach detection** (`lib/breach.ts`)
  - Flags IPs that hit the photo API without a valid session
  - Form-submit rate check; access logging to Supabase

- **Session restore flow**
  - Background `/api/session` call on load; restores guest without re-showing the invitation form
  - "Replay invitation" button appears in CountdownHero after a silent restore

- **Pre-Supabase visitor migration** (`1583da8`)
  - Visitors who registered before Supabase launched are auto-registered on next visit

---

## [Production] — 2026-07-05  `ffbffdd`…`9f58d49`

### Added
- **Device-specific Drive folders for CountdownHero**
  - `?device=landscape` → landscape folder; `?device=portrait` → portrait folder
  - Gallery still uses the shared engagement folder

- **Unrecognised subfolder fallback** (`659f439`)
  - Drive subfolders with names other than `main`/`sub[N]` treated as `sub` priority (value 1)

---

## [Production] — earlier

### Added
- Next.js App Router project scaffold (webpack, not Turbopack)
- Google Drive photo API (`/api/drive-photos`, `/api/drive-image` same-origin proxy)
- CinematicSlideshow: dual-slot cross-fade with `onPhotoChange` callback and `lightBackdrop` prop
- CountdownHero: live wedding countdown with cinematic photo backdrop
- Nav with scroll-aware styling
- Venue, Our Story, Families, Comments sections
- Reveal animation wrapper
- Vitest test suite (145 tests)
- Vercel deployment: `main` → production, `staging` → preview
