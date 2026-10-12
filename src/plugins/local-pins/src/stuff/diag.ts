import { modules } from "@vendetta/metro";

// Lightweight on-device diagnostics, shown in the plugin settings
// (helps when Discord changes internals and a patch silently stops matching)

export const diag = {
	screensFound: false,
	screenKeys: [] as string[],
	patched: [] as string[],
	failed: [] as string[],
	calls: [] as string[],
	scan: [] as string[],
	info: [] as string[],
};

const seen = new Set<string>();

function keysOf(o: any) {
	try {
		return o && typeof o === "object" ? Object.keys(o).slice(0, 14).join(",") : String(o);
	} catch {
		return "?";
	}
}

/** Short, shallow description of a props object (primitives shown, objects by keys). */
export function summarize(o: any, depth = 0): string {
	if (o == null) return String(o);
	if (typeof o === "string") return JSON.stringify(o.length > 28 ? `${o.slice(0, 28)}…` : o);
	if (typeof o !== "object") return typeof o === "function" ? "fn" : String(o);
	if (depth >= 2) return `{${keysOf(o)}}`;
	try {
		return `{${
			Object.keys(o).slice(0, 14).map(k => `${k}:${summarize(o[k], depth + 1)}`).join(" ")
		}}`;
	} catch {
		return "{?}";
	}
}

export function recordScreen(name: string, props: any) {
	const line = `${name} ${summarize(props)}`;
	if (seen.has(line)) return;
	seen.add(line);
	diag.calls.push(line);
	if (diag.calls.length > 25) diag.calls.shift();
}

export function report() {
	return [
		`screensModule: ${diag.screensFound}`,
		`screen exports: ${diag.screenKeys.join(", ") || "none"}`,
		`patched: ${diag.patched.join(", ") || "none"}`,
		`failed: ${diag.failed.join(", ") || "none"}`,
		...diag.info,
		...(diag.scan.length ? ["module scan:", ...diag.scan] : []),
		"screen renders seen:",
		...(diag.calls.length ? diag.calls : ["(none yet - open a channel's Pins tab)"]),
	].join("\n");
}

const SCAN_RE = /Pins|Pinned|pins|pinned|MessagesScreen|SearchResult|ChannelInfo|ChannelProfile|ChannelDetails/;

/** Lists initialized Discord modules whose export names look pins/screen related. */
export function scanModules(limit = 70) {
	const out: string[] = [];
	for (const id of Object.keys(modules as any)) {
		try {
			const m = (modules as any)[id];
			if (!m?.isInitialized) continue;
			const e = m.publicModule?.exports;
			if (!e || (typeof e !== "object" && typeof e !== "function")) continue;

			const hits: string[] = [];
			for (const k of Object.keys(e)) if (SCAN_RE.test(k)) hits.push(k);
			const d = e.default;
			if (d && (typeof d === "function" || typeof d === "object")) {
				const n = d.displayName ?? d.name;
				if (typeof n === "string" && SCAN_RE.test(n)) hits.push(`default=${n}`);
				if (typeof d === "object") {
					for (const k of Object.keys(d).slice(0, 200)) if (SCAN_RE.test(k)) hits.push(`default.${k}`);
				}
			}
			if (hits.length) out.push(`${id}: ${hits.slice(0, 6).join(", ")}`);
		} catch {}
		if (out.length >= limit) break;
	}
	diag.scan = out.length ? out : ["(no matches - open the Pins tab first, then scan again)"];
	return diag.scan;
}
