import { findByProps } from "@vendetta/metro";
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
 * Component names can't be relied on (349 doesn't expose them), so intercept element
 * creation instead: any element with props { tab: "pins", searchContext: { channelId } }
 * is swapped for a wrapper that renders the original inside our chips UI.
 */
function patchPinsTab() {
	const wrappers = new WeakMap<any, any>();

	const wrapperFor = (type: any) => {
		let W = wrappers.get(type);
		if (!W) {
			W = (props: any) => {
				const { __localPins, ...rest } = props;
				const channelId = rest.searchContext?.channelId ?? rest.channelId;
				const ret = React.createElement(type, { ...rest, __localPins: true });
				return React.createElement(PinsScreen, { channelId, ret });
			};
			wrappers.set(type, W);
		}
		return W;
	};

	const intercept = (args: any[]) => {
		const [type, props] = args;
		if (
			!type || !props || typeof props !== "object" || props.__localPins
			|| props.tab !== "pins"
			|| typeof (props.searchContext?.channelId ?? props.channelId) !== "string"
			|| typeof type === "string"
		) return;
		return [wrapperFor(type), props, ...args.slice(2)] as any;
	};

	const unpatches: (() => void)[] = [];
	unpatches.push(before("createElement", React, intercept as any));
	const runtime = findByProps("jsx", "jsxs");
	if (runtime) {
		for (const k of ["jsx", "jsxs", "jsxDEV"]) {
			if (typeof runtime[k] === "function") unpatches.push(before(k, runtime, intercept as any));
		}
	}

	return () => {
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
