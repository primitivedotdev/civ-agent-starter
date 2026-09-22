#!/usr/bin/env node
// Run your agent over the example turns, lint every reply, and score it.
//
//   npm run try                      # all example turns, with a score
//   npm run try -- examples/turns/04-ready-assault.txt   # one turn, full reply
//   ANTHROPIC_API_KEY=... npm run try  # with the model path
//
// The score (src/score.mjs) is out of 100 per turn and averaged over the
// turns; the change since your last run is shown, so every edit has a number.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { decide, lastOrders } from "../src/agent.mjs";
import { parseBriefing } from "../src/briefing.mjs";
import { lintOrders } from "../src/lint.mjs";
import { scoreTurn } from "../src/score.mjs";

try { process.loadEnvFile(".env"); } catch { /* no .env: fine */ }

const args = process.argv.slice(2);
const files = args.length ? args : readdirSync("examples/turns").filter((f) => f.endsWith(".txt")).sort().map((f) => join("examples/turns", f));
const LAST = ".primitive/last-score.json";
const last = existsSync(LAST) ? JSON.parse(readFileSync(LAST, "utf8")) : {};
const delta = (now, before) => (before == null ? "" : now === before ? " (=)" : ` (${now > before ? "+" : ""}${now - before})`);

let errors = 0;
const scores = {};
for (const f of files) {
	const text = readFileSync(f, "utf8");
	const reply = await decide(text, process.env);
	const orders = lastOrders(reply);
	const brief = parseBriefing(text);
	const findings = orders ? lintOrders(orders, brief) : [{ severity: "error", message: "no parseable <ORDERS> block" }];
	const bad = findings.filter((x) => x.severity === "error");
	errors += bad.length;
	const score = scoreTurn(brief, orders, findings);
	scores[f] = score.total;
	console.log(`\n== ${f}  (turn ${brief.turn}, ${brief.civ}): score ${score.total}/100${delta(score.total, last.turns?.[f])}, ${orders?.length ?? 0} orders, ${bad.length} errors`);
	for (const p of score.parts) if (p.got < p.max) console.log(`   -${String(Math.round((p.max - p.got) * 10) / 10).padEnd(4)} ${p.name}${p.note ? `: ${p.note}` : ""}`);
	for (const x of findings) console.log(`   ${x.severity.padEnd(5)} ${x.message}`);
	if (args.length) console.log(`\n${reply}`);
}
const avg = Math.round(Object.values(scores).reduce((s, x) => s + x, 0) / Math.max(1, files.length));
console.log(`\n${files.length} turns, ${errors} errors, score ${avg}/100${args.length ? "" : delta(avg, last.average)}`);
if (!args.length) {
	mkdirSync(".primitive", { recursive: true });
	writeFileSync(LAST, JSON.stringify({ average: avg, turns: scores, at: new Date().toISOString() }, null, 2) + "\n");
}
process.exit(errors ? 1 : 0);
