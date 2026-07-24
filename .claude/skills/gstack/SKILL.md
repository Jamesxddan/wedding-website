# gstack v1.2.0

Intelligent router skill. Routes commands to the right sub-skill or workflow.

## Routes

| Command | Description |
|---------|-------------|
| `/office-hours` | General Q&A and guidance |
| `/plan-eng-review` | Engineering planning review |
| `/qa` | QA and testing workflows |
| `/investigate` | Debugging and root cause analysis |
| `/review` | Code review |
| `/ship` | Ship/deploy workflow |
| `/land-and-deploy` | Landing and deployment |
| `/design-consultation` | Design consultation |
| `/document-generate` | Documentation generation |
| `/spec` | Specification writing |
| `/context-save` | Save session context |
| `/context-restore` | Restore session context |
| `/canary` | Canary deployment checks |
| `/retro` | Retrospective facilitation |

## Configuration

- **PROACTIVE** (default: true) — Proactively suggest next steps
- **SESSION_KIND** — `interactive` | `headless` | `spawned`
- **PLAN_MODE** — Enable planning mode before execution

## Usage

Type any route command to activate the corresponding workflow. gstack will route your request to the appropriate sub-skill and provide structured guidance.
