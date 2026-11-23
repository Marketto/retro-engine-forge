#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// retro-engine-forge command line. Without cloning:  npx -y github:Marketto/retro-engine-forge <command>
//   init [folder]                     forge.conf, cases/, cards/ in a work folder
//   rules | workflow | testing | disasm   print the docs
//   context                           engine, game, version and original executable; what to ask the human (R30, R31)
//   check [--range A..B] [...]        check commits against the rules (tools/check-commits.mjs --help)
//   ready [--range A..B]              per commit: card with evidence, tests in game, regressions, checker (R12, R17, R32)
//   test <branch|range|commit> [case...]   build and test commits in game, before/after (bash)
//   play <commit>                     build a commit for manual play (bash)
//   le2elf <GAME.EXE> <out.elf>       DOS/4GW LE executable -> ELF for Ghidra/objdump (python3)
//   enable-plugin [folder]            enable the Claude Code plugin in a repo
//   review [range]                    double review with Claude Code (plugin loaded from this copy)
//   mcp                               MCP server (stdio)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [cmd, ...rest] = process.argv.slice(2);
const run = (bin, args) => {
  const r = spawnSync(bin, args, { stdio: "inherit" });
  if (r.error) { console.error(`${bin} not found: ${r.error.message}`); process.exit(1); }
  process.exit(r.status ?? 1);
};
const doc = f => process.stdout.write(fs.readFileSync(path.join(ROOT, f), "utf8"));

switch (cmd) {
  case "init": { const { init } = await import("./init.mjs"); console.log(init(rest[0] || ".")); break; }
  case "rules": doc("docs/RULES.md"); break;
  case "workflow": doc("docs/WORKFLOW.md"); break;
  case "testing": doc("docs/TESTING.md"); break;
  case "disasm": doc("docs/DISASSEMBLY.md"); break;
  case "check": run(process.execPath, [path.join(ROOT, "tools/check-commits.mjs"), ...rest]); break;
  case "context": run(process.execPath, [path.join(ROOT, "tools/ready.mjs"), "--context", ...rest]); break;
  case "ready": run(process.execPath, [path.join(ROOT, "tools/ready.mjs"), ...rest]); break;
  case "test": run("bash", [path.join(ROOT, "tools/test-commits.sh"), ...rest]); break;
  case "play": run("bash", [path.join(ROOT, "tools/build-commit.sh"), ...rest]); break;
  case "le2elf": run("python3", [path.join(ROOT, "tools/le2elf.py"), ...rest]); break;
  case "enable-plugin": { const { enablePlugin } = await import("./enable-plugin.mjs"); console.log(enablePlugin(rest[0] || ".")); break; }
  case "review": run("claude", ["--plugin-dir", ROOT, `/retro-engine-forge:double-review ${rest.join(" ") || "master..HEAD"}`]); break;
  case "mcp": await import("./mcp-server.mjs"); break;
  default:
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(2, 14).map(l => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exit(cmd && cmd !== "help" ? 1 : 0);
}
