import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import { themes } from "../themes";

// Apply stored theme before paint to prevent flash
const THEME_INIT_SCRIPT = `
	(function(){
		try {
			var nameKey='typing-theme';
			var varsKey='theme-vars';
			var all=${JSON.stringify(themes)};
			var r=document.documentElement;
			var storedName=localStorage.getItem(nameKey);
			var varsRaw=localStorage.getItem(varsKey);
			var vars=varsRaw ? JSON.parse(varsRaw) : null;
			if(!vars && storedName && all[storedName]) {
				vars=all[storedName];
			}
			if(vars) {
				for(var k in vars) r.style.setProperty(k, vars[k]);
				localStorage.setItem(varsKey, JSON.stringify(vars));
			}
		}catch(e){}
	})();
`;

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, interactive-widget=resizes-content",
			},
			{
				name: "theme-color",
				content: "#282a36",
			},
			{
				name: "color-scheme",
				content: "dark",
			},
			{
				title: "Web Typing",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "icon",
				type: "image/x-icon",
				href: "/favicon.ico",
			},
			{
				rel: "apple-touch-icon",
				href: "/logo192.png",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/** biome-ignore lint/security/noDangerouslySetInnerHtml: <Default script> */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body className="wrap-anywhere antialiased">
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
