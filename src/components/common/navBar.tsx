import React from 'react'
import NavLink from './navLink'

const NavBar = () => {
  return (
    <nav className="hidden md:flex items-center gap-6">
      <NavLink href="#features" className="text-sm font-medium hover:text-brand-600 transition-colors">
        Features
      </NavLink>
      <NavLink href="#pricing" className="text-sm font-medium hover:text-brand-600 transition-colors">
        Pricing
      </NavLink>
      <NavLink href="#resume" className="text-sm font-medium hover:text-brand-600 transition-colors">
        Resume Builder
      </NavLink>
    </nav>
  )
}

export default NavBar