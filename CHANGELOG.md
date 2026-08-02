# Changelog

All notable changes to the wedding website are documented here.

Entries are grouped by deployment target. **Staging** = deployed to the `staging` branch (Vercel preview).
**Production** = merged to `main` and pushed to `origin/main` (Vercel production).

---

## [Unreleased → PR #11] — branch `claude/repo-review-i6ucus`

> 4 commits ahead of `main` (`79253e5`…`79a1eec`). Open as draft PR. Pending merge.

### Added
- **Full-screen mobile nav overlay** (`79253e5`)
  - Hamburger tap opens a full-screen overlay instead of a dropdown
  - Gold rule separators, staggered link entrance animations, backdrop blur
  - Auto-closes on link click or Escape key

- **RSVP embedded in InvitationCard** (`d9d3f80`, `010f7bc`)
  - Three-option response: "Wouldn't miss it!", "I'll try my best", "Sadly can't make it"
  - +1 companion toggle (visible when attending or maybe) with companion name field
  - Dietary notes textarea
  - `POST /api/rsvp` → upserts to `rsvps` table (one row per guest, `onConflict: guest_id`)
  - `GET /api/rsvp` → restores existing response on card open
  - Confirmation summary with "Change response" link; no hard redirect
  - Requires new DB table — run migration before prod deploy (see below)

- **Wedding-day Live Ticker with emoji reactions** (`79a1eec`)
  - Admin posts live updates (message + icon) via `/api/admin/ticker`
  - Guests see the feed in `WeddingDayBanner` only (phase-gated)
  - Polls `/api/ticker` every 12 s; new entries slide in with gold highlight + animation
  - Six reaction buttons per update (❤️ 🎊 😭 🥂 🙏 ✨) with per-guest toggle + optimistic UI
  - Live red-dot pulse in section header
  - Admin ticker panel in `/admin` → "Live" tab: icon picker (10 options), 160-char message input, posted updates list with delete
  - Requires two new DB tables — run migration before prod deploy (see below)

### DB migrations required (run in Supabase SQL editor before merging to prod)
```sql
-- RSVPs
create table if not exists rsvps (
  id             uuid primary key default gen_random_uuid(),
  guest_id       uuid not null unique references guests(id) on delete cascade,
  response       text not null check (response in ('attending', 'not_attending', 'maybe')),
  plus_one       boolean not null default false,
  plus_one_name  text,
  dietary_notes  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists rsvps_guest_id_idx on rsvps(guest_id);
create index if not exists rsvps_response_idx  on rsvps(response);

-- Live ticker
create table if not exists ticker_updates (
  id      uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) <= 160),
  icon    text not null default '✨',
  created_at timestamptz not null default now()
);
create index if not exists ticker_updates_created_at_idx on ticker_updates(created_at desc);

create table if not exists ticker_reactions (
  update_id  uuid not null references ticker_updates(id) on delete cascade,
  guest_id   uuid not null references guests(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (update_id, guest_id, emoji)
);
create index if not exists ticker_reactions_update_id_idx on ticker_reactions(update_id);
```

---

## [Production] — 2026-07-10  `2694885` (PR #9)

### Added
- **WeddingDayTeaser** (`cf86765`)
  - Floating "Oct 8" pill on CountdownHero for return visitors
  - Tap opens a modal with ceremony/reception times and venue name
  - Fades in after 2 s; dismisses and doesn't re-appear in the same session

- **BackgroundMusic audio consent + mute persistence** (`4c9e1b7`, `36ae4ed`)
  - First-visit audio consent banner; music only starts after explicit "Play" tap
  - Mute state persisted to `localStorage` across remounts and page refreshes
  - Music pauses automatically on browser tab hide (`visibilitychange`); resumes on tab focus

- **Pre-wedding phase enhancements** (`c98e8c0`)
  - Animated entrance for Venue, Families, and Gallery sections
  - BackgroundSlideshow: full-screen crossfade photo backdrop for the pre-wedding RETURN_VISIT phase
  - Scroll-triggered section reveals via Intersection Observer

- **Phase logic fixes** (`c573e2b`, `fa753f0`)
  - INVITATION always shown first on a fresh load regardless of prior visit state
  - `invitation_seen` flag persisted to Supabase `guests` table on close; read back on session restore

### Fixed
- **Safe localStorage wrappers** (`80cd92c`)
  - All `localStorage` reads/writes go through `safeGetItem`/`safeSetItem` in `lib/storage.ts`
  - Prevents crashes in private browsing mode or when storage is quota-exceeded

- **WeddingDayTeaser TS type error** (`15bd15b`)
  - Timer ref typed as `ReturnType<typeof setTimeout> | null` (was `0`)

---

## [Unreleased — on `claude/ui-redesign`] — 2026-07-09

> Changes deployed to `staging`. Not yet merged to `main`.

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
