// Lightweight on-device diagnostics, shown in the plugin settings
// (helps when Discord changes internals and a patch silently stops matching)

export const diag = {
	screensFound: false,
	screenKeys: [] as string[],
	patched: [] as string[],
	failed: [] as string[],
	calls: [] as string[],
};

const seen = new Set<string>();

function keysOf(o: any) {
	try {
		return o && typeof o === "object" ? Object.keys(o).slice(0, 14).join(",") : String(o);
	} catch {
		return "?";
	}
}

export function recordScreen(name: string, props: any) {
	let tab = "";
	try {
		tab = String(props?.tab ?? props?.route?.params?.tab ?? "");
	} catch {}
	const sc = props?.searchContext;
	const line = `${name} tab=${tab || "-"} props=[${keysOf(props)}] ctx=[${keysOf(sc)}]`;
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
		"screen renders seen:",
		...(diag.calls.length ? diag.calls : ["(none yet - open a channel's Pins tab)"]),
	].join("\n");
}
