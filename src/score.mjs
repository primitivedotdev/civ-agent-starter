// A score for one reply to one briefing, out of 100, so iterating has a number
// to push up. It is not the game's result; it rewards the habits that win
// games in the arena and punishes the ones that lose them:
//
//   legal orders        30  orders the engine accepts (lint errors cost)
//   units used          15  no unit left idle without a standing order
//   cities building     10  every city building something you chose
//   cities defended     15  no city left without a defender after your moves
//   attacks taken       15  when the briefing flags a STRIKE OPPORTUNITY, go in
//   gold                10  losing gold per turn and not adjusting rates costs
//   offers answered      5  a trade offer left unanswered costs
//   expansion           10  room for more cities (CITY COUNT line) and no settler coming
//   research             5  nothing being researched
//
// Only the parts that apply to a turn count (no strike flagged: no attack
// part), and the total is scaled back to 100.
//
// Pure: scoreTurn(briefing, orders, lintFindings) from parsed data.

const isMilitary = (u) => (u.attack ?? 0) > 0 || (u.defense ?? 0) > 0;
const isNonCombat = (u) => /worker|settler|engineer|scout|explorer|catapult|trebuchet|cannon|artillery/i.test(u.type);
const MOVES = new Set(["move_to", "move_unit", "advance", "explore"]);

export function scoreTurn(b, orders, findings = []) {
	const parts = [];
	const add = (name, max, frac, note) => parts.push({ name, max, got: Math.round(max * Math.max(0, Math.min(1, frac)) * 10) / 10, note });
	const na = () => {}; // a part that does not apply to this turn
	const list = Array.isArray(orders) ? orders : [];

	// Legal orders.
	if (!orders) add("legal orders", 30, 0, "no parseable <ORDERS> block");
	else {
		const errors = findings.filter((f) => f.severity === "error").length;
		add("legal orders", 30, list.length ? 1 - errors / list.length : 1, errors ? `${errors} of ${list.length} orders would be refused` : "");
	}

	// Units used: ordered, or already on a standing order / busy.
	const ordered = new Set(list.map((o) => o.unit).filter(Boolean));
	const units = b.units ?? [];
	const idle = units.filter((u) => !u.standingOrder && !u.busy && !ordered.has(u.id));
	add("units used", 15, units.length ? 1 - idle.length / units.length : 1, idle.length ? `${idle.length} idle: ${idle.slice(0, 4).map((u) => u.id).join(", ")}${idle.length > 4 ? ", ..." : ""}` : "");

	// Cities building something chosen (not the engine's default pick).
	const setFor = new Set(list.filter((o) => o.type === "set_production").map((o) => o.city));
	const cities = b.cities ?? [];
	const drifting = cities.filter((c) => (c.engineDefault || !c.producing) && !setFor.has(c.id));
	add("cities building", 10, cities.length ? 1 - drifting.length / cities.length : 1, drifting.length ? `${drifting.length} on the engine's default: ${drifting.slice(0, 3).map((c) => c.name).join(", ")}` : "");

	// Cities defended after this turn's moves.
	const leaving = new Set(list.filter((o) => MOVES.has(o.type)).map((o) => o.unit));
	const byId = new Map(units.map((u) => [u.id, u]));
	const empty = cities.filter((c) => {
		const staying = units.some((u) => isMilitary(u) && !isNonCombat(u) && u.x === c.x && u.y === c.y && !leaving.has(u.id));
		const arriving = list.some((o) => o.type === "move_to" && o.x === c.x && o.y === c.y && byId.get(o.unit) && isMilitary(byId.get(o.unit)) && !isNonCombat(byId.get(o.unit)));
		return !staying && !arriving;
	});
	add("cities defended", 15, cities.length ? 1 - empty.length / cities.length : 1, empty.length ? `${empty.length} left empty: ${empty.slice(0, 3).map((c) => c.name).join(", ")}` : "");

	// Attacks taken on flagged openings.
	const strikes = b.strikes ?? [];
	const tileOf = (s) => (b.targets?.[s.civ] ?? []).find((t) => t.name === s.city);
	const taken = strikes.filter((s) => {
		const t = tileOf(s);
		return t && list.some((o) => o.type === "move_to" && o.x === t.x && o.y === t.y);
	});
	(strikes.length ? add : na)("attacks taken", 15, strikes.length ? taken.length / strikes.length : 1, strikes.length > taken.length ? `missed: ${strikes.filter((s) => !taken.includes(s)).map((s) => s.city).join(", ")}` : "");

	// Gold: bleeding gold without touching the rates.
	const bleeding = (b.goldPerTurn ?? 0) < 0;
	const adjusted = list.some((o) => o.type === "set_rates");
	(bleeding ? add : na)("gold", 10, !bleeding || adjusted ? 1 : 0, bleeding && !adjusted ? `losing ${-b.goldPerTurn} gold a turn, rates unchanged` : "");

	// Trade offers answered.
	const offers = b.tradeOffers ?? [];
	const answered = offers.filter((t) => list.some((o) => (o.type === "accept_trade" || o.type === "decline_trade") && o.civ === t.civ));
	(offers.length ? add : na)("offers answered", 5, offers.length ? answered.length / offers.length : 1, offers.length > answered.length ? `unanswered: ${offers.filter((t) => !answered.includes(t)).map((t) => t.civ).join(", ")}` : "");

	// Expansion: the engine prints the map's optimal city count; under it, a
	// settler should be walking or being built.
	if (b.cityOptimal != null && cities.length < b.cityOptimal) {
		const coming = units.some((u) => /settler/i.test(u.type)) ||
			cities.some((c) => /^Settler$/i.test(String(c.producing ?? "")) && !c.engineDefault) ||
			list.some((o) => o.type === "set_production" && /^Settler$/i.test(o.item));
		add("expansion", 10, coming ? 1 : 0, coming ? "" : `${cities.length} of about ${b.cityOptimal} cities and no settler coming`);
	}

	// Research.
	if ((b.researchable ?? []).length) {
		const researching = !!b.researching || list.some((o) => o.type === "research");
		add("research", 5, researching ? 1 : 0, researching ? "" : "nothing being researched");
	}

	const max = parts.reduce((s, p) => s + p.max, 0);
	const total = Math.round((100 * parts.reduce((s, p) => s + p.got, 0)) / Math.max(1, max));
	return { total, parts };
}
