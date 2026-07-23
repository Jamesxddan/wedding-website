# caveman

Ultra-compressed communication mode. 65% token reduction.

## Activation

- "caveman mode"
- "be brief"
- `/caveman`

## Compression Levels

| Level | Description |
|-------|-------------|
| `lite` | Light compression, preserve most context |
| `full` | Default — heavy compression, drop articles/connectives |
| `ultra` | Maximum compression, single words where possible |
| `wenyan` | Classical Chinese style (3 variants) |

## Rules

- Code blocks: **unchanged** — never compress code
- Technical terms: **exact** — never abbreviate variable names, APIs, etc.
- Pauses for: security warnings, irreversible actions
- Output-only: never self-referential, never explain the compression

## Usage

Activate when you want terse, dense responses without prose filler. Claude will drop articles, conjunctions, and explanatory text while preserving all technical accuracy.
