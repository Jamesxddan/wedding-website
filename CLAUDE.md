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

## Photo Access Policy

**Dev and staging are open by design — do not add auth gates to them.**

- In **dev** (`!process.env.VERCEL_ENV`): all photo proxy routes (`/api/drive-image`, `/api/drive-photos`) are fully open. No cookie, no referer check, no HMAC token validation. This is intentional so local development works without credentials.
- In **staging** (`process.env.VERCEL_ENV === "preview"`): same open access applies. Staging uses a different registered user name / city from prod, so session-based restrictions must not interfere with testing there.
- In **prod** (`process.env.VERCEL_ENV === "production"`): full auth enforced — HMAC-signed token required, referer and cookie checked.

When writing any photo-serving or Drive API code, gate all auth/restriction logic behind `if (process.env.VERCEL_ENV === "production")` (or equivalently `if (process.env.VERCEL_ENV)`). Never make dev or staging block photo loading.
