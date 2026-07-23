# superpowers

Development methodology for shipping high-quality code with AI assistance.

## Stages

| Stage | Description |
|-------|-------------|
| **Brainstorm** | Explore approaches, define scope, identify risks |
| **Git** | Create feature branch, clean working tree |
| **Plan** | Break into 2-5 minute atomic tasks |
| **Implement** | Fresh subagent per task, two-stage review |
| **Test** | Red-green-refactor, no skipping failing tests |
| **Review** | Code review pass before merge |
| **Complete** | Merge, tag, deploy, retrospective |

## Implementation Rules

- Each task gets a **fresh subagent** — no context bleed between tasks
- **Two-stage review**: author self-review → peer/AI review
- Tasks must be atomic: completable in 2-5 minutes
- Never skip failing tests — fix the test or the code

## Platforms

- Claude Code
- Cursor
- GitHub Copilot CLI
- OpenCode

## Usage

Invoke at the start of any non-trivial feature or bug fix. Follow stages in order. The methodology enforces quality gates at each transition.

Maintained by Jesse Vincent / Prime Radiant.
