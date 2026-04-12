import { useState } from "react";
import { applyTheme, getStoredTheme, themes } from "../themes";

export function ThemePicker() {
	const [active, setActive] = useState(getStoredTheme);
	const [open, setOpen] = useState(false);

	function select(name: string) {
		applyTheme(name);
		setActive(name);
	}

	return (
		<div className="absolute top-4 right-4">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="rounded-lg border border-(--text-muted)/30 bg-(--bg) px-3 py-1.5 text-(--text-muted) text-sm transition hover:text-(--text)"
			>
				{active}
			</button>

			{open && (
				<div className="absolute right-0 mt-2 flex flex-col gap-1 whitespace-nowrap rounded-lg border border-(--text-muted)/20 bg-(--bg) p-2 shadow-lg">
					{Object.keys(themes).map((name) => (
						<button
							key={name}
							type="button"
							onClick={() => select(name)}
							className={`flex items-center gap-3 rounded-md px-3 py-1.5 text-left text-sm transition hover:bg-(--text-muted)/10 ${name === active ? "text-(--accent)" : "text-(--text-muted)"}`}
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
