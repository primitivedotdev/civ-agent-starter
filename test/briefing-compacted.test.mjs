import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseBriefing, byId } from "../src/briefing.mjs";
import { lintOrders } from "../src/lint.mjs";

// A trimmed level-5 compacted briefing (a 40-city, 234-unit empire given a
// 90000-byte budget): the compaction note, two cities, and one row of each
// compact form.
const text = readFileSync(new URL("./fixtures/briefing-compacted.txt", import.meta.url), "utf8");
const b = parseBriefing(text);
const units = byId(b.units);
const lint = (orders, brief) => lintOrders(orders, brief).map((x) => `${x.code}:${x.severity}`);

test("reads the compaction note at the top", () => {
	assert.deepEqual(b.compaction, { level: 5, maxLevel: 6, fullBytes: 328805, budget: 90000 });
	assert.equal(b.truncated, false);
	assert.equal(b.turn, 0);
	assert.equal(b.civ, "Greece");
});

test("a full briefing has no compaction", () => {
	const full = parseBriefing(readFileSync(new URL("../examples/turns/03-many-units.txt", import.meta.url), "utf8"));
	assert.equal(full.compaction, null);
	assert.equal(full.truncated, false);
	assert.deepEqual([full.citiesComplete, full.unitsComplete], [true, true]);
});

test("every unit row in a compacted briefing parses, one per id", () => {
	assert.deepEqual(b.units.map((u) => u.id), ["Knight-1", "Scout-2", "Scout-42", "Worker-100", "Worker-43", "Worker-45", "Settler-43", "Pikeman-1"]);
	assert.deepEqual(b.cities.map((c) => c.id), ["city-1", "city-2"]);
	assert.equal(b.army, 80);
	assert.equal(b.workers, 148);
});

test("a unit next to an enemy keeps its detail; adjacent_tiles is unknown, not empty", () => {
	const k = units.get("Knight-1");
	assert.equal(k.attack, 4);
	assert.ok(["move_unit", "move_to", "advance", "move_path", "fortify"].every((v) => k.actions.verbs.has(v)));
	assert.deepEqual(k.actions.attack, [{ x: 4, y: 2, civ: "Russia", units: 4, bestDefense: 3 }]);
	assert.equal(k.adjacentTiles, null);
	assert.ok(text.includes("adjacent_tiles: omitted from this briefing"));
});

test("short-form actions keep every verb and target", () => {
	const w = units.get("Worker-100");
	assert.ok(["move_unit", "move_to", "advance", "move_path", "explore", "fortify", "sentry", "hold", "disband"].every((v) => w.actions.verbs.has(v)));
	assert.deepEqual(w.actions.jobs, ["Mine", "Road"]);
	assert.ok(!text.includes("(or move_to x,y)"));
	const p = parseBriefing(`UNITS (army 0/40, workers 1, settlers 0):
  Worker-2 Worker (10,10) moves 1 HP 3/3
      actions: move_unit dir N/E | move_to x,y | join_city | hold
  Leader-3 Leader (10,10) moves 1 HP 3/3
      actions: leader_hurry | hold
`);
	assert.deepEqual(lint([{ type: "join_city", unit: "Worker-2" }, { type: "leader_hurry", unit: "Leader-3" }], p), []);
	assert.deepEqual(lint([{ type: "leader_hurry", unit: "Worker-2" }], p), ["action_not_available:error"]);
});

test("a 'same as' row keeps its own actions and shares the rest", () => {
	const first = units.get("Scout-2"), same = units.get("Scout-42");
	assert.equal(same.sameAs, "Scout-2");
	assert.equal(first.sameAs, undefined);
	assert.deepEqual([same.x, same.y, same.moves, same.hp], [first.x, first.y, first.moves, first.hp]);
	assert.deepEqual(same.tile, first.tile);
	assert.deepEqual([...same.actions.verbs].sort(), [...first.actions.verbs].sort());
	// Its own set, not the first unit's object.
	same.actions.verbs.add("probe");
	assert.equal(first.actions.verbs.has("probe"), false);
});

