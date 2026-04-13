export interface Theme {
	"--bg": string;
	"--text": string;
	"--text-muted": string;
	"--text-error": string;
	"--accent": string;
	"--error-decoration": string;
}

const THEME_NAME_KEY = "typing-theme";
const LEGACY_THEME_NAME_KEY = "theme";
const THEME_VARS_KEY = "theme-vars";

export const themes: Record<string, Theme> = {
	serikaDark: {
		"--bg": "#323437",
		"--text": "#d1d0c5",
		"--text-muted": "#646669",
		"--text-error": "#ca4754",
		"--accent": "#e2b714",
		"--error-decoration": "#ca4754",
	},
	catppuccin: {
		"--bg": "#1e1e2e",
		"--text": "#cdd6f4",
		"--text-muted": "#6c7086",
		"--text-error": "#f38ba8",
		"--accent": "#f5e0dc",
		"--error-decoration": "#f38ba8",
	},
	dracula: {
		"--bg": "#282a36",
		"--text": "#f8f8f2",
		"--text-muted": "#6272a4",
		"--text-error": "#ff5555",
		"--accent": "#bd93f9",
		"--error-decoration": "#ff5555",
	},
	monokai: {
		"--bg": "#272822",
		"--text": "#f8f8f2",
		"--text-muted": "#75715e",
		"--text-error": "#f92672",
		"--accent": "#e6db74",
		"--error-decoration": "#f92672",
	},
	nord: {
		"--bg": "#2e3440",
		"--text": "#eceff4",
		"--text-muted": "#4c566a",
		"--text-error": "#bf616a",
		"--accent": "#88c0d0",
		"--error-decoration": "#bf616a",
	},
	gruvbox: {
		"--bg": "#282828",
		"--text": "#ebdbb2",
		"--text-muted": "#665c54",
		"--text-error": "#fb4934",
		"--accent": "#fabd2f",
		"--error-decoration": "#fb4934",
	},
	tokyoNight: {
		"--bg": "#1a1b26",
		"--text": "#c0caf5",
		"--text-muted": "#565f89",
		"--text-error": "#f7768e",
		"--accent": "#7aa2f7",
		"--error-decoration": "#f7768e",
	},
	solarizedDark: {
		"--bg": "#002b36",
		"--text": "#839496",
		"--text-muted": "#586e75",
		"--text-error": "#dc322f",
		"--accent": "#268bd2",
		"--error-decoration": "#dc322f",
	},
	rosePine: {
		"--bg": "#191724",
		"--text": "#e0def4",
		"--text-muted": "#6e6a86",
		"--text-error": "#eb6f92",
		"--accent": "#c4a7e7",
		"--error-decoration": "#eb6f92",
	},
};

export function applyTheme(name: string) {
	const theme = themes[name];
	if (!theme) return;
	for (const [key, value] of Object.entries(theme)) {
		document.documentElement.style.setProperty(key, value);
	}
	localStorage.setItem(THEME_NAME_KEY, name);
	localStorage.setItem(THEME_VARS_KEY, JSON.stringify(theme));
}

export function getStoredTheme(): string {
	if (typeof window === "undefined") {
		return "dracula";
	}

	const stored = localStorage.getItem(THEME_NAME_KEY);
	if (stored && stored in themes) {
		return stored;
	}

	const legacy = localStorage.getItem(LEGACY_THEME_NAME_KEY);
	if (legacy && legacy in themes) {
		return legacy;
	}

	return "dracula";
}
