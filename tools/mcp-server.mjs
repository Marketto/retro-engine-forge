#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// retro-engine-forge MCP server (stdio, no dependencies). Used by the plugin (.mcp.json) and any MCP client.
//   node tools/mcp-server.mjs      or      npx -y github:Marketto/retro-engine-forge mcp
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { checkRange, checkMessage, readConf } from "./check-commits.mjs";
import { init } from "./init.mjs";
import { context, judge, findCard, readResults } from "./ready.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const skill = n => read(`.claude/skills/${n}/SKILL.md`);

const SKILLS = fs.readdirSync(path.join(ROOT, ".claude/skills")).sort();
const need = (a, ...keys) => { for (const k of keys) if (typeof a[k] !== "string" || !a[k].trim()) throw new Error(`missing argument: ${k}`); };

export const TOOLS = [
  { name: "rules", description: "Rules R0–R29 for contributions prepared with this toolkit: the target project's own rules first (R0), strict defaults on AI use, evidence from the original executable, tested in game, double review, copyright.",
    inputSchema: { type: "object", properties: {} }, run: () => read("docs/RULES.md") },
  { name: "workflow", description: "The steps from learning a target project's rules to a pull request, with the skill and rules of each step.",
    inputSchema: { type: "object", properties: {} }, run: () => read("docs/WORKFLOW.md") },
  { name: "skill", description: `Instructions of one skill: ${SKILLS.join(", ")}.`,
    inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string", enum: SKILLS } } },
    run: a => { if (!SKILLS.includes(a.name)) throw new Error(`unknown skill: ${a.name}`); return skill(a.name); } },
  { name: "testing_guide", description: "How to test engine commits in game with a test driver and before/after cases.",
    inputSchema: { type: "object", properties: {} }, run: () => read("docs/TESTING.md") + "\n\n" + read("driver/README.md") },
  { name: "disassembly_guide", description: "How to find and cite the original executable's behaviour within copyright limits.",
    inputSchema: { type: "object", properties: {} }, run: () => read("docs/DISASSEMBLY.md") },
  { name: "templates", description: "Templates: forge.conf, project-rules.md, card (one per fix), case (test driver script with checks), PR checklist.",
    inputSchema: { type: "object", properties: {} },
    run: () => ["forge.conf", "project-rules.md", "card.md", "case.txt", "pr-description.md"].map(f => `--- templates/${f}\n${read(`templates/${f}`)}`).join("\n") },
  { name: "check_commits", description: "Checks commits of a local checkout against the rules and the project's settings in forge.conf: title prefixes and length, DRAFT left, co-author trailers, bots, merges, formatting, forbidden constructs, long comments, license header. Returns JSON per commit.",
    inputSchema: { type: "object", required: ["repo"], properties: {
      repo: { type: "string", description: "absolute path of the target project's checkout" },
      range: { type: "string", description: "git range, e.g. main..my-fixes-1 (default <MAIN_BRANCH>..HEAD)" },
      conf: { type: "string", description: "absolute path of forge.conf (optional)" },
      allow_draft: { type: "boolean" } } },
    run: a => {
      need(a, "repo");
      const conf = a.conf ? readConf(a.conf) : {};
      return JSON.stringify(checkRange({ repo: a.repo, range: a.range || `${conf.MAIN_BRANCH || "master"}..HEAD`, conf, allowDraft: !!a.allow_draft }), null, 2);
    } },
  { name: "check_message", description: "Checks one commit message (written by the human) against the title/body rules and the project's settings.",
    inputSchema: { type: "object", required: ["message"], properties: { message: { type: "string" }, conf: { type: "string", description: "absolute path of forge.conf (optional)" }, allow_draft: { type: "boolean" } } },
    run: a => { need(a, "message"); return JSON.stringify(checkMessage(a.message, a.conf ? readConf(a.conf) : {}, { allowDraft: !!a.allow_draft }), null, 2); } },
  { name: "context", description: "Which engine, game, version, platform and original executable the work is about (forge.conf), and the questions to ask the human when something is missing (R30, R31). Call it before any analysis.",
    inputSchema: { type: "object", required: ["conf"], properties: { conf: { type: "string", description: "absolute path of forge.conf" } } },
    run: a => { need(a, "conf"); const c = readConf(a.conf); if (!c.__dir) throw new Error(`${a.conf} not found: ask the human which engine, game and executable, then run init_workspace`); return JSON.stringify(context(c), null, 2); } },
  { name: "ready", description: "Per commit of a range: card with engine and evidence from the original, neighbouring cases, in-game results of the fix and of the regression cases, checker errors (R12, R17, R24, R30-R32). Returns the problems left.",
    inputSchema: { type: "object", required: ["conf", "range"], properties: { conf: { type: "string", description: "absolute path of forge.conf" }, range: { type: "string" } } },
    run: a => {
      need(a, "conf", "range");
      const c = readConf(a.conf);
      if (!c.__dir) throw new Error(`${a.conf} not found`);
      const ctx = context(c);
      if (ctx.missing.length) return JSON.stringify({ context: ctx, ready: false }, null, 2);
      const abs = p => (path.isAbsolute(p) ? p : path.join(c.__dir, p));
      const commits = checkRange({ repo: abs(c.UPSTREAM), range: a.range, conf: c }).map(x => {
        const problems = judge({ card: findCard(abs(c.CARDS || "cards"), x.sha, x.title), results: readResults(abs(c.OUT || ".forge/tests"), x.sha), findings: x.findings });
        return { sha: x.sha, title: x.title, ready: !problems.length, problems };
      });
      return JSON.stringify({ context: ctx, commits }, null, 2);
    } },
  { name: "init_workspace", description: "Creates forge.conf, project-rules.md, cases/, cards/ and the PR checklist in a folder (never overwrites).",
    inputSchema: { type: "object", required: ["folder"], properties: { folder: { type: "string", description: "absolute path" } } },
    run: a => { need(a, "folder"); return init(a.folder); } },
];

