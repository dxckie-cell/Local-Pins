import { clipboard, React, ReactNative as RN, stylesheet } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";
import { semanticColors } from "@vendetta/ui";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { Forms } from "@vendetta/ui/components";

import { BetterTableRowGroup } from "$/components/BetterTableRow";
import Text from "$/components/Text";

import { openModal } from "$/types";

import { hasAnyPin, vstorage } from "..";
import { report } from "../stuff/diag";
import LocalPinnedModal from "./modals/LocalPinnedModal";

const { FormRow } = Forms;

const styles = stylesheet.createThemedStyleSheet({
	destructiveIcon: {
		tintColor: semanticColors.TEXT_FEEDBACK_CRITICAL,
	},
});
const destructiveText: Parameters<typeof Text>[0] = {
	color: "TEXT_FEEDBACK_CRITICAL",
	variant: "text-md/semibold",
};

export default () => {
	useProxy(vstorage);
	const [, refresh] = React.useReducer((x: number) => x + 1, 0);

	return (
		<RN.ScrollView>
			<BetterTableRowGroup
				title="Local pins"
				icon={getAssetIDByName("PinIcon")}
			>
				<FormRow
					label="View local pins"
					subLabel={hasAnyPin() ? "Open your locally pinned messages" : "Nothing pinned yet"}
					leading={<FormRow.Icon source={getAssetIDByName("PinIcon")} />}
					trailing={<FormRow.Arrow />}
					onPress={() => openModal("local-pinned", LocalPinnedModal)}
				/>
			</BetterTableRowGroup>
			<BetterTableRowGroup
				title="Diagnostics"
				icon={getAssetIDByName("PencilIcon")}
			>
				<FormRow
					label="Copy diagnostics"
					subLabel="Copies what the plugin sees in Discord (for bug reports)"
					leading={<FormRow.Icon source={getAssetIDByName("PencilIcon")} />}
					onPress={() => {
						clipboard.setString(report());
						showToast("Copied diagnostics");
					}}
				/>
				<FormRow
					label="Refresh"
					leading={<FormRow.Icon source={getAssetIDByName("PencilIcon")} />}
					onPress={refresh}
				/>
				<RN.View style={{ padding: 12 }}>
					<Text variant="text-sm/medium" color="TEXT_MUTED" selectable>
						{report()}
					</Text>
				</RN.View>
			</BetterTableRowGroup>
			<BetterTableRowGroup
				title="Settings"
				icon={getAssetIDByName("SettingsIcon")}
			>
				<FormRow
					label="Data size"
					subLabel={vstorage.pinned
						? `${
							Math.floor(
								(JSON.stringify(vstorage.pinned).length
									/ 1000)
									* 100,
							) / 100
						} kilobytes`
						: "N/A"}
					leading={<FormRow.Icon source={getAssetIDByName("PencilIcon")} />}
				/>
				<FormRow
					label={<Text {...destructiveText}>Clear data</Text>}
					leading={
						<FormRow.Icon
							style={styles.destructiveIcon}
							source={getAssetIDByName("TrashIcon")}
						/>
					}
					trailing={<FormRow.Arrow />}
					onPress={() => {
						showConfirmationAlert({
							title: "Clear data",
							content: "Are you sure you want to clear all local pin data?",
							confirmText: "Clear",
							confirmColor: "red" as ButtonColors,
							onConfirm: () => {
								vstorage.pinned = {};
							},
							isDismissable: true,
						});
					}}
				/>
			</BetterTableRowGroup>
		</RN.ScrollView>
	);
};
