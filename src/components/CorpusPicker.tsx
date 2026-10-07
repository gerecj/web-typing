import { useDropdown } from "../hooks/useDropdown";
import { controlStyles } from "../lib/controlStyles";

export interface CorpusOption {
	id: string;
	label: string;
}

interface CorpusPickerProps {
	active: string;
	options: readonly CorpusOption[];
	onSelect?: (id: string) => void;
	className?: string;
}

export function CorpusPicker({ active, options, onSelect, className = "" }: CorpusPickerProps) {
	const { open, setOpen, rootRef } = useDropdown();
	const activeLabel = options.find((option) => option.id === active)?.label ?? active;

	if (!onSelect) {
		return (
			<div className={`${controlStyles.group} ${className}`.trim()}>
				<span className="rounded-md px-3 py-1 text-(--text-muted) text-sm">{activeLabel}</span>
			</div>
		);
	}

	function select(id: string) {
		onSelect?.(id);
		setOpen(false);
	}

	return (
		<div ref={rootRef} className={`${controlStyles.group} ${className}`.trim()}>
			<button
				type="button"
				onClick={(e) => {
					setOpen(!open);
					e.currentTarget.blur();
				}}
				className={controlStyles.trigger}
			>
				{activeLabel}
			</button>

			{open && (
				<div className={controlStyles.menu}>
					{options.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => select(option.id)}
							className={`${controlStyles.menuItemBase} ${
								option.id === active ? "text-(--accent)" : "text-(--text-muted)"
							}`}
						>
							{option.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
