#!/usr/bin/env node
// Everything between cloning this repo and a working agent, in one command:
//
//   npm run setup -- civ@your-name.primitive.email
//   npm run setup -- civ@your-name.primitive.email --takeover
//   npm run setup                    # again later: redeploys the same agent
//
// 1. Signs the Primitive CLI in if it is not (browser approval).
// 2. Checks the address's domain is in your Primitive account.
// 3. Builds and deploys the agent (or redeploys the one this repo deployed
//    before, remembered in .primitive/function.json).
// 4. Sets ANTHROPIC_API_KEY as a Function secret when it is in your shell or
//    in .env, so a model plays; without it, the built-in rules play.
// 5. Routes the domain's inbound mail to the agent.
// 6. Sends it a real turn and shows the reply (skip with --no-test).
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sourceHash } from "../src/source-hash.mjs";

try { process.loadEnvFile(".env"); } catch { /* no .env: fine */ }

const STATE = ".primitive/function.json";
const saved = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : null;
const args = process.argv.slice(2);
const address = (args.find((a) => a.includes("@")) ?? saved?.address)?.toLowerCase();
const takeover = args.includes("--takeover");
if (!address) {
	console.error("usage: npm run setup -- <your agent's address>   e.g. civ@your-name.primitive.email");
	process.exit(2);
}
const domain = address.split("@")[1];

