#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Checks commits against the rules in docs/RULES.md and the target project's settings in forge.conf.
//   node tools/check-commits.mjs [--repo <checkout>] [--range main..HEAD] [--conf forge.conf] [--allow-draft] [--json]
// Exit code: 0 no errors, 1 errors found, 2 usage problem.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const DEFAULTS = {
  TITLE_PREFIXES: "", SUBPREFIXES: "", TITLE_MAX: "50", TITLE_HARD: "72", BODY_MAX: "76",
  INDENT: "any", POINTER_STYLE: "any", BRACES: "any", KEYWORD_SPACE: "any", LINE_MAX: "120",
  COMMENT_BLOCK_MAX: "3", NEW_FILE_HEADER: "", ERROR_PATTERNS: "", WARN_PATTERNS: "", SCOPE: "", MAIN_BRANCH: "master",
};

export function readConf(file) {
  const conf = {};
  if (!file || !fs.existsSync(file)) return conf;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    conf[m[1]] = v;
  }
  conf.__dir = path.dirname(path.resolve(file));
  return conf;
}

const list = s => (s || "").split(/\s+/).filter(Boolean);
// trailers and phrases that credit a tool as author; plain names are not flagged (games and products share them)
const AI_TRAILER = /^(Co-Authored-By|Assisted-By|Generated-By):/im;
const AI_CREDIT = /generated (with|by) (an? )?(ai|claude|chatgpt|copilot|gemini|llm|cursor|codex)\b|\b(ai|llm)[- ]generated\b/i;

