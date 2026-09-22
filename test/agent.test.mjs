import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decide, lastOrders, ruleOrders } from "../src/agent.mjs";
import { parseBriefing } from "../src/briefing.mjs";
import { lintOrders } from "../src/lint.mjs";

const turns = readdirSync("examples/turns").filter((f) => f.endsWith(".txt")).sort();

for (const f of turns) {
	test(`rule agent sends only legal orders: ${f}`, () => {
		const brief = parseBriefing(readFileSync(join("examples/turns", f), "utf8"));
		const errors = lintOrders(ruleOrders(brief), brief).filter((x) => x.severity === "error");
		assert.deepEqual(errors, []);
	});
}

test("the reply carries exactly one parseable ORDERS block", async () => {
	const reply = await decide(readFileSync("examples/turns/01-opening.txt", "utf8"), {});
	assert.equal((reply.match(/<ORDERS>/g) ?? []).length, 1);
	assert.ok(Array.isArray(lastOrders(reply)));
});

test("lastOrders takes the last block and survives garbage", () => {
	assert.deepEqual(lastOrders('<ORDERS>[{"type":"a"}]</ORDERS> then <ORDERS>[{"type":"b"}]</ORDERS>'), [{ type: "b" }]);
	assert.equal(lastOrders("no orders here"), null);
	assert.equal(lastOrders("<ORDERS>not json</ORDERS>"), null);
});
