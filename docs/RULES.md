# Rules

The **target project** is the open-source project that will receive the contribution (an engine, an emulator, a
game reimplementation...). Its rules come first. IDs (`R0`…`R32`) are used by the skills, the checker and the
reviewers. When two rules disagree, the strictest wins.

## Before anything

| ID | Rule |
|---|---|
| R30 | **Know the engine.** Before any analysis or change, establish which engine (and which game, version, language and platform) the work is about: from `forge.conf` (`ENGINE`, `GAME_TITLE`, `GAME_VERSION`, `PLATFORM`), the request, the branch and the files involved. If it is not certain, **ask the human**; never guess or mix engines. Engines often share code between games: say which other games use the code you touch. |
| R31 | **Ask for the original executable.** Every verification is made against the original game's executable (its disassembly). If `ORIGINAL_EXE` is not set or the file is missing, **ask the human** for it (path to their own copy, the exact version they play); never download it or use one found elsewhere. Without it, nothing can be verified or proposed (R12). |

## A. The target project's own rules

| ID | Rule |
|---|---|
| R0 | **Follow the target project's rules, best practices, guidance and documentation**: AI policy, contributing guide, code of conduct, coding and formatting conventions (`.clang-format`, `.editorconfig`, linters), commit and PR guidelines, PR template, license, wiki pages, and what its maintainers ask in reviews and chats. Read them before any work (skill `learn-project`) and record them, with sources, in the work folder's `project-rules.md`. Where the documents are silent, follow the code: measure how the touched files are written. Re-read the AI policy before every PR: it changes. |

## B. Defaults when the target project says nothing stricter

Many projects accept AI-assisted contributions only on terms like these. Apply them unless `project-rules.md`
records a stricter or explicitly different rule.

| ID | Rule |
|---|---|
| R1 | **Disclose AI assistance**, at least in the PR description. |
| R2 | **Commit messages and the PR description are written by the human.** The agent may list the points to cover, never the text. Local scratch commits carry `DRAFT` in the title so they cannot slip through. |
| R3 | **The human is the sole author.** Every line is read, understood and explainable by them. No `Co-Authored-By`, no "Generated with", no AI as (co-)author. |
| R4 | **Short comments**, in the style of the surrounding code; no long explanations written for an AI reader. |
| R5 | **Small, scoped PRs.** Extensive AI-written code is usually reserved for established maintainers; large features are discussed with the maintainers first. |
| R6 | **Formatting** exactly as the project's configuration and existing code (indentation, braces, pointer style, spacing, line length, final newline, no trailing spaces). |
| R7 | **Constructs** allowed by the project (e.g. its own container classes instead of the standard library, no exceptions, its logging functions); engine- or module-specific bans recorded in `project-rules.md`. |
| R8 | **Commit titles and bodies** in the project's format (prefix, length, tense, wrapping); linear history if the project wants it. |
| R9 | **Documentation** where the project requires it (shared code, user-visible changes). |
| R10 | **License** compatible with the project's; its license header in new files. |
| R11 | **No AI-generated media** (art, logos, icons, music, voices) in contributions. |
| R26 | **Know your limits**: use AI assistance only in parts of the code the human understands; the human must be able to explain and maintain every change without the AI. |
| R27 | **No slop**: nothing is submitted that the human has not read, understood and tested ("vibe coding" is not a contribution). |
| R28 | **No whole engines or subsystems reversed by agents**: the toolkit is for targeted fixes; a new engine or a large subsystem needs a human maintainer who knows it deeply and the maintainers' agreement first. |
| R29 | **Commits are made by the human.** The agent may keep local scratch commits (titled `DRAFT`, never pushed) to build and test; the commits that are proposed are created or reworded by the human with their own message. |

## C. Requests that maintainers commonly make of game-engine fixes

| ID | Rule |
|---|---|
| R12 | **Evidence from the original executable.** Every fix of game logic cites the routine and address in the original binary, with a few lines of assembly or pseudocode. Without evidence the change stays in your fork. |
| R13 | **Minimal, usable, traceable, bisectable commits**: one logical change per commit; every commit builds and works on its own. |
| R14 | **Start from the project's main branch.** A big patch on top of a fork is not reviewable: rebuild each fix on the main branch. |
| R15 | **Respect the project's name and trademarks**: forks and tools do not use them in their own names. |
| R16 | **Talk to the maintainers first** in the channel they prefer (chat, forum, issue), especially for larger blocks. |

## D. Working practice of this toolkit

| ID | Rule |
|---|---|
| R17 | **Every commit is tested in game before it is proposed**: the scene of the bug (or of the restored original feature) is played before and after the commit (an automatic driver that really performs the actions, or a manual play-through that was actually done). "It builds and starts" is not a test. A manual check that nobody ran means *not tested*. |
| R32 | **Verified against the assembly and in game, with no regressions.** Every fix or restored feature of the original engine is checked twice: (1) against the original's assembly, so the new behaviour matches the original in the case fixed *and* in the neighbouring cases the same code handles; (2) in game, on the fixed scene and on the **regression cases** (`#@ regression`: scenes of every game of the engine that run through the touched code), which must give the same result before and after unless the original says otherwise. Any difference is explained by the assembly or the commit is not proposed. |
| R18 | **Check upstream first**: is the bug still on the current main branch? If not, drop it. |
| R19 | **Double review** of every block by two independent reviewers who get the code, not the author's conclusions: (1) project rules and style, (2) correctness against the original's disassembly, other games of the same engine, side effects. A block closes only with no open findings. |
| R20 | **Follow precedent**: if the code already names the same thing in the same context, reuse that name. No local variable shadowing a member. No new magic numbers (name them); existing numbers stay as they are (renaming is a separate refactor commit). |
| R21 | **Small PRs, one topic each**; open the next only after the previous one is reviewed. Fixes for an already submitted PR go into the next PR unless the reviewers ask otherwise. |
| R22 | **Changes to a submitted branch** (amend, rebase, force push) only with the human's explicit approval; replies to reviewers are written by the human. |
| R23 | **No game data** in public places: original files and anything extracted from them (scripts, texts, graphics, audio, saves) stay private. Test cases may name rooms and opcodes, not quote game content at length. |
| R24 | **Card per fix** (`templates/card.md`): bug, original behaviour with address, change, before/after test, points for the human's message. |
| R25 | **Copyright.** Game executables, data and their disassembly belong to their rights holders: use them only privately for analysis; cards and PRs cite a few lines at most; never transcribe decompiled code into a commit (reimplement the behaviour). New source files carry the project's license header; code taken from elsewhere only with a compatible license and its notice kept. Images, music and texts are never copied from the game or from other projects. |

## Naming

Use the project's conventions (R0, R20). Typical C++ engine conventions, to verify against the code:

| What | Typical form |
|---|---|
| Classes, structs, types | `UpperCamelCase` |
| Methods, functions | `lowerCamelCase`, verb |
| Members | `_lowerCamelCase` |
| Locals, parameters | `lowerCamelCase`, descriptive; short names only where the file already uses them |
| Constants, enums | `kUpperCamelCase` |
| Globals | `g_lowerCamelCase` |
| Macros | `UPPER_CASE` |
