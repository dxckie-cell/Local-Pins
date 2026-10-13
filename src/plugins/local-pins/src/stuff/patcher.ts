import { find, findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";
import { findInReactTree } from "@vendetta/utils";

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

				const buttons = findInReactTree(
					comp,
					x => Array.isArray(x) && x.filter(isRow).length >= 2,
				);
				if (!buttons) return comp;

				// put it right before "Mark Unread" when present, else at the end
				const unread = buttons.findIndex(
					(x: any) => !!intlProxy.MARK_UNREAD && rowLabel(x) === intlProxy.MARK_UNREAD,
				);
				buttons.splice(
					unread >= 0 ? unread : buttons.length,
					0,
					React.createElement(PinMessageLocallyAction, message),
				);
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
