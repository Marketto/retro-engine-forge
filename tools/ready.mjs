#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Is a block ready to be proposed? Checks engine context (R30), original executable (R31), cards with evidence (R12, R24),
// in-game results of the fix and of the regression cases (R17, R32) and the commit checker, per commit.
//   node tools/ready.mjs [--range main..my-fixes-1] [--conf forge.conf] [--json]      context only: node tools/ready.mjs --context
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readConf, checkRange } from "./check-commits.mjs";

const resolver = conf => p => (path.isAbsolute(p) ? p : path.join(conf.__dir || process.cwd(), p));

// what the agent must know before working, and the question to ask the human when it is missing
export function context(conf) {
  const abs = resolver(conf);
  const missing = [];
  if (!conf.ENGINE) missing.push({ rule: "R30", ask: "Which engine are we working on (its folder name in the project)?" });
  if (!conf.GAME_TITLE || !conf.GAME_VERSION || !conf.PLATFORM) missing.push({ rule: "R30", ask: "Which game, version, language and platform are we testing (exactly the copy you play)?" });
  if (!conf.ORIGINAL_EXE) missing.push({ rule: "R31", ask: "Where is the original executable of that version (path to your own copy)? Every verification is made against its assembly." });
  else if (!fs.existsSync(abs(conf.ORIGINAL_EXE))) missing.push({ rule: "R31", ask: `ORIGINAL_EXE ${conf.ORIGINAL_EXE} does not exist: where is the original executable?` });
  if (conf.ENGINE && conf.SCOPE && !conf.SCOPE.includes(conf.ENGINE)) missing.push({ rule: "R30", ask: `SCOPE ${conf.SCOPE} does not contain ENGINE ${conf.ENGINE}: which one is right?` });
  return {
    engine: conf.ENGINE || null, game: conf.GAME_TITLE || null, version: conf.GAME_VERSION || null, platform: conf.PLATFORM || null,
    otherGames: (conf.OTHER_GAMES || "").split(/\s*,\s*|\s{2,}/).filter(Boolean), originalExe: conf.ORIGINAL_EXE || null, missing,
  };
}

export function parseCard(text) {
  const field = name => (text.match(new RegExp(`^- \\*\\*${name}\\*\\*[^:]*:(.*(?:\\n(?!- \\*\\*).*)*)`, "m")) || [])[1] || "";
  const filled = v => v.trim() && !/<[a-z][^>]*>/i.test(v);
  return {
    engine: filled(field("Engine / game")),
    evidence: /0x[0-9a-f]{3,}/i.test(field("Original")) && filled(field("Original").split("\n")[0]),
    neighbours: filled(field("Neighbouring cases in the original")),
    regressions: filled(field("Regressions")),
    regressionsExplained: /explained/i.test(field("Regressions")),
    playedByHuman: /Played by:\s*human on \d/i.test(text),
  };
}

export function findCard(cardsDir, sha, title) {
  if (!fs.existsSync(cardsDir)) return null;
  const clean = title.replace(/^DRAFT\s+/, "").replace(/^([A-Za-z0-9_-]+: ){1,2}/, "").toLowerCase();
  for (const f of fs.readdirSync(cardsDir).filter(f => f.endsWith(".md") && !f.startsWith("_"))) {
    const t = fs.readFileSync(path.join(cardsDir, f), "utf8");
    const head = t.split("\n")[0].toLowerCase();
    if (head.includes(sha.slice(0, 8)) || (clean && head.includes(clean))) return { file: f, text: t };
  }
  return null;
}

export function readResults(outDir, sha) {
  const f = path.join(outDir, sha.slice(0, 8), "result.txt");
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map(l => { const [kind, name, before, after, result] = l.split(" "); return { kind, name, before, after, result }; });
}