// --- message ----------------------------------------------------------------------------------------------
export function checkMessage(msg, conf = {}, { allowDraft = false } = {}) {
  const c = { ...DEFAULTS, ...conf };
  const out = [];
  const add = (rule, level, text) => out.push({ rule, level, text });
  const lines = msg.replace(/\s+$/, "").split("\n");
  let title = lines[0] || "";
  if (/^DRAFT\b/.test(title)) {
    if (!allowDraft) add("R2", "error", "title starts with DRAFT: the human has not written the message yet");
    title = title.replace(/^DRAFT\s+/, "");
  }
  const prefixes = list(c.TITLE_PREFIXES);
  if (prefixes.length) {
    const m = title.match(/^([A-Za-z0-9_-]+): (?:([A-Za-z0-9_-]+): )?(.+)$/);
    if (!m) add("R8", "error", `title must start with one of: ${prefixes.map(p => `"${p}: "`).join(", ")}`);
    else {
      if (!prefixes.includes(m[1])) add("R8", "error", `title prefix "${m[1]}" is not one of ${prefixes.join(", ")}`);
      const subs = list(c.SUBPREFIXES);
      if (m[2] && subs.length && !subs.includes(m[2])) add("R8", "warn", `sub-prefix "${m[2]}" not in ${subs.join(", ")}`);
    }
  }
  const summary = title.replace(/^([A-Za-z0-9_-]+: ){1,2}/, "");
  const verb = summary.split(" ")[0];
  if (/\.$/.test(summary)) add("R8", "warn", "title ends with a period");
  if (/^\w+ed$/i.test(verb) && !/^(Need|Speed|Feed|Seed|Embed|Shed)$/i.test(verb)) add("R8", "warn", `use the imperative ("Fix", not "${verb}")`);
  if (/^(Fixes|Adds|Removes|Implements|Updates|Changes|Makes|Uses)$/.test(verb)) add("R8", "warn", `use the imperative ("${verb.replace(/(x|sh|ch|ss)es$/, "$1").replace(/([^s])s$/, "$1")}", not "${verb}")`);
  if (title.length > +c.TITLE_HARD) add("R8", "error", `title is ${title.length} characters (keep it around ${c.TITLE_MAX})`);
  else if (title.length > +c.TITLE_MAX) add("R8", "warn", `title is ${title.length} characters (aim for ${c.TITLE_MAX} or less)`);
  if (lines.length > 1 && lines[1].trim() !== "") add("R8", "error", "second line of the message must be empty");
  lines.slice(2).forEach((l, i) => {
    if (l.length > +c.BODY_MAX && !/https?:\/\//.test(l)) add("R8", "warn", `body line ${i + 3} is ${l.length} columns`);
  });
  if (AI_TRAILER.test(msg)) add("R3", "error", "co-author or generator trailer: the human is the sole author");
  else if (AI_CREDIT.test(msg)) add("R3", "warn", "message credits an AI tool: check the project's policy (disclosure usually goes in the PR description)");
  return out;
}

// --- diff -------------------------------------------------------------------------------------------------
const SOURCE = /\.(c|cc|cpp|cxx|h|hh|hpp|m|mm|js|mjs|ts|py|java|rs|go)$/;
const C_LIKE = /\.(c|cc|cpp|cxx|h|hh|hpp|m|mm)$/;

export function checkDiff(diff, conf = {}) {
  const c = { ...DEFAULTS, ...conf };
  const out = [];
  const add = (rule, level, file, line, text) => out.push({ rule, level, file, line, text });
  const errRe = c.ERROR_PATTERNS ? new RegExp(c.ERROR_PATTERNS) : null;
  const warnRe = c.WARN_PATTERNS ? new RegExp(c.WARN_PATTERNS) : null;
  const headerRe = c.NEW_FILE_HEADER ? new RegExp(c.NEW_FILE_HEADER) : null;
  let file = null, ln = 0, comment = [], newFile = false, headerSeen = false, inBlock = false;
  const flushComment = () => {
    if (comment.length > +c.COMMENT_BLOCK_MAX) add("R4", "warn", file, comment[0], `comment block of ${comment.length} lines: keep comments short`);
    comment = [];
  };
  const flushFile = () => {
    if (file && newFile && headerRe && C_LIKE.test(file) && !headerSeen) add("R25", "error", file, 1, "new source file without the project's license header");
    newFile = false; headerSeen = false; inBlock = false;
  };
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("diff --git")) { flushComment(); flushFile(); file = null; continue; }
    if (raw.startsWith("new file mode")) { newFile = true; continue; }
    const f = raw.match(/^\+\+\+ b\/(.+)$/);
    if (f) {
      file = f[1];
      if (c.SCOPE && !file.startsWith(c.SCOPE.replace(/\/?$/, "/"))) add("R13", "warn", file, 0, `file outside ${c.SCOPE}: is it part of this fix?`);
      continue;
    }
    const h = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (h) { flushComment(); inBlock = false; ln = Number(h[1]); continue; }
    if (!file || raw.startsWith("---")) continue;
    if (raw.startsWith("+")) {
      const t = raw.slice(1);
      if (headerRe && headerRe.test(t)) headerSeen = true;
      if (/[ \t]+$/.test(t)) add("R6", "error", file, ln, "trailing whitespace");
      if (SOURCE.test(file)) {
        // comment lines: //, /* ... and the lines of an open /* */ block
        const isComment = inBlock || /^\s*(\/\/|\/\*)/.test(t);
        if (/\/\*/.test(t) && !/\*\//.test(t.slice(t.indexOf("/*") + 2))) inBlock = true;
        if (inBlock && /\*\//.test(t)) inBlock = /\/\*(?!.*\*\/)/.test(t.slice(t.lastIndexOf("*/") + 2));
        const code = isComment ? "" : t.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "")
          .replace(/"(\\.|[^"\\])*"/g, '""').replace(/'(\\.|[^'\\])*'/g, "''");
        if (c.INDENT === "tabs" && /^ +\S/.test(t) && !(isComment && /^ \*/.test(t))) add("R6", "error", file, ln, "indent with tabs, not spaces");
        if (c.INDENT === "spaces" && /^\t/.test(t)) add("R6", "error", file, ln, "indent with spaces, not tabs");
        const width = t.replace(/\t/g, "    ").length;
        if (width > +c.LINE_MAX) add("R6", "warn", file, ln, `line is ${width} columns`);
        if (C_LIKE.test(file) && code) {
          if (c.KEYWORD_SPACE === "yes" && /\b(if|for|while|switch)\(/.test(code)) add("R6", "error", file, ln, "space after if/for/while/switch");
          if (c.KEYWORD_SPACE === "no" && /\b(if|for|while|switch) \(/.test(code)) add("R6", "error", file, ln, "no space after if/for/while/switch");
          if (c.BRACES === "same-line" && /^\s+\{\s*$/.test(t)) add("R6", "warn", file, ln, "opening brace on its own line: the project puts braces on the same line");
          if (c.POINTER_STYLE === "right" && /^\s*(const\s+)?[A-Z]\w*(::\w+)*(<[^>]*>)?\* [a-z_]\w*\s*[=;,)]/.test(code)) add("R6", "warn", file, ln, 'pointer style is "Type *ptr"');
          if (c.POINTER_STYLE === "left" && /^\s*(const\s+)?[A-Z]\w*(::\w+)*(<[^>]*>)? \*[a-z_]\w*\s*[=;,)]/.test(code)) add("R6", "warn", file, ln, 'pointer style is "Type* ptr"');
        }
        if (code && errRe && errRe.test(code)) add("R7", "error", file, ln, `forbidden by the project: /${c.ERROR_PATTERNS}/`);
        if (code && warnRe && warnRe.test(code)) add("R7", "warn", file, ln, `discouraged by the project: /${c.WARN_PATTERNS}/`);
        if (isComment) comment.push(ln); else flushComment();
      }
      ln++;
    } else if (raw.startsWith(" ")) { flushComment(); ln++; }
  }
  flushComment();
  flushFile();
  return out;
}

