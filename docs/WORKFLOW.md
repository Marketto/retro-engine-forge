# Workflow: from a bug to a pull request

Each step names the skill that runs it (`.claude/skills/<name>/SKILL.md`) and the rules it enforces
([`RULES.md`](RULES.md)). Step 0 comes first on every new target project.

```
learn project ─► find ─► reproduce ─► upstream? ─► original evidence ─► minimal fix ─► build ─► test in game
                                                                                                    │
          PR (human text) ◄── human commits/rewords ◄── double review ◄── card ◄────────────────────┘
```

| # | Step | Skill | Output | Rules |
|---|---|---|---|---|
| 0a | **Context**: which engine, game, version, platform; the human's original executable. Missing or uncertain: ask | `learn-project` | `forge context` asks nothing | R30, R31 |
| 0 | **Learn the project**: AI policy, contributing guide, style, commit format, PR template, license, channels | `learn-project` | `project-rules.md` and `forge.conf` in the work folder | R0 |
| 1 | **Find** candidates: unimplemented opcodes, `TODO`, crashes, differences from the original game, bug tracker | `survey-engine` | ranked list with a scene to reproduce | — |
| 2 | **Reproduce** in the game, with a save or a script for the test driver | `test-in-game` | a case file that shows the bug | R17 |
| 3 | **Upstream check**: still present on the current main branch? | `investigate-bug` | yes / dropped | R18 |
| 4 | **Evidence** in the original executable: routine, address, 2–5 lines | `disasm-evidence` | evidence block for the card | R12, R25 |
| 5 | **Minimal fix** from the main branch, one logical change, project style | `minimal-fix` | change + local `DRAFT` scratch commit | R4–R8, R13, R14, R20, R29 |
| 6 | **Build** each commit on its own | `minimal-fix` | builds | R13 |
| 7 | **Test in game**, before (parent) and after (commit), same case, plus the regression cases of every game of the engine | `test-in-game` | OK / FAILED / REGRESSION / CHANGED | R17, R32 |
| 7b | **Ready**: card with evidence and neighbouring cases, tests and regressions passed, checker clean | `test-in-game` | `forge ready`: READY | R12, R24, R32 |
| 8 | **Card** for the fix | `minimal-fix` | `cards/<id>.md` | R24 |
| 9 | **Double review** of the block, two independent reviewers | `double-review` | findings, all closed | R19 |
| 10 | **Commits by the human**: they read every change and create or reword each commit with their own message | `prepare-pr` | final commits, checker clean | R2, R3, R8, R26, R27, R29 |
| 11 | **PR**: the human writes the description with the AI disclosure and opens it | `prepare-pr` | PR | R1, R5, R16, R21 |

## Branches and folders

- Checkout of the target project tracking its main branch; one branch per block: `<module>-fixes-<n>`.
- Test driver: one commit on a branch that is **never proposed** (`TEST_BRANCH`), applied with
  `git cherry-pick -n` on top of each commit under test (see [`TESTING.md`](TESTING.md)).
- Work folder (`init`): `forge.conf`, `project-rules.md`, `cases/`, `cards/`, outputs in `.forge/` (private).
- Your public fork can hold everything else; its name does not use the project's name (R15).

## Blocks

A block is a small PR: one topic, a handful of commits, a few dozen lines. Order candidates by value (crash or dead end
first, then visible bugs, then minor ones) and size; send a block only when every commit in it passed steps 4–10. Large
features (R5, R28) wait for the maintainers' go-ahead.
