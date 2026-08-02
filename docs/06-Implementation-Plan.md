# 6. Implementation Plan — Build Order

> Project: James & Sharon — Wedding Website · Status: **Launched (pre-wedding phase live)** · Next milestone: **Oct 8, 2026 (WEDDING_DAY)**

## Build Order (as executed)
1. **Project setup** — Next.js + TypeScript + Tailwind v4 + eslint + vitest + Playwright.
2. **Database** — Supabase schema (`supabase/schema.sql`), service-key client, seeds.
3. **Identity & auth** — device fingerprint, guest register/session/relink APIs, admin auth + sessions.
4. **Core features** — phase system, opening screen, registration form, invitation card, countdown hero, gallery, venue/itinerary, Wall of Love, live streams, admin panel.
5. **Polish** — animations, scroll reveals, 3D scenes, responsive/accessibility pass.
6. **Testing** — vitest unit tests, Playwright e2e, `scripts/smoke-check.mjs` against the live site.
7. **Deployment** — Vercel production (`www.jameswedssharon.site`) + staging; production smoke-tested.

## Phase Checklist

### Phase 1 — Project Setup ✅
- [x] Repo + Next.js App Router scaffold, TypeScript strict
- [x] Tailwind v4 `@theme` (palette + fonts) in `globals.css`
- [x] eslint, vitest, Playwright wired (`dev`, `build`, `test`, `test:e2e:*`)
- [x] Build pipeline: `scripts/generate-video-manifest.js && next build`

### Phase 2 — Database ✅
- [x] All tables in `supabase/schema.sql` (guests, device_fingerprints, access_logs, breach_flags, gallery_events, admins, admin_sessions, settings)
- [x] Idempotent seeds (`phase_override`, youtube URLs, announcement)

### Phase 3 — Identity & Authentication ✅
- [x] `lib/fingerprint.ts` multi-storage device UUID
- [x] `/api/register`, `/api/session`, `/api/relink`
- [x] Admin auth (`admins`/`admin_sessions`, 8h) + audit
- [x] Session-token checks + breach checks on photo routes

### Phase 4 — Core Features ✅
- [x] Phase engine (`lib/phase.ts` + `lib/usePhase.ts`)
- [x] Opening screen (rings, aurora, 3D) + FirstVisitForm (city autocomplete fix)
- [x] Invitation envelope + wax seal + invitation card
- [x] Countdown hero + photo slideshow (Drive-backed, HMAC)
- [x] Gallery, venue/itinerary, Wall of Love (giscus), live streams
- [x] Admin panel (guests, logs, breaches, settings, owner toggle)

### Phase 5 — Polish ✅
- [x] GSAP album flip, scroll reveals, floral accents, music bar
- [x] Mobile-first responsive + reduced-motion where feasible

### Phase 6 — Testing ✅
- [x] Vitest unit (phase logic, validation)
- [x] Playwright e2e
- [x] Live smoke check (`scripts/smoke-check.mjs`) — production only reachable headless (staging behind Vercel login wall)

### Phase 7 — Deployment ✅
- [x] Staging + production on Vercel
- [x] Production verified: registration form renders, city autocomplete shows "Hyderabad" for "Hyder" and fills on click
- [x] Rollback path: previous production deployment can be re-promoted via `vercel promote`

## Current Status
- **In progress:** ongoing maintenance + pre-wedding content (stream URLs are TEST placeholders in `lib/constants.ts` — replace before the day).
- **Done:** all 7 phases above.
- **Next up (pre-wedding, before Oct 8):**
  - [ ] Set real ceremony/reception stream URLs (`KIRK_STREAM_URL`, `BKN_STREAM_URL`) + `settings` youtube keys
  - [ ] Itinerary times (currently `TBD`)
  - [ ] Final photo/gallery review + guest list hygiene in admin
  - [ ] Re-run `scripts/smoke-check.mjs` on production after any content change
- **On the day (Oct 8):** confirm `WEDDING_DAY` banner + streams go live; monitor access logs/breaches.
- **After (POST_WEDDING):** set `HIGHLIGHTS_VIDEO_URL`, enable post-wedding hero.

## Questions to Ask (answered)
1. Most important feature first → identity + invitation journey (guest experience) — done.
2. MVP early? → yes, launched with pre-wedding phases.
3. Who tests? → James/Sharon + admins via `/preview`; automated smoke check.
4. Hard date → Oct 8, 2026.
5. Ready to launch → live; day-of items above are the remaining checklist.
