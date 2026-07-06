# James & Sharon — Wedding Website

A personalised, cinematic wedding invitation website for James & Sharon (October 8, 2026, Chennai). Guests receive a unique first-visit experience, animated invitation, countdown hero, gallery, and venue details — all in one link.

## Tech Stack

- **Next.js 15** (App Router, `"use client"` components)
- **Tailwind CSS v4** with `@theme` block in `globals.css`
- **TypeScript**
- **Framer Motion** (`motion/react`) for animations
- **Google Drive API** for photo galleries (proxied server-side)
- **Vercel** for deployment (two environments: production on `main`, preview on `staging`)

---

## Phase System

The site shows different content depending on where the user is in the guest journey. The phase is derived from `localStorage` on the client.

| Phase | Trigger | What guests see |
|---|---|---|
| `FIRST_VISIT` | No `guest_name` in localStorage | Opening screen — rings animation, name/city form |
| `INVITATION` | Name entered, `invitation_seen` not set | Animated invitation card with envelope reveal |
| `RETURN_VISIT` | `invitation_seen = true`, before wedding date | Countdown hero with photo slideshow |
| `WEDDING_DAY` | Same calendar day as Oct 8, 2026 | Wedding day banner |
| `POST_WEDDING` | After Oct 8, 2026 | Post-wedding hero |

Phase logic lives in `lib/phase.ts`. The hook `lib/usePhase.ts` reads localStorage and exposes a `refresh()` function so phase can update without a full page reload.

---

## Project Structure

```
app/
  page.tsx              # Root — renders the correct phase
  layout.tsx            # Fonts, DevPanel, DevViewportFrame
  api/
    drive-photos/       # Server-side: list photos from Google Drive
    drive-image/        # Server-side: proxy Drive thumbnails (avoids CORS)
    youtube-comments/   # Server-side: fetch YouTube comments

components/
  phases/
    OpeningScreen.tsx   # First-visit: rings, particles, name/city form
    FirstVisitForm.tsx  # Name + city autocomplete form
    InvitationCard.tsx  # Envelope reveal invitation
    CountdownHero.tsx   # Pre-wedding countdown with cinematic slideshow
    WeddingDayBanner.tsx
    PostWeddingHero.tsx
  sections/
    Gallery.tsx         # Photo gallery (Drive albums)
    OurStory.tsx
    AboutJames.tsx / AboutSharon.tsx
    Families.tsx
    Venue.tsx           # Ceremony + reception details
    Itinerary.tsx
    Comments.tsx        # YouTube comments section
  ui/
    BackgroundMusic.tsx # Module-level audio singleton — continuous across phase transitions
    DevPanel.tsx        # Dev-only: phase switcher + viewport simulator
    DevViewportFrame.tsx# Wraps page to constrain width for viewport preview
    Nav.tsx
    Footer.tsx
    Marquee.tsx
    Reveal.tsx          # Scroll-triggered fade-in wrapper
    CinematicSlideshow.tsx
    ParticleCanvas.tsx

lib/
  phase.ts              # getPhase() pure function
  usePhase.ts           # Client hook — reads localStorage, exposes refresh()
  drive.ts              # Google Drive API helpers
  cities.ts             # City autocomplete data
  constants.ts          # WEDDING_DATE, MUSIC_URL
  calendar.ts           # Google Calendar + ICS deep link builders

public/
  rings.png             # Watercolor wedding rings illustration
  song.mp3              # Background music (plays continuously across phases)
```

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
GOOGLE_DRIVE_API_KEY=your_key_here
ENGAGEMENT_FOLDER_ID=your_drive_folder_id
WEDDING_FOLDER_ID=your_drive_folder_id
NEXT_PUBLIC_VERCEL_ENV=development   # optional — controls DevPanel visibility
```

---

## Dev Tools (DevPanel)

The `⚙` button appears in development, on Vercel preview (staging), and at `?dev=1`. It never appears on production.

**Phase switcher** — jump to any phase without waiting for real dates or clearing localStorage.

**View As** — simulate how the site looks on different devices:
- 📱 Mobile (390px) — constrains width, loads portrait photos in the countdown hero
- 💻 Tablet (768px) — constrains width, loads landscape photos
- 🖥 Desktop — full width

Switching reloads the page. Reset buttons restore normal behaviour.

---

## Audio

`BackgroundMusic.tsx` uses a **module-level singleton** (`let _audio`) so the same `HTMLAudioElement` persists across React renders and phase transitions — no snapping or restarting when the phase changes.

- Desktop/Android: autoplay fires on mount
- iOS Safari: music starts when the guest taps "Open Your Invitation" (a guaranteed user gesture)
- The mute button (🎵/🔇, bottom-left) sets `volume = 0` rather than pausing, so resuming is instant

---

## Photos

Photos are served from Google Drive folders via server-side Next.js API routes, which:
1. Keep the Drive API key out of the browser
2. Proxy thumbnails through `/api/drive-image` to avoid browser CORS blocks
3. Cache responses for 1 hour on the server and 24 hours in the browser

The pre-wedding countdown hero automatically shows **portrait photos** on mobile and **landscape photos** on tablet/desktop.

---

## Deployment

| Branch | Environment | URL |
|---|---|---|
| `main` | Production (Vercel) | Live guest-facing site |
| `staging` | Preview (Vercel) | Testing — DevPanel always visible |

**Never push directly to `main` without the owner's explicit sign-off.**

To deploy to staging:
```bash
git push origin main:staging
```

To deploy to production (owner approval required):
```bash
git push origin main
```