test("a 'same as' row without an actions line takes the named unit's", () => {
	const p = parseBriefing(`UNITS (army 0/40, workers 2, settlers 0):
  Worker-1 Worker (3,3) moves 1 HP 3/3
      on Grassland/Grassland f2s0c0 RES:NONE [road]
      actions: move_unit dir N | work job Mine | hold
  Worker-2 Worker (3,3) moves 1 HP 3/3
      same as Worker-1: same type, tile, moves, HP and detail
`);
	const [one, two] = p.units;
	assert.deepEqual([...two.actions.verbs].sort(), [...one.actions.verbs].sort());
	assert.deepEqual(two.actions.jobs, ["Mine"]);
	assert.equal(two.tile.road, true);
	assert.notEqual(two.actions.jobs, one.actions.jobs);
});

test("a 'same as' naming a unit not in the briefing is left alone", () => {
	const p = parseBriefing(`UNITS (army 0/40, workers 1, settlers 0):
  Worker-9 Worker (3,3) moves 1 HP 3/3
      same as Worker-1: same type, tile, moves, HP and detail
`);
	assert.equal(p.units[0].sameAs, "Worker-1");
	assert.equal(p.units[0].actions.verbs.size, 0);
});

test("compact standing-order and BUSY rows keep what the linter needs", () => {
	assert.equal(units.get("Pikeman-1").standingOrder, "FORTIFIED");
	assert.equal(units.get("Pikeman-1").actions.verbs.size, 0);
	// A compact BUSY row (not next to an enemy) and a full one both read as busy.
	assert.equal(units.get("Worker-43").busy, true);
	assert.equal(units.get("Worker-45").busy, true);
	assert.deepEqual(lint([{ type: "work", unit: "Worker-43", job: "Road" }], b), ["unit_busy:noop"]);
});

test("a settler keeps its HERE line and actions when its neighbor lines go", () => {
	const s = units.get("Settler-43");
	assert.ok(s.actions.verbs.has("move_to"));
	const rows = text.slice(text.indexOf("  Settler-43 ")).split("\n").slice(1).filter((l) => l.startsWith("      "));
	assert.ok(rows.some((l) => l.startsWith("      HERE: ")));
	assert.ok(!rows.some((l) => /^ {6}(N|NE|E|SE|S|SW|W|NW) ?: /.test(l)));
});

test("the observed foreign units still parse", () => {
	assert.equal(b.observedUnits.length, 4);
});

test("a capped contact list reads as unknown, not as the whole list", () => {
	const p = parseBriefing(`OBSERVED FOREIGN UNITS (2; current sight, excludes cargo):
  CONTACT {"id":"Pikeman-41","civ":"Russia","type":"Pikeman","x":4,"y":2,"hp":3,"maxHp":3,"attack":1,"defense":3,"speed":1,"land":true,"fortified":false}
  (1 more contact(s) in sight are not listed, to fit the email size limit; the 1 above are the ones nearest your cities)

Known tiles: 5.
`);
	assert.equal(p.observedUnits, null);
});

// Level 6: every unit is a header-only row with no actions line.
const level6 = parseBriefing(`*** BRIEFING COMPACTED (level 6 of 6): the full briefing is 400000 bytes, over the 180000-byte limit for one email, so some detail is left out. Every city and every unit is still listed with its id, position, moves and HP, and every order works as usual. Left out:
  - every unit is a one-line row, with no actions line
  A unit shown without an actions line still takes its usual orders; the engine refuses one that is not legal and says why in the next briefing. ***

=== TURN 200 | Rome ===
CITIES (1):
  city-1 Roma (2,2) size 3
UNITS (army 2/40, workers 1, settlers 0):
  Catapult-1 Catapult a6/d1/m1 (2,2) moves 1 HP 3/3
  Warrior-1 Warrior a1/d1/m1 (2,2) moves 1 HP 3/3
  Worker-7 Worker (3,3) moves 0 HP 3/3
      BUSY: building Road, ~2 turn(s) left. Moving it abandons the job.

Known tiles: 5.
`);

