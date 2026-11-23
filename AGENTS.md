# retro-engine-forge — guide for AI agents (Claude, Codex, Cursor, Copilot, Gemini...)

Toolkit to **analyze and fix game engines** in open-source reimplementation projects and to prepare contributions
that follow **the target project's rules, best practices, guidance and documentation**. The human contributor stays
the author: you learn the project's rules, investigate, gather evidence, write minimal code, test, review and prepare
checklists; **the human writes every commit message, PR description and reply, makes the commits that are proposed,
and decides**.

## Read first
1. The target project's own rules (skill `learn-project` → `project-rules.md` in the work folder). They win (R0).
2. [`docs/RULES.md`](docs/RULES.md) — defaults and practice R1–R29.
3. [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — the steps from a bug to a PR.

## Router

| Request | Skill (`.claude/skills/`) | Agent (`.claude/agents/`) |
|---|---|---|
| new target project, "what are their rules?" | `learn-project` | — |
| "what can be fixed in engine X?" | `survey-engine` | `engine-analyst` |
| a bug: crash, wrong behaviour, missing opcode | `investigate-bug` → `disasm-evidence` → `minimal-fix` | `engine-analyst`, `disasm-analyst` |
| "does the original do this?" | `disasm-evidence` | `disasm-analyst` |
| test a commit, write a case, extend the driver | `test-in-game` | `tester` |
| review a block of commits | `double-review` | `rules-reviewer` + `correctness-reviewer` (in parallel, independent) |
| get a block ready for a PR | `prepare-pr` | — |
| what rules apply? | `rules` | — |

## Hard limits
- Know which engine, game, version and platform you are working on, and have the human's original executable:
  `forge context`. If anything is missing or uncertain, **ask the human** before doing anything else (R30, R31).
- Never write or edit commit messages / PR text on your own (R2). Never create the commits that are proposed: local
  `DRAFT` scratch commits only, never pushed; the human creates or rewords the final ones (R3, R29).
- Never call a commit "tested" unless its scene was played before/after (R17), it matches the original's assembly also
  in the neighbouring cases, and the regression cases are unchanged (R32): `forge ready`.
- Never propose without evidence from the original executable (R12).
- Only small changes in code the human understands; no whole engines or subsystems (R5, R26–R28).
- Never force-push or amend a submitted branch without the human's explicit approval (R22).
- Never commit, publish or paste game data or more than a few lines of disassembly (R23, R25).

## Tools
`forge <command>` = `node tools/cli.mjs` here, `node "${CLAUDE_PLUGIN_ROOT}/tools/cli.mjs"` in a plugin install,
`npx -y github:Marketto/retro-engine-forge` anywhere. Commands: `init`, `rules`, `workflow`, `testing`, `disasm`,
`context`, `check`, `test`, `ready`, `play`, `le2elf`, `enable-plugin`, `review`, `mcp`.
- Before saying a block is ready: `forge ready --range <range>` with every commit READY.
- Changes to this repo: `npm test` must pass; bump `version` in `.claude-plugin/plugin.json` and `package.json` when
  skills, agents or MCP tools change.
