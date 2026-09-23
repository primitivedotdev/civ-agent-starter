// Your agent.
//
// decide(briefingText, env, game) returns the full reply body: a line of
// reasoning, optional tagged blocks, and one <ORDERS>[...]</ORDERS> block.
// `game` is what the harness remembers about this game (civ, rivals'
// mailboxes, letters received since last turn); see handler.ts.
//
// To write to a rival, put <DIPLOMACY to="Greece">your letter</DIPLOMACY> in
// the reply: the harness mails it to Greece's mailbox for this game.
// onLetter(letter, env, game) is called when a rival writes to you; return
// text to answer in thread, or null to just read it (it also lands in
// game.inbox for your next turn).
//
// Out of the box it plays a simple rule-based game (no API key needed) built on
// parseBriefing(), so every order it sends comes from the actions the briefing
// lists. Set ANTHROPIC_API_KEY as a Function secret to have a model play
// instead, with the rules as the fallback. Replace any of this with your own.

import { parseBriefing } from "./briefing.mjs";
import { lintOrders } from "./lint.mjs";
import { askModel } from "./llm.mjs";
import { diplomacyContext, noteAgreement, pendingOffers, recordLetter, setStance } from "./diplomacy.mjs";

export async function decide(briefingText, env = {}, game = {}) {
	const brief = parseBriefing(briefingText);
	if (env.ANTHROPIC_API_KEY) {
		try {
			// Three things the model needs beyond the briefing: letters that
			// arrived since last turn, what you and each rival have said before
			// now (game.diplomacy, see src/diplomacy.mjs), and which offers the
			// ENGINE says are actually on the table this turn.
			const letters = (game.inbox ?? []).map((l) => `Letter from ${l.fromCiv}:\n${l.text}`).join("\n\n");
			const diplo = diplomacyContext(game.diplomacy, brief);
			const context = [
				briefingText,
				letters ? `=== LETTERS FROM RIVALS SINCE LAST TURN ===\n${letters}` : "",
				diplo,
			].filter(Boolean).join("\n\n");
			const reply = await askModel(context, env);
			const orders = lastOrders(reply);
			// Keep the model's reply only if it produced orders the engine will take,
			// and let the rules cover every unit and city it left alone (a model
			// often answers with policy only: rates, research, a trade).
			if (orders && !lintOrders(orders, brief).some((f) => f.severity === "error")) {
				const merged = fillGaps(orders, ruleOrders(brief));
				return merged.length === orders.length ? reply : withOrders(reply, merged);
			}
		} catch (e) {
			console.error(`model failed, falling back to rules: ${e instanceof Error ? e.message : e}`);
		}
	}
	return formatReply("Holding the line and building while the realm grows.", ruleOrders(brief));
}

// Model orders first; then rule orders for any unit or city the model did not
// order, and for order types it did not use at all (rates, research).
export function fillGaps(primary, fallback) {
	const units = new Set(primary.map((o) => o.unit).filter(Boolean));
	const cities = new Set(primary.map((o) => o.city).filter(Boolean));
	const types = new Set(primary.map((o) => o.type));
	const extra = fallback.filter((o) =>
		o.unit ? !units.has(o.unit) : o.city ? !cities.has(o.city) : !types.has(o.type));
	return [...primary, ...extra];
}

// The reply with its last ORDERS block replaced (everything else kept).
export function withOrders(reply, orders) {
	const text = String(reply);
	const i = text.lastIndexOf("<ORDERS>");
	const block = `<ORDERS>${JSON.stringify(orders, null, 1)}</ORDERS>`;
	if (i < 0) return `${text}\n\n${block}`;
	const j = text.indexOf("</ORDERS>", i);
	return text.slice(0, i) + block + (j < 0 ? "" : text.slice(j + "</ORDERS>".length));
}

export function formatReply(reasoning, orders) {
	return `${reasoning}\n\n<ORDERS>${JSON.stringify(orders, null, 1)}</ORDERS>`;
}

// The last <ORDERS> block in a reply, parsed, or null.
export function lastOrders(reply) {
	const blocks = [...String(reply).matchAll(/<ORDERS>([\s\S]*?)<\/ORDERS>/g)];
	if (!blocks.length) return null;
	try {
		const v = JSON.parse(blocks[blocks.length - 1][1]);
		return Array.isArray(v) ? v : null;
	} catch {
		return null;
	}
}

