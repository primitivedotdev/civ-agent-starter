import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBriefing } from "../src/briefing.mjs";
import { lintOrders } from "../src/lint.mjs";

const lint = (orders, brief) => lintOrders(orders, brief).map((x) => `${x.code}:${x.severity}`);

const joinBrief = parseBriefing(`UNITS (army 1/40, workers 1, settlers 0):
  Worker-2 Worker (10,10) moves 1 HP 3/3
      actions: move_unit dir N/E (or move_to x,y) | join_city (adds 1 citizen(s) to Roma, size 3 -> 4; the unit is used up) | hold | disband
  Warrior-4 Warrior a1/d1/m1 (10,10) moves 1 HP 3/3
      actions: move_unit dir N/E (or move_to x,y) | fortify | hold
`);

test("join_city and leader_hurry are checked against the unit's listed actions", () => {
	assert.deepEqual(lint([{ type: "join_city", unit: "Worker-2" }], joinBrief), []);
	assert.deepEqual(lint([{ type: "leader_hurry", unit: "Worker-2" }], joinBrief), ["action_not_available:error"]);
	assert.deepEqual(lint([{ type: "join_city", unit: "Warrior-4" }], joinBrief), ["action_not_available:error"]);
	assert.deepEqual(lint([{ type: "join_city", unit: "Nobody-1" }], joinBrief), ["unknown_unit:error"]);
	const leader = parseBriefing(`UNITS (army 0/40, workers 0, settlers 0):
  Leader-3 Leader (10,10) moves 1 HP 3/3
      actions: leader_hurry (completes Warrior in Roma next turn; the leader is used up) | hold
`);
	assert.deepEqual(lint([{ type: "leader_hurry", unit: "Leader-3" }], leader), []);
});

test("an order after one that uses the unit up is flagged; one before it is not", () => {
	for (const orders of [
		[{ type: "join_city", unit: "Worker-2" }, { type: "hold", unit: "Worker-2" }],
		[{ type: "join_city", unit: "Worker-2" }, { type: "join_city", unit: "Worker-2" }],
		[{ type: "hold", unit: "Worker-2" }, { type: "disband", unit: "Worker-2" }, { type: "move_unit", unit: "Worker-2", dir: "N" }],
	]) {
		const found = lintOrders(orders, joinBrief);
		assert.deepEqual(found.map((f) => [f.code, f.index]), [["duplicate_unit_order", orders.length - 1]], JSON.stringify(orders));
		assert.match(found[0].message, /is used up by order #\d \((join_city|disband)\)/);
	}
	// Both of these run: the unit acts first and is used up last.
	assert.deepEqual(lintOrders([{ type: "move_unit", unit: "Worker-2", dir: "N" }, { type: "join_city", unit: "Worker-2" }], joinBrief), []);
	assert.deepEqual(lintOrders([{ type: "hold", unit: "Worker-2" }, { type: "disband", unit: "Worker-2" }], joinBrief), []);
	// A join after a move may be refused (the Worker left the city), so a later
	// order is not called a certain failure.
	const moved = lintOrders([{ type: "move_unit", unit: "Worker-2", dir: "N" }, { type: "join_city", unit: "Worker-2" }, { type: "hold", unit: "Worker-2" }], joinBrief);
	assert.ok(moved.every((f) => !/is used up/.test(f.message)), JSON.stringify(moved));
});

const cityBrief = parseBriefing(`=== TURN 90 | Rome ===
Government: Monarchy   Gold: 300 (+4/turn)   Rates: science 60% / tax 40% / luxury 0%

CITIES (3):
  city-1 Roma (10,10) size 8 [2 happy/3 content/3 unhappy]
      producing: The Pyramids (12 turns left); food +2/turn, grows in 5 (food box 10/20, +2/turn)
      built: Palace, Temple, Library, The Great Library, Heroic Epic
  city-7 Delphi (26,26) size 7 [0 happy/4 content/3 unhappy]
      producing: Warrior (stalled - 0 shields/turn); food +0/turn, NOT GROWING (zero food surplus)
      built: Temple, Granary
      resisting: 2 citizen(s) resist your rule, so the city produces nothing and cannot hurry; each turn, each land combat unit in the city can quell one resister (garrison now: 1)
      raze: captured this turn; {"type":"raze","city":"city-7"} destroys it and leaves 3 Worker(s) (this turn only)
  city-9 Megara (24,18) size 4 [1 happy/3 content/0 unhappy]
      producing: Library (6 turns left); food +1/turn, grows in 9 (food box 3/12, +1/turn)
      built: Temple
      hurry (80g): rush-buy the rest of Library
UNITS (army 0/40, workers 0, settlers 0):
`);

test("raze is checked against the city's raze offer", () => {
	assert.deepEqual(lint([{ type: "raze", city: "city-7" }], cityBrief), []);
	assert.deepEqual(lint([{ type: "raze", city: "city-1" }], cityBrief), ["raze_unavailable:error"]);
	// A city taken by an earlier order in the same reply is not listed yet.
	assert.deepEqual(lint([{ type: "raze", city: "city-40" }], cityBrief), ["raze_unverified:warn"]);
	assert.deepEqual(lint([{ type: "raze" }], cityBrief), ["missing_field:error"]);
	assert.deepEqual(lint([{ type: "raze", city: 7 }], cityBrief), ["missing_field:error"]);
});

test("the Palace and wonders are never for sale", () => {
	for (const building of ["Palace", "The Great Library", "Heroic Epic"]) {
		assert.deepEqual(lint([{ type: "sell_building", city: "city-1", building }], cityBrief), ["not_for_sale:error"], building);
	}
	assert.deepEqual(lint([{ type: "sell_building", city: "city-1", building: "Library" }], cityBrief), []);
});

test("hurry is refused on a wonder and in a resisting city, and allowed where offered", () => {
	assert.deepEqual(lint([{ type: "hurry", city: "city-1" }], cityBrief), ["hurry_wonder:error"]);
	const resisting = lintOrders([{ type: "hurry", city: "city-7" }], cityBrief);
	assert.deepEqual(resisting.map((f) => f.code), ["hurry_unavailable"]);
	assert.match(resisting[0].message, /resisting/);
	assert.deepEqual(lint([{ type: "hurry", city: "city-9" }], cityBrief), []);
});

test("research must be one of the techs the briefing offers", () => {
	const brief = parseBriefing(`Researching: Bronze Working - 10/40 beakers (~4 turns left)
Techs known: 3. Can research now:
  Alphabet (cost 40 beakers): unlocks Writing
  Pottery (cost 40 beakers): unlocks Granary
`);
	assert.deepEqual(lint([{ type: "research", tech: "Alphabet" }], brief), []);
	assert.deepEqual(lint([{ type: "research", tech: "Bronze Working" }], brief), ["already_researching:noop"]);
	assert.deepEqual(lint([{ type: "research", tech: "Gunpowder" }], brief), ["not_researchable:error"]);
});
