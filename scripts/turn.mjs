#!/usr/bin/env node
// Send an example turn to your DEPLOYED agent and print what it replied.
//
//   npm run turn -- civ@your-name.primitive.email
//   npm run turn -- civ@your-name.primitive.email examples/turns/04-ready-assault.txt
//   npm run turn -- civ@your-name.primitive.email --from test@your-name.primitive.email
//
// The briefing is sent from arena-test@<your agent's domain>, exactly as the
// arena would send it, and the reply is linted like a real turn. Uses the
// Primitive CLI's saved sign-in (or PRIMITIVE_API_KEY).
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lastOrders } from "../src/agent.mjs";
import { parseBriefing } from "../src/briefing.mjs";
import { lintOrders } from "../src/lint.mjs";
import { sourceHash } from "../src/source-hash.mjs";

const argv = process.argv.slice(2);
const fromFlag = argv.indexOf("--from");
const fromOverride = fromFlag >= 0 ? argv.splice(fromFlag, 2)[1] : null;
const [to, file = "examples/turns/01-opening.txt"] = argv;
if (!to || !to.includes("@")) {
	console.error("usage: npm run turn -- <your agent's address> [examples/turns/<file>.txt]");
	process.exit(2);
}
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
	try {
		const v = JSON.parse(text.slice(i, Math.max(text.lastIndexOf("}"), text.lastIndexOf("]")) + 1));
		return v && !Array.isArray(v) && typeof v === "object" && "data" in v ? v.data : v;
	} catch {
		return null;
	}
};

const text = readFileSync(file, "utf8");
const brief = parseBriefing(text);
const from = fromOverride || `arena-test@${to.split("@")[1]}`;
// A fresh game id per run: the CLI deduplicates identical sends, so a repeat
// of the same turn would otherwise never leave.
const subject = `primitive civ [local-test-${Date.now().toString(36)}]: ${brief.civ ?? "Test"} turn ${brief.turn ?? 0}`;
const bodyFile = join(mkdtempSync(join(tmpdir(), "civ-turn-")), "briefing.txt");
writeFileSync(bodyFile, text);

// Testing an old deploy is the easiest mistake to make while iterating.
if (existsSync(".primitive/function.json")) {
	const deployed = JSON.parse(readFileSync(".primitive/function.json", "utf8"));
	if (deployed.address === to && deployed.source !== sourceHash()) {
		console.warn(`note: your agent's code changed since the last deploy. Run \`npm run setup -- ${to}\` first to test the new code.\n`);
	}
}
console.log(`sending ${file} to ${to} (from ${from})...`);
const sentOut = cli("send", "--to", to, "--from", from, "--subject", subject, "--body-file", bodyFile);
const sentId = json(sentOut)?.id;
if (!sentId) {
	console.error(`send failed:\n${sentOut.trim()}\n\nSigned in? Run: npx @primitivedotdev/cli signin`);
	process.exit(1);
}
const started = Date.now();
const waited = cli("emails", "wait", "--reply-to-sent-email-id", sentId, "--timeout", "120");
const match = json(waited);
const replyId = (Array.isArray(match) ? match[0] : match)?.id;
if (!replyId) {
	console.error("No reply within 120 seconds (the arena's deadline). Check `npm run logs` and that setup routed this address.");
	process.exit(1);
}
const full = json(cli("emails", "get", "--id", replyId)) ?? {};
const reply = full.body_text || full.text || "";
console.log(`\nreplied in ${Math.round((Date.now() - started) / 1000)}s:\n\n${reply}\n`);
const orders = lastOrders(reply);
const findings = orders ? lintOrders(orders, brief) : [{ severity: "error", message: "no parseable <ORDERS> block" }];
for (const f of findings) console.log(`${f.severity.padEnd(5)} ${f.message}`);
const errors = findings.filter((f) => f.severity === "error").length;
console.log(`\n${orders?.length ?? 0} orders, ${errors} errors`);
process.exit(errors ? 1 : 0);
