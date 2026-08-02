# 3. App Flow — User Flows & Interactions

> Project: James & Sharon — Wedding Website

## User Journey (high level)
1. **New device** opens the link → Opening screen (rings, aurora, 3D) with registration form.
2. Guest enters **name, email, mobile, city** (city autocomplete from `cities-list`) → **OPEN YOUR INVITATION**.
3. Envelope + wax-seal reveal → animated **invitation card** (James & Sharon, Oct 8 2026, St Andrews Kirk, Chennai; verse ECCLESIASTES 3:11).
4. Guest marks/sees invitation → **RETURN_VISIT**: countdown hero + photo slideshow → gallery → venue/itinerary → Wall of Love comments.
5. **Wedding day (Oct 8)**: wedding-day banner + live streams. **After**: post-wedding hero + highlights reel.

## Pages & Their Purpose

### Home — `/` (phase-driven)
- **Purpose:** one page that renders the correct phase for the guest.
- **Main function:** gate content by phase + identity; sync session with Supabase on mount.
- **Phases (from `lib/phase.ts`):** `FIRST_VISIT`, `INVITATION`, `RETURN_VISIT`, `WEDDING_DAY`, `POST_WEDDING`.
- **Key components:** `OpeningScreen`, `FirstVisitForm`, `InvitationCard`, `CountdownHero`, `WeddingDayBanner`, `PostWeddingHero`.

### Admin — `/admin/[email]`
- **Purpose:** manage the site without code.
- **Main function:** guest list (search/promote owner), access logs, breach flags (block/unblock), settings (phase override, announcement, stream URLs), YouTube comments moderation.

### Preview — `/preview`
- **Purpose:** see every phase as an admin (visual QA of the journey).

## Buttons & Component Behaviors
| Element | Where | On click / action | Result / next state |
|---|---|---|---|
| **OPEN YOUR INVITATION** | FirstVisitForm | Submit registration (validate Indian mobile, city autocomplete) | POST `/api/register` → guest + device saved → `INVITATION` phase |
| **City search field** | FirstVisitForm | Type city (e.g. "Hyder") | Dropdown stays open; select "Hyderabad" (isIndianCity fix) fills value |
| **Replay invitation** | CountdownHero (`sessionRestored`) | Replay | Back to `INVITATION` envelope reveal |
| **Scroll / "view" actions** | Home | Reveal sections | `access_logs` events logged; photos lazy-load |
| **Photo open** | Gallery | Request signed token | `/api/drive-image` validates session + HMAC → proxied image |
| **Admin save** | Admin panel | Save settings/guest changes | PUT to `/api/admin/*` → `settings`/`guests` updated + audit log |

## Navigation & State Transitions
- **Storage:** `localStorage` = fast cache; **Supabase** = source of truth; device fingerprint survives via cookie/IndexedDB/localStorage (`lib/fingerprint.ts`).
- **Session restore:** on every mount, `/api/session` syncs device → if known, hydrates localStorage silently (guest never re-sees form).
- **Relink:** `/api/relink` lets a guest on a new device claim their identity if they have the old device's token.
- **Phase priority:** date-based phases win over the invitation gate (`WEDDING_DAY`/`POST_WEDDING` override).
- **New/unregistered device after launch:** no registration offered (prevents impersonation); shows limited `RETURN_VISIT`-style view.

## Edge Cases & Error States
- **New / incognito / cleared-storage device:** fingerprint absent → limited view; no impersonation.
- **Invalid phone:** form rejects non-Indian format with inline message.
- **API down / network fail:** register/session calls fail gracefully; localStorage still shows cached phase.
- **Rate limited (429):** `FirstVisitForm` shows polite error; user blocked briefly.
- **Breach / blocked (403):** repeated abuse flags the device (`breach_flags`); photo routes refuse signed tokens.
- **Empty gallery / no streams yet:** sections render placeholders (stream URLs set later from admin).

## Questions to Ask (answered)
1. First thing a new user sees → opening screen + registration form.
2. "Complete" experience → register → open invitation → return for countdown → attend (live) → see highlights.
3. Breakable steps → registration (network/validation), photo tokens (rate limit), streams (URLs not yet set).
4. Roles → guest vs admin (separate flows).
5. Persists → identity + invitation_seen; resets → cleared storage (recovered via fingerprint/relink).
