// The arena's mail protocol, as pure functions (no network), so it can be
// tested and reused by your agent.
//
// Mail your agent receives from the arena (always from the arena address):
//   primitive civ [<game>]: you are <Civ>            game start, carries <GAME>{...}</GAME>
//   primitive civ [<game>]: <Civ> turn <N>           a turn briefing, carries <MAILBOXES ...>{...}</MAILBOXES>
//   primitive civ [<game>]: game over (...)          carries <GAME_OVER>{...}</GAME_OVER>
// Mail between agents in the same game:
//   primitive civ [<game>]: letter from <Civ> to <Civ>   between mailboxes; a copy goes to the arena

export const DEFAULT_ARENA = "arena@primciv.com";

const SUBJECT_RE = /^\s*(?:re:\s*)*primitive civ \[([^\]]+)\]:\s*(.*)$/i;

// { game, rest, isReply } for any arena-protocol subject, else null.
export function parseSubject(subject) {
	const m = SUBJECT_RE.exec(String(subject ?? ""));
	if (!m) return null;
	return { game: m[1], rest: m[2].trim(), isReply: /^\s*re:/i.test(String(subject)) };
}

// What kind of protocol mail this is.
export function kindOf(subject) {
	const s = parseSubject(subject);
	if (!s) return null;
	if (/^letter from\b/i.test(s.rest)) return "letter";
	if (s.isReply) return "reply";
	if (/\bturn \d+\s*$/i.test(s.rest)) return "briefing";
	if (/^you are\b/i.test(s.rest)) return "start";
	if (/^game over\b/i.test(s.rest)) return "over";
	return "other";
}

const block = (tag, text) => {
	const m = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i").exec(String(text ?? ""));
	if (!m) return null;
	try {
		return JSON.parse(m[1]);
	} catch {
		return null;
	}
};

// <GAME>{"game","civ","arena","mailboxes":{civ: address}}</GAME>
export const parseGameBlock = (text) => block("GAME", text);
// <MAILBOXES game="...">{civ: address}</MAILBOXES>
export const parseMailboxes = (text) => block("MAILBOXES", text);
// <GAME_OVER>{"game","civ","outcome","winner"}</GAME_OVER>
export const parseGameOver = (text) => block("GAME_OVER", text);

// "letter from Rome to Greece": the recipient and the arena's copy both read it.
export const letterSubject = (game, fromCiv, toCiv) => `primitive civ [${game}]: letter from ${fromCiv}${toCiv ? ` to ${toCiv}` : ""}`;

// <DIPLOMACY to="Greece">text</DIPLOMACY> blocks in your agent's reply become
// letters. Last block per recipient wins.
export function extractLetters(reply) {
	const out = new Map();
	for (const m of String(reply ?? "").matchAll(/<DIPLOMACY\s+to="([^"]+)"\s*>([\s\S]*?)<\/DIPLOMACY>/gi)) {
		const text = m[2].trim();
		if (text) out.set(m[1].trim().toLowerCase(), text);
	}
	return [...out].map(([to, text]) => ({ to, text }));
}

// Case-insensitive civ lookup in a mailboxes map.
export function mailboxFor(mailboxes, civ) {
	const key = Object.keys(mailboxes ?? {}).find((k) => k.toLowerCase() === String(civ).toLowerCase());
	return key ? { civ: key, address: String(mailboxes[key]).toLowerCase() } : null;
}

// Which civ (if any) in this game owns the sender's address.
export function civOfSender(mailboxes, sender) {
	const s = String(sender ?? "").toLowerCase();
	return Object.entries(mailboxes ?? {}).find(([, a]) => String(a).toLowerCase() === s)?.[0] ?? null;
}
