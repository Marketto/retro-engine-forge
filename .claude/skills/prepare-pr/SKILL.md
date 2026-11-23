---
name: prepare-pr
description: Get a reviewed block of commits ready for a pull request to the target project - the human reads every change and creates or rewords each commit with their own message from the cards' points, the checker passes, the human writes the PR description with the AI disclosure. Use when a block passed testing and double review.
---

# Prepare the PR

1. Confirm: `forge ready --range <main>..<branch>` says every commit READY (context R30–R31, evidence R12, cards R24,
   fix tested in game R17, regressions unchanged R32); double review closed (R19); AI policy re-read (R0).
2. For each commit, show the human the change and the card's "points for the message". **The human** creates or
   rewords the commit (`git commit`, `git rebase -i` with `reword`) with their own message (R2, R3, R29). Do not run
   these for them.
3. `forge check --range <main>..<branch>`: 0 errors, no `DRAFT`, no co-author or generator trailers.
4. Give the human `templates/pr-description.md`; they write the description, including the AI disclosure (R1).
5. The human pushes and opens the PR. Afterwards: changes to the branch only with their approval (R22); new fixes go
   to the next PR (R21).
