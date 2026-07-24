# design

Master design router. Routes to specialized design sub-skills.

## Routes

| Sub-skill | Description |
|-----------|-------------|
| `brand` | Brand voice and assets |
| `design-system` | Design tokens and system |
| `ui-styling` | Tailwind CSS + shadcn/ui implementation |
| `logos` | Logo generation (55+ styles, 30 palettes, Gemini AI) |
| `CIP` | Corporate identity packages (50+ deliverables, 20 styles) |
| `slides` | Presentation slides (Chart.js, HTML) |
| `banners` | Marketing banners (see banner-design skill) |
| `icons` | Icon sets (15 SVG styles, Gemini AI) |
| `social-media` | Social assets (Instagram, Facebook, LinkedIn, Twitter, Pinterest, TikTok) |

## Requirements

- Python (for logo/icon generation via Gemini)
- Gemini API key (set `GEMINI_API_KEY`)

## Usage

Invoke `/design` followed by the sub-skill name and brief. Routes automatically to the right specialist workflow. For UI implementation combine with `ui-ux-pro-max` for design direction.