test("header-only rows at the last level still parse by id", () => {
	assert.deepEqual(level6.compaction, { level: 6, maxLevel: 6, fullBytes: 400000, budget: 180000 });
	assert.deepEqual(level6.units.map((u) => [u.id, u.x, u.y, u.moves, u.hp]), [["Catapult-1", 2, 2, 1, 3], ["Warrior-1", 2, 2, 1, 3], ["Worker-7", 3, 3, 0, 3]]);
	assert.ok(level6.units.slice(0, 2).every((u) => u.actions.verbs.size === 0));
	assert.equal(byId(level6.units).get("Worker-7").busy, true);
});

test("a unit without an actions line is not linted as having no legal actions", () => {
	const orders = [
		{ type: "move_unit", unit: "Warrior-1", dir: "N" },
		{ type: "fortify", unit: "Catapult-1" },
		{ type: "bombard", unit: "Catapult-1", x: 3, y: 2 },
	];
	assert.deepEqual(lintOrders(orders, level6).filter((x) => x.severity === "error"), []);
	// Unknown ids are still errors: the list is complete.
	assert.deepEqual(lint([{ type: "fortify", unit: "Warrior-99" }], level6), ["unknown_unit:error"]);
});

test("reads the arena's truncation marker", () => {
	const p = parseBriefing("*** BRIEFING TRUNCATED: this email would have been 300000 bytes. ***\n=== TURN 3 | Rome ===\n");
	assert.equal(p.truncated, true);
	assert.equal(p.turn, 3);
});

test("an unlisted id is a warning only in a section the cut may have ended early", () => {
	const head = "=== TURN 3 | Rome ===\nCITIES (2):\n  city-1 Roma (2,2) size 3\n";
	const unitRows = "UNITS (army 1/40, workers 0, settlers 0):\n  Warrior-1 Warrior a1/d1/m1 (2,2) moves 1 HP 3/3\n      actions: fortify | hold\n";
	const rest = "\nOBSERVED FOREIGN UNITS (0; current sight, excludes cargo):\n\nKnown tiles: 5.\n";
	const cutHere = "\n*** BRIEFING TRUNCATED HERE (see the note at the top) ***\n";
	const note = "*** BRIEFING TRUNCATED: cut. ***\n";
	const orders = [{ type: "fortify", unit: "Warrior-99" }, { type: "set_production", city: "city-7", item: "Warrior" }];
	const severities = (t) => lintOrders(orders, parseBriefing(t)).filter((x) => x.code.startsWith("unknown_")).map((x) => x.severity);
	// Whole briefing: both are errors.
	assert.deepEqual(severities(head + unitRows + rest), ["error", "error"]);
	// Cut among the cities: both lists may be incomplete.
	const inCities = parseBriefing(note + head + cutHere);
	assert.deepEqual([inCities.citiesComplete, inCities.unitsComplete], [false, false]);
	assert.deepEqual(severities(note + head + cutHere), ["warn", "warn"]);
	// Cut among the units: every city was listed, so an unknown city is still an error.
	const inUnits = parseBriefing(note + head + unitRows + cutHere);
	assert.deepEqual([inUnits.citiesComplete, inUnits.unitsComplete], [true, false]);
	assert.deepEqual(severities(note + head + unitRows + cutHere), ["warn", "error"]);
	// Cut after the units: both lists are complete.
	assert.deepEqual(severities(note + head + unitRows + rest + cutHere), ["error", "error"]);
	// A compacted but uncut briefing reports both lists complete.
	assert.deepEqual([b.citiesComplete, b.unitsComplete], [true, true]);
});
