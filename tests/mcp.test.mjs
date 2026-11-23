import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const server = path.join(path.dirname(fileURLToPath(import.meta.url)), "../tools/mcp-server.mjs");

function call(reqs) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [server]);
    let out = "";
    p.stdout.on("data", d => {
      out += d;
      const lines = out.trim().split("\n").filter(Boolean);
      if (lines.length >= reqs.filter(r => r.id !== undefined).length) { p.kill(); resolve(lines.map(l => JSON.parse(l))); }
    });
    p.on("error", reject);
    for (const r of reqs) p.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...r }) + "\n");
  });
}

test("initialize, list tools and prompts, read rules", async () => {
  const [init, tools, prompts, rules] = await call([
    { id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } },
    { method: "notifications/initialized" },
    { id: 2, method: "tools/list" },
    { id: 3, method: "prompts/list" },
    { id: 4, method: "tools/call", params: { name: "rules", arguments: {} } },
  ]);
  assert.equal(init.result.serverInfo.name, "retro-engine-forge");
  const names = tools.result.tools.map(t => t.name);
  for (const n of ["rules", "workflow", "skill", "check_commits", "check_message", "templates"]) assert.ok(names.includes(n), n);
  assert.ok(prompts.result.prompts.length >= 3);
  assert.match(rules.result.content[0].text, /R17/);
});

test("skill name is validated and prompts need their arguments", async () => {
  const [bad, prompt] = await call([
    { id: 1, method: "tools/call", params: { name: "skill", arguments: { name: "../../package.json" } } },
    { id: 2, method: "prompts/get", params: { name: "fix_bug", arguments: {} } },
  ]);
  assert.equal(bad.result.isError, true);
  assert.ok(prompt.error);
});

test("check_message flags a DRAFT", async () => {
  const [r] = await call([{ id: 1, method: "tools/call", params: { name: "check_message", arguments: { message: "DRAFT AGI: Fix x" } } }]);
  assert.match(r.result.content[0].text, /R2/);
});
