// Talking to the other civs.
//
// Two things arrive from a rival, and they are not the same thing:
//
//   A LETTER is prose, delivered as real email from that civ's mailbox to
//   yours, between turns. Nothing in a letter binds anybody. It is where you
//   threaten, bluff, ask for help, and agree to things you then have to
//   actually do.
//
//   An ORDER is the only thing the engine executes: propose_trade,
//   accept_trade, decline_trade, make_peace, declare_war. A trade only happens
//   when one side proposes it as an order and the other accepts it as an order
//   on their next turn. "I promise to pay you 200 gold next turn" is a letter;
//   it moves no gold.
//
// Agents lose games by confusing those. A rival that says "peace is agreed" has
// not made peace. Check `relations` and the offer lists in your briefing, which
// come from the engine, before you believe a letter.
//
// This ledger is what you remember about each rival across turns, kept in
// Primitive memories under `games/<game>/diplomacy` so it survives between
// invocations (each turn and each letter is a separate cold start, so anything
// you do not write down is gone). It is deliberately simple: the letters both
// ways, what you think you agreed, and a stance you set yourself.

/** Memory key for a game's ledger. Separate from `games/<game>` because letters
 *  arrive between turns, so keeping them apart narrows the window in which a
 *  letter and a turn can overwrite each other. */
export const ledgerKey = (game) => `games/${game}/diplomacy`;

/** Letters kept per rival. Enough to see a conversation, small enough to send. */
export const KEEP_LETTERS = 8;
const MAX_TEXT = 1200;

export function emptyLedger(game) {
	return { game, rivals: {} };
}

function rival(ledger, civ) {
	const key = String(civ || "").trim();
	if (!key) return null;
	ledger.rivals ??= {};
	ledger.rivals[key] ??= { letters: [], agreements: [], stance: null };
	return ledger.rivals[key];
}

/** Record a letter. `direction` is "in" (they wrote) or "out" (you replied). */
export function recordLetter(ledger, { civ, direction, text, turn }) {
	const r = rival(ledger, civ);
	if (!r) return ledger;
	r.letters.push({
		direction: direction === "out" ? "out" : "in",
		text: String(text ?? "").slice(0, MAX_TEXT),
		turn: Number.isFinite(turn) ? turn : null,
	});
	if (r.letters.length > KEEP_LETTERS) r.letters = r.letters.slice(-KEEP_LETTERS);
	return ledger;
}

/** Something you believe you agreed to. Writing it down is the only reason you
 *  will still know next turn; the engine does not track promises. */
export function noteAgreement(ledger, civ, text, turn) {
	const r = rival(ledger, civ);
	if (!r) return ledger;
	r.agreements.push({ text: String(text ?? "").slice(0, 300), turn: Number.isFinite(turn) ? turn : null });
	if (r.agreements.length > 10) r.agreements = r.agreements.slice(-10);
	return ledger;
}

/** Your own label for a rival ("ally", "target", "leave alone"). Yours to use. */
export function setStance(ledger, civ, stance) {
	const r = rival(ledger, civ);
	if (r) r.stance = stance == null ? null : String(stance).slice(0, 80);
	return ledger;
}

/** What the engine says is actually on the table this turn, as opposed to what
 *  anyone has written to you. */
export function pendingOffers(brief) {
	return {
		trades: (brief?.tradeOffers ?? []).map((t) => ({ civ: t.civ, text: t.text })),
		peaceFrom: [...(brief?.peaceOffersFrom ?? [])],
		canDeclareWarOn: [...(brief?.declarableWar ?? [])],
		canOfferPeaceTo: [...(brief?.offerablePeace ?? [])],
	};
}

/** The ledger and this turn's real offers as text, to put in front of a model.
 *  Returns "" when there is nothing to say, so callers can skip the section. */
export function diplomacyContext(ledger, brief) {
	const lines = [];
	const rels = brief?.relations ?? {};
	const offers = pendingOffers(brief);

	for (const [civ, r] of Object.entries(ledger?.rivals ?? {})) {
		const rel = rels[civ] ? ` (${rels[civ]})` : "";
		const head = `${civ}${rel}${r.stance ? ` - you called them: ${r.stance}` : ""}`;
		const convo = r.letters.map((l) => `    ${l.direction === "out" ? "you" : civ}${l.turn == null ? "" : ` (turn ${l.turn})`}: ${l.text}`);
		const agreed = r.agreements.length
			? [`    agreed so far: ${r.agreements.map((a) => a.text).join("; ")}`]
			: [];
		lines.push([`  ${head}`, ...agreed, ...convo].join("\n"));
	}

	const real = [];
	if (offers.trades.length) {
		real.push("  TRADES ON THE TABLE (accept_trade or decline_trade this turn, or they lapse):");
		for (const t of offers.trades) real.push(`    from ${t.civ}: ${t.text}`);
	}
	if (offers.peaceFrom.length) real.push(`  PEACE OFFERED BY: ${offers.peaceFrom.join(", ")} (make_peace to take it)`);

	if (!lines.length && !real.length) return "";
	return [
		"=== DIPLOMACY ===",
		"Letters are talk and bind nobody. Only orders move anything:",
		"propose_trade, accept_trade, decline_trade, make_peace, declare_war.",
		...(real.length ? ["", "What the engine says is really on the table:", ...real] : []),
		...(lines.length ? ["", "What you and each rival have said:", ...lines] : []),
	].join("\n");
}
