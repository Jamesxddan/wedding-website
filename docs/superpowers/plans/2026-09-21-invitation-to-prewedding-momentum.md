# Invitation → Pre-Wedding Momentum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the invitation card's RSVP section flow naturally into the "Explore" button instead of reading as a dead end, and gently help guests who stall on the RSVP form without ever auto-navigating them away.

**Architecture:** All changes are contained in one existing file, `components/phases/InvitationCard.tsx`: a static teaser + chip row placed above the existing Explore button, a one-line forward-looking teaser inside the existing RSVP-confirmed card, and a small idle-nudge feature (`IntersectionObserver` + `setTimeout`) scoped to the RSVP form section. No new files, no new API routes, no new props.

**Tech Stack:** React 19 (`useState`/`useEffect`/`useRef`), TypeScript, Vitest + React Testing Library (existing `tests/InvitationCard.test.tsx`), browser `IntersectionObserver` (already polyfilled as a no-op in `vitest.setup.ts:9-16` — tests override it locally where needed).

**Spec:** `docs/superpowers/specs/2026-09-21-invitation-to-prewedding-momentum-design.md`

---

## Current code this plan touches

`components/phases/InvitationCard.tsx`:
- `RSVP_OPTIONS` / `EVENT_OPTIONS` module-level constants (lines 24-33) — new `EXPLORE_TEASER_CHIPS` constant goes next to these.
- RSVP state block (lines 238-247): `rsvpSaved`, `rsvpResp`, `rsvpCount`, `rsvpMeal`, `rsvpEvents`, `rsvpSubmitting`, `rsvpDone`, `rsvpError`, `guestHasEmail`, `rsvpEmail`.
- The RSVP section wrapper `<div style={{ animation: ..., marginBottom: 16 }}>` (line 793) — gets a `ref`.
- The RSVP-confirmed summary card (lines 799-829) — gets a new teaser line.
- The RSVP form's attendance buttons (line 835-855), guest-count buttons (867-877), meal buttons (890-909), event buttons (918-938), email input (951-965) — each interaction handler gets wired to cancel the idle-nudge timer.
- The closing `{relinkSlot ? (...) : (<button onClick={handleExplore}>...)}` block (lines 1001-1011) — the `else` branch gets the static teaser chips added above the existing button.

`tests/InvitationCard.test.tsx` — existing test file; all new tests are added here, following its existing mocking patterns (`localStorageMock`, `vi.mock("@/lib/SiteContentContext", ...)`, `vi.useFakeTimers()`, the `navigateToCard()` helper).

---

### Task 1: Static teaser chips above the Explore button

