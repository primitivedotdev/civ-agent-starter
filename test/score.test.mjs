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

test("a state-only strike line is scored from its own tile", () => {
	const brief = parseBriefing(`UNITS (army 2/40, workers 0, settlers 0):
  Horseman-4 Horseman a2/d1/m2 (11,30) moves 2
      actions: move_unit dir E (or move_to x,y) | hold
  Horseman-5 Horseman a2/d1/m2 (13,30) moves 2
      actions: move_unit dir W (or move_to x,y) | hold
  ADJACENT RIVAL CITY: Greece's Pella at (12,30), 1 defender; your units next to it that can still act: 2 attacker(s)
`);
	const go = [{ type: "move_to", unit: "Horseman-4", x: 12, y: 30 }, { type: "move_to", unit: "Horseman-5", x: 12, y: 30 }];
	const part = scoreTurn(brief, go, []).parts.find((p) => p.name === "attacks taken");
	assert.equal(part.got, part.max);
});

test("a path move takes a city's only defender out of it", () => {
	const brief = parseBriefing(`CITIES (1):
  city-1 Roma (10,10) size 3 [1 happy/2 content/0 unhappy]
      producing: Warrior (2 turns left); food +2/turn
UNITS (army 1/40, workers 0, settlers 0):
  Warrior-1 Warrior a1/d1/m1 (10,10) moves 1
      actions: move_unit dir N (or move_to x,y) | fortify | hold
`);
	const part = scoreTurn(brief, [{ type: "move_path", unit: "Warrior-1", directions: ["N"] }], []).parts.find((p) => p.name === "cities defended");
	assert.equal(part.got, 0);
});
