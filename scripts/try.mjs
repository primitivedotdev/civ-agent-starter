#!/usr/bin/env node
// Run your agent over the example turns and lint every reply.
//
//   npm run try                      # all example turns
//   npm run try -- examples/turns/04-ready-assault.txt
//   ANTHROPIC_API_KEY=... npm run try  # with the model path
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decide, lastOrders } from "../src/agent.mjs";
import { parseBriefing } from "../src/briefing.mjs";
import { lintOrders } from "../src/lint.mjs";

const args = process.argv.slice(2);
const files = args.length ? args : readdirSync("examples/turns").filter((f) => f.endsWith(".txt")).sort().map((f) => join("examples/turns", f));
let errors = 0;
for (const f of files) {
	const text = readFileSync(f, "utf8");
	const reply = await decide(text, process.env);
	const orders = lastOrders(reply);
	const brief = parseBriefing(text);
	const findings = orders ? lintOrders(orders, brief) : [{ severity: "error", message: "no parseable <ORDERS> block" }];
	const bad = findings.filter((x) => x.severity === "error");
	errors += bad.length;
	console.log(`\n== ${f}  (turn ${brief.turn}, ${brief.civ}): ${orders?.length ?? 0} orders, ${bad.length} errors, ${findings.length - bad.length} warnings`);
	for (const x of findings) console.log(`   ${x.severity.padEnd(5)} ${x.message}`);
	if (args.length) console.log(`\n${reply}`);
}
console.log(`\n${files.length} turns, ${errors} errors`);
process.exit(errors ? 1 : 0);