const cli = (...a) => {
	try {
		return execFileSync("npx", ["--no-install", "primitive", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
	} catch (e) {
		return String(e.stdout ?? "") + String(e.stderr ?? "");
	}
};
const json = (text) => {
	const i = text.search(/[[{]/);
	if (i < 0) return null;
	const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
	try {
		const v = JSON.parse(text.slice(i, end + 1));
		return v && typeof v === "object" && "data" in v && !Array.isArray(v) ? v.data : v;
	} catch {
		return null;
	}
};
const step = (msg) => console.log(`\n> ${msg}`);
const fail = (msg) => {
	console.error(`\n${msg}`);
	process.exit(1);
};

// 1. Signed in? Listing domains is the cheapest authenticated call.
let domains = json(cli("domains", "list"));
if (!Array.isArray(domains)) {
	step("signing the Primitive CLI in (approve it in your browser)");
	const r = spawnSync("npx", ["--no-install", "primitive", "signin"], { stdio: "inherit" });
	if (r.status !== 0) fail("sign-in did not finish. Run `npx @primitivedotdev/cli signin`, then this again.");
	domains = json(cli("domains", "list"));
	if (!Array.isArray(domains)) fail("still not signed in. Run `npx @primitivedotdev/cli signin`, then this again.");
}

// 2. The domain must be one of yours.
const match = domains.find((d) => String(d.domain).toLowerCase() === domain);
if (!match) {
	const suggestion = domains.find((d) => /\.primitive\.email$/.test(d.domain))?.domain ?? "your-name.primitive.email";
	fail(`${domain} is not a domain in your Primitive account. Yours: ${domains.map((d) => d.domain).join(", ") || "none"}.
Use an address on one of them, e.g. civ@${suggestion}`);
}

// 3. Build and deploy.
step("building");
execFileSync("node", ["build.mjs"], { stdio: "inherit" });
let functionId = saved?.address === address ? saved.functionId : null;
if (functionId) {
	step(`redeploying your agent (${functionId})`);
	const out = cli("functions", "redeploy", "--id", functionId, "--file", "./dist/handler.js", "--wait");
	if (!/"deployed"/.test(out)) {
		console.log("redeploy failed, deploying a new function instead:\n" + out.trim());
		functionId = null;
	}
}
if (!functionId) {
	const local = address.split("@")[0].replace(/[^a-z0-9_-]/g, "-");
	const base = (local === "civ" || local === "civ-agent" ? "civ-agent" : `civ-agent-${local}`).slice(0, 63);
	// Deployed for this address from another clone or machine (possibly under
	// the older civ-<mailbox> name)? Update it rather than add another, but only
	// a function already receiving this domain's mail: a same-named function
	// doing something else is never touched.
	const list = json(cli("functions", "list"));
	const routedHere = (f) => json(cli("functions", "route-get", "--id", f.id))?.domain?.name?.toLowerCase() === domain;
	const existing = (Array.isArray(list) ? list : [])
		.filter((f) => f.name === base || f.name === `civ-${local}`.slice(0, 63))
		.find(routedHere);
	if (existing) {
		functionId = existing.id;
		step(`updating ${existing.name}, deployed for this address earlier (another clone or machine)`);
		const out = cli("functions", "redeploy", "--id", functionId, "--file", "./dist/handler.js", "--wait");
		if (!/"deployed"/.test(out)) fail(`redeploy failed:\n${out.trim()}`);
	} else {
		const taken = new Set((Array.isArray(list) ? list : []).map((f) => f.name));
		const name = taken.has(base) ? `${base}-${domain.split(".")[0]}`.slice(0, 63) : base;
		step(`deploying your agent as ${name}`);
		const out = cli("functions", "deploy", "--name", name, "--file", "./dist/handler.js", "--wait");
		functionId = json(out)?.id ?? null;
		if (!functionId) fail(`deploy failed:\n${out.trim()}`);
	}
}
const state = { functionId, address, source: sourceHash(), key: saved?.functionId === functionId ? saved.key : undefined };
const save = () => {
	mkdirSync(".primitive", { recursive: true });
	writeFileSync(STATE, JSON.stringify(state, null, 2) + "\n");
};
save();

// 4. The model key, only when it changed (a fingerprint is kept, never the key).
const key = process.env.ANTHROPIC_API_KEY?.trim();
if (key) {
	const fingerprint = createHash("sha256").update(key).digest("hex").slice(0, 12);
	if (fingerprint !== state.key) {
		step("setting ANTHROPIC_API_KEY on your agent (a model will play)");
		const out = cli("functions", "set-secret", "--id", functionId, "--key", "ANTHROPIC_API_KEY", "--value-from-env", "ANTHROPIC_API_KEY", "--redeploy");
		if (!/"key"\s*:\s*"ANTHROPIC_API_KEY"/.test(out)) fail(`could not set the secret:\n${out.split(key).join("<key>").trim()}`);
		state.key = fingerprint;
		save();
	}
}
const modelPlays = !!state.key || /"key"\s*:\s*"ANTHROPIC_API_KEY"/.test(cli("functions", "list-secrets", "--id", functionId) + cli("functions", "list-org-secrets"));
console.log(modelPlays
	? "\n  Player: a model (ANTHROPIC_API_KEY is set on your agent)."
	: "\n  Player: the built-in rules. To have a model play, put ANTHROPIC_API_KEY=sk-ant-...\n  in .env and run npm run setup again.");

// 5. Route the domain.
step(`routing every mailbox on ${domain} to your agent`);
const routeArgs = ["functions", "route-set", "--id", functionId, "--domain", match.id];
if (takeover) routeArgs.push("--takeover");
const routed = cli(...routeArgs);
const result = json(routed);
if (result?.conflict) {
	const holder = result.conflict.functionName ?? result.conflict.url ?? "another function";
	fail(`${domain} already sends its mail to ${holder}. To send it to this agent instead, run:
  npm run setup -- ${address} --takeover`);
}
if (!result?.routing) fail(`routing did not succeed:\n${routed.trim()}`);

// 6. Prove it.
if (!args.includes("--no-test")) {
	step("sending your agent a real turn");
	const t = spawnSync("node", ["scripts/turn.mjs", address], { stdio: "inherit" });
	if (t.status !== 0) fail("The test turn did not pass (see above). `npm run logs` shows what your agent did.");
}

console.log(`
Your agent is live at ${address}.

Next: npm run join -- --username <name>
That qualifies your agent with the arena's own test turn and puts it in the
queue for the next game. (Or do the same at https://primitiveciv.com/play.)

To make it play better, edit src/agent.mjs and run npm run setup again: it
redeploys and retests.`);
