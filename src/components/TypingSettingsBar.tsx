import type { ReactNode } from "react";
import { controlStyles, segmentedItemClass } from "../lib/controlStyles";
import type { TypingPreset } from "../lib/typing-settings";

type LengthOption = string | number;

interface TypingSettingsBarProps {
	preset: TypingPreset;
	presetOptions: readonly TypingPreset[];
	lengthOptions: readonly LengthOption[];
	selectedLength: LengthOption;
	punctuationEnabled: boolean;
	showPunctuation?: boolean;
	onPresetChange?: (preset: TypingPreset) => void;
	onLengthChange?: (option: LengthOption) => void;
	onTogglePunctuation?: () => void;
}

interface SettingItemProps {
	active: boolean;
	children: ReactNode;
	onSelect?: () => void;
}

function SettingItem({ active, children, onSelect }: SettingItemProps) {
	if (!onSelect) {
		return (
			<span
				className={`${controlStyles.itemBase} ${
					active ? controlStyles.itemActive : "text-(--text-muted)"
				}`}
			>
				{children}
			</span>
		);
	}

	return (
		<button
			type="button"
			onClick={(event) => {
				onSelect();
				event.currentTarget.blur();
			}}
			className={segmentedItemClass(active, "whitespace-nowrap")}
		>
			{children}
		</button>
	);
}

export function TypingSettingsBar({
	preset,
	presetOptions,
	lengthOptions,
	selectedLength,
	punctuationEnabled,
	showPunctuation = true,
	onPresetChange,
	onLengthChange,
	onTogglePunctuation,
}: TypingSettingsBarProps) {
	return (
		<div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
			{showPunctuation && (
				<div className={`absolute top-0 right-full mr-4 whitespace-nowrap ${controlStyles.group}`}>
					<SettingItem active={punctuationEnabled} onSelect={onTogglePunctuation}>
						punctuation
					</SettingItem>
				</div>
			)}

			<div className={controlStyles.group}>
				{presetOptions.map((option) => (
					<SettingItem
						key={option}
						active={preset === option}
						onSelect={onPresetChange ? () => onPresetChange(option) : undefined}
					>
						{option}
					</SettingItem>
				))}
			</div>

			<div
				className={`absolute top-0 left-full ml-4 flex-nowrap whitespace-nowrap ${controlStyles.group}`}
			>
				{lengthOptions.map((option) => (
					<SettingItem
						key={option}
						active={selectedLength === option}
						onSelect={onLengthChange ? () => onLengthChange(option) : undefined}
					>
						{option}
					</SettingItem>
				))}
			</div>
		</div>
	);
}
