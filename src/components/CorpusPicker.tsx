import { useEffect, useRef, useState } from "react";
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
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const activeLabel = options.find((option) => option.id === active)?.label ?? active;

	useEffect(() => {
		if (!open) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (
				e.key === "Escape" ||
				e.key === "Backspace" ||
				(e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
			) {
				setOpen(false);
			}
		}

		function handlePointerDown(e: MouseEvent) {
			if (!rootRef.current?.contains(e.target as Node)) {
				setOpen(false);
			}
		}

		function handleFocusIn(e: FocusEvent) {
			if (!rootRef.current?.contains(e.target as Node)) {
				setOpen(false);
			}
		}

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("focusin", handleFocusIn);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("focusin", handleFocusIn);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [open]);

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
