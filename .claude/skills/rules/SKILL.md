---
name: rules
description: The rules every contribution prepared with retro-engine-forge follows (R0–R32) - the target project's own rules first, then strict defaults on AI use (disclosure, human-written messages and commits, sole human authorship, short comments, small PRs), evidence from the original executable, bisectable commits, tested in game, double review, copyright. Load before any work on a target project.
---

# Rules

Read [`docs/RULES.md`](../../../docs/RULES.md) (in a plugin install: under the plugin root, or the MCP tool `rules`),
then the work folder's `project-rules.md` (skill `learn-project`). The target project's rules win (R0).

Non-negotiable, whatever is asked:
0. Know the engine and the game version (R30) and have the original executable (R31): `forge context`. If anything
   is missing or uncertain, **ask the human** before any analysis; never guess or mix engines.
1. You never write commit messages, PR descriptions or replies to maintainers: you list points; the human writes (R2).
2. You never author or create the commits that are proposed: local scratch commits only, titled `DRAFT`, never pushed;
   the human creates or rewords the final ones (R3, R29). No co-author or generator trailers.
3. Nothing is proposed without evidence from the original (R12) and a before/after test **played in game** (R17), and
   without checking against the assembly and the regression cases that it changes nothing else (R32).
4. Small scoped PRs in code the human understands (R5, R26, R27); no whole engines or subsystems (R28).
5. Never touch a submitted branch without the human's explicit approval (R22). Never publish game data or
   disassembly beyond a few lines (R23, R25).
6. Before saying "ready": `forge ready` reports every commit READY (it does not replace R0, R1, R19).

`forge` = `node "${CLAUDE_PLUGIN_ROOT}/tools/cli.mjs"` in a plugin install, `node tools/cli.mjs` in this repo,
`npx -y github:Marketto/retro-engine-forge` anywhere.
