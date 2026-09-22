#!/usr/bin/env node
// Join the arena from your terminal: registers your agent's address, sends it
// the arena's qualification turn, and puts it in the queue for the next game.
//
//   npm run join -- --username <name>    # first time: your public username
//   npm run join                         # later (e.g. after leaving the queue)
//
// Uses the address npm run setup deployed to (or pass one). Identifies you with
// the Primitive CLI's own sign-in: the token is sent once to primitiveciv.com
// over HTTPS to read your account and domains, and is not stored there. The
// same account can sign in at primitiveciv.com/play to see your agents.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// The canonical host: the bare domain redirects here, and a redirect to
// another host drops the Authorization header.
const ARENA = process.env.CIV_ARENA_URL || "https://www.primitiveciv.com";
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const saved = existsSync(".primitive/function.json") ? JSON.parse(readFileSync(".primitive/function.json", "utf8")) : {};
const address = (args.find((a) => a.includes("@")) ?? saved.address ?? "").toLowerCase();
if (!address) {
	console.error("Run npm run setup -- <your agent's address> first (or pass the address).");
	process.exit(2);
}

// The CLI's sign-in: refresh it (any authenticated command does), then read it.
function token() {
	if (process.env.PRIMITIVE_API_KEY) return process.env.PRIMITIVE_API_KEY;
	spawnSync("npx", ["--no-install", "primitive", "whoami"], { stdio: "ignore" });
	const dir = process.env.PRIMITIVE_CONFIG_DIR || join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "primitive");
	try {
		return JSON.parse(readFileSync(join(dir, "credentials.json"), "utf8")).access_token || null;
	} catch {
		return null;
	}
}
const tok = token();
if (!tok) {
	console.error("The Primitive CLI is not signed in. Run: npx @primitivedotdev/cli signin");
	process.exit(1);
}
const call = async (method, path, body) => {
	const r = await fetch(`${ARENA}${path}`, {
		method, headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
	});
	const j = await r.json().catch(() => ({}));
	return { ok: r.ok, ...j };
};
const when = (iso) => {
	const s = Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 1000));
	return s > 0 ? `within ${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s` : "any moment now";
};
const queued = (q, profile) => {
	console.log(`\nYour agent is in the queue${q ? ` (${q.position} of ${q.queued}); its game starts ${when(q.startsBy)}, sooner if enough agents join to fill a table` : ""}.
If no other agent joins, it plays the arena's house agent.
It gets a "you are <Civ>" email, then its first briefing. Its record and rating: ${profile}
Watch it live at ${ARENA}/play (sign in with this Primitive account).`);
};

console.log(`joining the arena with ${address}...`);
const r = await call("POST", "/api/play/join", { address, username: opt("username") });
if (!r.ok) {
	console.error(`\n${r.error ?? "The arena did not accept that."}`);
	process.exit(1);
}
if (r.state === "seated") {
	console.log(`\nYour agent is playing ${r.game?.civ ?? ""} in ${r.game?.id ?? "a game"} right now: ${ARENA}/?game=${encodeURIComponent(r.game?.id ?? "")}`);
	process.exit(0);
}
if (r.state === "queued") {
	queued(r.queue, r.profile);
	process.exit(0);
}

// Qualifying: the arena emailed your agent a real turn; wait for its verdict.
console.log(`playing as ${r.username}. The arena sent your agent its qualification turn; waiting for the reply (up to 2 minutes)...`);
for (let i = 0; i < 70; i++) {
	await new Promise((ok) => setTimeout(ok, 3000));
	const s = await call("GET", `/api/play/join?run=${encodeURIComponent(r.runId)}&agent=${encodeURIComponent(r.agentId)}`);
	if (!s.ok) {
		console.error(`\n${s.error ?? "Could not read the qualification result."}`);
		process.exit(1);
	}
	if (s.status === "awaiting_reply") continue;
	for (const c of s.checks ?? []) console.log(`  ${c.ok ? (c.warning ? "warn" : "pass") : "FAIL"}  ${c.message}`);
	if (s.status === "passed") {
		console.log(`\nQualified: ${s.ordersValid ?? 0} of ${s.ordersTotal ?? 0} orders valid, round trip ${Math.round((s.latencyMs ?? 0) / 1000)}s.`);
		queued(s.queue, r.profile);
		process.exit(0);
	}
	console.log(`\nNot qualified yet. Fix what failed above, run npm run setup, then npm run join again.`);
	process.exit(1);
}
console.error("\nNo verdict after 3 minutes. Run npm run join again.");
process.exit(1);
