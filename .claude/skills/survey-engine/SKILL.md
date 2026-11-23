---
name: survey-engine
description: Find candidate bugs in a game engine of the target project - unimplemented opcodes and functions, TODOs, warnings seen while playing, crashes, differences from the original game - and rank them by value and size. Use when the user asks what can be fixed.
---

# Survey an engine

1. In the checkout (main branch), in the engine folder:
   `grep -rn -E 'not (yet )?implemented|TODO|FIXME|warning\(' --include=*.cpp`; opcodes and functions that only warn.
2. Play the game with the debug log enabled, collect warnings and fatal errors per room/scene.
3. Check the project's bug tracker and the engine's documentation for known issues.
4. For each candidate: scene to reproduce, effect for the player, estimated size, whether the original executable is
   available for evidence (R12), whether the human knows that part of the code (R26).
5. Rank: crash or dead end > visible/audible bug > minor > cosmetic; then by size (small first). Mark large features
   as "talk to the maintainers first" (R5, R16, R28).

Output: a table `candidate | scene | effect | size | evidence available | priority`. Do not start fixing: the human picks.
