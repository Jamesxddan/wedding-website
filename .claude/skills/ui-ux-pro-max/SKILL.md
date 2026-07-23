# ui-ux-pro-max

Design intelligence database for generating production-quality UI/UX designs.

## Database

- 84 design styles
- 192 color palettes
- 74 font pairings
- 192 product types
- 98 UX guidelines
- 104 icon entries
- 16 GSAP motion presets
- 25 chart types
- 22 tech stacks

## Workflow

1. **Identify** the product type and domain
2. Apply **--design-system** flag to select design system
3. Apply **--domain** flag to match industry conventions
4. Apply **--stack** flag to match tech stack

## Dials

| Flag | Range | Description |
|------|-------|-------------|
| `--variance` | 1-10 | Visual variation level |
| `--motion` | 1-10 | Animation intensity |
| `--density` | 1-10 | Information density |

## Anti-Patterns to Avoid

- Removing focus rings (accessibility violation)
- Hover-only interactions (mobile-hostile)
- Horizontal scrolling (breaks UX)
- Placeholder-only labels (form accessibility failure)

## Usage

Invoke when designing UI components, pages, or full products. Combine with `--domain`, `--stack`, and dial flags for tailored output. Works with `ui-styling` for implementation.