// A deliberately simple policy. It is legal, not good: improving it is the game.
export function ruleOrders(b) {
	const orders = [];
	const atWar = Object.values(b.relations ?? {}).includes("war");
	const cityAt = new Set(b.cities.map((c) => `${c.x},${c.y}`));
	const military = (u) => (u.attack ?? 0) > 0;
	const garrison = new Map();
	for (const u of b.units) if (military(u)) garrison.set(`${u.x},${u.y}`, (garrison.get(`${u.x},${u.y}`) ?? 0) + 1);

	for (const u of b.units) {
		if (u.standingOrder || u.busy) continue; // already doing something
		const v = u.actions.verbs;
		const here = `${u.x},${u.y}`;
		if (/settler/i.test(u.type) && v.has("found_city")) {
			orders.push({ type: "found_city", unit: u.id, name: `${b.civ ?? "New"} ${b.cities.length + 1}` });
		} else if (/worker/i.test(u.type) && u.actions.jobs.length) {
			orders.push({ type: "work", unit: u.id, job: u.actions.jobs.includes("Road") ? "Road" : u.actions.jobs[0] });
		} else if (u.actions.bombard.length) {
			const t = u.actions.bombard[0];
			orders.push({ type: "bombard", unit: u.id, x: t.x, y: t.y });
		} else if (military(u) && cityAt.has(here) && garrison.get(here) <= 1 && v.has("fortify")) {
			orders.push({ type: "fortify", unit: u.id }); // a city's only defender stays home
		} else if (military(u) && atWar && v.has("advance")) {
			orders.push({ type: "advance", unit: u.id, to: "nearest_enemy_city" });
		} else if (v.has("explore") && b.turn != null && b.turn < 40) {
			orders.push({ type: "explore", unit: u.id });
		} else if (v.has("fortify")) {
			orders.push({ type: "fortify", unit: u.id });
		}
	}

	// Empty cities: the nearest soldier that is not its own city's only
	// defender walks in (one per city, never a unit already given an order).
	const ordered = new Set(orders.map((o) => o.unit));
	const soldiersAt = new Map();
	for (const u of b.units) if (military(u)) soldiersAt.set(`${u.x},${u.y}`, (soldiersAt.get(`${u.x},${u.y}`) ?? 0) + 1);
	const dist = (p, q) => Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y));
	for (const c of b.cities) {
		if (soldiersAt.get(`${c.x},${c.y}`)) continue;
		const spare = b.units
			// A unit on a standing order (fortified, advancing) lists no actions but
			// takes a move_to all the same.
			.filter((u) => military(u) && !ordered.has(u.id) && !u.busy &&
				(u.actions.verbs.has("move_to") || (u.standingOrder && !u.actions.verbs.size)) &&
				!(cityAt.has(`${u.x},${u.y}`) && (soldiersAt.get(`${u.x},${u.y}`) ?? 0) <= 1))
			.sort((p, q) => dist(p, c) - dist(q, c))[0];
		if (!spare || dist(spare, c) > 8) continue;
		// Replace any order already given to this unit (explore, fortify).
		const i = orders.findIndex((o) => o.unit === spare.id);
		if (i >= 0) orders.splice(i, 1);
		orders.push({ type: "move_to", unit: spare.id, x: c.x, y: c.y });
		ordered.add(spare.id);
		soldiersAt.set(`${spare.x},${spare.y}`, (soldiersAt.get(`${spare.x},${spare.y}`) ?? 1) - 1);
		soldiersAt.set(`${c.x},${c.y}`, 1);
	}

	// A ready assault (the briefing's STRIKE OPPORTUNITY with more attackers
	// next to the city than it has defenders): every adjacent attacker goes in
	// this turn. An unready one the engine itself says to muster for first.
	for (const s of b.strikes ?? []) {
		if ((s.attackersAdjacent ?? 0) <= (s.defenders ?? 0)) continue;
		const city = (b.targets?.[s.civ] ?? []).find((t) => t.name === s.city);
		if (!city) continue;
		for (const u of b.units) {
			if (!military(u) || u.busy || dist(u, city) !== 1) continue;
			if (cityAt.has(`${u.x},${u.y}`) && (soldiersAt.get(`${u.x},${u.y}`) ?? 0) <= 1) continue; // keep home defended
			const i = orders.findIndex((o) => o.unit === u.id);
			if (i >= 0) orders.splice(i, 1);
			orders.push({ type: "move_to", unit: u.id, x: city.x, y: city.y });
		}
	}

	// Always be researching something.
	if (!b.researching && (b.researchable ?? []).length) orders.push({ type: "research", tech: b.researchable[0] });

	// The briefing's CITY COUNT line gives the map's optimal city count; past it,
	// new cities mostly add corruption.
	const roomToSettle = b.cityOptimal == null ? b.cityCount == null : b.cities.length < b.cityOptimal;
	for (const c of b.cities) {
		if (c.producing && !c.engineDefault) continue; // keep what it is building
		const opts = c.buildOptions;
		const defended = (garrison.get(`${c.x},${c.y}`) ?? 0) > 0;
		const pick =
			(!defended && opts.find((o) => /^(Spearman|Pikeman|Musketman|Warrior)$/.test(o))) ||
			(roomToSettle && c.size >= 2 && opts.find((o) => o === "Settler")) ||
			opts.find((o) => /^(Temple|Granary|Library|Marketplace|Courthouse)$/.test(o)) ||
			opts[0];
		// An engine default is not a choice until you make it, even when it is
		// what you would pick: the engine re-picks defaults on its own.
		if (pick && (pick !== c.producing || c.engineDefault)) orders.push({ type: "set_production", city: c.id, item: pick });
	}

	// Answer any trade offer (an unanswered offer simply expires).
	for (const offer of b.tradeOffers ?? []) orders.push({ type: "decline_trade", civ: offer.civ, note: "Not this turn." });

	// Losing gold every turn: shift a tenth of science to tax.
	if ((b.goldPerTurn ?? 0) < 0 && b.rates && b.rates.science >= 10) {
		orders.push({ type: "set_rates", science: b.rates.science / 10 - 1, luxury: b.rates.luxury / 10 });
	}
	return orders;
}

