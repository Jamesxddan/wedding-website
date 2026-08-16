# James & Sharon — Wedding Website

A cinematic wedding invitation website built for James & Sharon's wedding (October 8, 2026, Chennai). Guests experience a curated journey: opening registration, animated invitation card, countdown hero with photo slideshow, gallery, venue details, and a Wall of Love.

## Tech Stack

- **Next.js 16** (App Router, React 19, server/client components)
- **Tailwind CSS v4** with `@theme` block in `globals.css`
- **TypeScript**
- **Supabase** — guest registry, device fingerprints, settings, comments, breach detection
- **Google Drive API** — photo galleries (proxied server-side with HMAC-signed tokens)
- **Three.js** — 3D particle scenes (OpeningScene, PetalScene)
- **GSAP** — album book page-flip animation
- **Vercel** — deployment (production on `main`, preview on `staging`)

---

## Guest Journey (Phase System)

The site shows different content based on where the guest is in their journey. Phase is derived from `localStorage` and optionally a Supabase session check.

| Phase | Trigger | What guests see |
|---|---|---|
| `FIRST_VISIT` | No `guest_name` in localStorage, no matching device fingerprint (production only) | Opening screen — rings animation, aurora blobs, Three.js scene, registration form |
| `INVITATION` | Name entered, `invitation_seen` not set | Animated envelope with wax seal reveal → full invitation card |
| `RETURN_VISIT` | `invitation_seen = true`, before Oct 8 | Countdown hero, cinematic slideshow, gallery, venue, comments |
| `WEDDING_DAY` | Same calendar day as Oct 8 | Wedding day banner |
| `POST_WEDDING` | After Oct 8 | Post-wedding hero |

Phase logic: `lib/phase.ts` (pure function), `lib/usePhase.ts` (client hook with `refresh()`).

### Production registration flow

1. **New device (incognito/new browser):** Device fingerprint (UUID + browser signals hash) has no match in Supabase → session check returns `"new"` → guest sees registration form
2. **Registration:** Guest submits name + city + email or mobile → creates/finds guest record + creates a `device_fingerprint` → returns `session_token`
3. **Same device returning:** Fingerprint matches → session restored from `localStorage` → straight to content
4. **New device, already registered:** Email/mobile lookup matches existing guest → new fingerprint created for this device → guest proceeds without duplicating
5. **Dev/staging:** Session check skipped, all photo/auth gates bypassed

Guest data: `supabase/guests` + `supabase/device_fingerprints` tables. Device UUID persisted across localStorage, cookie, and IndexedDB.

---

## Project Structure

```
app/
  page.tsx                  # Root — renders the correct phase component
  layout.tsx                # Fonts (Playfair Display, Cormorant Garamond, Inter), OG/Twitter cards
  preview/page.tsx          # Admin preview — always RETURN_VISIT, no session check

  api/
    register/               # POST: create/find guest + device fingerprint
    session/                # POST: session check by device UUID
    relink/                 # POST: re-link existing guest to a new device
    settings/               # GET: public settings (phase_override, site_content, etc.)
    chat/                   # POST: guest chatbot answers (OpenRouter)
    drive-photos/           # GET: photos from Google Drive (auth: HMAC + session token)
    drive-image/            # GET: proxy Drive images (auth: HMAC-signed token)
    comments/               # CRUD: comments/Wall of Love with moderation

    admin/
      auth/                 # POST login / DELETE logout
      me/                   # GET current admin + POST change own password
      admins/               # CRUD admins; PATCH also resets another admin's password
      gear-status/          # GET affordance check — is this visitor an admin?
      settings/ comments/ guests/ rsvps/ logs/ flags/ ticker/ audit/ …

  admin/page.tsx            # Admin panel — 12 tabs

components/
  phases/
    OpeningScreen.tsx       # Rings, Three.js OpeningScene, aurora blobs, registration form
    FirstVisitForm.tsx      # Name + city autocomplete + email/mobile toggle animation
    InvitationCard.tsx      # Envelope with coin-flip, wax seal break, card reveal, calendar links
    CountdownHero.tsx       # Animated countdown, CinematicSlideshow, adaptive text luminance
    WeddingDayBanner.tsx
    PostWeddingHero.tsx

  sections/
    Gallery.tsx             # SpotlightGrid, AlbumCard, MasonryGrid, AlbumBook (GSAP), SlideshowPlayer
    AboutSection.tsx        # AboutJames + AboutSharon bios with facts
    Families.tsx            # Two-column family member cards
    Venue.tsx               # Ceremony + reception cards with Google Maps embeds
    Comments.tsx            # Wall of Love — emoji picker, stickers, moderation, stagger animation

  ui/
    BackgroundMusic.tsx     # Module-level audio singleton — continuous across phase transitions
    Footer.tsx
    Marquee.tsx
    CinematicSlideshow.tsx  # Crossfade video/slideshow with luminance-based text contrast

  webgl/
    OpeningScene.tsx        # Three.js: blurred photo backdrops + interactive gold/rose particles
    PetalScene.tsx          # Three.js: falling petal animation

lib/
  phase.ts                  # getPhase() — pure function for phase determination
  usePhase.ts               # Client hook — localStorage, session check, refresh()
  content.ts                # SiteContent interface, DEFAULT_CONTENT, mergeSiteContent()
  SiteContentContext.tsx     # Fetches /api/settings, merges with DEFAULT_CONTENT
  constants.ts              # WEDDING_DATE, COLORS, COUPLE, VENUES, ITINERARY
  supabase.ts               # Server-only Supabase admin client
  drive.ts                  # Google Drive API helpers (HMAC signing, caching, retry)
  session-check.ts          # Photo API auth — validates session_token in production
  fingerprint.ts            # Device UUID (localStorage + cookie + IndexedDB) + browser signals hash
  cities.ts                 # City autocomplete from cities-list (Indian cities prioritised)
  calendar.ts               # Google Calendar + ICS deep link builders
  breach.ts                 # Breach detection and rate limiting
  chatbot.ts                # Guest FAQ chatbot — OpenRouter call, off-topic sentinel
  admin-auth.ts             # Admin sessions, scrypt hashPassword/verifyPassword
  admin-audit.ts            # Admin action audit logging
```

