import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	server: {
		proxy: {
			"/api": {
				target: "http://127.0.0.1:8787",
				ws: true,
			},
		},
	},
	plugins: [
		// Console piping can echo server errors back and forth and freeze the tab.
		devtools({ consolePiping: { enabled: false } }),
		tailwindcss(),
		tanstackStart({
			spa: {
				enabled: true,
				prerender: {
					outputPath: "/index.html",
				},
			},
		}),
		viteReact(),
	],
});

export default config;
