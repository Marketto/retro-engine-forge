import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { context, parseCard, judge, findCard, readResults } from "../tools/ready.mjs";

test("context asks for engine, game and executable when missing", () => {
  const c = context({ __dir: "/tmp" });
  assert.deepEqual(c.missing.map(m => m.rule), ["R30", "R30", "R31"]);
  const d = context({ __dir: "/tmp", ENGINE: "foo", GAME_TITLE: "G", GAME_VERSION: "1.0", PLATFORM: "DOS", ORIGINAL_EXE: "/nonexistent/GAME.EXE" });
  assert.equal(d.missing.length, 1);
  assert.match(d.missing[0].ask, /does not exist/);
});

const GOOD = `# fix-x — \`1234abcd\` Fix x
- **Engine / game** (R30): foo, Game 1.0 en DOS; other games using this code: none.
- **Original** (R12): \`doit_\` at \`0x1a2b0\` in \`GAME.EXE\`:
- **Neighbouring cases in the original** (R32): the other branch keeps the old value; unchanged.
- **Change**: \`a.cpp\` +1 −1.
  - Played by: driver (automatic).
- **Regressions** (R32): 3 regression cases unchanged.
`;
test("a complete card", () => {
  assert.deepEqual(parseCard(GOOD), { engine: true, evidence: true, neighbours: true, regressions: true, regressionsExplained: false, playedByHuman: false });
});
test("template placeholders do not count", () => {
  const t = fs.readFileSync(new URL("../templates/card.md", import.meta.url), "utf8");
  const c = parseCard(t);
  assert.equal(c.engine || c.evidence || c.neighbours || c.regressions, false);
});

const OK = [{ kind: "fix", name: "x", before: "OK", after: "OK", result: "OK" }, { kind: "regression", name: "r", before: "OK", after: "OK", result: "OK" }];
test("judge: ready", () => assert.deepEqual(judge({ card: { text: GOOD }, results: OK, findings: [] }), []));
test("judge: missing pieces", () => {
  const p = judge({ card: null, results: null, findings: [{ level: "error", rule: "R2" }] });
  assert.equal(p.length, 3);
  const q = judge({ card: { text: GOOD }, results: [OK[0], { kind: "regression", name: "-", result: "NONE" }], findings: [] });
  assert.match(q.join(), /no regression cases/);
  const r = judge({ card: { text: GOOD }, results: [OK[0], { kind: "regression", name: "r", before: "OK", after: "OK", result: "CHANGED" }], findings: [] });
  assert.match(r.join(), /changed: explain/);
  const s = judge({ card: { text: GOOD.replace("3 regression cases unchanged.", "1 regression case changed, explained by the assembly.") }, results: [OK[0], { kind: "regression", name: "r", result: "CHANGED" }], findings: [] });
  assert.deepEqual(s, []);
  const t = judge({ card: { text: GOOD }, results: [{ kind: "regression", name: "r", after: "FAILED", result: "REGRESSION" }, OK[0]], findings: [] });
  assert.match(t.join(), /REGRESSION in r/);
});
test("cards and results are found on disk", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "forge-"));
  fs.mkdirSync(path.join(d, "cards")); fs.writeFileSync(path.join(d, "cards/x.md"), GOOD);
  fs.mkdirSync(path.join(d, "out/1234abcd"), { recursive: true });
  fs.writeFileSync(path.join(d, "out/1234abcd/result.txt"), "fix x OK OK OK\nregression r OK OK OK\n");
  assert.equal(findCard(path.join(d, "cards"), "1234abcd5678", "FOO: Fix x").file, "x.md");
  assert.equal(findCard(path.join(d, "cards"), "ffffffff", "FOO: Fix x").file, "x.md");
  assert.equal(readResults(path.join(d, "out"), "1234abcd5678").length, 2);
  fs.rmSync(d, { recursive: true });
});
test("judge: broken regression case", () => {
  const p = judge({ card: { text: GOOD }, results: [OK[0], { kind: "regression", name: "r", result: "BROKEN-CASE" }], findings: [] });
  assert.match(p.join(), /fails before and after/);
});
