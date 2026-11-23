# retro-engine-forge

Agentic toolkit to **analyze and fix game engines** in open-source reimplementation projects and to prepare
contributions that follow **the target project's own rules, best practices, guidance and documentation** — with the
human contributor as the only author.

## Why
Projects that reimplement classic game engines often accept AI-assisted contributions only on strict terms:
disclosure, human-written messages, human authorship, short comments, small PRs. Their maintainers also ask for fixes
backed by the **original executable's disassembly** and for **minimal, bisectable commits** on the main branch. This
toolkit turns those expectations into a workflow, checks and agents, so the AI does the digging and the human stays in
charge.

## What's inside
| | |
|---|---|
| [`docs/RULES.md`](docs/RULES.md) | R30–R31: know the engine and game version, and have the original executable (or ask); R0: the target project's rules come first; then strict defaults on AI use, maintainers' usual requests, and this toolkit's practice (R1–R32) |
| [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | learn the project → survey → reproduce → upstream check → evidence → minimal fix → test in game → card → double review → human commits → PR |
| Skills (`.claude/skills/`) | `rules`, `learn-project`, `survey-engine`, `investigate-bug`, `disasm-evidence`, `minimal-fix`, `test-in-game`, `double-review`, `prepare-pr` |
| Agents (`.claude/agents/`) | `engine-analyst`, `disasm-analyst`, `tester`, `rules-reviewer`, `correctness-reviewer` |
| `check` | Commit checker configured from the project's conventions: title prefixes and length, `DRAFT` left, co-author trailers, bots, merges, indentation, trailing spaces, braces, pointer style, forbidden constructs, long comments, license header in new files |
| `context` | Engine, game, version, platform and original executable from `forge.conf`, with the questions to ask the human when something is missing |
| `test` / `play` | Build every commit and its parent with a test driver and play the bug's scene before/after, plus the regression cases of every game of the engine ([`docs/TESTING.md`](docs/TESTING.md), [`driver/`](driver/README.md)) |
| `ready` | Per commit: card with engine and evidence (routine + address, neighbouring cases), fix tested in game, regressions unchanged, checker clean |
| `le2elf` | DOS/4GW LE executable → ELF with Watcom symbols, for Ghidra/objdump ([`docs/DISASSEMBLY.md`](docs/DISASSEMBLY.md)) |
| MCP server | Rules, guides, templates and the checker for any MCP client |
| [`templates/`](templates) | `forge.conf`, project rules, card per fix, test case, PR checklist |

## Quick start
```bash
npx -y github:Marketto/retro-engine-forge init      # in your work folder: forge.conf, project-rules.md, cases/, cards/
# fill forge.conf and project-rules.md from the target project's documents (skill learn-project)
npx -y github:Marketto/retro-engine-forge context       # asks what is missing: engine, game version, original executable
npx -y github:Marketto/retro-engine-forge test my-fixes-1
npx -y github:Marketto/retro-engine-forge ready --range main..my-fixes-1
```
With Claude Code: `/plugin marketplace add Marketto/retro-engine-forge`, `/plugin install retro-engine-forge@retro-engine-forge`,
then "learn the rules of the project in ../target" or `/retro-engine-forge:survey-engine`.

All the ways to use it (plugin, web, CLI, other agents, MCP, one-line prompt): [`docs/MODES.md`](docs/MODES.md).

## Principles
- **The project's rules first.** Its AI policy, contributing guide, style and maintainers' requests override the defaults.
- **The human is the author.** The AI never writes commit messages or PR descriptions and never makes the commits that are proposed.
- **Know what you work on.** Engine, game version and the original executable are established first; when unsure, the agent asks.
- **Evidence over guesses.** Every fix or restored feature is checked against the original's assembly — the case fixed and the neighbouring ones; cards cite a few lines, never the listing.
- **Played, not assumed.** Every commit is tested in game, before and after, and the regression cases must not change.
- **Small and reviewable.** One change per commit, a few commits per PR, two independent reviews per block.
- **Copyright respected.** No game data, no transcribed decompiled code, license headers kept.

## License
GPL-3.0-or-later. See [`NOTICE`](NOTICE) for names, trademarks and game data.
