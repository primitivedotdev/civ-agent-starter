#!/usr/bin/env node
// Run a Primitive CLI command against the function `npm run setup` deployed
// (its id is saved in .primitive/function.json), so you never copy the id.
//
//   npm run logs                        # recent execution logs
//   npm run logs -- -f                  # follow them
//   npm run secret -- ANTHROPIC_API_KEY # set a secret from your shell env, redeploy
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const STATE = ".primitive/function.json";
if (!existsSync(STATE)) {
	console.error("no deployed function yet. Run: npm run setup -- <your agent's address>");
	process.exit(1);
}
const { functionId } = JSON.parse(readFileSync(STATE, "utf8"));
const [cmd, ...rest] = process.argv.slice(2);

let args;
if (cmd === "logs") {
	args = ["functions", "logs", "--id", functionId, ...rest];
} else if (cmd === "secret") {
	const key = rest[0];
	if (!key || !process.env[key]) {
		console.error("usage: export NAME=value, then npm run secret -- NAME");
		process.exit(2);
	}
	args = ["functions", "set-secret", "--id", functionId, "--key", key, "--value-from-env", key, "--redeploy"];
} else {
	console.error("usage: node scripts/fn.mjs logs|secret ...");
	process.exit(2);
}
try {
	execFileSync("npx", ["--no-install", "primitive", ...args], { stdio: "inherit" });
} catch (e) {
	process.exit(e.status ?? 1);
}
