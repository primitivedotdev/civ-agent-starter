import { test } from "node:test";
import assert from "node:assert/strict";
import { civOfSender, extractLetters, kindOf, letterSubject, mailboxFor, parseGameBlock, parseMailboxes, parseSubject, testSenderAllowed } from "../src/game.mjs";

test("subjects are classified by kind", () => {
	assert.equal(kindOf("primitive civ [g1]: Rome turn 12"), "briefing");
	assert.equal(kindOf("primitive civ [g1]: you are Rome"), "start");
	assert.equal(kindOf("primitive civ [g1]: game over (Rome: win)"), "over");
	assert.equal(kindOf("primitive civ [g1]: letter from Greece"), "letter");
	assert.equal(kindOf("Re: primitive civ [g1]: letter from Greece"), "letter");
	assert.equal(kindOf("Re: primitive civ [g1]: Rome turn 12"), "reply");
	assert.equal(kindOf("hello"), null);
	assert.equal(parseSubject("primitive civ [open-a-b-1]: Rome turn 3").game, "open-a-b-1");
});

test("machine blocks parse, and garbage reads as null", () => {
	assert.deepEqual(parseMailboxes('x\n<MAILBOXES game="g1">{"Rome":"a@x.dev","Greece":"greece@primciv.com"}</MAILBOXES>'), { Rome: "a@x.dev", Greece: "greece@primciv.com" });
	assert.equal(parseGameBlock("<GAME>not json</GAME>"), null);
	assert.equal(parseMailboxes("nothing here"), null);
});

test("letters come from DIPLOMACY blocks, last per rival wins", () => {
	const letters = extractLetters('<DIPLOMACY to="Greece">one</DIPLOMACY> <DIPLOMACY to="greece">two</DIPLOMACY><DIPLOMACY to="Persia">  </DIPLOMACY>');
	assert.deepEqual(letters, [{ to: "greece", text: "two" }]);
	assert.equal(letterSubject("g1", "Rome", "Greece"), "primitive civ [g1]: letter from Rome to Greece");
});

test("mailbox lookups are case-insensitive both ways", () => {
	const m = { Rome: "Bot@X.dev", Greece: "greece@primciv.com" };
	assert.deepEqual(mailboxFor(m, "rome"), { civ: "Rome", address: "bot@x.dev" });
	assert.equal(civOfSender(m, "BOT@x.dev"), "Rome");
	assert.equal(civOfSender(m, "stranger@x.dev"), null);
});

test("the own-domain test sender stands in for the arena only in local test games", () => {
	const { game } = parseSubject("primitive civ [local-test-mg1abc]: Carthage turn 21");
	assert.equal(game, "local-test-mg1abc");
	// npm run setup's live turn, with no secret set: answered.
	assert.equal(testSenderAllowed(game, undefined), true);
	// A real game (arena qualification, trial, open) is not, unless opted in.
	for (const real of ["test-a2e5355c", "trial-russia-rome-carthage-o69lb", "open-rome-america-hittites-cad0k"]) {
		assert.equal(testSenderAllowed(real, undefined), false, real);
		assert.equal(testSenderAllowed(real, "1"), true, real);
	}
	assert.equal(testSenderAllowed(undefined, undefined), false);
});
