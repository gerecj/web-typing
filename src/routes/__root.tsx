import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import appCss from "../styles.css?url";
import { themes } from "../themes";

interface MyRouterContext {
	queryClient: QueryClient;
}

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

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
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

function RootDocument({ children }: { children: React.ReactNode }) {
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
						TanStackQueryDevtools,
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
