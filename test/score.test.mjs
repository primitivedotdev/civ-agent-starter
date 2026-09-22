import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseBriefing } from "../src/briefing.mjs";
import { lintOrders } from "../src/lint.mjs";
import { scoreTurn } from "../src/score.mjs";

const brief = parseBriefing(readFileSync("examples/turns/04-ready-assault.txt", "utf8"));

test("no orders block scores low, and says why", () => {
	const s = scoreTurn(brief, null, [{ severity: "error", message: "no parseable <ORDERS> block" }]);
	assert.ok(s.total < 60);
	assert.equal(s.parts.find((p) => p.name === "legal orders").got, 0);
});

test("taking the flagged assault scores higher than ignoring it", () => {
	const strike = brief.strikes[0];
	const city = (brief.targets[strike.civ] ?? []).find((t) => t.name === strike.city);
	const attacker = brief.units.find((u) => (u.attack ?? 0) > 0 && !u.standingOrder);
	const go = [{ type: "move_to", unit: attacker.id, x: city.x, y: city.y }];
	const withAttack = scoreTurn(brief, go, lintOrders(go, brief));
	const without = scoreTurn(brief, [], []);
	assert.ok(withAttack.parts.find((p) => p.name === "attacks taken").got > without.parts.find((p) => p.name === "attacks taken").got);
});

test("parts that do not apply are left out", () => {
	const opening = parseBriefing(readFileSync("examples/turns/01-opening.txt", "utf8"));
	const names = scoreTurn(opening, [], []).parts.map((p) => p.name);
	assert.ok(!names.includes("attacks taken"));
	assert.ok(!names.includes("offers answered"));
});
