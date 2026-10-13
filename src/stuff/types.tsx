import { findByProps, findByStoreName } from "@vendetta/metro";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";

import type Modal from "./components/Modal";

const ThemeStore = findByStoreName("ThemeStore");
const colorModule = findByProps("colors", "unsafe_rawColors");
const colorResolver = colorModule?.internal ?? colorModule?.meta;

export const TextStyleSheet = findByProps("TextStyleSheet")
	?.TextStyleSheet as _TextStyleSheet | undefined;

export const Navigator = findByProps("Navigator")?.Navigator;
export const modalCloseButton = findByProps("getHeaderCloseButton")?.getHeaderCloseButton;
export const { popModal, pushModal } = (findByProps("popModal", "pushModal") ?? {}) as any;

export function resolveSemanticColor(color: any, theme: string = ThemeStore?.theme) {
	return (color && colorResolver?.resolveSemanticColor(theme, color)) || "#000000";
}

/** Opens a full-screen modal on Discord's modal stack. */
export function openModal(key: string, modal: typeof Modal) {
	if (!Navigator || !modalCloseButton || !pushModal) {
		showToast("Couldn't open the modal (Discord internals missing)", getAssetIDByName("CircleXIcon-primary"));
		return;
	}

	pushModal({
		key,
		modal: {
			key,
			modal,
			animation: "slide-up",
			shouldPersistUnderModals: false,
			closable: true,
		},
	});
}

export type TextStyleSheetCase = "normal" | "medium" | "semibold" | "bold";

type TextStyleSheetHasExtraBoldCase =
	| "heading-sm"
	| "heading-md"
	| "heading-lg"
	| "heading-xl"
	| "heading-xxl"
	| "heading-deprecated-12";
type TextStyleSheetHasCase =
	| TextStyleSheetHasExtraBoldCase
	| "text-xxs"
	| "text-xs"
	| "text-sm"
	| "text-md"
	| "text-lg";

export type TextStyleSheetVariant =
	| `${TextStyleSheetHasCase}/${TextStyleSheetCase}`
	| `${TextStyleSheetHasExtraBoldCase}/${TextStyleSheetCase | "extrabold"}`
	| "eyebrow"
	| "display-sm"
	| "display-md"
	| "display-lg";

type _TextStyleSheet = Record<TextStyleSheetVariant, object>;
