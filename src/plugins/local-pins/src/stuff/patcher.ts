import { find, findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";

import { LazyActionSheet } from "$/components/ActionSheet";
import intlProxy from "$/lib/intlProxy";

import PinMessageLocallyAction from "../components/MessageActionSheetButton";
import PinsScreen from "../components/screens/PinsScreen";

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
 * Discord 343 names that tab's component `PinsScreen` (props: { tab: "pins", searchContext }),
 * so find it by function name in any module export (plain, memo or forwardRef).
 */
function patchPinsTab() {
	const nameOf = (v: any) => (typeof v === "function" ? v.displayName ?? v.name : undefined);

	let hit: [any, string] | undefined;
	find((m: any) => {
		if (hit || !m || (typeof m !== "object" && typeof m !== "function")) return false;
		try {
			for (const k of Object.keys(m)) {
				const v = m[k];
				if (!v) continue;
				if (nameOf(v) === "PinsScreen") hit = [m, k];
				else if (typeof v === "object" && nameOf(v.type) === "PinsScreen") hit = [v, "type"];
				else if (typeof v === "object" && nameOf(v.render) === "PinsScreen") hit = [v, "render"];
				if (hit) return true;
			}
		} catch {}
		return false;
	});
	if (!hit) throw new Error("PinsScreen not found");

	return after(hit[1], hit[0], ([props], ret) => {
		const channelId = props?.searchContext?.channelId;
		if (props?.tab !== "pins" || typeof channelId !== "string") return;
		return React.createElement(PinsScreen, { channelId, ret });
	});
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
