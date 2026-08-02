# 2. TRD — Technical Requirement Document

> Project: James & Sharon — Wedding Website · Status: **Implemented** (reflects live stack)

## Stack Overview
- **Language:** TypeScript
- **Framework:** Next.js (App Router), React 19
- **Styling:** Tailwind CSS v4 with a single `@theme` block in `app/globals.css` (custom color + font tokens)
- **Animations:** GSAP (album flip), `motion` (Framer), Three.js + PlayCanvas (3D opening/petal scenes), CSS keyframes (reveal, floating florals, slideshow zoom)
- **UI:** shadcn components, `cities-list` for city autocomplete

## Frontend
- **Routes:** `/` (phase-driven homepage), `/admin/[email]` (admin panel), `/preview` (phase preview)
- **State:** React Context (`lib/SiteContentContext.tsx`); localStorage as fast cache, Supabase authoritative
- **Phase system:** `lib/phase.ts` (pure `getPhase`) + `lib/usePhase.ts` (client hook) — `FIRST_VISIT → INVITATION → RETURN_VISIT → WEDDING_DAY → POST_WEDDING`

## Backend & APIs
- **Pattern:** Next.js API routes, server-side only (browser never talks to Supabase directly); service key in `lib/supabase.ts` (`server-only`)
- **Routes:** `register`, `session`, `guest`, `relink`, `settings`, `photos`, `drive-photos`, `drive-image`, `couple-photo`, `gallery-event(s)`, `comments`, `youtube-comments`, `select-image`, `select-photos`, `places`, `admin/*`
- **Integrations:** Google Drive API (photos, HMAC-signed proxied tokens), YouTube (live streams via `settings` URLs), giscus (comments), Google Identity (admin sign-in)
- **Bad words:** `bad-words` filter on public comments

## Database
- **Provider:** Supabase (Postgres) — project `sadikezxiwyntwutntnp`
- **Stores:** guests, device fingerprints, access logs, breach flags, gallery events, admins, admin sessions, settings. Media files live in Google Drive, not the DB. Full model in `docs/05-Backend-Schema.md` and `supabase/schema.sql`.

## Authentication
- **Guests:** device fingerprint (UUID persisted across cookie/IndexedDB/localStorage) + `session_token` per device; session restore via `/api/session`; relink flow via `/api/relink`
- **Admins:** custom `admins` + `admin_sessions` (8h expiry), Google sign-in, `lib/admin-auth.ts`, audit log in `lib/admin-audit.ts`

## Hosting & Deployment
- **Host:** Vercel — production aliases `www.jameswedssharon.site` / `jameswedssharon.site`; staging alias `staging.jameswedssharon.site`
- **Environments:** production on `main`; preview/staging deployments (Vercel Authentication login-walled — only the production domain is reachable by headless checks)
- **Deploy:** `vercel` CLI / git push; build runs `scripts/generate-video-manifest.js && next build`

## Configuration
- **Env vars:** Supabase URL + service key, admin session secret, Google Drive service credentials, HMAC signing secret (drive tokens)
- **Runtime settings (DB `settings` table):** `phase_override`, `youtube_live_url`, `youtube_ceremony_url`, `youtube_reception_url`, `announcement`
- **Site constants (`lib/constants.ts`):** `WEDDING_DATE`, venues, stream URLs, music URL, highlights video, COLORS, COUPLE

## Performance & Security
- **Performance:** server/client components, minimal client bundles, lazy 3D scenes; target smooth mobile 60fps on hero
- **Security:** API rate limits + breach detection (`lib/breach.ts`), session-token checks on photo routes, HMAC-signed Drive tokens (no hotlinking), no direct browser→Supabase access, Indian phone validation

## Folder / File Structure
```
wedding-website/
├── app/            # routes: /, /admin/[email], /preview + app/api/* server routes
├── components/     # phases/, sections/, ui/, webgl/ (opening rings, petals, album)
├── lib/            # phase, usePhase, supabase, fingerprint, breach, drive, cities, storage, constants, content, SiteContentContext, admin-*
├── docs/           # the 6 core documents (this folder)
├── scripts/        # smoke-check, generate-video-manifest, build helpers
├── supabase/       # schema.sql
├── tests/          # vitest unit + playwright e2e
└── public/
```

## Questions to Ask (answered)
1. Backend needed? → Yes — guest registry, access control, settings (Supabase).
2. Existing services? → Google Drive, YouTube, giscus, Google Identity.
3. Scale? → low (hundreds of guests); free tier sufficient.
4. Must-use tech? → Next.js + Vercel + Supabase (chosen).
5. Mobile-first? → Yes, strongly.
6. Persist + visibility? → Guest data private; only invited guests see photos/comments.