// --- git --------------------------------------------------------------------------------------------------
const git = (repo, args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
const SHOW = ["show", "--no-color", "--no-ext-diff", "--src-prefix=a/", "--dst-prefix=b/"];
const BOT = /\[bot\]|-bot\b|^bot\b|claude|anthropic|openai|copilot/i;

export function checkRange({ repo, range, conf = {}, allowDraft = false }) {
  if (typeof range !== "string" || !range || range.startsWith("-") || /\s/.test(range)) throw new Error(`invalid range: ${range}`);
  const shas = git(repo, ["rev-list", "--reverse", "--end-of-options", range]).split("\n").filter(Boolean);
  return shas.map(sha => {
    const parents = git(repo, ["rev-list", "--parents", "-n", "1", sha]).trim().split(" ").length - 1;
    const msg = git(repo, ["log", "-1", "--format=%B", sha]);
    const findings = checkMessage(msg, conf, { allowDraft });
    if (parents > 1) findings.push({ rule: "R8", level: "warn", text: "merge commit: most projects want a linear history" });
    for (const who of [git(repo, ["log", "-1", "--format=%an <%ae>", sha]).trim(), git(repo, ["log", "-1", "--format=%cn <%ce>", sha]).trim()])
      if (BOT.test(who)) findings.push({ rule: "R3", level: "error", text: `author/committer "${who}" is not a human` });
    findings.push(...checkDiff(git(repo, [...SHOW, "--format=", "-U0", sha]), conf));
    const stat = git(repo, ["show", "--format=", "--numstat", sha]).split("\n").filter(Boolean)
      .reduce((a, l) => { const [p, d] = l.split("\t"); return { add: a.add + (+p || 0), del: a.del + (+d || 0) }; }, { add: 0, del: 0 });
    return { sha: sha.slice(0, 8), title: msg.split("\n")[0], ...stat, findings };
  });
}

function main(argv) {
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") opt.repo = argv[++i];
    else if (a === "--range") opt.range = argv[++i];
    else if (a === "--conf") opt.conf = argv[++i];
    else if (a === "--allow-draft") opt.allowDraft = true;
    else if (a === "--json") opt.json = true;
    else if (a === "-h" || a === "--help") { console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(2, 5).join("\n")); return 0; }
    else { console.error(`unknown option ${a}`); return 2; }
  }
  const confFile = opt.conf || process.env.FORGE_CONF || path.join(process.cwd(), "forge.conf");
  const conf = readConf(confFile);
  if (!conf.__dir) console.error(`note: ${confFile} not found, only the generic checks run (see templates/forge.conf)`);
  const resolve = p => (path.isAbsolute(p) ? p : path.join(conf.__dir || process.cwd(), p));
  const repo = opt.repo || (conf.UPSTREAM ? resolve(conf.UPSTREAM) : process.cwd());
  let res;
  try { res = checkRange({ repo, range: opt.range || `${conf.MAIN_BRANCH || "master"}..HEAD`, conf, allowDraft: opt.allowDraft }); }
  catch (e) { console.error(e.message); return 2; }
  const count = lvl => res.reduce((n, c) => n + c.findings.filter(f => f.level === lvl).length, 0);
  if (opt.json) console.log(JSON.stringify(res, null, 2));
  else {
    for (const c of res) {
      console.log(`${c.sha} +${c.add} -${c.del}  ${c.title}`);
      for (const f of c.findings) console.log(`   ${f.level === "error" ? "ERROR" : "warn "} ${f.rule} ${f.file ? `${f.file}:${f.line} ` : ""}${f.text}`);
    }
    console.log(`\n${res.length} commits, ${count("error")} errors, ${count("warn")} warnings. Not checked automatically: R0 project rules beyond forge.conf, R1 disclosure, R12 evidence, R17 tested in game, R19 double review.`);
  }
  return count("error") ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) process.exitCode = main(process.argv.slice(2));
