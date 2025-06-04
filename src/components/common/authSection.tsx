// components/AuthSection.tsx
"use client";

import { useEffect, useState } from "react";
import NavLink from "./navLink";
import { Button } from "../ui/button";
import {
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton,
	useUser,
} from "@clerk/nextjs";

const AuthSection = () => {
	const { isLoaded, isSignedIn } = useUser();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || !isLoaded) {
		return (
			<div className="flex items-center gap-4">
				<div className="w-20 h-9 bg-gray-200 animate-pulse rounded" />
				<div className="w-16 h-9 bg-gray-200 animate-pulse rounded" />
			</div>
		);
	}

	return isSignedIn ? (
		<>
			<NavLink href="/dashboard">Dashboard</NavLink>
			<UserButton afterSignOutUrl="/" />
		</>
	) : (
		<>
			<SignInButton mode="modal">
				<Button variant="outline">Log In</Button>
			</SignInButton>
			<SignUpButton mode="modal">
				<Button>Sign Up</Button>
			</SignUpButton>
		</>
	);
};

export default AuthSection;
