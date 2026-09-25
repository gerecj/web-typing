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
		// On phones the groups wrap on their own row below the top corners.
		<div className="absolute inset-x-0 top-16 z-10 flex flex-wrap justify-center gap-2 px-4 md:inset-x-auto md:top-4 md:left-1/2 md:block md:-translate-x-1/2 md:px-0">
			{showPunctuation && (
				<div
					className={`whitespace-nowrap md:absolute md:top-0 md:right-full md:mr-4 ${controlStyles.group}`}
				>
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
				className={`flex-nowrap whitespace-nowrap md:absolute md:top-0 md:left-full md:ml-4 ${controlStyles.group}`}
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
