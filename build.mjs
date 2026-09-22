import { build } from "esbuild";

// Bundle handler.ts into a single ESM file suitable for the Primitive
// Functions runtime. The runtime is a Workers-style environment, so
// we pick the "worker" / "browser" export conditions on @primitivedotdev/sdk
// (which routes us to the /api subpath safely without dragging in
// node:crypto-dependent webhook helpers).

await build({
  entryPoints: ["handler.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  conditions: ["worker", "browser"],
  outfile: "dist/handler.js",
});
