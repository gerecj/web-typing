export const controlStyles = {
	group: "flex items-center gap-1 rounded-lg border border-(--text-muted)/30 bg-(--bg) p-1",
	trigger: "rounded-md px-3 py-1 text-(--text-muted) text-sm transition hover:text-(--text)",
	menu: "absolute top-full right-0 z-20 mt-2 flex min-w-max flex-col gap-1 whitespace-nowrap rounded-lg border border-(--text-muted)/20 bg-(--bg) p-2 shadow-lg",
	itemBase: "rounded-md px-3 py-1 text-sm transition",
	itemInactive: "text-(--text-muted) hover:text-(--text)",
	itemActive: "bg-(--text-muted)/20 text-(--accent)",
	menuItemBase: "rounded-md px-3 py-1 text-left text-sm transition hover:text-(--text)",
} as const;

export function segmentedItemClass(isActive: boolean, extra = ""): string {
	const base = `${controlStyles.itemBase} ${isActive ? controlStyles.itemActive : controlStyles.itemInactive}`;
	return `${base} ${extra}`.trim();
}
