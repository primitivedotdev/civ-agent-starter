#!/usr/bin/env node
// Deploy your agent and route your agent address's mail to it, in one step.
//
//   npm run setup -- civ@your-name.primitive.email
//   npm run setup -- civ@your-name.primitive.email --takeover
//
// Builds the handler, deploys it (or redeploys the one this repo deployed
// before, remembered in .primitive/function.json), finds the domain of your
// agent's address in your Primitive account, and binds that domain's inbound
// mail to the function. Uses the Primitive CLI's saved sign-in
// (`npx @primitivedotdev/cli signin`) or PRIMITIVE_API_KEY.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const address = args.find((a) => a.includes("@"))?.toLowerCase();
const takeover = args.includes("--takeover");
if (!address) {
	console.error("usage: npm run setup -- <your agent's address>   e.g. civ@your-name.primitive.email");
	process.exit(2);
}
const domain = address.split("@")[1];
const STATE = ".primitive/function.json";

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

console.log("building...");
execFileSync("node", ["build.mjs"], { stdio: "inherit" });

// 1. Deploy, or redeploy what we deployed last time.
const saved = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : null;
let functionId = saved?.functionId ?? null;
if (functionId) {
	console.log(`redeploying function ${functionId}...`);
	const out = cli("functions", "redeploy", "--id", functionId, "--file", "./dist/handler.js", "--wait");
	if (!/"deployed"/.test(out)) {
		console.log("redeploy failed, deploying a new function instead:\n" + out.trim());
		functionId = null;
	}
}
if (!functionId) {
	const name = `civ-${address.split("@")[0].replace(/[^a-z0-9_-]/g, "-")}`.slice(0, 63);
	console.log(`deploying function ${name}...`);
	const out = cli("functions", "deploy", "--name", name, "--file", "./dist/handler.js", "--wait");
	functionId = json(out)?.id ?? null;
	if (!functionId) {
		console.error(`deploy failed:\n${out.trim()}\n\nSigned in? Run: npx @primitivedotdev/cli signin`);
		process.exit(1);
	}
}
mkdirSync(".primitive", { recursive: true });
writeFileSync(STATE, JSON.stringify({ functionId, address }, null, 2) + "\n");

// 2. Route the address's domain to the function.
const domains = json(cli("domains", "list"));
const match = Array.isArray(domains) ? domains.find((d) => String(d.domain).toLowerCase() === domain) : null;
if (!match) {
	const have = Array.isArray(domains) ? domains.map((d) => d.domain).join(", ") : "none";
	console.error(`\n${domain} is not a domain in your Primitive account (you have: ${have}).`);
	process.exit(1);
}
console.log(`routing mail for ${domain} to the function...`);
const routeArgs = ["functions", "route-set", "--id", functionId, "--domain", match.id];
if (takeover) routeArgs.push("--takeover");
const routed = cli(...routeArgs);
const result = json(routed);
if (result?.conflict) {
	const holder = result.conflict.functionName ?? result.conflict.url ?? "another function";
	console.error(`\n${domain} is already routed to ${holder}. To point it at this agent instead, run:\n  npm run setup -- ${address} --takeover`);
	process.exit(1);
}
if (!result?.routing) {
	console.error(`\nroute-set did not succeed:\n${routed.trim()}`);
	process.exit(1);
}

console.log(`\ndone: mail to ${address} now reaches your agent (function ${functionId}).

next:
  npm run turn -- ${address}        # send it a real turn and see its reply
  then send the example turn from primitiveciv.com/play`);
