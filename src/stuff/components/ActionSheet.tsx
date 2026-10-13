import { findByProps } from "@vendetta/metro";
import type { ImageSourcePropType } from "react-native";

export const LazyActionSheet = (findByProps("openLazy", "hideActionSheet") ?? {}) as {
	openLazy: (component: Promise<any>, key: string, props?: object) => void;
	hideActionSheet: () => void;
};
export const { hideActionSheet } = LazyActionSheet;

export const showSimpleActionSheet = (findByProps("showSimpleActionSheet")
	?.showSimpleActionSheet) as (props: {
		key: "CardOverflow";
		header: { title: string; onClose?: () => void };
		options: {
			label: string;
			icon?: ImageSourcePropType;
			isDestructive?: boolean;
			onPress?: () => void;
		}[];
	}) => void;
