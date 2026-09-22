#!/usr/bin/env node
// Pull the briefings your agent received in a real game out of your own
// Primitive mailbox, so you can iterate on the positions it actually faced:
//
//   npm run replay -- <game-id>                # every 10th turn, plus the last
//   npm run replay -- <game-id> --every 5
//   npm run replay -- <game-id> --turns 120-160
//   npm run replay -- <game-id> --all
//
// Saves examples/games/<game-id>/turn-NNN.txt, then run
//   npm run try -- examples/games/<game-id>
// to score your current agent on them. The game id is in every briefing's
// subject and in the game-over email. Uses the address npm run setup deployed
// to (or --address <addr>).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const game = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!game) {
	console.error("usage: npm run replay -- <game-id> [--every 10 | --turns 120-160 | --all] [--address <addr>]");
	process.exit(2);
}
const saved = existsSync(".primitive/function.json") ? JSON.parse(readFileSync(".primitive/function.json", "utf8")) : {};
const address = (opt("address") ?? saved.address ?? "").toLowerCase();
if (!address) {
	console.error("which address played? Run npm run setup first, or pass --address <your agent's address>.");
	process.exit(2);
}

// stdout and stderr together: the CLI prints "next cursor: ..." on stderr.
const cli = (...a) => {
	const r = spawnSync("npx", ["--no-install", "primitive", ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
	return `${r.stderr ?? ""}\n${r.stdout ?? ""}`;
};
const jsonOf = (text) => {
	const i = text.search(/[[{]/);
	if (i < 0) return null;
	try {
		const v = JSON.parse(text.slice(i, Math.max(text.lastIndexOf("}"), text.lastIndexOf("]")) + 1));
		return v && !Array.isArray(v) && typeof v === "object" && "data" in v ? v.data : v;
	} catch {
		return null;
	}
};

// 1. Find the briefings: arena -> you, "primitive civ [<game>]: <Civ> turn N".
const turnRe = new RegExp(`^primitive civ \\[${game.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]: .+ turn (\\d+)\\s*$`, "i");
const found = new Map();
let cursor;
for (let page = 0; page < 30; page++) {
	const out = cli("emails", "list", "--search", game, "--limit", "100", "--json", ...(cursor ? ["--cursor", cursor] : []));
	const rows = jsonOf(out);
	if (!Array.isArray(rows) || !rows.length) break;
	for (const e of rows) {
		const m = turnRe.exec(e.subject ?? "");
		if (m && String(e.recipient ?? "").toLowerCase() === address) found.set(Number(m[1]), e.id);
	}
	cursor = /next cursor: (\S+)/.exec(out)?.[1];
	if (!cursor) break;
}
if (!found.size) {
	console.error(`no briefings for ${game} to ${address} in your mailbox.`);
	process.exit(1);
}

// 2. Pick which turns.
const all = [...found.keys()].sort((a, z) => a - z);
let turns;
if (args.includes("--all")) turns = all;
else if (opt("turns")) {
	const [a, z] = opt("turns").split("-").map(Number);
	turns = all.filter((t) => t >= a && t <= (z ?? a));
} else {
	const every = Number(opt("every") ?? 10);
	turns = all.filter((t, i) => t % every === 0 || i === all.length - 1);
}

// 3. Fetch and save.
const dir = join("examples", "games", game);
mkdirSync(dir, { recursive: true });
let n = 0;
for (const t of turns) {
	const e = jsonOf(cli("emails", "get", "--id", found.get(t))) ?? {};
	const body = e.body_text || e.text || "";
	if (!body) continue;
	writeFileSync(join(dir, `turn-${String(t).padStart(3, "0")}.txt`), body);
	n++;
	process.stdout.write(`\rsaved ${n}/${turns.length}`);
}
console.log(`\n${n} briefings from ${game} (turns ${turns[0]}-${turns.at(-1)} of ${all[0]}-${all.at(-1)}) in ${dir}/
Score your agent on them: npm run try -- ${dir}`);
