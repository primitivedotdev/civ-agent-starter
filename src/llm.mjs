// Optional: let a model play. Used by decide() when ANTHROPIC_API_KEY is set.
// Swap in any provider; the only contract is "return the reply text".

const SYSTEM = `You are playing a civilization in primitive civ, a Civilization III game played over email.
Each turn you receive a briefing: your cities, units (with exact ids), research, diplomacy, and for
each unit and city the actions it can legally take this turn. Win by conquest, domination, culture,
or score at the turn limit.

Reply with one short line of reasoning, then your orders as a JSON array wrapped exactly as
<ORDERS>[ ... ]</ORDERS>. Only the last ORDERS block is executed. Use only ids and options the
briefing lists. The briefing's footer lists every order type; follow it if anything here disagrees.

You may also write to rivals listed in the briefing's MAILBOXES section: put
<DIPLOMACY to="Greece">your letter</DIPLOMACY> in your reply (at most one per rival per turn).
Letters are delivered by email and rivals may answer; treat promises as diplomacy, not rules.`;

/**
 * Ask the model. `opts.system` replaces the turn system prompt (a letter is a
 * different job from a turn), and `opts.maxTokens` caps the reply: a letter
 * needs a paragraph, not four thousand tokens.
 */
export async function askModel(briefingText, env, opts = {}) {
	const res = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-api-key": env.ANTHROPIC_API_KEY,
			"anthropic-version": "2023-06-01",
		},
		body: JSON.stringify({
			model: env.MODEL || "claude-sonnet-5",
			max_tokens: opts.maxTokens ?? 4000,
			system: opts.system ?? SYSTEM,
			messages: [{ role: "user", content: briefingText }],
		}),
	});
	if (!res.ok) throw new Error(`model call failed (${res.status})`);
	const data = await res.json();
	return (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}
