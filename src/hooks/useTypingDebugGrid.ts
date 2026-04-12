import { useEffect, useState } from "react";

export function useTypingDebugGrid() {
	const isDev = import.meta.env.DEV;
	const [showDebugGrid, setShowDebugGrid] = useState(false);

	useEffect(() => {
		if (!isDev) return;
		// Keep debug styles out of production bundle by loading them only in dev.
		void import("../styles.debug.css");
	}, [isDev]);

	useEffect(() => {
		if (!isDev) return;
		if (typeof document === "undefined") return;
		// Apply/remove a single root class so the debug overlay remains CSS-driven.
		document.documentElement.classList.toggle("debug-grid", showDebugGrid);
		return () => document.documentElement.classList.remove("debug-grid");
	}, [isDev, showDebugGrid]);

	useEffect(() => {
		if (!isDev) return;

		// Alt+G toggles debug grid without touching functional typing state.
		function handleDebugShortcut(e: KeyboardEvent) {
			if (!e.altKey || e.key.toLowerCase() !== "g") return;
			e.preventDefault();
			e.stopPropagation();
			setShowDebugGrid((value) => !value);
		}

		window.addEventListener("keydown", handleDebugShortcut, { capture: true });
		return () => window.removeEventListener("keydown", handleDebugShortcut, { capture: true });
	}, [isDev]);

	return { isDev, showDebugGrid };
}
