---
name: test-in-game
description: Prove an engine commit in game - a case for the engine's test driver that fails on the parent and passes on the commit, run before/after with forge test; extend the driver when it cannot see the effect. Use for every commit before it is proposed (rule R17).
---

# Test in game

Follow [`docs/TESTING.md`](../../../docs/TESTING.md).

1. Write `cases/<id>.txt` from `templates/case.txt`: the real scene of the bug, played by the driver.
2. The `before` checks must prove the bug on the parent; the `after` checks the fix. A case that passes on both proves
   nothing: rewrite it.
3. If the driver cannot do the action or see the effect, extend the driver (its own branch, never proposed). Leave a
   case `#@ manual` only when no driver can do it; then a human must play it before the commit is proposed.
4. Run `forge test <commit> <id>`; on a busy machine repeat timing failures.
5. Report per commit: `commit | case | before | after | played in game: yes/no`. Never write "tested" for a case whose
   manual part was not played. If a commit is wrong in game, report it with logs; do not hide it.
