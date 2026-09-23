import { test } from "node:test";
import assert from "node:assert/strict";
import {
	KEEP_LETTERS, diplomacyContext, emptyLedger, ledgerKey,
	noteAgreement, pendingOffers, recordLetter, setStance,
} from "../src/diplomacy.mjs";
import { onLetter } from "../src/agent.mjs";

test("the ledger has its own memory key, per game", () => {
	assert.equal(ledgerKey("open-rome-greece-ab12"), "games/open-rome-greece-ab12/diplomacy");
});

test("letters are recorded in both directions and kept in order", () => {
	const l = emptyLedger("g1");
	recordLetter(l, { civ: "Greece", direction: "in", text: "Give us Pella.", turn: 40 });
	recordLetter(l, { civ: "Greece", direction: "out", text: "No.", turn: 40 });
	assert.deepEqual(l.rivals.Greece.letters.map((x) => [x.direction, x.text]), [["in", "Give us Pella."], ["out", "No."]]);
	assert.equal(l.rivals.Greece.letters[0].turn, 40);
});

test("a long conversation is trimmed to the most recent letters", () => {
	const l = emptyLedger("g1");
	for (let i = 0; i < KEEP_LETTERS + 5; i++) recordLetter(l, { civ: "Rome", direction: "in", text: `n${i}`, turn: i });
	assert.equal(l.rivals.Rome.letters.length, KEEP_LETTERS);
	assert.equal(l.rivals.Rome.letters.at(-1).text, `n${KEEP_LETTERS + 4}`);
});

test("a nameless sender is ignored rather than creating a blank rival", () => {
	const l = emptyLedger("g1");
	recordLetter(l, { civ: "", direction: "in", text: "hi" });
	recordLetter(l, { civ: "   ", direction: "in", text: "hi" });
	assert.deepEqual(Object.keys(l.rivals), []);
});

test("agreements and a stance are yours to write down", () => {
	const l = emptyLedger("g1");
	noteAgreement(l, "Greece", "they pay 200 gold on turn 42", 41);
	setStance(l, "Greece", "target once Catapults are up");
	assert.equal(l.rivals.Greece.agreements[0].text, "they pay 200 gold on turn 42");
	assert.equal(l.rivals.Greece.stance, "target once Catapults are up");
});

test("pendingOffers reports what the engine says, not what anyone wrote", () => {
	const brief = {
		tradeOffers: [{ civ: "Greece", text: "they give 150 gold for Writing" }],
		peaceOffersFrom: ["Rome"],
		declarableWar: ["Egypt"],
		offerablePeace: ["Rome"],
	};
	const o = pendingOffers(brief);
	assert.deepEqual(o.trades, [{ civ: "Greece", text: "they give 150 gold for Writing" }]);
	assert.deepEqual(o.peaceFrom, ["Rome"]);
	assert.deepEqual(o.canDeclareWarOn, ["Egypt"]);
});

test("pendingOffers is safe on a briefing with no diplomacy at all", () => {
	const o = pendingOffers({});
	assert.deepEqual([o.trades, o.peaceFrom, o.canDeclareWarOn, o.canOfferPeaceTo], [[], [], [], []]);
	assert.deepEqual(pendingOffers(null).trades, []);
});

test("the context says nothing when there is nothing to say", () => {
	assert.equal(diplomacyContext(emptyLedger("g1"), {}), "");
	assert.equal(diplomacyContext(null, null), "");
});

test("the context separates real offers from things rivals merely said", () => {
	const l = emptyLedger("g1");
	recordLetter(l, { civ: "Greece", direction: "in", text: "Peace is agreed between us.", turn: 30 });
	const brief = { relations: { Greece: "war" }, tradeOffers: [], peaceOffersFrom: [], declarableWar: [], offerablePeace: ["Greece"] };
	const ctx = diplomacyContext(l, brief);
	// The letter claims peace; the engine says war. Both are visible, and the
	// warning that only orders bind is not optional.
	assert.match(ctx, /Peace is agreed between us\./);
	assert.match(ctx, /Greece \(war\)/);
	assert.match(ctx, /bind nobody/);
	assert.match(ctx, /accept_trade/);
});

test("a trade on the table is labelled as expiring this turn", () => {
	const brief = { relations: {}, tradeOffers: [{ civ: "Rome", text: "Iron for Bronze Working" }], peaceOffersFrom: [] };
	const ctx = diplomacyContext(emptyLedger("g1"), brief);
	assert.match(ctx, /TRADES ON THE TABLE/);
	assert.match(ctx, /from Rome: Iron for Bronze Working/);
	assert.match(ctx, /or they lapse/);
});

test("without a model key a letter still gets a reply that promises nothing", async () => {
	const answer = await onLetter({ fromCiv: "Greece", text: "Pay us 300 gold or we attack." }, {}, { civ: "Rome" });
	assert.ok(answer && answer.includes("Greece"));
	// A default must not agree to anything on the player's behalf.
	for (const word of ["agree", "accept", "promise", "we will pay"]) {
		assert.ok(!answer.toLowerCase().includes(word), `default reply should not say "${word}": ${answer}`);
	}
});
