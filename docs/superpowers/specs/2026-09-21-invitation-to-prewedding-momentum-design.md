# Invitation → Pre-Wedding Momentum

**Date:** 2026-09-21
**Status:** Approved, ready for implementation planning

## Problem

Guests open the invitation card, scroll through the details, and (whether or not they fill out the RSVP) very few click the "Explore" button that advances them into the pre-wedding phase (countdown, gallery, venue, wall-of-love). This is anecdotal, not backed by hard funnel data — a one-off diagnostic query during this session found real production drop-off (a device reaching `INVITATION` but never `PRE_WEDDING`: 72 of 168, ~43%), but that number is likely polluted by the author's own testing traffic and isn't trustworthy for sizing the problem. The fix is being made on the strength of the qualitative pattern (RSVP feels like "the end") rather than the exact rate.

**Goal:** get more guests to continue into the pre-wedding section — specifically because that's where the rest of the site's content lives (countdown, gallery, venue, wall-of-love), and right now almost none of it gets seen. This is explicitly *not* about RSVP completion — RSVP already saves independently the moment "Confirm RSVP" is clicked (`submitRsvp`), regardless of whether the guest ever clicks Explore afterward.

## Root cause

In `components/phases/InvitationCard.tsx`:
- The RSVP outcome (`rsvpDone` confirmation card, lines 799-829) is visually and narratively self-contained — a "✅ RSVP Confirmed" card with only a small "Update my RSVP" link. It reads as a finished, closed interaction.
- A `Divider` separates it from the `Explore` button (lines 1007-1011), which appears far below with no indication of what it leads to. It reads as an unrelated, optional afterthought rather than the natural next step.
- There is no mechanism to help a guest who scrolls onto the RSVP section and stalls (doesn't interact) — they're left with no visible cue about what to do next.

## Design

### 1. Merge the RSVP outcome and the Explore button into one continuous moment

Remove the `Divider` currently separating the RSVP section from the Explore button (`InvitationCard.tsx:1001-1011`). Both outcome states get a one-line forward-looking teaser baked directly into the existing card, leading the eye straight down into the Explore button with no visual gap:

- **`rsvpDone` (confirmed) branch** (lines 799-829): add a short teaser line under the existing confirmation summary, e.g. *"You're all set 🎉 — the countdown, photos & more are just below."*
- **Not-attending / not-yet-decided state**: the Explore button already renders unconditionally below the RSVP block whenever `!relinkSlot` (i.e., regardless of `rsvpDone`). No change to *when* it shows — only to the visual/narrative connection between it and whatever RSVP state precedes it (no more `Divider`, no more dead space).

The Explore button itself (and its glow animation) is unchanged in behavior — this section is purely about removing the visual/narrative seam between "RSVP outcome" and "next step."

### 2. Static teaser chips on the Explore button (light version of content preview)

Directly above the Explore button, add a small row of static, muted icon+label chips previewing what's ahead:

**🕐 Countdown · 📸 Gallery · 📍 Venue & more**

Styled consistently with the card's existing uppercase micro-label convention (see the "Will you be joining us?" label at line 795 for the pattern to match: `Georgia, serif`, small size, letter-spacing, muted color).

Explicitly static — no live data (no real countdown number, no photo count query). No new network requests, no new props threaded into `InvitationCard`. Purely a labeling/content change scoped to the render tree already in this component.

### 3. Idle nudge for guests who stall on the RSVP form

New behavior scoped to the RSVP section, active only when `!relinkSlot && !rsvpDone` (i.e., the RSVP form itself is showing, unverified-device relink flow isn't in play):

- An `IntersectionObserver` watches the RSVP section element. When it first enters the viewport, start a 25-second timer.
- Any interaction with the RSVP form cancels the timer permanently for this page load: selecting an attendance option (`setRsvpResp`), changing guest count (`setRsvpCount`), meal preference (`setRsvpMeal`), event selection (`setRsvpEvents`), or typing into the email field. (`rsvpDone` becoming `true` also cancels/hides it, via the existing conditional render.)
- If the timer fires with zero interaction, fade in a small inline nudge just below the attendance options: *"Take your time — you can always come back and RSVP later. Curious what's ahead?"* with a compact "See what's next →" affordance that calls the existing `handleExplore()` function (the same one the main Explore button calls).
- The nudge is purely additive — it never hides, disables, or replaces the RSVP form. A guest can ignore it and RSVP normally at any time.
- Fires at most once per page load (no re-arming if the guest scrolls away and back into view).
- No auto-navigation under any circumstances — the guest must click the nudge's own link to advance. This was an explicit design decision: an earlier version of this idea proposed auto-forwarding guests after 6 seconds of inactivity, which was rejected because it risks interrupting guests who are still genuinely reading/deciding and removes user control over navigation.
- Purely client-side (timer + `IntersectionObserver`) — no new tracking events, no server calls, no changes to `lib/breach.ts` / `access_logs` semantics.

## Explicitly out of scope

- Any change to RSVP form fields, validation, or submission logic (`submitRsvp` unchanged).
- Any change to phase-tracking/funnel instrumentation (`useTrackPageVisit`, `logEvent`, `access_logs`). The existing coarse phase-level tracking is a known limitation (can't currently distinguish "reached RSVP" from "submitted RSVP" from "clicked Explore"), but adding granular funnel events is a separate, independent piece of work not bundled into this change.
- Live/dynamic content in the teaser chips (real countdown, real photo/gallery counts).
- Auto-navigating guests away from the invitation card under any condition.
- Changes to the `relinkSlot` flow (IdentityGate / relink verification) — the merged RSVP→Explore treatment and the idle nudge are both explicitly scoped to `!relinkSlot` only, matching the existing conditional structure.

## Testing

- Unit/component tests (extending existing patterns in the `tests/` directory) covering:
  - RSVP outcome card renders the teaser line and no longer has a `Divider` between it and the Explore button.
  - Teaser chips render statically regardless of RSVP state.
  - Idle-nudge timer: does not fire before 25s; fires at 25s with no interaction; is cancelled by each of the interaction paths (attendance, count, meal, events, email); does not re-arm after firing once; never mounts/arms when `relinkSlot` is present or `rsvpDone` is already true.
  - Nudge's "See what's next →" affordance calls the same `handleExplore` path as the main Explore button.
- Manual/browser verification in dev: scroll to RSVP, wait past the idle window, confirm the nudge appears without disrupting the form; interact with the form and confirm the nudge never appears; complete RSVP and confirm the merged confirmation+Explore layout reads as one continuous flow.