// A rival wrote to you. Return reply text to answer in thread, or null to read
// it without answering. The letter is saved either way: to game.inbox, so
// decide() sees it on your next turn, and to the ledger in src/diplomacy.mjs,
// so you still know what was said ten turns from now.
//
// This is the obvious place to start iterating. Out of the box it answers
// briefly and non-committally, because the one thing a default must not do is
// promise something on your behalf. What it will NOT do is act: a letter
// cannot move gold, sign peace, or start a war. Only orders from decide() do
// that, so if you want to take a deal, the accept_trade or make_peace goes in
// your next turn's orders.
const LETTER_SYSTEM = [
	"You are the ruler of a civilization in a game of Civilization III, writing a short",
	"private letter to a rival ruler. Two or three sentences, in character, no preamble",
	"and no signature.",
	"",
	"You cannot execute anything in a letter. Gold, cities, techs and peace move only",
	"through game orders on a turn. So do not claim a payment has been made and do not",
	"state that a deal is done. You may propose, refuse, warn, stall or ask a question.",
	"Never promise something you would not actually order next turn.",
].join("\n");

export async function onLetter(letter, env = {}, game = {}) {
	const from = letter?.fromCiv ?? "a rival";
	const me = game?.civ ?? "our civilization";
	if (!env.ANTHROPIC_API_KEY) {
		// No model key: acknowledge, commit to nothing. Silence reads as hostility
		// and costs you alliances you might have wanted.
		return `${from}, your message reached us. We have read it and will answer with our actions.`;
	}
	try {
		const history = diplomacyContext(game?.diplomacy, null);
		const prompt = [
			`You are ${me}. ${from} has written to you.`,
			"",
			`Their letter:\n${String(letter?.text ?? "").slice(0, 2000)}`,
			history ? `\n${history}` : "",
			"",
			`Write your reply to ${from}.`,
		].filter(Boolean).join("\n");
		const reply = await askModel(prompt, env, { system: LETTER_SYSTEM, maxTokens: 400 });
		const text = String(reply ?? "").trim();
		return text || null;
	} catch (e) {
		console.error(`letter reply failed: ${e instanceof Error ? e.message : e}`);
		return null;
	}
}

// Re-exported so your agent can reach the ledger without a second import.
export { diplomacyContext, noteAgreement, pendingOffers, recordLetter, setStance };
