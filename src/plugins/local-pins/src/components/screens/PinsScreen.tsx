import { findByProps } from "@vendetta/metro";
import { ReactNative as RN } from "@vendetta/metro/common";
import { useProxy } from "@vendetta/storage";

import Text from "$/components/Text";

import { vstorage } from "../..";
import useLocalPinned from "../../hooks/useLocalPinned";
import { pinsCallback } from "../../stuff/patcher";

const { useSearchResultsQuery } = findByProps("useSearchResultsQuery");

export default function PinsScreen({
	channelId,
	ret,
}: {
	channelId: string;
	ret: any;
}) {
	useProxy(vstorage);
	const { status, data } = useLocalPinned(channelId);

	pinsCallback.overrides[channelId] = ({
		messages,
		searchContext,
		press,
	}) => {
		const rawQuery = useSearchResultsQuery?.(searchContext);
		const query = (
			typeof rawQuery === "string"
				? rawQuery
				: rawQuery?.query ?? searchContext?.query ?? ""
		).toString().toLowerCase();
		return [
			...(data
				? data
					.filter(x =>
						!query
						|| (x.message.content ?? "").toLowerCase().includes(query)
					)
					.map(({ message, channelId }) => ({
						type: "message",
						props: {
							searchContext,
							message,
							onPress: () => press?.(channelId, message.id),
							highlighter: (something: any) => something,
							lineClamp: 10,
						},
					}))
				: []),
			...messages,
		];
	};

	return data ? ret : (
		<RN.View
			style={{ alignItems: "center", justifyContent: "center", flex: 1 }}
		>
			<RN.ActivityIndicator size="large" style={{ marginBottom: 10 }} />
			<Text variant="text-lg/semibold" color="TEXT_DEFAULT" align="center">
				{Math.floor(status * 100)}%
			</Text>
		</RN.View>
	);
}
