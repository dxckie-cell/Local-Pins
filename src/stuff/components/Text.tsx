import { findByProps } from "@vendetta/metro";
import { ReactNative as RN } from "@vendetta/metro/common";
import { semanticColors } from "@vendetta/ui";
import type { TextProps } from "react-native";

import { resolveSemanticColor, TextStyleSheet, type TextStyleSheetVariant } from "../types";

const { useThemeContext } = findByProps("useThemeContext") ?? ({} as any);

export default function Text({
	variant,
	lineClamp,
	color,
	align,
	style,
	children,
}: React.PropsWithChildren<{
	variant?: TextStyleSheetVariant;
	color?: string;
	lineClamp?: TextProps["numberOfLines"];
	align?: "left" | "right" | "center";
	style?: TextProps["style"];
}>) {
	const themeContext = useThemeContext?.();

	return (
		<RN.Text
			style={[
				variant && TextStyleSheet?.[variant],
				color
					? { color: resolveSemanticColor(semanticColors[color], themeContext?.theme) }
					: {},
				align && { textAlign: align },
				style ?? {},
			]}
			numberOfLines={lineClamp}
		>
			{children}
		</RN.Text>
	);
}
