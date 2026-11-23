import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, ".claude-plugin/plugin.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

test("plugin and package versions match", () => assert.equal(plugin.version, pkg.version));
test("every agent listed in the plugin exists and has frontmatter", () => {
  for (const a of plugin.agents) assert.match(fs.readFileSync(path.join(ROOT, a), "utf8"), /^---\nname: /);
});
test("every skill has name and description", () => {
  const dir = path.join(ROOT, ".claude/skills");
  for (const s of fs.readdirSync(dir)) {
    const t = fs.readFileSync(path.join(dir, s, "SKILL.md"), "utf8");
    assert.match(t, new RegExp(`^---\\nname: ${s}\\ndescription: .{40,}`), s);
  }
});
test("skills only cite rule IDs that exist", () => {
  const rules = fs.readFileSync(path.join(ROOT, "docs/RULES.md"), "utf8");
  const files = [...fs.readdirSync(path.join(ROOT, ".claude/skills")).map(s => `.claude/skills/${s}/SKILL.md`), ...fs.readdirSync(path.join(ROOT, ".claude/agents")).map(a => `.claude/agents/${a}`), "AGENTS.md", "README.md", "docs/WORKFLOW.md", "docs/TESTING.md", "docs/DISASSEMBLY.md", "templates/pr-description.md"];
  for (const f of files) for (const [id] of fs.readFileSync(path.join(ROOT, f), "utf8").matchAll(/\bR\d+\b/g)) assert.ok(rules.includes(`| ${id} |`), `${f}: ${id}`);
});
test("no private data in the repo", () => {
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === ".git" || e.name === "node_modules" ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of walk(ROOT)) {
    if (/\.(png|jpg|elf|exe)$/i.test(f)) assert.fail(`binary file ${f}`);
    const t = fs.readFileSync(f, "utf8");
    for (const m of t.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)) assert.ok(/noreply|example\.|^a@b$/.test(m[0]) || f.endsWith("LICENSE"), `email ${m[0]} in ${f}`);
    assert.ok(!/\/Users\/\w|\/home\/\w/.test(t), `personal path in ${f}`);
  }
});
