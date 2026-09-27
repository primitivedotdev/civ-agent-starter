// Order linter: check an orders array against the briefing that produced it,
// before you send it.
//
// A bad order is otherwise only discovered when the engine applies it, and your
// agent hears about it in the next turn's briefing. Every rule here is
// checkable from the briefing alone, so you can lint locally, in tests, or
// inside your agent before replying (and hand the messages back to a model for
// a repair pass).
//
// Severities:
//   error   the engine will refuse this order; fix it before sending
//   noop    the engine will accept it and nothing will change; wasted order
//   warn    likely refused or likely a mistake; the briefing cannot prove it
//
// Messages are written to be handed straight back to a model for a repair pass.

import { byId } from "./briefing.mjs";

// The engine decides "defensive" from building data (providesWalls,
// combatDefenseBonus, veteran flags), which the briefing does not carry, so
// these are advisory only.
const LIKELY_DEFENSIVE = new Set([
	"Walls", "City Walls", "Great Wall", "The Great Wall", "Coastal Fortress",
	"Barracks", "SAM Missile Battery", "Bomb Shelter",
]);

// Buildings the engine never sells: the Palace and every Great and Small
// Wonder in the arena's ruleset. The engine also refuses to hurry a wonder with
// gold or population, and the briefing prints no hurry line for one.
//
// Generated from the arena engine's ruleset (C7/Lua/game_modes/base-ruleset.json):
// every building whose greatWonderProperties is present (an empty {} counts) or
// whose isSmallWonder is true, plus the one flagged isCenterOfEmpire (the
// Palace). To regenerate, from a checkout of the engine:
//   node -e 'console.log(JSON.stringify(require("./C7/Lua/game_modes/base-ruleset.json").buildings.filter((b) => b.greatWonderProperties != null || b.isSmallWonder || (b.flags ?? []).includes("isCenterOfEmpire")).map((b) => b.name)))'
// test/lint.test.mjs checks this list against that ruleset when CIV_RULESET
// points at the file.
export const NEVER_FOR_SALE = [
	"Palace", "The Pyramids", "The Hanging Gardens", "The Colossus", "The Great Lighthouse",
	"The Great Library", "The Oracle", "The Great Wall", "Sun Tzu's Art of War", "Sistine Chapel",
	"Magellan's Voyage", "Copernicus' Observatory", "Shakespeare's Theater", "Leonardo's Workshop",
	"JS Bach's Cathedral", "Newton's University", "Smith's Trading Company", "Universal Suffrage", "Hoover Dam",
	"Theory of Evolution", "The United Nations", "The Manhattan Project", "Cure for Cancer", "Longevity",
	"SETI program", "Heroic Epic", "Iron Works", "Forbidden Palace", "Military Academy", "The Pentagon",
	"Wall Street", "Apollo Program", "Strategic Missile Defense", "Intelligence Agency", "Battlefield Medicine",
	"The Internet", "The Temple of Artemis", "The Statue of Zeus", "The Mausoleum of Mausollos",
	"Knights Templar", "Secret Police HQ",
];
const NEVER_FOR_SALE_SET = new Set(NEVER_FOR_SALE.map((n) => n.toLowerCase()));
const PALACE = "palace";
const isWonder = (name) => typeof name === "string" && name.toLowerCase() !== PALACE && NEVER_FOR_SALE_SET.has(name.toLowerCase());
const NOT_FOR_SALE = (name) => typeof name === "string" && NEVER_FOR_SALE_SET.has(name.toLowerCase());

const VERB_FOR = {
	move_unit: "move_unit", move_to: "move_to", move_path: "move_path", advance: "advance", bombard: "bombard",
	fortify: "fortify", sentry: "sentry", hold: "hold", disband: "disband",
	explore: "explore", work: "work", upgrade: "upgrade", found_city: "found_city",
	pillage: "pillage", join_city: "join_city", leader_hurry: "leader_hurry",
};
const UNIT_ORDERS = new Set(Object.keys(VERB_FOR));
// Orders that remove the unit from play: nothing else can be ordered for it after.
const CONSUMING_ORDERS = ["join_city", "leader_hurry", "disband"];
// Orders that can change where the unit stands (work may walk a Worker to its job).
const RELOCATING_ORDERS = ["move_unit", "move_to", "move_path", "advance", "explore", "work"];
const CITY_ORDERS = new Set(["set_production", "hurry", "sell_building"]);
const DIRS = new Set(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]);