---

## Admin Panel

Available at `/admin`. 12 tabs:

| Tab | Function |
|---|---|
| **Guests** | View all registered guests, search, delete, manual add |
| **RSVPs** | RSVP responses |
| **Logs** | Event logs with level/type filtering |
| **Flags** | Breach flags / rate-limit violations management |
| **Live** | Real-time event stream |
| **Control** | Phase override, announcement banner, YouTube URLs |
| **Preview** | `/preview` iframe — full site as a returning guest sees it |
| **Admins** | Manage admin accounts — add, promote/demote, remove, **reset password** |
| **Audit** | Admin action audit trail |
| **Comments** | Moderate Wall of Love — approve, flag, block |
| **Content** | Full site content editor (opening, invitation, bios, venue, families) |
| **Chatbot** | FAQ bot on/off + pick the AI model |

### Admin Passwords

- **Reset password** (super admin only, Admins tab) — sets a fresh scrypt hash for
  another admin and signs their live sessions out. Always works even if a stored
  hash is stale or malformed.
- **Change my password** (any admin, header link) — requires the current password,
  keeps the current session, signs out other devices.
- Passwords are `scrypt(salt:hash)` — plaintext is never stored. Minimum length 8.

### Site Content Persistence

Admin content changes are stored in Supabase (`settings` table, key `site_content`) and fetched at runtime by `SiteContentContext.tsx`. Builds never overwrite database content — admin changes survive every deployment. `DEFAULT_CONTENT` in `lib/content.ts` serves only as the compile-time fallback.

---

## Key Features

### Device Fingerprinting
`lib/fingerprint.ts` — `crypto.randomUUID()` persisted to localStorage, cookie, and IndexedDB simultaneously. Browser signals (user agent, screen, timezone, language) hashed via SHA-256 for additional identity signals.

### Photo Gallery System
- **SpotlightGrid** — engagement photos with indexed navigation
- **AlbumCard / MasonryGrid** — wedding albums with priority sorting
- **AlbumBook** — GSAP cylinder-curl page flip animation
- **SlideshowPlayer** — crossfade with watermark overlay
- **Anti-screenshot** — blur on visibility change, window blur events, print attempt logging
- **Drive proxying** — HMAC-signed file ID tokens, 5-min server cache, 24-hr browser cache

### Comments / Wall of Love
- Emoji picker + sticker presets (rose, heart, ring, champagne, prayer)
- 2-minute edit window after posting
- Admin moderation: approve, flag, block (with blocked_peace state)
- Stagger animation on load
- Blocked/flagged/blocked_peace error state handling

### Registration & Guest Management
- Mobile-first lookup (highest precedence), then email lookup (secondary)
- Indian phone validation (10-15 digits after stripping non-digits)
- Email/mobile toggle animation — typing one hides the other (but shows both on autofill)
- Rate limiting + mizcheck name block
- Admin can delete guests or individual device fingerprints

### Phase Override System
- Admins can force any phase from the Control tab
- Dev/staging bypasses all session checks for testing
- `localStorage dev_phase` for local development overrides

### Guest Chatbot
`lib/chatbot.ts` — small OpenRouter-backed FAQ assistant, embedded bottom-right.
- Only answers wedding/website questions; anything else returns the `OFF_TOPIC`
  sentinel, which is mapped to a friendly decline and triggers an admin alert.
- Model is admin-pickable (`chatbot_model` setting, default
  `nvidia/nemotron-3-ultra-550b-a55b:free`). Reasoning models are budgeted
  generously (`max_tokens` 1000/2000) and retried once on empty output — an
  empty response is a failure, not a refusal.

### Chatbot Knowledge Base (instant answers)
`data/chatbot-knowledge.json` is a compact question bank (created by
`scripts/build-chatbot-kb.mjs` from a brainstorm of every topic a guest could
ask) that does two things:

