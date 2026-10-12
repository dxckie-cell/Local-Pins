import { findByName, findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative as RN, stylesheet, url } from "@vendetta/metro/common";
import { semanticColors } from "@vendetta/ui";
import { getAssetIDByName } from "@vendetta/ui/assets";

import { hideActionSheet, showSimpleActionSheet } from "$/components/ActionSheet";
import Modal from "$/components/Modal";
import Text from "$/components/Text";
import intlProxy from "$/lib/intlProxy";
import { popModal } from "$/types";

import { getPins, hasAnyPin, removePin } from "../..";
import useLocalPinned from "../../hooks/useLocalPinned";

const { default: ChatItemWrapper } = findByProps(
	"DCDAutoModerationSystemMessageView",
	"default",
) ?? ({} as any);
const MessageRecord = findByName("MessageRecord");
const RowManager = findByName("RowManager");

const ThemeStore = findByStoreName("ThemeStore");

// Discord's own link opener: handles discord.com/channels/... links in-app,
// the same way tapping a message link in chat does (no OS "open in app" prompt)
const { openUrl: openInApp } = findByProps("openUrl") ?? ({} as any);
const { jumpToMessage } = findByProps("jumpToMessage") ?? ({} as any);

function jumpTo(channel: any, channelId: string, messageId: string) {
	const link = `https://discord.com/channels/${channel?.guild_id ?? "@me"}/${channelId}/${messageId}`;
	if (typeof openInApp === "function") {
		try {
			return openInApp(link);
		} catch {}
	}
	if (typeof jumpToMessage === "function") {
		try {
			return jumpToMessage({ channelId, messageId, flash: true, jumpType: "ANIMATED" });
		} catch {}
	}
	url.openDeeplink(link);
}

// Plain-text fallback for when Discord's own message renderer is unavailable/broken
const PlainMessage = ({ message }: { message: any }) => {
	const author = message.author?.globalName ?? message.author?.username ?? "unknown";
	const attachments = message.attachments?.length ?? 0;
	let when = "";
	try {
		const t = message.timestamp?.toDate?.() ?? message.timestamp;
		when = t ? new Date(t).toLocaleString() : "";
	} catch {}

	return (
		<RN.View style={{ gap: 2 }}>
			<Text variant="text-sm/semibold" color="TEXT_DEFAULT">
				{author}
				{when ? `  ·  ${when}` : ""}
			</Text>
			<Text variant="text-md/medium" color="TEXT_DEFAULT">
				{message.content
					|| (attachments ? `[${attachments} attachment${attachments !== 1 ? "s" : ""}]` : "[no text]")}
			</Text>
		</RN.View>
	);
};

class SafeMessage extends React.Component<
	{ message: any },
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		const { message } = this.props;
		if (this.state.failed || !ChatItemWrapper || !MessageRecord || !RowManager) {
			return <PlainMessage message={message} />;
		}
		return (
			<ChatItemWrapper
				rowGenerator={new RowManager()}
				message={new MessageRecord(message)}
			/>
		);
	}
}

export const Message = ({
	message,
	channelId,
	channel,
	remove,
	inModal = true,
}: {
	message: any;
	channelId: string;
	channel?: any;
	remove: () => void;
	inModal?: boolean;
}) => {
	const styles = stylesheet.createThemedStyleSheet({
		message: {
			backgroundColor: semanticColors.CARD_SECONDARY_BG,
			padding: 8,
			borderRadius: 8,
			flexDirection: "column",
			gap: 4,
		},
		icon: {
			width: 16,
			height: 16,
			tintColor: semanticColors.TEXT_DEFAULT,
		},
		androidRipple: {
			color: semanticColors.ANDROID_RIPPLE,
			cornerRadius: 8,
			foreground: true,
		} as any,
	});

	return (
		<RN.Pressable
			style={styles.message}
			android_ripple={styles.androidRipple}
			onPress={() => {
				if (inModal) popModal();
				// give the modal a moment to close before navigating
				setTimeout(() => jumpTo(channel, channelId, message.id), 250);
			}}
			onLongPress={() => {
				showSimpleActionSheet({
					key: "CardOverflow",
					header: {
						title: "Pinned Message",
						onClose: hideActionSheet,
					},
					options: [
						{
							label: "Unpin",
							icon: getAssetIDByName("PinIcon"),
							onPress: () => {
								removePin(channelId, message.id);
								remove();
							},
						},
					],
				});
			}}
			pointerEvents="box-only"
		>
			<RN.View
				style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
			>
				<RN.Image
					style={styles.icon}
					source={getAssetIDByName("ChatIcon")}
					resizeMode="cover"
				/>
				<Text variant="text-md/medium" color="TEXT_DEFAULT">
					{channel?.name ?? "unknown"}
				</Text>
			</RN.View>
			<SafeMessage message={message} />
		</RN.Pressable>
	);
};

/** The list of local pins: all channels (modal) or a single channel (Pins tab). */
export function LocalPinsList(
	{ channelId, inModal = true }: { channelId?: string; inModal?: boolean },
) {
	const styles = stylesheet.createThemedStyleSheet({
		main: {
			flexDirection: "column",
			gap: 16,
			paddingHorizontal: 8,
			paddingTop: 8,
			paddingBottom: 36,
		},
		bowomp: {
			flex: 1,
			gap: 4,
			alignItems: "center",
			justifyContent: "center",
			flexDirection: "column",
		},
	});

	const { data, status, remove } = useLocalPinned(channelId);
	const any = channelId ? getPins(channelId).length > 0 : hasAnyPin();

	if (!any) {
		return (
			<RN.View style={styles.bowomp}>
				<RN.Image
					source={{
						dark: getAssetIDByName("img_pins_empty_dark"),
						light: getAssetIDByName("img_pins_empty_light"),
					}[ThemeStore?.theme as "dark" | "light"]
						?? getAssetIDByName("img_pins_empty_darker")}
					resizeMode="contain"
					style={{ marginLeft: 35 }}
				/>
				<Text variant="text-md/medium" color="TEXT_MUTED" align="center">
					{channelId
						? "No local pins in this channel yet. Long-press a message and tap Pin Message Locally."
						: intlProxy.NO_PINS_IN_CHANNEL}
				</Text>
			</RN.View>
		);
	}

	if (!data) {
		return (
			<RN.View style={{ alignItems: "center", justifyContent: "center", flex: 1 }}>
				<RN.ActivityIndicator size="large" style={{ marginBottom: 10 }} />
				<Text variant="text-lg/semibold" color="TEXT_DEFAULT" align="center">
					{Math.floor(status * 100)}%
				</Text>
			</RN.View>
		);
	}

	return (
		<RN.ScrollView style={{ flex: 1 }}>
			<RN.View style={styles.main}>
				{data.map(x => (
					<Message
						{...x}
						inModal={inModal}
						remove={() => remove(x.message.id)}
						key={x.message.id}
					/>
				))}
			</RN.View>
		</RN.ScrollView>
	);
}

export default function LocalPinnedModal() {
	return (
		<Modal mkey="local-pinned" title="Local Pinned">
			<LocalPinsList />
		</Modal>
	);
}
