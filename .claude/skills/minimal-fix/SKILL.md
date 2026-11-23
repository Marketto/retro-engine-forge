---
name: minimal-fix
description: Write the smallest change that reproduces the original game's behaviour - from the main branch, the target project's style and naming, short comments, one logical change, builds alone - as a local DRAFT scratch commit plus a card for the human. Use after investigate-bug.
---

# Minimal fix

0. `forge context` asks nothing (R30, R31); the evidence (skill `disasm-evidence`) is in hand.
1. Branch from the project's main branch (R14): `<module>-fixes-<n>`; one logical change per commit (R13).
2. Code: the smallest change; reuse existing names (R20); only constructs the project allows (R7, `project-rules.md`);
   its formatting (R6); comment only what is not obvious, one or two short lines (R4). No unrelated reformatting.
3. Keep it as a **local scratch commit** titled `DRAFT <prefix>: <summary>` so it can be built and tested; never push
   it. The commit the human proposes is created or reworded by the human (R2, R29).
4. Build it alone: `forge play <commit>`.
5. Write the card from `templates/card.md` (R24), with "points for the message" as bullets.
6. `forge check --range <commit>~1..<commit> --allow-draft`: fix every error.
Then: skill `test-in-game`.
