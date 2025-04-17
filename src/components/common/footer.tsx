import React from 'react';
import { Button } from "@/components/ui/button";
import { X, Github, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-gray-50 relative z-10">
      <div className="container px-4 md:px-6 py-12 mx-auto">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl">CareerBoost</span>
            </div>
            <p className="text-sm text-gray-500">
              AI-powered tools to supercharge your job search and boost your career.
            </p>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium">Product</h3>
            <ul className="space-y-1 text-sm text-gray-500">
              <li>
                <a href="#resume" className="hover:text-brand-600">Resume Optimizer</a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-600">Job Search</a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-600">Interview Simulator</a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-600">Templates</a>
              </li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium">Company</h3>
            <ul className="space-y-1 text-sm text-gray-500">
              <li>
                <a href="#" className="hover:text-brand-600">About Us</a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-600">Careers</a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-600">Blog</a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-brand-600">Pricing</a>
              </li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium">Legal</h3>
            <ul className="space-y-1 text-sm text-gray-500">
              <li>
                <a href="#" className="hover:text-brand-600">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-600">Terms of Service</a>
              </li>
              <li>
                <a href="#" className="hover:text-brand-600">Cookie Policy</a>
              </li>
            </ul>
            <div className="flex gap-3 mt-6">
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
                <span className="sr-only">X (Twitter)</span>
              </Button>
              <Button variant="ghost" size="icon">
                <Linkedin className="h-4 w-4" />
                <span className="sr-only">LinkedIn</span>
              </Button>
              {/* <Button variant="ghost" size="icon">
                <Github className="h-4 w-4" />
                <span className="sr-only">GitHub</span>
              </Button> */}
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-gray-500">
          <p>© 2025 CareerBoost. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer