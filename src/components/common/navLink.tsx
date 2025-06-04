"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

const NavLink = ({
	href,
	children,
	className = "",
	activeClassName = "text-brand-600",
	...props
}: {
	href: string;
	children: React.ReactNode;
	className?: string;
	activeClassName?: string;
	[key: string]: any;
}) => {
	const pathname = usePathname();
	const [isClient, setIsClient] = React.useState(false);

	// ✅ Ensure we're on client side before checking active state
	React.useEffect(() => {
		setIsClient(true);
	}, []);

	// ✅ Only calculate isActive on client side to avoid hydration mismatch
	const isActive =
		isClient && pathname
			? pathname === href || pathname.startsWith(href + "/")
			: false;

	return (
		<Link
			href={href}
			className={cn(
				"transition-colors text-sm duration-200 hover:text-brand-600",
				className,
				isActive && activeClassName
			)}
			{...props}
		>
			{children}
		</Link>
	);
};

export default NavLink;
