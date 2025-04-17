'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

const NavLink = ({
  href,
  children,
  className = "",
  activeClassName = "text-blue-600",
  ...props
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
  [key: string]: any;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link href={href} className={cn("transition-color text-sm duration-200 hover:text-blue-600", className, isActive && activeClassName)}>{children}</Link>
  )
}

export default NavLink