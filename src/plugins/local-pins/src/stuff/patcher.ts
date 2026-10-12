import { findByName, findByProps } from "@vendetta/metro";
import { React, ReactNative as RN } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { findInReactTree } from "@vendetta/utils";

import { LazyActionSheet } from "$/components/ActionSheet";
import SuperAwesomeIcon from "$/components/SuperAwesomeIcon";
import intlProxy from "$/lib/intlProxy";
import type { SearchContext } from "$/types";

import ChannelPinsRow from "../components/ChannelPinsRow";
import PinMessageLocallyAction, { ViewLocalPinsAction } from "../components/MessageActionSheetButton";
import ChannelPinsModal from "../components/modals/ChannelPinsModal";
import RedesignChannelPinsRow from "../components/RedesignChannelPinsRow";
import PinsScreen from "../components/screens/PinsScreen";

const ChannelSettingsModal = findByName("ChannelSettingsModal", false);
const ChannelPinsConnected = findByName("ChannelPinsConnected", false);
const screens = findByProps("MessagesScreen", "MessageContentScreen");
const { useOnPressSearchItem } = findByProps("useOnPressSearchItem") ?? {};
const { FlashList } = findByProps("FlashList") ?? {};

const { ActionSheetRow } = findByProps("ActionSheetRow") ?? ({} as any);
let warnedNoRows = false;

const PrivateChannels = findByName("ConnectedPrivateChannels", false);

export const pinsCallback: {
	filters?: () => void;
	clear?: () => void;
	overrides: Record<
		string,
		(data: {
			messages: any[];
			searchContext?: SearchContext;
			press?: (channelId: string, messageId: string) => void;
		}) => any[]
	>;
} = {
	overrides: {},
};

export default function() {
	const patches: (() => void)[] = [];
	const failed: string[] = [];
	const attempt = (name: string, fn: () => void) => {
		try {
			fn();
		} catch (e) {
			failed.push(name);
			console.warn(`[Local Pins] patch "${name}" failed`, e);
		}
	};

	attempt("pins list", () => {
	patches.push(
		after("default", ChannelPinsConnected, (_, pins) => {
			const { channelId, loaded, messages } = pins.props;
			return {
				...pins,
				props: {
					...pins.props,
					messages: loaded && messages
						? (pinsCallback.overrides[channelId]?.({
							messages,
						}) ?? messages)
						: messages,
				},
			};
		}),
	);
	});

	attempt("pins screen", () => {
	if (screens?.MessagesScreen && useOnPressSearchItem) {
		patches.push(
			after(
				"MessagesScreen",
				screens,
				([{ searchContext, tab }], ret) => {
					if (tab === "pins") {
						const { channelId } = searchContext;
						React.useEffect(
							() => () => {
								unpatch();
							},
							[],
						);

						const press = useOnPressSearchItem(searchContext);
						const unpatch = before("type", ret, ([x]) => {
							if (x?.data) {
								x.data = pinsCallback.overrides[channelId]?.({
									messages: x.data,
									searchContext,
									press,
								}) ?? x.data;
							}
						});

						return React.createElement(PinsScreen, {
							channelId: searchContext.channelId,
							ret,
						});
					}
				},
			),
		);
	}
	});
	attempt("channel settings pins", () => {
	patches.push(
		after("default", ChannelSettingsModal, (_, navigator) => {
			const { screens } = navigator.props;

			screens.PINNED_MESSAGES.headerRight = () =>
				React.createElement(
					RN.View,
					{
						style: { flexDirection: "row-reverse" },
					},
					React.createElement(SuperAwesomeIcon, {
						icon: getAssetIDByName("FiltersHorizontalIcon"),
						style: "header",
						onPress: () => pinsCallback.filters?.(),
					}),
					React.createElement(SuperAwesomeIcon, {
						icon: getAssetIDByName("TrashIcon"),
						style: "header",
						destructive: true,
						onPress: () => pinsCallback.clear?.(),
					}),
				);

			patches.push(
				after(
					"render",
					screens.PINNED_MESSAGES,
					(_, ret) =>
						React.createElement(ChannelPinsModal, {
							channelId: ret.props.channelId,
						}),
				),
			);
		}),
	);
	});

	attempt("message action sheet", () => {
	patches.push(
		before("openLazy", LazyActionSheet, ([component, key, msg]) => {
			const message = msg?.message;
			if (key !== "MessageLongPressActionSheet" || !message) return;

			component.then(i => {
				const unp = after("default", i, (_, comp) => {
					React.useEffect(
						() => () => {
							unp();
						},
						[],
					);

					// Discord renames/wraps these between versions (names can be empty
					// for memo'd components), so match rows by name OR by their props
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
					if (!buttons) {
						if (!warnedNoRows) {
							warnedNoRows = true;
							showToast("Local Pins: couldn't find message action rows");
						}
						console.warn("[Local Pins] no action sheet row list found", comp);
						return comp;
					}

					const unread = buttons.findIndex(
						(x: any) =>
							!!intlProxy.MARK_UNREAD
							&& rowLabel(x) === intlProxy.MARK_UNREAD,
					);
					const at = unread >= 0 ? unread : buttons.length;
					buttons.splice(
						at,
						0,
						React.createElement(PinMessageLocallyAction, message),
						React.createElement(ViewLocalPinsAction),
					);
				});
			});
		}),
	);
	});

	attempt("home pins row", () => {
	if (FlashList) {
		patches.push(
			after(
				"render",
				FlashList,
				([d], ret) =>
					d.accessibilityLabel === intlProxy.HAPPENING_NOW
						? React.createElement(RedesignChannelPinsRow, { ret })
						: ret,
			),
		);
	}
	});

	// patches.push(
	//   after("default", FastList, ([d], ret) =>
	//     d.accessibilityLabel === intlProxy.DIRECT_MESSAGES
	//       ? React.createElement(MessagesPinsRow, { ret })
	//       : ret,
	//   ),
	// );

	attempt("dm list pins row", () => {
	let privatePatched = false;
	patches.push(
		after("default", PrivateChannels, (_, res) => {
			if (privatePatched) return;
			privatePatched = true;

			patches.push(
				after("render", res.type.prototype, (_, list) => {
					const children = findInReactTree(
						list,
						x => x.find((y: any) => y.type?.name === "FastList"),
					);
					if (!children) return;

					children.splice(
						1,
						0,
						React.createElement(ChannelPinsRow, {}),
					);
				}),
			);
		}),
	);
	});

	// Some Discord UI patches (pins list, home/DM rows) don't exist on newer Discord
	// versions; that's expected, so only log it instead of toasting on every launch.
	if (failed.length) {
		console.warn(`[Local Pins] skipped patches: ${failed.join(", ")}`);
	}

	return () => {
		for (const x of patches) {
			x();
		}
	};
}
