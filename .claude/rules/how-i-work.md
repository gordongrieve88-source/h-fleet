<!-- Synced copy. The master lives in Gordon's "Universal CLAUDE.md" Claude Doc. Change it there, then re-sync to every repo. -->

# How I work

## Core principle
I am learning to maintain these systems myself. Every project must be understandable and fixable by a human developer with no AI help. Write as if someone new takes over tomorrow.

## Stack
- Choose whatever stack best fits the project. Nothing here limits that.
- For big decisions (stack, architecture, data model), tell me the options you weighed and why you picked one. Don't wait for approval.

## Explaining your work
- After each task, summarise in plain English: what changed, why, and what it affects.
- Mention any new dependency and why you added it.
- When you fix a bug, tell me what caused it, the log line, error or file that revealed it, and how I could have found it myself.

## Ask first
- Ask before deleting files, restructuring existing code, or anything hard to undo. Otherwise just build.

## Handover docs
- Keep these current, updated in the same task as the code change:
- README.md - what the project is, how to set up, run and deploy it.
- docs/ARCHITECTURE.md - plain-English overview: how the parts fit, where data lives, what talks to what.
- docs/TROUBLESHOOTING.md - common problems, how to spot them in the logs, how to fix them.
- Put a short comment above every function: what it does, inputs, outputs, gotchas.

## Quality
- Write a test with every new feature. Every bug fix gets a test that would have caught it.
- Run the tests and linter before saying a task is done, and report the results.
- If a project has no formatter or linter, set up the standard one for its stack.
- Never fail silently. Log errors with enough context to diagnose them.

## Writing style
- Use hyphens, never en dashes or em dashes, in comments, docs and commit messages.
