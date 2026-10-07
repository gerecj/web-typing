import { useEffect, useRef, useState } from "react";

/** Open state for a dropdown that closes on Escape, on typing, or on a click or focus outside it. */
export function useDropdown() {
	const [open, setOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);

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

		function closeIfOutside(e: Event) {
			if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
		}

		document.addEventListener("mousedown", closeIfOutside);
		document.addEventListener("focusin", closeIfOutside);
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", closeIfOutside);
			document.removeEventListener("focusin", closeIfOutside);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [open]);

	return { open, setOpen, rootRef };
}
