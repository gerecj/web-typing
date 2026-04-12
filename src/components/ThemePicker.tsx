import { useEffect, useRef, useState } from "react";
import { controlStyles } from "../lib/controlStyles";
import { applyTheme, getStoredTheme, themes } from "../themes";

interface ThemePickerProps {
	className?: string;
}

export function ThemePicker({ className = "" }: ThemePickerProps) {
	const [active, setActive] = useState(getStoredTheme);
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

	function select(name: string) {
		applyTheme(name);
		setActive(name);
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
				{active}
			</button>

			{open && (
				<div className={controlStyles.menu}>
					{Object.keys(themes).map((name) => (
						<button
							key={name}
							type="button"
							onClick={() => select(name)}
							className={`${controlStyles.menuItemBase} flex items-center gap-3 ${
								name === active ? "text-(--accent)" : "text-(--text-muted)"
							}`}
						>
							<span className="flex gap-1">
								{["--bg", "--text", "--accent", "--text-error"].map((key) => (
									<span
										key={key}
										className="size-3 rounded-full"
										style={{ backgroundColor: themes[name][key as keyof (typeof themes)[string]] }}
									/>
								))}
							</span>
							{name}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