**Files:**
- Modify: `components/phases/InvitationCard.tsx:24-33` (add constant), `components/phases/InvitationCard.tsx:1006-1011` (wrap button)
- Test: `tests/InvitationCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `tests/InvitationCard.test.tsx`, inside the existing `describe("InvitationCard", ...)` block (after the last `it(...)`, before the closing `});`):

```tsx
  it("shows static teaser chips above the Explore button", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();
    expect(screen.getByText(/Countdown/)).toBeInTheDocument();
    expect(screen.getByText(/Gallery/)).toBeInTheDocument();
    expect(screen.getByText(/Venue & more/)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/InvitationCard.test.tsx -t "static teaser chips"`
Expected: FAIL — `Unable to find an element with the text: /Countdown/`

- [ ] **Step 3: Write minimal implementation**

In `components/phases/InvitationCard.tsx`, add a new constant right after `EVENT_OPTIONS` (after line 33):

```tsx
const EXPLORE_TEASER_CHIPS: { emoji: string; label: string }[] = [
  { emoji: "🕐", label: "Countdown" },
  { emoji: "📸", label: "Gallery" },
  { emoji: "📍", label: "Venue & more" },
];
```

Then replace the closing block (currently lines 1001-1011):

```tsx
            {relinkSlot ? (
              <div style={{ animation: "blur-reveal 0.9s ease 0.9s both" }}>
                <Divider />
                <div style={{ marginTop: 14 }}>{relinkSlot}</div>
              </div>
            ) : (
              <button onClick={handleExplore}
                style={{ width: "100%", padding: "14px", background: ROSE, color: "#fef9f0", border: "none", borderRadius: 10, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase", cursor: "pointer", animation: "blur-reveal 0.9s ease 0.95s both, btn-glow 2.2s ease-in-out 2s infinite" }}>
                {invitation.explore_btn}
              </button>
            )}
```

with:

```tsx
            {relinkSlot ? (
              <div style={{ animation: "blur-reveal 0.9s ease 0.9s both" }}>
                <Divider />
                <div style={{ marginTop: 14 }}>{relinkSlot}</div>
              </div>
            ) : (
              <div style={{ animation: "blur-reveal 0.9s ease 0.9s both" }}>
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                  {EXPLORE_TEASER_CHIPS.map(chip => (
                    <span key={chip.label} style={{ fontFamily: "Georgia, serif", fontSize: 9, letterSpacing: "1px", color: RA(0.4) }}>
                      {chip.emoji} {chip.label}
                    </span>
                  ))}
                </div>
                <button onClick={handleExplore}
                  style={{ width: "100%", padding: "14px", background: ROSE, color: "#fef9f0", border: "none", borderRadius: 10, fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase", cursor: "pointer", animation: "blur-reveal 0.9s ease 0.95s both, btn-glow 2.2s ease-in-out 2s infinite" }}>
                  {invitation.explore_btn}
                </button>
              </div>
            )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/InvitationCard.test.tsx -t "static teaser chips"`
Expected: PASS

- [ ] **Step 5: Run the full existing test file to confirm no regressions**

Run: `npx vitest run tests/InvitationCard.test.tsx`
Expected: all tests PASS (the existing "sets invitation_seen and calls onExplore" test still finds the button by its accessible name, unaffected by the new wrapping `<div>`/chips).

- [ ] **Step 6: Commit**

```bash
git add components/phases/InvitationCard.tsx tests/InvitationCard.test.tsx
git commit -m "$(cat <<'EOF'
feat: add static teaser chips above the invitation card's Explore button

Gives guests a preview of what's past the Explore button (countdown,
gallery, venue) instead of an unlabeled click into the unknown.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Forward-looking teaser line in the RSVP-confirmed card

**Files:**
- Modify: `components/phases/InvitationCard.tsx:799-829`
- Test: `tests/InvitationCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `tests/InvitationCard.test.tsx`:

```tsx
  it("shows a forward-looking teaser once RSVP is confirmed", async () => {
    globalThis.fetch = vi.fn((url: RequestInfo | URL) => {
      if (String(url) === "/api/rsvp") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            rsvp: { response: "attending", guest_count: 2, meal_pref: "veg", attending_events: "both", updated_at: "" },
            has_email: true,
          }),
        }) as unknown as Promise<Response>;
      }
      return Promise.resolve({ ok: true, json: async () => ({}) }) as unknown as Promise<Response>;
    });

    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(screen.getByText(/countdown, photos & more are just below/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/InvitationCard.test.tsx -t "forward-looking teaser once RSVP"`
Expected: FAIL — text not found (the mount-time `GET /api/rsvp` effect at `InvitationCard.tsx:275-290` does populate `rsvpDone`, but the new teaser line doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

In `components/phases/InvitationCard.tsx`, inside the `rsvpDone` confirmation branch, insert a new paragraph right after the `guestHasEmail` confirmation-email paragraph (after line 822's closing `)}` for that block) and before the "Update my RSVP" button (line 823):

```tsx
                  <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 11, color: ROSE, margin: "6px 0 0", textAlign: "center" }}>
                    You&apos;re all set 🎉 — the countdown, photos &amp; more are just below.
                  </p>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/InvitationCard.test.tsx -t "forward-looking teaser once RSVP"`
Expected: PASS

- [ ] **Step 5: Run the full existing test file to confirm no regressions**

Run: `npx vitest run tests/InvitationCard.test.tsx`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add components/phases/InvitationCard.tsx tests/InvitationCard.test.tsx
git commit -m "$(cat <<'EOF'
feat: add forward-looking teaser to the RSVP-confirmed card

The confirmation card previously read as a finished, closed state.
This connects it narratively to the Explore button that follows.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Idle-nudge scaffolding — arm on viewport entry, fire at 25s

**Files:**
- Modify: `components/phases/InvitationCard.tsx:238-247` (new state/refs), `components/phases/InvitationCard.tsx:793` (ref), after line 290 (new effect)
- Test: `tests/InvitationCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `tests/InvitationCard.test.tsx`, and add a module-level helper + local `IntersectionObserver` mock used by this and the next task's tests. Insert this near the top of the file, after the existing `vi.mock(...)` calls and before `describe("InvitationCard", ...)`:

```tsx
let intersectionCallbacks: IntersectionObserverCallback[] = [];
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    intersectionCallbacks.push(callback);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
function fireIntersection(isIntersecting: boolean) {
  const entry = { isIntersecting } as IntersectionObserverEntry;
  intersectionCallbacks.forEach(cb => cb([entry], {} as IntersectionObserver));
}
```

Then add a new `describe` block at the end of the file (after the existing `describe("InvitationCard", ...)` block's closing `});`):

```tsx
describe("InvitationCard — RSVP idle nudge", () => {
  beforeEach(() => {
    localStorageMock.clear();
    exploreMock.mockClear();
    vi.useFakeTimers();
    intersectionCallbacks = [];
    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, json: async () => ({}) }) as unknown as Promise<Response>);
  });
  afterEach(() => { vi.useRealTimers(); });

  it("shows the idle nudge after 25s of no interaction once the RSVP section is in view", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    act(() => { fireIntersection(true); });
    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(25000); });
    expect(screen.getByText(/see what's next/i)).toBeInTheDocument();
  });

  it("does not show the nudge before the RSVP section has scrolled into view", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    await act(async () => { vi.advanceTimersByTime(25000); });
    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/InvitationCard.test.tsx -t "idle nudge"`
Expected: FAIL — "See what's next" text never appears (feature not implemented yet).

- [ ] **Step 3: Write minimal implementation**

In `components/phases/InvitationCard.tsx`, add new state and refs right after the existing RSVP state block (after line 247, `const [rsvpEmail, setRsvpEmail] = useState("");`):

```tsx
  const [rsvpStalled, setRsvpStalled]     = useState(false);
  const rsvpSectionRef = useRef<HTMLDivElement>(null);
  const rsvpIdleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rsvpIdleArmed  = useRef(false);
```

Add a new effect right after the existing mount-time `GET /api/rsvp` effect (after line 290, before `const isAttending = ...` on line 292):

```tsx
  // Arm a 25s idle timer the first time the RSVP section scrolls into view.
  useEffect(() => {
    if (relinkSlot || rsvpDone) return;
    const el = rsvpSectionRef.current;
    if (!el || rsvpIdleArmed.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !rsvpIdleArmed.current) {
        rsvpIdleArmed.current = true;
        rsvpIdleTimer.current = setTimeout(() => setRsvpStalled(true), 25000);
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [relinkSlot, rsvpDone]);

  // Clear the idle timer on unmount.
  useEffect(() => () => { if (rsvpIdleTimer.current) clearTimeout(rsvpIdleTimer.current); }, []);

  function markRsvpInteraction() {
    if (rsvpIdleTimer.current) {
      clearTimeout(rsvpIdleTimer.current);
      rsvpIdleTimer.current = null;
    }
    setRsvpStalled(false);
  }
```

Add the `ref` to the RSVP section wrapper (line 793):

```tsx
            <div ref={rsvpSectionRef} style={{ animation: "blur-reveal 0.9s ease 0.9s both", marginBottom: 16 }}>
```

(replacing the current `<div style={{ animation: "blur-reveal 0.9s ease 0.9s both", marginBottom: 16 }}>`).

Add the nudge UI right after the attendance-options `.map(...)` closes (after line 855's closing `})}` for `RSVP_OPTIONS.map(...)`, before the `{/* Steps 2–4 ... */}` comment on line 857):

```tsx
                  {rsvpStalled && (
                    <div style={{ marginTop: 4, padding: "10px 12px", background: "rgba(212,175,55,0.06)", border: `1px solid ${GA(0.15)}`, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animation: "blur-reveal 0.6s ease both" }}>
                      <p style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 11, color: RA(0.5), margin: 0, textAlign: "center" }}>
                        Take your time — you can always come back and RSVP later. Curious what&apos;s ahead?
                      </p>
                      <button type="button" onClick={handleExplore}
                        style={{ background: "none", border: "none", fontFamily: "Georgia, serif", fontSize: 11, letterSpacing: "1px", color: ROSE, cursor: "pointer", textDecoration: "underline" }}>
                        See what&apos;s next →
                      </button>
                    </div>
                  )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/InvitationCard.test.tsx -t "idle nudge"`
Expected: PASS (both tests in this task)

- [ ] **Step 5: Run the full existing test file to confirm no regressions**

Run: `npx vitest run tests/InvitationCard.test.tsx`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add components/phases/InvitationCard.tsx tests/InvitationCard.test.tsx
git commit -m "$(cat <<'EOF'
feat: add idle nudge for guests who stall on the RSVP form

After 25s with no interaction once the RSVP section is in view, shows
a non-blocking nudge pointing at the Explore button. Never navigates
guests away automatically — they must click the nudge's own link.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Cancel the idle nudge on interaction; wire remaining handlers

**Files:**
- Modify: `components/phases/InvitationCard.tsx` — attendance buttons (~line 841), guest-count buttons (~869, ~875), meal buttons (~896), event buttons (~924), email input (~954)
- Test: `tests/InvitationCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to the `"InvitationCard — RSVP idle nudge"` describe block from Task 3:

```tsx
  it("cancels the nudge the moment the guest picks an attendance option", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    act(() => { fireIntersection(true); });
    await act(async () => { vi.advanceTimersByTime(10000); });
    fireEvent.click(screen.getByText(/Yes, I'll be there/i));

    await act(async () => { vi.advanceTimersByTime(25000); });
    expect(screen.queryByText(/see what's next/i)).not.toBeInTheDocument();
  });

  it("the nudge's link advances the guest the same way the main Explore button does", async () => {
    render(<InvitationCard guestName="James" onExplore={exploreMock} />);
    await act(async () => { vi.advanceTimersByTime(500); });
    await navigateToCard();

    act(() => { fireIntersection(true); });
    await act(async () => { vi.advanceTimersByTime(25000); });
    fireEvent.click(screen.getByText(/see what's next/i));

    expect(exploreMock).toHaveBeenCalledOnce();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/InvitationCard.test.tsx -t "cancels the nudge"`
Expected: FAIL — clicking "Yes, I'll be there!" does not cancel the timer yet (the attendance button doesn't call `markRsvpInteraction()` yet), so the nudge still appears at 25s.

(The second new test, "the nudge's link advances the guest...", is expected to already PASS after Task 3 since `handleExplore` was already wired to the nudge button — it's included here for completeness of interaction coverage, not because it depends on this task's implementation.)

- [ ] **Step 3: Write minimal implementation**

In `components/phases/InvitationCard.tsx`, update each RSVP interaction handler to call `markRsvpInteraction()` first:

Attendance buttons (currently `onClick={() => setRsvpResp(opt.value)}` around line 841):
```tsx
                        onClick={() => { markRsvpInteraction(); setRsvpResp(opt.value); }}
```

Guest-count decrement (currently `onClick={() => setRsvpCount(c => Math.max(1, c - 1))}` around line 869):
```tsx
                            onClick={() => { markRsvpInteraction(); setRsvpCount(c => Math.max(1, c - 1)); }}
```

Guest-count increment (currently `onClick={() => setRsvpCount(c => Math.min(20, c + 1))}` around line 875):
```tsx
                            onClick={() => { markRsvpInteraction(); setRsvpCount(c => Math.min(20, c + 1)); }}
```

Meal-preference buttons (currently `onClick={() => setRsvpMeal(pref)}` around line 896):
```tsx
                                onClick={() => { markRsvpInteraction(); setRsvpMeal(pref); }}
```

Event buttons (currently `onClick={() => setRsvpEvents(evt.value)}` around line 924):
```tsx
                                onClick={() => { markRsvpInteraction(); setRsvpEvents(evt.value); }}
```

Email input (currently `onChange={e => setRsvpEmail(e.target.value)}` around line 954):
```tsx
                        onChange={e => { markRsvpInteraction(); setRsvpEmail(e.target.value); }}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/InvitationCard.test.tsx -t "cancels the nudge"`
Expected: PASS

- [ ] **Step 5: Run the full test file (both describe blocks) to confirm no regressions**

Run: `npx vitest run tests/InvitationCard.test.tsx`
Expected: all tests PASS — this includes every test from Tasks 1-4 plus the pre-existing tests at the top of the file.

- [ ] **Step 6: Commit**

```bash
git add components/phases/InvitationCard.tsx tests/InvitationCard.test.tsx
git commit -m "$(cat <<'EOF'
feat: cancel the RSVP idle nudge on any form interaction

Wires every RSVP input (attendance, guest count, meal, events, email)
to cancel the idle-nudge timer the moment the guest engages with the
form, so the nudge never appears once they've actually started.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Manual verification in the browser

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server and open the invitation flow**

Run the project's dev server (via the `run` skill or `preview_start`, per this session's tooling) and navigate through the envelope-opening animation to the full card.

- [ ] **Step 2: Verify the merged RSVP → Explore flow**

Scroll to the RSVP section, submit an RSVP (any option), and confirm:
- The "RSVP Confirmed ✅" card shows the new "You're all set 🎉 — the countdown, photos & more are just below." line.
- The teaser chips ("🕐 Countdown · 📸 Gallery · 📍 Venue & more") appear directly above the Explore button with no visible gap/divider disconnect.

- [ ] **Step 3: Verify the idle nudge**

Reload, scroll to the RSVP section, and wait ~25 seconds without clicking anything. Confirm:
- The nudge ("Take your time... Curious what's ahead?" / "See what's next →") fades in below the attendance options.
- The RSVP form remains fully usable — the nudge does not block or replace it.
- Clicking "See what's next →" advances to the pre-wedding phase, same as the main Explore button.

- [ ] **Step 4: Verify the nudge is cancelled by interaction**

Reload, scroll to the RSVP section, click any attendance option within the first 25 seconds, then wait past 25 seconds total. Confirm the nudge never appears.

- [ ] **Step 5: Report results to the user**

Summarize what was verified (with a screenshot if useful) — no code changes in this task, verification only.

---

## Self-Review Notes

- **Spec coverage:** Section 1 (merged flow) → Tasks 1 + 2. Section 2 (static teaser chips) → Task 1. Section 3 (idle nudge) → Tasks 3 + 4. "Explicitly out of scope" items (RSVP submission logic, funnel instrumentation, live/dynamic teaser content, auto-navigation, `relinkSlot` flow changes) are untouched by every task above — confirmed no task modifies `submitRsvp`, `lib/breach.ts`, `useTrackPageVisit`, or the `relinkSlot` branch.
- **Placeholder scan:** no TBD/TODO markers; every step has literal code.
- **Type consistency:** `rsvpStalled` (boolean), `rsvpSectionRef` (`HTMLDivElement`), `rsvpIdleTimer` (`ReturnType<typeof setTimeout> | null`), `rsvpIdleArmed` (boolean ref), and `markRsvpInteraction()` (no args, no return) are each defined once in Task 3 and referenced identically (same names/signatures) in Task 4 — no drift.
