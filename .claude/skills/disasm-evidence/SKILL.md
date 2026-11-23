---
name: disasm-evidence
description: Find and cite the original executable's behaviour (routine, address, a few lines of assembly or pseudocode) for an engine fix - LE/DOS4GW to ELF conversion, Ghidra/objdump/capstone, strings and cross-references - within copyright limits. Use for every fix of game logic (rule R12).
---

# Evidence from the original

Follow [`docs/DISASSEMBLY.md`](../../../docs/DISASSEMBLY.md).

1. Get a readable binary (`forge le2elf` for DOS/4GW LE; Ghidra for the rest). The game and its executable stay private.
2. Find the routine from strings (script keywords, error texts, file names) or symbols.
3. Read the decision that matters; write 2–5 lines of assembly or pseudocode with addresses.
4. Compare with the reimplementation: same, different (how), or missing.
5. If the evidence contradicts the planned fix, say so and change the plan. Without evidence the fix stays out of PRs.

Output: the **Original** block of the card (`templates/card.md`). Never paste large disassembly or game data, never
transcribe decompiled code into a commit (R23, R25).
