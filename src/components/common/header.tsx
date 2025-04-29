'use client'

import React from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, Menu, X } from "lucide-react";
import { 
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from '../ui/button'
import NavLink from './NavLink'
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser
} from '@clerk/nextjs'
import NavBar from './NavBar';

const Header = () => {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { isSignedIn } = useUser();
  
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 w-full z-40 transition-all duration-200 ${
      isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm' : 'bg-transparent'
    }`}>
      <div className="flex h-16 items-center justify-between px-4 sm:px-4 lg:px-12">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1 lg:gap-2">
            <BriefcaseBusiness className="h-6 w-6 text-brand-600" />
            <span className="font-bold text-xl">CareerBoost</span>
          </Link>
        </div>
        
        <NavBar />
        
        <div className="hidden md:flex items-center gap-4">
          {isSignedIn ? (
            <>
              <NavLink href="/dashboard" className="text-base font-medium hover:text-brand-600 transition-colors">
                Dashboard
              </NavLink>
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
          )}
        </div>
        
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="flex flex-col gap-6 mt-6">
              <a href="#features" className="text-base font-medium hover:text-brand-600 transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-base font-medium hover:text-brand-600 transition-colors">
                Pricing
              </a>
              <a href="#resume" className="text-base font-medium hover:text-brand-600 transition-colors">
                Resume Builder
              </a>
              <div className="flex flex-col gap-2 mt-4">
                <Button variant="outline" className="w-full">Log In</Button>
                <Button className="w-full">Sign Up</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}

export default Header