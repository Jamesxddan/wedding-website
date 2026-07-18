@AGENTS.md

# Project Rules

## Git Push Policy

- `git push origin main` — **requires explicit user signoff** before pushing. Always commit locally and wait for approval.
- `git push origin staging` — free to push without signoff. Staging is a test environment.
- Any other branch — free to push without signoff.

## Admin Preview

- The admin panel's Preview tab loads `/preview` in an iframe.
- `/preview` renders the full site in RETURN_VISIT mode (countdown + all sections) with no session check.
- Do NOT add session logic or phase detection to `/app/preview/page.tsx` — it must always show the site as a returning guest sees it.
- The dev server, staging branch, and admin preview mode are exempt from the production push signoff rule.
