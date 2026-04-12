import { useEffect, useRef, useState } from "react";

export interface CorpusOption {
	id: string;
	label: string;
}

interface CorpusPickerProps {
	active: string;
	options: CorpusOption[];
	onSelect: (id: string) => void;
	className?: string;
}

export function CorpusPicker({ active, options, onSelect, className = "" }: CorpusPickerProps) {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const activeLabel = options.find((option) => option.id === active)?.label ?? active;

	useEffect(() => {
		if (!open) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
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

	function select(id: string) {
		onSelect(id);
		setOpen(false);
	}

	return (
		<div ref={rootRef} className={className}>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="rounded-lg border border-(--text-muted)/30 bg-(--bg) px-3 py-1.5 text-(--text-muted) text-sm transition hover:text-(--text)"
			>
				{activeLabel}
			</button>

			{open && (
				<div className="absolute right-0 mt-2 flex flex-col gap-1 whitespace-nowrap rounded-lg border border-(--text-muted)/20 bg-(--bg) p-2 shadow-lg">
					{options.map((option) => (
						<button
							key={option.id}
							type="button"
							onClick={() => select(option.id)}
							className={`rounded-md px-3 py-1.5 text-left text-sm transition hover:bg-(--text-muted)/10 ${
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
