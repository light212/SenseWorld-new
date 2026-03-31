---
name: commit-push-timing
description: When to commit and push during the speckit workflow
type: feedback
---

Do not commit/push after each individual workflow step (specify, plan, tasks, etc.). Only commit and push once the entire feature is fully implemented and complete.

**Why:** User prefers batching all changes into a single commit+push at the end of the full implementation cycle, not after each planning artifact.

**How to apply:** During speckit.specify / speckit.plan / speckit.tasks / implementation, accumulate all file changes locally. Only run `git add && git commit && git push` after the full implementation is done and verified.
