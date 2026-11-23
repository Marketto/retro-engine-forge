#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Prepares a work folder: forge.conf, cases/, cards/, .gitignore entries. Never overwrites existing files.
//   node tools/init.mjs [folder]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function init(dir = ".") {
  const d = path.resolve(dir);
  const done = [];
  const copy = (from, to) => {
    const t = path.join(d, to);
    if (fs.existsSync(t)) return;
    fs.mkdirSync(path.dirname(t), { recursive: true });
    fs.copyFileSync(path.join(ROOT, from), t);
    done.push(to);
  };
  copy("templates/forge.conf", "forge.conf");
  copy("templates/case.txt", "cases/_template.txt");
  copy("templates/card.md", "cards/_template.md");
  copy("templates/pr-description.md", "pr-description.md");
  copy("templates/project-rules.md", "project-rules.md");
  const gi = path.join(d, ".gitignore");
  const lines = fs.existsSync(gi) ? fs.readFileSync(gi, "utf8") : "";
  if (!lines.includes(".forge/")) { fs.appendFileSync(gi, `${lines && !lines.endsWith("\n") ? "\n" : ""}# retro-engine-forge outputs (may contain game screenshots: keep private)\n.forge/\n`); done.push(".gitignore"); }
  return done.length ? `Created: ${done.join(", ")}. Fill project-rules.md and forge.conf from the target project (skill learn-project).` : "Nothing to do: the folder is already initialized.";
}

if (process.argv[1]?.endsWith("init.mjs")) console.log(init(process.argv[2] || "."));
