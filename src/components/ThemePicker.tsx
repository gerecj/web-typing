import { useState } from "react";
import { useDropdown } from "../hooks/useDropdown";
import { controlStyles } from "../lib/controlStyles";
import { applyTheme, getStoredTheme, themes } from "../themes";

interface ThemePickerProps {
	className?: string;
}

export function ThemePicker({ className = "" }: ThemePickerProps) {
	const [active, setActive] = useState(getStoredTheme);
	const { open, setOpen, rootRef } = useDropdown();

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
