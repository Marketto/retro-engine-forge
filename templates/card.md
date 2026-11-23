# <id> — `<hash>` <commit title without the ENGINE: prefix>

- **Bug**: what goes wrong, where (room/scene, script opcode, code path), how often.
- **Upstream**: still present in `master` at `<hash>` (R18).
- **Original** (R12): `<routine>` at `0x<address>` in `<EXECUTABLE>`:
  ```
  2–5 lines of assembly or pseudocode that show the original behaviour
  ```
- **Change**: `<file>` +N −M — what the commit does, in one or two lines.
- **Test in game** (R17): case `cases/<id>.txt`.
  - Before: what the player sees / what the log shows.
  - After: what the player sees / what the log shows.
  - Played by: driver (automatic) | human on <date>. "Not played" means not tested.
- **Other games of the engine**: shared code? checked how?
- **Points for the message** (R2: the human writes the text): bullet points only.