const PROMPTS = [
  { name: "learn_project", description: "Learn a target project's rules and record them before contributing.",
    arguments: [{ name: "project", description: "path or URL of the target project", required: true }],
    text: ({ project }) => `Learn the contribution rules of ${project} with retro-engine-forge (skill learn-project): AI policy, contributing guide, style, commit format, PR template, license, channels. Write project-rules.md with sources and show me where they differ from the toolkit's defaults.` },
  { name: "survey_engine", description: "Find and rank candidate bugs in a game engine of the target project.",
    arguments: [{ name: "engine", description: "engine or module name", required: true }],
    text: ({ engine }) => `Survey the engine "${engine}" with retro-engine-forge. Confirm with me the game, version and platform and ask me for the original executable if you do not have it. Read the tools "rules" and "skill" (survey-engine). Give me the ranked table; do not fix anything yet.` },
  { name: "fix_bug", description: "Take one bug from report to a tested scratch commit, following every rule.",
    arguments: [{ name: "bug", description: "what goes wrong and where", required: true }],
    text: ({ bug }) => `Bug: ${bug}
Follow retro-engine-forge: first the tool "context" (if the engine, game version or original executable is missing or uncertain, ask me), then "rules" and "workflow", then skills investigate-bug, disasm-evidence, minimal-fix, test-in-game (regression cases included).
Stop and ask me before writing code if the evidence is unclear. Never write commit messages: local DRAFT scratch commits and points only.` },
  { name: "prepare_pr", description: "Check a block of commits and prepare the PR checklist (the human writes the text and makes the commits).",
    arguments: [{ name: "range", description: "git range of the block", required: true }],
    text: ({ range }) => `Prepare the commits ${range} for a PR with retro-engine-forge (skill prepare-pr): run the tool ready, list what is missing (context, evidence, tests in game, regressions, review), and give me the points for each message. I make the commits and write the messages and the PR description.` },
];

const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];
const send = msg => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
const version = () => JSON.parse(read(".claude-plugin/plugin.json")).version;

export async function handle({ method, params = {} }) {
  switch (method) {
    case "initialize":
      return { protocolVersion: SUPPORTED.includes(params.protocolVersion) ? params.protocolVersion : SUPPORTED[0],
        capabilities: { tools: {}, prompts: {} }, serverInfo: { name: "retro-engine-forge", version: version() } };
    case "ping": return {};
    case "tools/list": return { tools: TOOLS.map(({ run, ...t }) => t) };
    case "tools/call": {
      const tool = TOOLS.find(t => t.name === params.name);
      if (!tool) throw Object.assign(new Error(`Unknown tool: ${params.name}`), { code: -32602 });
      try { return { content: [{ type: "text", text: await tool.run(params.arguments || {}) }] }; }
      catch (e) { return { content: [{ type: "text", text: String(e.message || e) }], isError: true }; }
    }
    case "prompts/list": return { prompts: PROMPTS.map(({ text, ...p }) => p) };
    case "prompts/get": {
      const p = PROMPTS.find(x => x.name === params.name);
      if (!p) throw Object.assign(new Error(`Unknown prompt: ${params.name}`), { code: -32602 });
      const args = params.arguments || {};
      for (const a of p.arguments) if (a.required && !args[a.name]) throw Object.assign(new Error(`Missing argument: ${a.name}`), { code: -32602 });
      return { messages: [{ role: "user", content: { type: "text", text: p.text(params.arguments || {}) } }] };
    }
    default: throw Object.assign(new Error(`Method not handled: ${method}`), { code: -32601 });
  }
}

if (process.argv[1] && (process.argv[1].endsWith("mcp-server.mjs") || process.argv[2] === "mcp")) {
  readline.createInterface({ input: process.stdin }).on("line", async line => {
    if (!line.trim()) return;
    let req;
    try { req = JSON.parse(line); } catch { return send({ id: null, error: { code: -32700, message: "Invalid JSON" } }); }
    if (Array.isArray(req)) return send({ id: null, error: { code: -32600, message: "Batch requests not supported" } });
    if (req.id === undefined) return;
    try { send({ id: req.id, result: await handle(req) }); }
    catch (e) { send({ id: req.id, error: { code: e.code || -32603, message: e.message } }); }
  });
}
