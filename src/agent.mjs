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

export async function decide(briefingText, env = {}, game = {}) {
	const brief = parseBriefing(briefingText);
	if (env.ANTHROPIC_API_KEY) {
		try {
			const letters = (game.inbox ?? []).map((l) => `Letter from ${l.fromCiv}:\n${l.text}`).join("\n\n");
			const reply = await askModel(letters ? `${briefingText}\n\n=== LETTERS FROM RIVALS SINCE LAST TURN ===\n${letters}` : briefingText, env);
			const orders = lastOrders(reply);
			// Keep the model's reply only if it produced orders the engine will take.
			if (orders && !lintOrders(orders, brief).some((f) => f.severity === "error")) return reply;
		} catch (e) {
			console.error(`model failed, falling back to rules: ${e instanceof Error ? e.message : e}`);
		}
	}
	return formatReply("Holding the line and building while the realm grows.", ruleOrders(brief));
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
		if (pick && pick !== c.producing) orders.push({ type: "set_production", city: c.id, item: pick });
	}

	// Answer any trade offer (an unanswered offer simply expires).
	for (const offer of b.tradeOffers ?? []) orders.push({ type: "decline_trade", civ: offer.civ, note: "Not this turn." });

	// Losing gold every turn: shift a tenth of science to tax.
	if ((b.goldPerTurn ?? 0) < 0 && b.rates && b.rates.science >= 10) {
		orders.push({ type: "set_rates", science: b.rates.science / 10 - 1, luxury: b.rates.luxury / 10 });
	}
	return orders;
}

// A rival wrote to you. Return reply text to answer in thread, or null. The
// letter is also saved to game.inbox, so decide() sees it next turn.
export async function onLetter(letter, env = {}, game = {}) {
	return null;
}
