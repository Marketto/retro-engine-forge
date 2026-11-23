# Evidence from the original executable (R12)

Every fix of game logic cites the original: routine, address, a few lines of assembly or pseudocode.

## Getting a readable binary

- **DOS/4GW LE executables** (Watcom, common in 1993–1997 DOS games): `python3 tools/le2elf.py GAME.EXE game.elf`
  writes an ELF32 i386 file with fixups applied and the Watcom debug symbols when present
  (function names ending in `_`). Open it in Ghidra, or disassemble with `objdump -d -M intel` (GNU binutils) or
  Python `capstone`.
- **Amiga hunks, NE, MZ**: Ghidra imports them directly.
- Strings first: find the script keyword or error text, then its cross-references.

## What to write in the card

```
doorcheck_ 0x1a2b0: cmp eax,[0x4c010] / je skip   ; same zone as last frame: no ENTER
(illustrative example, not taken from a real game)
```

- Name the routine (symbol or your own label) and the address.
- Show the **decision**, not the whole function.
- Say what the original does where the reimplementation differs, and whether the difference is a port bug
  (event-based input, pointers instead of fixed structures) or a logic bug.
- When the disassembly contradicts the planned fix, the disassembly wins: change the fix or drop it.

## Rules

- Copyright (R25): the executable and its disassembly belong to the game's rights holders. Never publish the
  executable, its symbol tables or large chunks of its disassembly; cite only the few lines that show the decision.
- Reimplement the behaviour in the project's own code and style: never transcribe decompiled routines into a commit.
- If the fix has no counterpart in the original (a crash in the reimplementation's own code), say what the original
  does at the same point, if anything.
