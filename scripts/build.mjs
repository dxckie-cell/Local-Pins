// Standalone build for Local Pins. Output: dist/index.js + dist/manifest.json
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { transformFile } from "@swc/core";
import { build } from "esbuild";

const isDev = process.argv.includes("--dev");
const plugin = "src/plugins/local-pins";
const manifest = JSON.parse(await readFile(join(plugin, "manifest.json"), "utf8"));

await mkdir("dist", { recursive: true });

await build({
	entryPoints: [join(plugin, manifest.main)],
	bundle: true,
	outfile: "dist/index.js",
	format: "iife",
	supported: { "const-and-let": false },
	minifySyntax: !isDev,
	minifyWhitespace: !isDev,
	define: {
		IS_DEV: `${isDev}`,
		PREVIEW_LANG: "false",
		DEFAULT_LANG: "undefined",
		DEV_LANG: "undefined",
		PLUGINS_LIST: JSON.stringify(["local-pins"]),
	},
	alias: { "$": "./src/stuff" },
	loader: { ".html": "text", ".css": "text", ".svg": "text", ".json": "json" },
	globalName: "$",
	banner: { js: "(()=>{" },
	footer: { js: "return $;})();" },
	plugins: [
		{
			// `@vendetta/foo/bar` -> global `vendetta.foo.bar`
			name: "vendetta",
			setup(b) {
				b.onResolve({ filter: /^@vendetta\/?/ }, ({ path }) => ({ path, namespace: "vendetta" }));
				b.onLoad({ filter: /.*/, namespace: "vendetta" }, ({ path }) => ({
					contents: `module.exports = ${path.slice(1).replace(/\//g, ".")}`,
					loader: "js",
				}));
			},
		},
		{
			name: "swc",
			setup(b) {
				b.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async args => {
					const result = await transformFile(args.path, {
						jsc: { externalHelpers: false },
						env: {
							targets: "fully supports es6",
							include: [
								"transform-block-scoping",
								"transform-classes",
								"transform-async-to-generator",
								"transform-async-generator-functions",
								"transform-named-capturing-groups-regex",
							],
							exclude: [
								"transform-parameters",
								"transform-template-literals",
								"transform-exponentiation-operator",
								"transform-nullish-coalescing-operator",
								"transform-object-rest-spread",
								"transform-optional-chaining",
								"transform-logical-assignment-operators",
							],
						},
					});
					return { contents: result.code, loader: args.path.match(/\.[cm]?tsx?$/) ? "js" : undefined };
				});
			},
		},
	],
});

const hash = createHash("sha256").update(await readFile("dist/index.js", "utf8")).digest("hex");
await writeFile("dist/manifest.json", JSON.stringify({ ...manifest, main: "index.js", hash }));
console.log(`Built dist/ (${isDev ? "dev" : "prod"}) hash ${hash.slice(0, 12)}`);
