import { React, ReactNative as RN, stylesheet } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { semanticColors } from "@vendetta/ui";

import Text from "$/components/Text";

import { getPins, vstorage } from "../..";
import { LocalPinsList } from "../modals/LocalPinnedModal";

let lastMode: "server" | "local" = "server";

const styles = stylesheet.createThemedStyleSheet({
	row: {
		flexDirection: "row",
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	chip: {
		paddingHorizontal: 14,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: semanticColors.BACKGROUND_MOD_SUBTLE,
	},
	chipActive: {
		backgroundColor: semanticColors.BACKGROUND_MOD_STRONG,
	},
});

function Chip(
	{ label, active, onPress }: { label: string; active: boolean; onPress: () => void },
) {
	return (
		<RN.Pressable
			onPress={onPress}
			style={[styles.chip, active && styles.chipActive]}
		>
			<Text
				variant="text-sm/semibold"
				color={active ? "TEXT_DEFAULT" : "TEXT_MUTED"}
			>
				{label}
			</Text>
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
	const [mode, setMode] = React.useState(lastMode);
	const pick = (m: "server" | "local") => {
		lastMode = m;
		setMode(m);
	};

	return (
		<RN.View style={{ flex: 1 }}>
			<RN.View style={styles.row}>
				<Chip
					label="Server pins"
					active={mode === "server"}
					onPress={() => pick("server")}
				/>
				<Chip
					label={`Local pins (${getPins(channelId).length})`}
					active={mode === "local"}
					onPress={() => pick("local")}
				/>
			</RN.View>
			{mode === "server" ? ret : <LocalPinsList channelId={channelId} inModal={false} />}
		</RN.View>
	);
}
