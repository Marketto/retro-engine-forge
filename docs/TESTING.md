# Testing in game

Rule R17: a commit is proposed only after the scene of the bug has been played before and after the commit.

## Test driver

Game engines rarely have a scripting hook for tests, so each engine gets a small **test driver**: code that reads a
script from an environment variable (`DRIVER_ENV` in `forge.conf`) and, once per frame, injects input and logs state.
It lives in **one commit on its own branch** (`TEST_BRANCH`), is never proposed upstream and is applied with
`git cherry-pick -n` on top of the commit under test. How to write one: [`../driver/README.md`](../driver/README.md).

What the driver logs is what the case checks: when a fix changes something the driver cannot see (pointer, held item,
sound frequency, balloon text), **extend the driver**, do not leave the case manual.

## Cases

A case (`templates/case.txt`) is a driver script plus `#@` lines: `subject` (which commit titles it tests),
`before`/`after` checks (`grep`, `nogrep`, `exit`, `sh`), `timeout`, `env`. A good case **fails on the parent and
passes on the commit**: a case that passes on both proves nothing.

## Running

```bash
forge test <branch|range|commit> [case...]   # build commit and parent with the driver, run the cases
forge play <commit>                          # build a commit without the driver, for manual play
```

`forge` stands for `node <toolkit>/tools/cli.mjs` or `npx -y github:Marketto/retro-engine-forge`. Builds use
`CONFIGURE`, `BUILD`, `BINARY` and the game runs with `RUN` from `forge.conf`; they are cached per driver version and
commit in `$WORK/bin/`. Results: `$OUT/<hash>/{before,after}/<case>/` and `$OUT/summary.txt`.

The game runs without a window (SDL dummy video driver): copy a test config into `$CASE_DIR` with `RUN_FILES`
(software renderer, no startup dialogs, no autosave: a dialog the driver does not expect blocks the run) and point
`RUN` to it. On Linux, if your engine needs a display, run
under `xvfb-run` or set `DISPLAY`.

## Hard cases

| Problem | Way to test |
|---|---|
| Uninitialized member | `#@ env MallocPreScribble=1` (macOS) or another fill pattern, so "before" shows garbage |
| Timing / speed | measure frames per second of a walk or loop with the driver; compare with the original in an emulator |
| Load/save | `save` in the scene, restart, `load` from the menu, check the state line |
| No scene in the data shows it | drive the engine into that state with the debug console or the driver; if impossible, the fix is not proposed |
| Busy machine | repeat a timing-dependent failure before blaming the commit |