const f = (code, severity, index, order, message) => ({ code, severity, index, order, message });

export function lintOrders(orders, brief) {
	const out = [];
	if (!Array.isArray(orders)) return [f("not_an_array", "error", -1, null, "Orders must be a JSON array.")];

	const cities = byId(brief.cities);
	const units = byId(brief.units);
	const movedUnits = new Map();
	const consumedAt = new Map(); // unit id -> index of the order that uses it up
	const relocated = new Set(); // units an earlier order may have moved
	let proposals = 0;

	orders.forEach((o, i) => {
		if (!o || typeof o !== "object" || typeof o.type !== "string") {
			out.push(f("malformed", "error", i, o, "Each order must be an object with a string \"type\"."));
			return;
		}
		const t = o.type;

		if (UNIT_ORDERS.has(t)) {
			const u = units.get(o.unit);
			if (!u) {
				out.push(f("unknown_unit", "error", i, o, `No unit "${o.unit}" in this briefing. Use the exact unit ids listed under UNITS.`));
				return;
			}
			const firstFinding = out.length;
			if (u.busy && ["work", "fortify", "sentry", "hold"].includes(t)) {
				out.push(f("unit_busy", "noop", i, o, `${u.id} is BUSY finishing a job and needs no order; this one is wasted.`));
			} else if (u.busy && ["move_unit", "move_to", "move_path", "advance"].includes(t)) {
				// Moving a busy worker is legal and does something: it abandons the
				// job. Worth flagging, never worth silently dropping in a repair.
				out.push(f("unit_busy_move", "warn", i, o, `${u.id} is BUSY building; moving it ABANDONS that job and wastes the turns already spent. Intentional?`));
			}
			if (u.standingOrder === "FORTIFIED" && t === "fortify") {
				out.push(f("already_fortified", "noop", i, o, `${u.id} is already FORTIFIED. Do not re-issue fortify.`));
			}
			if (u.standingOrder && u.standingOrder.startsWith("ADVANCING") && t === "advance") {
				out.push(f("already_advancing", "noop", i, o, `${u.id} is already ADVANCING and keeps going every turn. Do not re-issue advance.`));
			}
			if (u.standingOrder && u.standingOrder.startsWith("AUTO") && t === "work") {
				out.push(f("already_working", "noop", i, o, `${u.id} is already on AUTO-WORK. Do not re-issue work.`));
			}
			// A worker standing on a tile with no useful job has no "work" verb, but
			// the engine still accepts work and walks it somewhere useful.
			const softVerb = t === "work";
			if (u.actions.verbs.size && !u.actions.verbs.has(VERB_FOR[t]) && t !== "found_city" && !softVerb) {
				out.push(f("action_not_available", "error", i, o, `${u.id} (${u.type}) cannot ${t}. Its listed actions are: ${[...u.actions.verbs].join(", ")}.`));
			}
			if (t === "move_path") {
				if (!brief.pathMovement) out.push(f("path_not_supported", "error", i, o, "This briefing does not advertise move_path."));
				if (!Array.isArray(o.directions) || o.directions.length < 1 || o.directions.length > 60 || o.directions.some((d) => typeof d !== "string" || !DIRS.has(d.trim().toUpperCase())))
					out.push(f("bad_path", "error", i, o, "directions must contain 1 to 60 compass directions."));
			}
			if (t === "move_unit" && !DIRS.has(o.dir)) {
				out.push(f("bad_direction", "error", i, o, `"${o.dir}" is not a direction. Use one of N, NE, E, SE, S, SW, W, NW.`));
			}
			// Only check range when the briefing actually listed this unit's
			// actions. A unit under a standing order prints a compact line with no
			// "actions:" at all, so an empty bombard list is no evidence: the
			// engine accepts the order on unit type and range alone (the engine
			// case "bombard" checks canBombard()/canBombardTile(), with no guard
			// against a fortified unit).
			if (t === "bombard" && u.actions.verbs.has("bombard")) {
				const ok = u.actions.bombard.some((b) => b.x === o.x && b.y === o.y);
				if (!ok) {
					const list = u.actions.bombard.map((b) => `(${b.x},${b.y})`).join(", ") || "none this turn";
					out.push(f("bombard_out_of_range", "error", i, o, `${u.id} cannot bombard (${o.x},${o.y}). In range: ${list}.`));
				}
			}
			if (t === "work" && u.actions.jobs.length && !u.actions.jobs.includes(o.job)) {
				// A worker with no useful job here is auto-walked to a tile where the
				// job applies, so this is a hint, not a refusal.
				out.push(f("job_not_here", "warn", i, o, `${u.id} cannot do "${o.job}" on its current tile (available here: ${u.actions.jobs.join(", ")}); the engine will walk it to a tile where the job applies.`));
			}
			if (t === "found_city" && !/settler/i.test(u.type)) {
				out.push(f("not_a_settler", "error", i, o, `${u.id} is a ${u.type}, not a Settler, so it cannot found a city.`));
			}
			// An order the checks above already call a refusal leaves the unit where
			// it was and in play, so it neither moves nor uses up the unit below.
			const refused = out.slice(firstFinding).some((x) => x.severity === "error");
			// Orders run in array order. After one that uses the unit up, every
			// later order for it fails with "unit not found"; before it, an order
			// still runs (moving a Worker into a city, then join_city, is fine).
			if (consumedAt.has(o.unit)) {
				const at = consumedAt.get(o.unit);
				out.push(f("duplicate_unit_order", "warn", i, o, `${u.id} is used up by order #${at} (${orders[at].type}) earlier this turn, so this later order fails. Drop it or put it first.`));
			} else if (["move_unit", "move_to", "move_path", "advance", "bombard", "fortify", "sentry", "hold", "explore", "work"].includes(t)) {
				if (movedUnits.has(o.unit)) {
					out.push(f("duplicate_unit_order", "warn", i, o, `${u.id} already has order #${movedUnits.get(o.unit)} (${orders[movedUnits.get(o.unit)].type}) this turn; the later one usually wins.`));
				} else movedUnits.set(o.unit, i);
			}
			if (!refused) {
				// join_city and leader_hurry are judged where the unit stands when they
				// run: after an earlier order moved it, they may be refused and leave
				// the unit in play, so only then is it not certainly used up.
				const placeBound = t === "join_city" || t === "leader_hurry";
				if (CONSUMING_ORDERS.includes(t) && !consumedAt.has(o.unit) && !(placeBound && relocated.has(o.unit)))
					consumedAt.set(o.unit, i);
				if (RELOCATING_ORDERS.includes(t)) relocated.add(o.unit);
			}
			return;
		}

		if (t === "raze") {
			if (typeof o.city !== "string" || !o.city) {
				out.push(f("missing_field", "error", i, o, `raze needs "city". Send {"type":"raze","city":"<id of a city you captured this turn>"}.`));
				return;
			}
			const c = cities.get(o.city);
			// A city captured by an earlier order in this same reply is not in the
			// briefing's own cities yet, so an unknown id is only a warning here.
			if (!c) {
				out.push(f("raze_unverified", "warn", i, o, `No own city "${o.city}" in this briefing. raze works only on a city you captured this turn; it succeeds only if an earlier order in this reply takes it.`));
			} else if (c.razeWorkers == null) {
				out.push(f("raze_unavailable", "error", i, o, `${c.name} cannot be razed: only a city captured this turn can be, and the briefing offers no raze for it.`));
			}
			return;
		}

		if (CITY_ORDERS.has(t)) {
			const c = cities.get(o.city);
			if (!c) {
				out.push(f("unknown_city", "error", i, o, `No city "${o.city}" in this briefing. Use the exact city ids listed under CITIES.`));
				return;
			}
			if (t === "set_production") {
				if (c.producing && o.item === c.producing) {
					out.push(f("already_building", "noop", i, o, `${c.name} is already building ${o.item}. Do not re-issue it; the shields are not lost and the order changes nothing.`));
				} else if (c.buildOptions.length && !c.buildOptions.includes(o.item)) {
					// The briefing lists at most 12 options; a full list may be hiding
					// legal items (wonders especially), so that case is only a warning.
					const sev = c.buildOptionsTruncated ? "warn" : "error";
					const tail = c.buildOptionsTruncated
						? ` It is not among the 12 options the briefing lists (${c.buildOptions.join(", ")}), and the list is capped, so it may still be legal.`
						: ` Its options are: ${c.buildOptions.join(", ")}.`;
					out.push(f("not_buildable", sev, i, o, `${c.name}: "${o.item}" is not a listed build option.${tail}`));
				}
			}
			if (t === "hurry") {
				if (isWonder(c.producing)) {
					out.push(f("hurry_wonder", "error", i, o, `${c.name} is building ${c.producing}, a wonder. Wonders cannot be hurried with gold or population; build them with shields.`));
				} else if (c.hurryCost == null) {
					const why = c.resisting > 0 ? ` Its citizens are resisting your rule, and a resisting city cannot hurry.` : "";
					out.push(f("hurry_unavailable", "error", i, o, `${c.name} has no hurry option this turn.${why}`));
				} else if (c.hurryGold != null && brief.gold != null && brief.gold < c.hurryGold) {
					out.push(f("hurry_too_expensive", "error", i, o, `Hurrying ${c.name} costs ${c.hurryGold}g and you have ${brief.gold}g.`));
				}
			}
			if (t === "sell_building") {
				if (NOT_FOR_SALE(o.building)) {
					out.push(f("not_for_sale", "error", i, o, `${o.building} cannot be sold: the engine never sells the Palace or a wonder.`));
				} else if (c.builtKnown && !c.built.includes(o.building)) {
					out.push(f("not_built", "error", i, o, `${c.name} has no ${o.building}. Built there: ${c.built.join(", ") || "nothing"}.`));
				} else if (LIKELY_DEFENSIVE.has(o.building)) {
					out.push(f("defensive_building", "warn", i, o, `The engine refuses to sell defensive buildings such as ${o.building}. Sell a Colosseum, Cathedral or Marketplace in a safe city instead, or disband units.`));
				}
			}
			return;
		}

		switch (t) {
			case "declare_war":
				if (brief.relations[o.civ] === "war") out.push(f("already_at_war", "noop", i, o, `You are already AT WAR with ${o.civ}.`));
				else if (brief.declarableWar.length && !brief.declarableWar.includes(o.civ)) {
					out.push(f("cannot_declare", "error", i, o, `Cannot declare war on "${o.civ}". You may declare on: ${brief.declarableWar.join(", ") || "nobody"}.`));
				}
				break;
			case "make_peace":
				if (brief.relations[o.civ] === "peace") {
					// The engine answers ok with "already at peace with X".
					out.push(f("already_at_peace", "noop", i, o, `You are already at peace with ${o.civ}; the order changes nothing.`));
				} else if (brief.offerablePeace.length && !brief.offerablePeace.includes(o.civ)) {
					out.push(f("cannot_offer_peace", "error", i, o, `No war to end with "${o.civ}". You may offer peace to: ${brief.offerablePeace.join(", ") || "nobody"}.`));
				}
				break;
			case "propose_trade": {
				if (++proposals > 1) out.push(f("second_trade", "error", i, o, "Only ONE propose_trade per turn; this one will be refused."));
				const give = /gold:(\d+)/.exec(String(o.give || ""));
				if (give && brief.gold != null && Number(give[1]) > brief.gold) {
					out.push(f("gold_you_lack", "error", i, o, `You offer ${give[1]} gold but hold ${brief.gold}.`));
				}
				break;
			}
			case "accept_trade":
			case "decline_trade":
				if (!brief.tradeOffersFrom.includes(o.civ)) {
					const open = brief.tradeOffersFrom.join(", ");
					out.push(f("no_offer", "error", i, o, `${o.civ} has no open offer to answer this turn${open ? `; open offers: ${open}` : " (nobody has offered you a trade)"}. An offer must be answered on the turn it appears.`));
				}
				break;
			case "research":
				if (brief.researching && o.tech === brief.researching.tech) {
					out.push(f("already_researching", "noop", i, o, `You are already researching ${o.tech} (${brief.researching.have}/${brief.researching.need} beakers). Re-issuing does nothing.`));
				} else if (brief.researchable.length && !brief.researchable.includes(o.tech)) {
					out.push(f("not_researchable", "error", i, o, `"${o.tech}" is not available to research now. Options: ${brief.researchable.join(", ")}.`));
				}
				break;
			case "set_rates": {
				// The engine takes either scale (0-10 tenths or a percentage, which it
				// normalizes) and defaults an OMITTED slider to its current value, so
				// changing only one of the two is legal. Compare in percent.
				const pct = (v) => (Number.isFinite(v) ? (v > 10 ? v : v * 10) : NaN);
				const given = (k) => o[k] !== undefined && o[k] !== null;
				const bad = ["science", "luxury"].filter((k) => given(k) && !(Number.isFinite(Number(o[k])) && Number(o[k]) >= 0));
				const sci = given("science") ? pct(Number(o.science)) : (brief.rates ? brief.rates.science : NaN);
				const lux = given("luxury") ? pct(Number(o.luxury)) : (brief.rates ? brief.rates.luxury : NaN);
				if (bad.length) {
					out.push(f("bad_rates", "error", i, o, `${bad.join(" and ")} must be a number of 0 or more (0-10 tenths, or a percentage). An omitted slider keeps its current value.`));
				} else if (!given("science") && !given("luxury")) {
					out.push(f("rates_unchanged", "noop", i, o, "Neither science nor luxury was given, so nothing changes."));
				} else if (!Number.isFinite(sci) || !Number.isFinite(lux)) {
					// Nothing to compare against (no rates line in this briefing).
				} else if (sci + lux > 100) {
					// The engine clamps rather than refusing, so this is advisory.
					out.push(f("rates_over_100", "warn", i, o, `science ${sci}% + luxury ${lux}% exceeds 100%; the engine will clamp them, so set what you actually want.`));
				} else if (brief.rates && sci === brief.rates.science && lux === brief.rates.luxury) {
					out.push(f("rates_unchanged", "noop", i, o, `Rates are already science ${brief.rates.science}% / luxury ${brief.rates.luxury}%.`));
				}
				break;
			}
			case "revolt":
				if (brief.government && o.government === brief.government) {
					out.push(f("already_government", "noop", i, o, `You are already a ${o.government}.`));
				} else if (brief.revoltKnown && !brief.canRevoltTo.includes(o.government)) {
					out.push(f("government_locked", "error", i, o, `Cannot revolt to ${o.government}. Available: ${brief.canRevoltTo.join(", ")}.`));
				}
				break;
			default:
				out.push(f("unknown_order_type", "error", i, o, `"${t}" is not an order type the arena accepts.`));
		}
	});
	return out;
}

// Compact, model-facing rendering of the findings: one line per problem.
export function formatFindings(findings) {
	return findings
		.filter((x) => x.severity !== "warn")
		.map((x) => `order ${x.index} ${JSON.stringify(x.order)} -> ${x.severity.toUpperCase()}: ${x.message}`)
		.join("\n");
}

export const summarize = (findings) => ({
	error: findings.filter((x) => x.severity === "error").length,
	noop: findings.filter((x) => x.severity === "noop").length,
	warn: findings.filter((x) => x.severity === "warn").length,
});
