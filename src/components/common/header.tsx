"use client";

import React from "react";
import Link from "next/link";
import { BriefcaseBusiness, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "../ui/button";
import NavLink from "./navLink";
import {
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton,
	useUser,
} from "@clerk/nextjs";
import NavBar from "./navBar";
import AuthSection from "./authSection";

const Header = () => {
	const [isScrolled, setIsScrolled] = React.useState(false);
	const { isSignedIn, isLoaded } = useUser(); // ✅ Added isLoaded

	React.useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 10);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<header
			className={`sticky top-0 w-full z-40 transition-all duration-200 ${
				isScrolled ? "bg-white/80 backdrop-blur-md shadow-sm" : "bg-transparent"
			}`}
		>
			<div className="flex h-16 items-center justify-between px-4 sm:px-4 lg:px-12">
				{/* Logo section */}
				<div className="flex items-center gap-2">
					<Link href="/" className="flex items-center gap-1 lg:gap-2">
						<BriefcaseBusiness className="h-6 w-6 text-brand-600" />
						<span className="font-bold text-xl">CareerBoost</span>
					</Link>
				</div>

				{/* Navigation */}
				<NavBar />

				{/* Authentication section - Desktop */}
				<div className="hidden md:flex items-center gap-4">
					<AuthSection />
				</div>

				{/* Mobile menu */}
				<Sheet>
					<SheetTrigger asChild className="md:hidden">
						<Button variant="ghost" size="icon">
							<Menu className="h-5 w-5" />
							<span className="sr-only">Toggle menu</span>
						</Button>
					</SheetTrigger>
					<SheetContent side="right">
						<div className="flex flex-col gap-6 mt-6">
							{/* Navigation links */}
							<a
								href="#features"
								className="text-base font-medium hover:text-brand-600 transition-colors"
							>
								Features
							</a>
							<a
								href="#pricing"
								className="text-base font-medium hover:text-brand-600 transition-colors"
							>
								Pricing
							</a>
							<a
								href="#resume"
								className="text-base font-medium hover:text-brand-600 transition-colors"
							>
								Resume Builder
							</a>

							{/* Mobile authentication */}
							<div className="flex flex-col gap-2 mt-4">
								{!isLoaded ? (
									// ✅ Loading state for mobile
									<>
										<div className="w-full h-9 bg-gray-200 animate-pulse rounded" />
										<div className="w-full h-9 bg-gray-200 animate-pulse rounded" />
									</>
								) : isSignedIn ? (
									// ✅ Authenticated user mobile
									<>
										<NavLink href="/dashboard">
											<Button variant="outline" className="w-full">
												Dashboard
											</Button>
										</NavLink>
										<div className="flex justify-center mt-2">
											<UserButton afterSignOutUrl="/" />
										</div>
									</>
								) : (
									// ✅ Non-authenticated user mobile
									<>
										<SignInButton mode="modal">
											<Button variant="outline" className="w-full">
												Log In
											</Button>
										</SignInButton>
										<SignUpButton mode="modal">
											<Button className="w-full">Sign Up</Button>
										</SignUpButton>
									</>
								)}
							</div>
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</header>
	);
};

export default Header;
