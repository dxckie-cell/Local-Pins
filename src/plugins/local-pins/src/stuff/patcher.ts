import { findByProps } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";

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
 * Adds the Server pins / Local pins switch to the channel info "Pins" tab. Component names
 * aren't reliable, so swap any element with props { tab: "pins", searchContext: { channelId } }
 * for a wrapper that renders the original inside our UI.
 */
function patchPinsTab() {
	const wrappers = new WeakMap<any, any>();

	const wrapperFor = (type: any) => {
		let W = wrappers.get(type);
		if (!W) {
			W = ({ __localPins, ...props }: any) => {
				const inner = React.createElement(type, { ...props, __localPins: true });
				// nested components get the same props: only the outermost one adds the switch
				if (React.useContext(WrappedContext)) return inner;
				return React.createElement(PinsScreen, {
					channelId: props.searchContext?.channelId ?? props.channelId,
					ret: inner,
				});
			};
			wrappers.set(type, W);
		}
		return W;
	};

	const intercept = ([type, props, ...rest]: any[]) => {
		if (
			typeof type === "string" || !type || !props || props.__localPins || props.tab !== "pins"
			|| typeof (props.searchContext?.channelId ?? props.channelId) !== "string"
		) return;
		return [wrapperFor(type), props, ...rest] as any;
	};

	const unpatches = [before("createElement", React, intercept)];
	const runtime = findByProps("jsx", "jsxs");
	for (const k of ["jsx", "jsxs", "jsxDEV"]) {
		if (typeof runtime?.[k] === "function") unpatches.push(before(k, runtime, intercept));
	}
	return () => unpatches.forEach(u => u());
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
