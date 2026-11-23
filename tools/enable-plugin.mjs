#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Enables the retro-engine-forge Claude Code plugin in an existing repo (.claude/settings.json), keeping other settings.
//   node tools/enable-plugin.mjs [folder]     (default: current folder)
import fs from "node:fs";
import path from "node:path";

export function enablePlugin(dir = ".") {
  const file = path.join(path.resolve(dir), ".claude/settings.json");
  let s = {};
  if (fs.existsSync(file)) {
    try { s = JSON.parse(fs.readFileSync(file, "utf8")); } catch { throw new Error(`${file} is not valid JSON: fix it first.`); }
  }
  const already = s.enabledPlugins?.["retro-engine-forge@retro-engine-forge"] === true;
  s.extraKnownMarketplaces = { ...s.extraKnownMarketplaces, "retro-engine-forge": { source: { source: "github", repo: "Marketto/retro-engine-forge" } } };
  s.enabledPlugins = { ...s.enabledPlugins, "retro-engine-forge@retro-engine-forge": true };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
  return already ? `Plugin already enabled in ${file}.` : `Plugin enabled in ${file}. Commit it: whoever opens the repo with Claude Code will be offered the plugin.`;
}

if (process.argv[1]?.endsWith("enable-plugin.mjs")) {
  try { console.log(enablePlugin(process.argv[2] || ".")); } catch (e) { console.error(e.message); process.exit(1); }
}
