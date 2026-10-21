import { find, findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";
import { showToast } from "@vendetta/ui/toasts";

import { LazyActionSheet } from "$/components/ActionSheet";
import intlProxy from "$/lib/intlProxy";

import PinMessageLocallyAction from "../components/MessageActionSheetButton";
import PinsScreen, { WrappedContext } from "../components/screens/PinsScreen";

const { ActionSheetRow } = findByProps("ActionSheetRow") ?? ({} as any);

/** "Pin Message Locally" row in the message long-press menu. */
function patchMessageMenu() {
	return before("openLazy", LazyActionSheet, ([component, key, msg]) => {
		const message = msg?.message;
		if (key !== "MessageLongPressActionSheet" || !message) return;

		component.then(i => {
			const unpatch = after("default", i, (_, comp) => {
				React.useEffect(() => () => unpatch(), []);

				// rows can be wrapped (empty type.name), so match by name OR by props
				const rowLabel = (c: any) => c?.props?.label ?? c?.props?.message;
				const isRow = (c: any) =>
					!!c
					&& typeof c === "object"
					&& (c.type?.name === "ButtonRow"
						|| c.type?.name === "ActionSheetRow"
						|| (ActionSheetRow && c.type === ActionSheetRow)
						|| (typeof rowLabel(c) === "string"
							&& typeof c.props?.onPress === "function"));

				// every list of rows in the sheet (it is split into groups)
				const lists: any[][] = [];
				const seen = new Set<any>();
				const walk = (node: any, depth: number) => {
					if (!node || typeof node !== "object" || depth > 24 || seen.has(node)) return;
					seen.add(node);
					if (Array.isArray(node) && node.filter(isRow).length >= 2) lists.push(node);
					if (Array.isArray(node)) {
						for (const c of node) walk(c, depth + 1);
					} else {
						for (const k of ["props", "children", "child", "sibling"]) walk(node[k], depth + 1);
					}
				};
				walk(comp, 0);
				if (!lists.length) return comp;

				const row = React.createElement(PinMessageLocallyAction, message);

				// preferred spot: directly below the server's "Pin Message" / "Unpin Message" row
				const isServerPin = (c: any) => {
					const label = rowLabel(c);
					return typeof label === "string" && !!label
						&& (label === intlProxy.PIN_MESSAGE
							|| label === intlProxy.UNPIN_MESSAGE
							|| /^(un)?pin message$/i.test(label));
				};
				for (const list of lists) {
					const at = list.findIndex(isServerPin);
					if (at >= 0) {
						list.splice(at + 1, 0, row);
						return;
					}
				}

				// no server pin row (e.g. no permission): before "Mark Unread", else at the end
				const list = lists[0];
				const unread = list.findIndex(
					(x: any) => !!intlProxy.MARK_UNREAD && rowLabel(x) === intlProxy.MARK_UNREAD,
				);
				list.splice(unread >= 0 ? unread : list.length, 0, row);
			});
		});
	});
}

/**
 * Wraps the channel info "Pins" tab with the Server pins / Local pins switch.
 * Discord names that tab's component `PinsScreen` (props: { tab: "pins", searchContext }).
 * Newer Discord versions may rename it or load it lazily, so match a few name
 * shapes, look inside memo/forwardRef wrappers and keep retrying for a while.
 */
// 343 names the pins tab `PinsScreen`; newer versions may render it through the generic
// messages screen the Media/Links tabs use. Hook all of them, each acts only for tab "pins".
const SCREEN_NAME = /^(PinsScreen|BaseMessagesScreen|[A-Za-z]*PinsScreen)$/;

function findScreens() {
	const nameOf = (v: any) => (typeof v === "function" ? v.displayName ?? v.name : undefined);
	const isScreen = (v: any) => {
		const n = nameOf(v);
		return typeof n === "string" && SCREEN_NAME.test(n);
	};

	const hits: [any, string][] = [];
	const seenNames = new Set<string>();
	find((m: any) => {
		if (!m || (typeof m !== "object" && typeof m !== "function")) return false;
		try {
			for (const k of Object.keys(m)) {
				const v = m[k];
				if (!v) continue;
				const n = nameOf(v) ?? nameOf(v.type) ?? nameOf(v.render);
				if (typeof n === "string" && /(Screen|Pins?)$/.test(n)) seenNames.add(n);
				let target: [any, string] | undefined;
				if (isScreen(v)) target = [m, k];
				else if (typeof v === "object" && isScreen(v.type)) target = [v, "type"];
				else if (typeof v === "object" && isScreen(v.render)) target = [v, "render"];
				else if (typeof v === "object" && v.type && isScreen(v.type.type)) target = [v.type, "type"];
				if (target && !hits.some(h => h[0] === target![0] && h[1] === target![1])) hits.push(target);
			}
		} catch {}
		return false;
	});
	return { hits, seenNames };
}

function patchPinsTab() {
	const unpatches: (() => void)[] = [];
	let timer: any;
	let tries = 0;

	const attempt = () => {
		const { hits, seenNames } = findScreens();
		if (!hits.length) {
			// lazily loaded screens aren't in the module list yet: try again shortly
			if (++tries < 30) {
				timer = setTimeout(attempt, 1500);
			} else {
				const names = [...seenNames].slice(0, 10).join(", ") || "none";
				console.warn("[Local Pins] pins screen not found; screens seen:", names);
				try {
					showToast(`Local Pins: Pins tab not found. Screens: ${names}`);
				} catch {}
			}
			return;
		}
		for (const [obj, key] of hits) {
			unpatches.push(after(key, obj, ([props], ret) => {
				// already wrapped by an outer screen (PinsScreen renders through BaseMessagesScreen)
				if (React.useContext(WrappedContext)) return;
				const channelId = props?.searchContext?.channelId;
				if (props?.tab !== "pins" || typeof channelId !== "string") return;
				return React.createElement(PinsScreen, { channelId, ret });
			}));
		}
	};
	attempt();

	return () => {
		clearTimeout(timer);
		for (const u of unpatches) u();
	};
}

export default function() {
	const patches: (() => void)[] = [];

	for (const patch of [patchMessageMenu, patchPinsTab]) {
		try {
			patches.push(patch());
		} catch (e) {
			// one patch failing (Discord changed something) must not stop the other
			console.warn(`[Local Pins] ${patch.name} failed`, e);
		}
	}

	return () => {
		for (const unpatch of patches) unpatch();
	};
}
