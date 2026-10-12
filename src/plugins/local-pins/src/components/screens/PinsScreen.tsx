import { React, ReactNative as RN, stylesheet } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { semanticColors } from "@vendetta/ui";

import Text from "$/components/Text";

import { getPins, vstorage } from "../..";
import { LocalPinsList } from "../modals/LocalPinnedModal";

type Mode = "server" | "local";
let lastMode: Mode = "server";

const DURATION = 240;
const SLIDE = 18;

const styles = stylesheet.createThemedStyleSheet({
	row: {
		flexDirection: "row",
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	chip: {
		borderRadius: 16,
		overflow: "hidden",
		backgroundColor: semanticColors.BACKGROUND_MOD_SUBTLE,
	},
	chipActive: {
		...RN.StyleSheet.absoluteFillObject,
		backgroundColor: semanticColors.BACKGROUND_MOD_STRONG,
	},
	chipLabel: {
		paddingHorizontal: 14,
		paddingVertical: 6,
	},
	pane: {
		...RN.StyleSheet.absoluteFillObject,
	},
});

/**
 * One chip. `active` is an Animated.Value in [0, 1]; the highlight and label
 * fade with it (opacity only, so it all runs on the native driver).
 */
function Chip(
	{ label, active, onPress }: {
		label: string;
		active: any;
		onPress: () => void;
	},
) {
	return (
		<RN.Pressable onPress={onPress} style={styles.chip}>
			<RN.Animated.View style={[styles.chipActive, { opacity: active }]} />
			<RN.Animated.View
				style={[
					styles.chipLabel,
					{ opacity: active.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
				]}
			>
				<Text variant="text-sm/semibold" color="TEXT_DEFAULT">
					{label}
				</Text>
			</RN.Animated.View>
		</RN.Pressable>
	);
}

/** Wraps Discord's Pins tab with a Server pins / Local pins switch. */
export default function PinsScreen({
	channelId,
	ret,
}: {
	channelId: string;
	ret: any;
}) {
	useProxy(vstorage);
	const [mode, setMode] = React.useState<Mode>(lastMode);
	// the local list is only built the first time it's needed, then kept alive
	// so switching back and forth is instant (no reload, scroll position kept)
	const [localMounted, setLocalMounted] = React.useState(lastMode === "local");
	// 0 = server pins shown, 1 = local pins shown
	const progress = React.useRef(new RN.Animated.Value(lastMode === "local" ? 1 : 0)).current;

	const pick = (m: Mode) => {
		if (m === mode) return;
		lastMode = m;
		if (m === "local") setLocalMounted(true);
		setMode(m);
		RN.Animated.timing(progress, {
			toValue: m === "local" ? 1 : 0,
			duration: DURATION,
			easing: RN.Easing.out(RN.Easing.cubic),
			useNativeDriver: true,
		}).start();
	};

	const serverActive = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

	return (
		<RN.View style={{ flex: 1 }}>
			<RN.View style={styles.row}>
				<Chip
					label="Server pins"
					active={serverActive}
					onPress={() => pick("server")}
				/>
				<Chip
					label={`Local pins (${getPins(channelId).length})`}
					active={progress}
					onPress={() => pick("local")}
				/>
			</RN.View>

			<RN.View style={{ flex: 1 }}>
				<RN.Animated.View
					style={[
						styles.pane,
						{
							opacity: serverActive,
							transform: [{
								translateX: progress.interpolate({
									inputRange: [0, 1],
									outputRange: [0, -SLIDE],
								}),
							}],
						},
					]}
					pointerEvents={mode === "server" ? "auto" : "none"}
				>
					{ret}
				</RN.Animated.View>

				{localMounted && (
					<RN.Animated.View
						style={[
							styles.pane,
							{
								opacity: progress,
								transform: [{
									translateX: progress.interpolate({
										inputRange: [0, 1],
										outputRange: [SLIDE, 0],
									}),
								}],
							},
						]}
						pointerEvents={mode === "local" ? "auto" : "none"}
					>
						<LocalPinsList channelId={channelId} inModal={false} />
					</RN.Animated.View>
				)}
			</RN.View>
		</RN.View>
	);
}
