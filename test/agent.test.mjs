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

import { fillGaps, withOrders } from "../src/agent.mjs";

test("the rules fill in units and cities a model reply left alone", () => {
	const model = [{ type: "set_rates", science: 10 }, { type: "fortify", unit: "Warrior-1" }];
	const rules = [
		{ type: "fortify", unit: "Warrior-1" },
		{ type: "work", unit: "Worker-2", job: "Road" },
		{ type: "set_production", city: "city-1", item: "Settler" },
		{ type: "set_rates", science: 5 },
	];
	const merged = fillGaps(model, rules);
	assert.deepEqual(merged.map((o) => o.unit ?? o.city ?? o.type), ["set_rates", "Warrior-1", "Worker-2", "city-1"]);
});

test("withOrders replaces only the last ORDERS block", () => {
	const r = withOrders('plan\n<ORDERS>[1]</ORDERS>\nmore\n<ORDERS>[2]</ORDERS>\n<PLAN>x</PLAN>', [{ type: "hold" }]);
	assert.ok(r.includes("<ORDERS>[1]</ORDERS>"));
	assert.ok(r.includes('"hold"'));
	assert.ok(r.endsWith("<PLAN>x</PLAN>"));
});

test("the stock rules pass the arena's qualification turn (two or more listed ids)", async () => {
	const { parseBriefing } = await import("../src/briefing.mjs");
	const text = readFileSync("examples/turns/00-qualification.txt", "utf8");
	const b = parseBriefing(text);
	const listed = new Set([...b.units.map((u) => u.id), ...b.cities.map((c) => c.id)]);
	const orders = lastOrders(await decide(text, {}));
	const ids = new Set(orders.flatMap((o) => [o.unit, o.city]).filter((id) => listed.has(id)));
	assert.ok(ids.size >= 2, `only ${[...ids].join(", ")}`);
});
