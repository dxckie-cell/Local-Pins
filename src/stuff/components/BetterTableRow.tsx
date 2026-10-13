import { ReactNative as RN, stylesheet } from "@vendetta/metro/common";
import { semanticColors } from "@vendetta/ui";

import Text from "./Text";

const styles = stylesheet.createThemedStyleSheet({
	group: { marginHorizontal: 16, marginTop: 16 },
	title: { marginBottom: 8, gap: 4, flexDirection: "row", alignItems: "center" },
	icon: { width: 16, height: 16, marginTop: 1.5, tintColor: semanticColors.TEXT_MUTED },
	card: {
		backgroundColor: semanticColors.CARD_BACKGROUND_DEFAULT,
		borderColor: semanticColors.BORDER_MUTED,
		borderWidth: 1,
		borderRadius: 16,
		overflow: "hidden",
		flex: 1,
	},
});

/** A titled card that groups settings rows. */
export function BetterTableRowGroup({ title, icon, children }: React.PropsWithChildren<{
	title: string;
	icon?: number;
}>) {
	return (
		<RN.View style={styles.group}>
			<RN.View style={styles.title}>
				{icon && <RN.Image style={styles.icon} source={icon} resizeMode="cover" />}
				<Text variant="text-sm/semibold" color="TEXT_MUTED">
					{title}
				</Text>
			</RN.View>
			<RN.View style={styles.card}>{children}</RN.View>
		</RN.View>
	);
}
