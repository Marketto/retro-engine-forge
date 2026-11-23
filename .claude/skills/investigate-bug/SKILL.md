---
name: investigate-bug
description: Take one candidate bug from report to root cause - reproduce it in game, check it still exists on the project's current main branch, find the code path and the original game's behaviour. Use before writing any fix.
---

# Investigate a bug

0. **Context** (R30, R31): `forge context`. Unknown engine, game version or missing executable: ask the human first.
1. **Reproduce** with the test driver (`templates/case.txt`) or a save; write down the exact scene.
2. **Upstream** (R18): update the main branch from the project's remote (`forge play` warns when it is stale), build it
   and reproduce there. Gone? Stop.
3. **Code path**: from the script opcode / input event / resource loader to the faulty line. Read the surrounding file
   to learn its naming and style (R20).
4. **Original** (R12): skill `disasm-evidence`. The original's behaviour defines the fix, not a guess.
5. Report: root cause in two lines, evidence, the smallest change that reproduces the original, the other paths of the
   same original routine (R32), and the scenes of every game of the engine that run through the code you would touch
   (they become regression cases). Wait for the human before writing code if the change is not obvious.
