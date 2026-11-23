# Writing a test driver for an engine

A test driver lets a script play the game: it injects input, jumps to rooms and logs the state the cases check.
It lives in **one commit on its own branch** of your checkout (`TEST_BRANCH` in `forge.conf`) and is **never proposed
upstream**: `forge test` applies it with `git cherry-pick -n` on top of each commit under test.

## Shape

- A small class (e.g. `autotest.{h,cpp}` in the engine folder) that reads the script named by an environment variable
  (`DRIVER_ENV`) and runs one step per frame.
- One hook in the engine's input or main loop (a few lines): `if (_autoTest) _autoTest->step(this);`.
- One line in the build file list.
- Logs through the engine's debug output with a fixed prefix (`AutoTest: ...`) so cases can `grep` them.
- The project's license header in the new files (R25).

Keep the hook small: the cherry-pick must apply cleanly on every commit of your series.

## Commands worth having

| Group | Commands |
|---|---|
| Time | `wait N`, `until N <condition>` (room, mode, idle, menu), `every N <command>` |
| Input | `move X Y`, `click X Y`, `rclick X Y`, `rdown`/`rup`, `key K`, `rtap X Y` (down+up in the same frame) |
| Navigation | `loc ROOM [PART]` through the engine's own location change; `zone NAME` (click a hotspot) |
| State | `state [tag]` one line: mode, room, character, position, scroll, held item, pointer, flags |
| Media | `shot FILE`, `bghash` (hash of the background), `sfxlog` (sound start/stop with rate and channel), `music` (tempo) |
| Text | last balloon/subtitle text size and shape (never log the game's text itself into public files) |
| Saves | `save N`, `load N` through the engine |
| End | `quit` |

## Reading private members

Prefer existing getters. When the driver must read a private member, use the explicit-template-instantiation access
trick or a `friend` declaration **only inside the driver commit**: the commits you propose must not change because of
the driver.
