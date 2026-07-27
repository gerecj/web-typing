import { Link } from "@tanstack/react-router";
import { controlStyles, segmentedItemClass } from "../lib/controlStyles";

interface ModeSwitcherProps {
	active: "solo" | "race";
}

export function ModeSwitcher({ active }: ModeSwitcherProps) {
	return (
		<nav aria-label="Play mode" className={controlStyles.group}>
			<Link to="/" className={segmentedItemClass(active === "solo")}>
				solo
			</Link>
			<Link to="/race" className={segmentedItemClass(active === "race")}>
				race
			</Link>
		</nav>
	);
}