- **Fast path** — `lib/chatbot-knowledge.ts` scores the question against the
  bank's keywords/phrasings; a clear match answers instantly with no LLM call
  (zero cost, ~instant response). Non-matches fall through to the LLM, and the
  matcher is deliberately conservative so it never shows a wrong answer.
- **Fact sheet** — the same file feeds `buildFactSheet()`, which is injected
  into the LLM system prompt so the bot knows the site's ground truth (who
  created the site, where the couple works, bios, streams, etc.).

The bank is rebuilt by running the brainstorming workflow (12 domain agents +
2 gap critics writing to `data/brainstorm/`), then `node scripts/build-chatbot-kb.mjs`
merges, dedupes, compacts, and emits the JSON plus a readable
`docs/chatbot-question-bank.md`.

### Preview Switcher Gear (sub-owner + admins)
The `⚙️` gear (bottom-left) shows phase/error-state previews for this device only.
- Shown to sub-owners (guests flagged `is_owner`) **and** any admin / super admin
  visitor (detected via `/api/admin/gear-status`).
- Admin & super admin visitors also get an **Admin Panel** link inside the gear —
  a one-click path to `/admin`. The link is affordance-only; `/admin` and every
  `/api/admin` route remain gated by `getAdminSession`.

### Background Music
Module-level `HTMLAudioElement` singleton persists across React renders and phase transitions. No snap/restart on phase change. iOS requires user gesture (registration button tap).

### DevPanel
Shown in dev, Vercel preview (staging), and at `?dev=1`. Never on production.
- Phase switcher — jump to any phase
- Viewport simulator — mobile (390px), tablet (768px), desktop
- Same-origin iframe preview mode for admin panel

---

## Audio

`BackgroundMusic.tsx` uses a **module-level singleton** (`let _audio`) so the same `HTMLAudioElement` persists across React renders and phase transitions — no snapping or restarting.

- Desktop/Android: autoplay fires on mount
- iOS Safari: music starts when the guest registers (guaranteed user gesture)
- Mute button (🎵/🔇, bottom-left) sets `volume = 0` rather than pausing, so resuming is instant

---

## Photos

Photos are served from Google Drive folders via server-side Next.js API routes:

1. **Drive API key stays server-side** — never exposed to the browser
2. **HMAC-signed tokens** — file IDs are signed before being sent to the browser; `/api/drive-image` verifies the signature before proxying
3. **Production auth** — `x-session-token` header required in production (validated against `device_fingerprints` table)
4. **Dev/staging are open** — no auth gates, no HMAC validation
5. **Recursive folder scanning** — collects images from nested subfolders (album grouping)
6. **5-min in-memory cache** — avoids hammering Drive API quota across concurrent requests
7. **Landscape-first sorting** — landscape photos prioritized for hero slideshow

### Folder structure

```
Engagement Folder (ENGAGEMENT_FOLDER_ID)
├── (subfolders = albums)
└── (top-level files)

Wedding Folder (WEDDING_FOLDER_ID)
├── (subfolders = albums)
└── (top-level files)
```

Mobile/desktop-specific folder IDs allow different photo sets for the CountdownHero slideshow.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` file (never commit this):

```env
# Supabase (admin service role key)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key

# Google Drive
GOOGLE_DRIVE_API_KEY=your_drive_api_key
ENGAGEMENT_FOLDER_ID=your_engagement_folder_id
WEDDING_FOLDER_ID=your_wedding_folder_id
ENGAGEMENT_FOLDER_ID_MOBILE=optional_portrait_folder
ENGAGEMENT_FOLDER_ID_DESKTOP=optional_landscape_folder
DRIVE_TOKEN_SECRET=your_hmac_signing_secret

# Admin
ADMIN_SECRET=your_admin_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=scrypt_hashed_password

# Optional
NEXT_PUBLIC_VERCEL_ENV=development   # controls DevPanel visibility
NEXT_PUBLIC_DISABLE_RELINK=true       # hide relink form
```

---

## Dev Tools (DevPanel)

The `⚙` button appears in development, on Vercel preview (staging), and at `?dev=1`. It never appears on production.

**Phase switcher** — jump to any phase without waiting for real dates or clearing localStorage.

**View As** — simulate different devices:
- 📱 Mobile (390px)
- 💻 Tablet (768px)
- 🖥 Desktop

Switching reloads the page with `dev_viewport` in localStorage.

---

## Deployment

| Branch | Environment | URL |
|---|---|---|
| `main` | Production (Vercel) | Live guest-facing site |
| `staging` | Preview (Vercel) | Testing — DevPanel always visible |

### Push Policy

- `main` — requires explicit owner sign-off before pushing
- `staging` — free to push without sign-off
- Any other branch — free to push

```bash
# Deploy to staging
git push origin main:staging

# Deploy to production (owner approval required)
git push origin main
```

### Important: Admin Content

Site content changed via the admin panel is stored in **Supabase**, not in code. Builds never overwrite database content, so admin changes survive every deployment. The `DEFAULT_CONTENT` in `lib/content.ts` is only the compile-time fallback and is overridden by the database at runtime.
