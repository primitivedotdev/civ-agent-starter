import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseBriefing } from "../src/briefing.mjs";

// A real briefing from before these lines existed: every new field must read
// as "nothing to report", never throw.
const older = parseBriefing(readFileSync(new URL("../examples/turns/03-many-units.txt", import.meta.url), "utf8"));

test("reads the civ-specific optimal city count, and the older wording", () => {
	const over = parseBriefing("  CITY COUNT: you have 19 cities; this map's optimal is ~18 for your civilization. Cities past the optimal lose most of their output to CORRUPTION");
	assert.equal(over.cityCount, 19);
	assert.equal(over.cityOptimal, 18);
	const under = parseBriefing("  CITY COUNT: you have 3 cities; this map's optimal is ~18 for your civilization (room for about 15 more; count the settlers you already have on the way).");
	assert.equal(under.cityCount, 3);
	assert.equal(under.cityOptimal, 18);
	assert.equal(older.cityCount, 17);
	assert.equal(older.cityOptimal, 14, "older briefings without the civ suffix still parse");
});

test("reads bankruptcy seizures, war weariness and the join/leader actions", () => {
	const parsed = parseBriefing(`=== TURN 40 | Rome ===
Government: Republic   Gold: 0 (-3/turn)   Rates: science 60% / tax 40% / luxury 0%
  BANKRUPTCY last turn: Bankrupt: Roma sold its Temple (upkeep 1 gold/turn) because the treasury could not pay 2 gold this turn.
Diplomacy: Greece [AT WAR], Persia [peace]
  declare_war on: Persia   make_peace with: Greece   (you meet everyone at peace; declare_war before you can attack a civ)
  War weariness: Greece 12 point(s), Persia -2 point(s) (Republic feels low war weariness: they make citizens unhappy in every city, grow while you fight and fade in peace)

CITIES (1):
  city-1 Roma (10,10) size 8 [2 happy/3 content/3 unhappy]
      producing: Warrior (2 turns left); food +2/turn, grows in 5 (food box 10/20, +2/turn)
      war weary: 2 citizen(s) made unhappy by war weariness
UNITS (army 0/40, workers 1, settlers 0):
  Worker-2 Worker (10,10) moves 1 HP 3/3
      actions: join_city (adds 1 citizen(s) to Roma, size 8 -> 9; the unit is used up) | hold
  Leader-3 Leader (10,10) moves 1 HP 3/3
      actions: leader_hurry (completes Warrior in Roma next turn; the leader is used up) | hold
`);
	assert.deepEqual(parsed.bankruptcyEvents, ["Bankrupt: Roma sold its Temple (upkeep 1 gold/turn) because the treasury could not pay 2 gold this turn."]);
	assert.deepEqual(parsed.warWeariness, { Greece: 12, Persia: -2 });
	assert.deepEqual(parsed.offerablePeace, ["Greece"]);
	assert.equal(parsed.cities[0].warWeary, 2);
	assert.equal(parsed.cities[0].producing, "Warrior");
	assert.ok(parsed.units[0].actions.verbs.has("join_city"));
	assert.ok(parsed.units[1].actions.verbs.has("leader_hurry"));
	assert.ok(!parsed.units[1].actions.verbs.has("join_city"));
	assert.deepEqual(parsed.units.map((u) => [u.hp, u.maxHp]), [[3, 3], [3, 3]]);
});

