#!/usr/bin/env node
// Send an example turn to your DEPLOYED agent and print what it replied.
//
//   npm run turn -- civ@your-name.primitive.email
//   npm run turn -- civ@your-name.primitive.email examples/turns/04-ready-assault.txt
//
// The briefing is sent from arena-test@<your agent's domain>, exactly as the
// arena would send it, and the reply is linted like a real turn. Needs
// PRIMITIVE_API_KEY for the account that owns the address.
import { readFileSync } from "node:fs";
import { createPrimitiveClient } from "@primitivedotdev/sdk";
import { getEmail, searchEmails } from "@primitivedotdev/sdk/api";
import { lastOrders } from "../src/agent.mjs";
import { parseBriefing } from "../src/briefing.mjs";
import { lintOrders } from "../src/lint.mjs";

const [to, file = "examples/turns/01-opening.txt"] = process.argv.slice(2);
if (!to || !to.includes("@")) {
	console.error("usage: npm run turn -- <your agent's address> [examples/turns/<file>.txt]");
	process.exit(2);
}
if (!process.env.PRIMITIVE_API_KEY) {
	console.error("Set PRIMITIVE_API_KEY (the key for the account that owns your agent's address).");
	process.exit(2);
}

const text = readFileSync(file, "utf8");
const brief = parseBriefing(text);
const from = `arena-test@${to.split("@")[1]}`;
const subject = `primitive civ [local-test]: ${brief.civ ?? "Test"} turn ${brief.turn ?? 0}`;
const client = createPrimitiveClient({ apiKey: process.env.PRIMITIVE_API_KEY });

console.log(`sending ${file} to ${to} (from ${from})...`);
const sent = await client.send({ from, to, subject, bodyText: text });
const started = Date.now();

let reply = null;
while (!reply && Date.now() - started < 120000) {
	await new Promise((r) => setTimeout(r, 3000));
	const found = await searchEmails({ client: client.client, query: { reply_to_sent_email_id: sent.id, limit: 1 }, throwOnError: true });
	const row = found.data?.data?.[0];
	if (!row?.id) continue;
	const full = await getEmail({ client: client.client, path: { id: row.id }, throwOnError: true });
	const d = full.data?.data ?? full.data;
	reply = d?.body_text || d?.text || "";
}
if (reply == null) {
	console.error("No reply within 120 seconds (the arena's deadline). Check `npm run logs` and that your route is bound to this address's domain.");
	process.exit(1);
}
console.log(`\nreplied in ${Math.round((Date.now() - started) / 1000)}s:\n\n${reply}\n`);
const orders = lastOrders(reply);
const findings = orders ? lintOrders(orders, brief) : [{ severity: "error", message: "no parseable <ORDERS> block" }];
for (const f of findings) console.log(`${f.severity.padEnd(5)} ${f.message}`);
const errors = findings.filter((f) => f.severity === "error").length;
console.log(`\n${orders?.length ?? 0} orders, ${errors} errors`);
process.exit(errors ? 1 : 0);
