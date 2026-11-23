---
name: double-review
description: Run the two independent reviews of a block of commits - project rules and style (format, naming, comments, constructs, one change per commit) and correctness (matches the original's disassembly, no regressions in other games of the engine). Use before a block becomes a PR (rule R19).
---

# Double review

Spawn two reviewers **in parallel and independently** (agents `rules-reviewer` and `correctness-reviewer`). Give each
the commit range, the checkout path, `project-rules.md` and the cards; **do not** give them your conclusions or the
test results.

- Rules reviewer: R0 (`project-rules.md`), R4–R8, R13, R20, plus `forge check` output.
- Correctness reviewer: each change against the original's assembly (the reviewer reads it in `ORIGINAL_EXE`, not only
  the card), the other paths of the same routine, shared code used by other games of the engine, the regression results;
  flags anything the assembly does not support.

Collect findings as `commit | finding | severity | fix`. Apply fixes, rerun the tests (R17) and review the changed
commits again. The block closes when both reviews have no open findings.