test("reads the Golden Age, resisting citizens, flip risk and the raze offer", () => {
	const parsed = parseBriefing(`=== TURN 80 | Rome ===
Government: Monarchy   Gold: 120 (+4/turn)   Rates: science 60% / tax 40% / luxury 0%
  Golden Age: 7 turns left (every worked tile already making a shield makes one more, and likewise commerce; food is unchanged)

CITIES (3):
  city-1 Roma (10,10) size 8 [2 happy/3 content/3 unhappy]
      producing: Warrior (2 turns left); food +2/turn, grows in 5 (food box 10/20, +2/turn)
  city-7 Delphi (26,26) size 7 [0 happy/4 content/3 unhappy]
      producing: Warrior (stalled - 0 shields/turn); food +0/turn, NOT GROWING (zero food surplus)
      resisting: 2 citizen(s) resist your rule, so the city produces nothing and cannot hurry; each turn, each land combat unit in the city can quell one resister (garrison now: 1)
      flip risk: 1.2%/turn to Greece by culture (each land combat unit in the city lowers it)
      raze: captured this turn; {"type":"raze","city":"city-7"} destroys it and leaves 3 Worker(s) (this turn only)
  city-9 Megara (24,18) size 4 [1 happy/3 content/0 unhappy]
      producing: Warrior (4 turns left); food +1/turn, grows in 9 (food box 3/12, +1/turn)
      flip risk: <0.1%/turn to Ancient Greece by culture (each land combat unit in the city lowers it)
UNITS (army 0/40, workers 0, settlers 0):
`);
	assert.equal(parsed.goldenAgeTurnsLeft, 7);
	const [roma, delphi, megara] = parsed.cities;
	assert.equal(roma.resisting, 0);
	assert.equal(roma.flipRisk, null);
	assert.equal(roma.razeWorkers, null);
	assert.equal(delphi.resisting, 2);
	assert.deepEqual(delphi.flipRisk, { percent: 1.2, below: false, civ: "Greece" });
	assert.equal(delphi.razeWorkers, 3);
	assert.equal(delphi.disorder, false);
	assert.deepEqual(megara.flipRisk, { percent: 0.1, below: true, civ: "Ancient Greece" });
	assert.equal(megara.razeWorkers, null);
});

test("reads a unit that already attacked this turn", () => {
	const parsed = parseBriefing(`UNITS (army 2/40, workers 0, settlers 0):
  Horseman-4 Horseman a2/d1/m2 (12,12) moves 1 HP 2/3
      actions: move_unit dir N/NE/E (or move_to x,y) | already attacked this turn: it may still move, but not attack again until next turn | fortify | hold
  Horseman-5 Horseman a2/d1/m2 (13,12) moves 2 HP 3/3
      actions: move_unit dir N/NE/E (or move_to x,y) | attack: move onto (14,12) to attack Greece (1 unit, best defense 1) | fortify | hold
`);
	const [spent, fresh] = parsed.units;
	assert.equal(spent.actions.attackedThisTurn, true);
	assert.deepEqual(spent.actions.attack, []);
	assert.ok(spent.actions.verbs.has("move_unit"));
	assert.equal(fresh.actions.attackedThisTurn, false);
	assert.deepEqual(fresh.actions.attack, [{ x: 14, y: 12, civ: "Greece", units: 1, bestDefense: 1 }]);
});

test("reads the state-only adjacent rival city line as a strike", () => {
	const parsed = parseBriefing("  ADJACENT RIVAL CITY: Greece's Pella at (12,30), 2 defenders; your units next to it that can still act: 3 attacker(s) + 1 siege.");
	assert.deepEqual(parsed.strikes, [{ civ: "Greece", city: "Pella", x: 12, y: 30, defenders: 2, attackersAdjacent: 3, siegeAdjacent: 1 }]);
});

test("older briefings report none of the new rules", () => {
	assert.deepEqual(older.bankruptcyEvents, []);
	assert.deepEqual(older.warWeariness, {});
	assert.equal(older.goldenAgeTurnsLeft, 0);
	assert.ok(older.cities.length > 0);
	assert.ok(older.cities.every((c) => c.warWeary === 0 && c.resisting === 0 && c.flipRisk === null && c.razeWorkers === null));
	assert.ok(older.units.every((u) => u.actions.attackedThisTurn === false));
	assert.equal(older.pathMovement, false);
	assert.equal(older.observedUnits, null);
});

test("movement options are enabled only when advertised", () => {
	assert.equal(parseBriefing("  Movement option: move_path directions follows up to 60 ordered compass steps, stopping before foreign units or cities.").pathMovement, true);
	assert.equal(parseBriefing("  Movement option: move_to attack=false stops before foreign units or cities.").cautiousMovement, true);
});
