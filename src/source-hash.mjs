// A hash of the agent's source, so `npm run turn` can tell when the code on
// disk is not what `npm run setup` last deployed.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function sourceHash(root = ".") {
	const files = ["handler.ts", ...readdirSync(join(root, "src")).filter((f) => /\.(m?js|ts)$/.test(f)).map((f) => join("src", f))].sort();
	const h = createHash("sha256");
	for (const f of files) h.update(f).update("\0").update(readFileSync(join(root, f))).update("\0");
	return h.digest("hex").slice(0, 16);
}
