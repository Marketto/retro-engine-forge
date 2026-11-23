# Ways to use retro-engine-forge

| # | Mode | For | Needs |
|---|---|---|---|
| 1 | Claude Code in this repo | working on the toolkit, or with the target project's checkout next to it | clone |
| 2 | Claude Code plugin | any repo, including the target project's checkout | Claude Code on a computer |
| 3 | Plugin enabled in a repo | everyone who opens that repo | a committed `.claude/settings.json` |
| 4 | Claude Code on the web | browser or phone | claude.ai/code with this repo |
| 5 | Command line | checks and tests without AI, CI | Node 20+, bash, python3 |
| 6 | Other AI agents | Codex, Cursor, Copilot, Gemini | `AGENTS.md` |
| 7 | MCP server | any MCP client (Claude Desktop, Cursor, VS Code...) | Node 20+ |
| 8 | One-line prompt | any chat with web access | nothing |

| | Rules & workflow | Check commits | Test in game | Agents & skills |
|---|---|---|---|---|
| 1–3 Claude Code / plugin | ✅ | ✅ | ✅ | ✅ |
| 4 Web | ✅ | ✅ (with the checkout cloned in the session) | ❌ (needs your game files) | ✅ |
| 5 CLI | ✅ (`rules`, `workflow`) | ✅ (`check`) | ✅ (`test`, `play`) | ❌ |
| 6 Other agents | ✅ | ✅ (running the CLI) | ✅ (running the CLI) | ✅ (reading the files) |
| 7 MCP | ✅ | ✅ (`check_commits`) | guides only | prompts |
| 8 Prompt | ✅ | — | — | — |

## 1. Claude Code in this repo
```bash
git clone https://github.com/Marketto/retro-engine-forge && cd retro-engine-forge && claude
```
Keep the target project's checkout and the work folder (`init`) next to it.

## 2. Plugin
```
/plugin marketplace add Marketto/retro-engine-forge
/plugin install retro-engine-forge@retro-engine-forge
```
Skills appear as `/retro-engine-forge:<skill>`; the MCP server starts with the plugin. Where `/plugin` is not available
(for example some mobile or cloud sessions), use mode 4 or 8.

## 3. Plugin enabled in a repo
```bash
npx -y github:Marketto/retro-engine-forge enable-plugin
```
Commit `.claude/settings.json`.

## 4. Web
On claude.ai/code pick this repo (and your fork). Testing in game needs the game files, which never go online.

## 5. Command line
```bash
npx -y github:Marketto/retro-engine-forge init                 # forge.conf, project-rules.md, cases/, cards/
npx -y github:Marketto/retro-engine-forge check --range main..my-fixes-1
npx -y github:Marketto/retro-engine-forge test my-fixes-1
npx -y github:Marketto/retro-engine-forge le2elf GAME.EXE game.elf
```

## 6. Other agents
`AGENTS.md` is the entry point (Codex, Cursor, Copilot read it; `GEMINI.md` and `CLAUDE.md` point to it).

## 7. MCP server
```json
{ "mcpServers": { "retro-engine-forge": { "command": "npx", "args": ["-y", "github:Marketto/retro-engine-forge", "mcp"] } } }
```
Tools: `context`, `rules`, `workflow`, `skill`, `testing_guide`, `disassembly_guide`, `templates`, `check_commits`,
`check_message`, `ready`, `init_workspace`. Prompts: `learn_project`, `survey_engine`, `fix_bug`, `prepare_pr`.

## 8. One-line prompt
```
Follow https://raw.githubusercontent.com/Marketto/retro-engine-forge/main/AGENTS.md and the rules it links for this engine work.
```