export function judge({ card, results, findings }) {
  const problems = [];
  const errors = findings.filter(f => f.level === "error");
  if (errors.length) problems.push(`checker: ${errors.length} errors (${[...new Set(errors.map(e => e.rule))].join(", ")})`);
  if (!card) problems.push("no card (R24): cards/<id>.md with the commit hash or title in its first line");
  else {
    const c = parseCard(card.text);
    if (!c.engine) problems.push("card: engine/game not stated (R30)");
    if (!c.evidence) problems.push("card: no evidence from the original (routine + 0x address) (R12, R31)");
    if (!c.neighbours) problems.push("card: neighbouring cases of the original routine not checked (R32)");
    if (!c.regressions) problems.push("card: regressions not reported (R32)");
  }
  if (!results) problems.push("not tested in game: run forge test (R17)");
  else {
    const fix = results.filter(r => r.kind === "fix");
    const reg = results.filter(r => r.kind === "regression");
    if (fix.some(r => r.result === "NO-CASE")) problems.push("no case for the fix (R17)");
    for (const r of fix) {
      if (r.result === "FAILED") problems.push(`fix case ${r.name} failed (before ${r.before}, after ${r.after})`);
      if (r.result.includes("MANUAL-PENDING") && !(card && parseCard(card.text).playedByHuman)) problems.push(`fix case ${r.name}: manual part not played (R17)`);
    }
    if (reg.some(r => r.result === "NONE")) problems.push("no regression cases (#@ regression) for this engine (R32)");
    for (const r of reg) {
      if (r.result === "REGRESSION") problems.push(`REGRESSION in ${r.name}`);
      if (r.result === "BROKEN-CASE") problems.push(`regression case ${r.name} fails before and after: fix the case`);
      if (r.result === "CHANGED" && !(card && parseCard(card.text).regressionsExplained)) problems.push(`regression case ${r.name} changed: explain it with the assembly in the card, or fix it (R32)`);
    }
  }
  return problems;
}

function main(argv) {
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--range") opt.range = argv[++i];
    else if (argv[i] === "--conf") opt.conf = argv[++i];
    else if (argv[i] === "--json") opt.json = true;
    else if (argv[i] === "--context") opt.contextOnly = true;
    else if (argv[i] === "-h" || argv[i] === "--help") { console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(2, 6).join("\n")); return 0; }
    else { console.error(`unknown option ${argv[i]}`); return 2; }
  }
  const confFile = opt.conf || process.env.FORGE_CONF || path.join(process.cwd(), "forge.conf");
  const conf = readConf(confFile);
  if (!conf.__dir) { console.error(`${confFile} not found: run "forge init" and fill it (or answer the agent's questions)`); return 2; }
  const ctx = context(conf);
  if (opt.contextOnly || ctx.missing.length) {
    console.log(`Engine: ${ctx.engine || "?"} | Game: ${ctx.game || "?"} ${ctx.version || ""} ${ctx.platform || ""} | Other games: ${ctx.otherGames.join(", ") || "-"} | Original: ${ctx.originalExe || "?"}`);
    for (const m of ctx.missing) console.log(`ASK THE HUMAN (${m.rule}): ${m.ask}`);
    if (opt.contextOnly) return ctx.missing.length ? 1 : 0;
    console.log("Not ready: the context above is incomplete.");
    return 1;
  }
  const abs = resolver(conf);
  const repo = abs(conf.UPSTREAM);
  let commits;
  try { commits = checkRange({ repo, range: opt.range || `${conf.MAIN_BRANCH || "master"}..HEAD`, conf }); }
  catch (e) { console.error(e.message); return 2; }
  const cardsDir = abs(conf.CARDS || "cards");
  const outDir = abs(conf.OUT || ".forge/tests");
  const report = commits.map(c => {
    const sha = execFileSync("git", ["-C", repo, "rev-parse", c.sha], { encoding: "utf8" }).trim();
    const problems = judge({ card: findCard(cardsDir, sha, c.title), results: readResults(outDir, sha), findings: c.findings });
    return { sha: c.sha, title: c.title, ready: problems.length === 0, problems };
  });
  if (opt.json) console.log(JSON.stringify({ context: ctx, commits: report }, null, 2));
  else {
    console.log(`Engine ${ctx.engine}, ${ctx.game} ${ctx.version} ${ctx.platform}; original ${ctx.originalExe}`);
    for (const r of report) {
      console.log(`${r.ready ? "READY    " : "NOT READY"} ${r.sha} ${r.title}`);
      for (const p of r.problems) console.log(`          - ${p}`);
    }
    const n = report.filter(r => r.ready).length;
    console.log(`\n${n}/${report.length} commits ready. Still the human's: messages and commits (R2, R29), PR text with disclosure (R1).`);
  }
  return report.every(r => r.ready) ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) process.exitCode = main(process.argv.slice(2));
