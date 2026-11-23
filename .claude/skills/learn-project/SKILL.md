---
name: learn-project
description: Learn a target open-source project's rules before contributing - AI policy, contributing guide, code of conduct, style and formatting configuration, commit and PR conventions, license, maintainers' channels and requests - and record them in project-rules.md and forge.conf. Use first on every new target project, and again before each PR.
---

# Learn the target project (R0)

First, the context (R30, R31): which engine, which game, version, language and platform, which other games share the
engine, and where the human's own copy of the original executable is. Take them from the request and `forge.conf`;
**ask the human** for anything missing or uncertain, then fill `ENGINE`, `GAME_TITLE`, `GAME_VERSION`, `PLATFORM`,
`OTHER_GAMES`, `ORIGINAL_EXE` and run `forge context` until it asks nothing.

Then, in the project's checkout and website:
1. **Policies**: AI policy (e.g. `AI-GUIDELINES.md`, `AI_POLICY.md`, a section of `CONTRIBUTING.md`), contributing guide,
   code of conduct, PR template (`.github/pull_request_template.md`), issue templates, license and header of source files.
2. **Style**: `.clang-format`, `.editorconfig`, linters, style guide pages (wiki pages may block automated readers: ask
   the human to open them and paste the key points).
3. **Commits**: commit guidelines; measure the history of the module you will touch
   (`git log --format=%s -- <module> | head -200`): prefixes, length, tense, body wrapping, merges.
4. **Code**: measure the touched files: comment length and density, naming, constructs used and avoided, logging
   functions, container classes, line lengths.
5. **People**: where maintainers want to be contacted first (chat, forum, issue), and what they asked in past reviews.

Write `project-rules.md` in the work folder: one line per rule with its **source** (file, URL, or "measured on N
commits/files"), and where the project is stricter or different from `docs/RULES.md` defaults. Fill `forge.conf`
(`TITLE_PREFIXES`, `INDENT`, `POINTER_STYLE`, `KEYWORD_SPACE`, `ERROR_PATTERNS`, `NEW_FILE_HEADER`, build and run
commands). Show the human the differences from the defaults; they confirm.
