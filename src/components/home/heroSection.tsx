import React from 'react'
import { Button } from '../ui/button'
import { ArrowRight, CheckCircle, FileText, Check, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge"
import Link from 'next/link'


const HeroSection = () => {
  return (
    <section className="py-20 md:py-32">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Boost Your Career with <br></br><span className="gradient-text">AI-Powered Tools</span>
              </h1>
              <p className="max-w-[600px] text-gray-500 md:text-xl dark:text-gray-400">
                Optimize your resume, find your dream job, and practice for interviews - all with our advanced AI assistant.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-brand-600" />
                <p className="text-sm md:text-base">AI-optimized resume with keywords and suggestions</p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-brand-600" />
                <p className="text-sm md:text-base">Real-time job search with advanced filters <span className="pro-badge">PRO</span></p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-brand-600" />
                <p className="text-sm md:text-base">AI interview simulator with feedback <span className="pro-badge">PRO</span></p>
              </div>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Button size="lg" className="gap-1.5 group">
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button size="lg" variant="outline">
                View Demo
              </Button>
            </div>
          </div>
          
          {/* Redesigned right section */}
          <div className="relative w-full">
            {/* Background decorative elements */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-purple-100 to-transparent rounded-full -z-10 blur-3xl opacity-70"></div>
            <div className="absolute left-20 bottom-20 w-48 h-48 bg-gradient-to-tr from-teal-100 to-transparent rounded-full -z-10 blur-3xl opacity-60"></div>
            
            {/* Main resume UI mockup */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Resume document */}
              <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden transform rotate-1 transition-all hover:rotate-0 duration-300">
                {/* Document header */}
                <div className="bg-gradient-to-r from-brand-500 to-teal-500 h-8 flex items-center px-4">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                    <div className="h-3 w-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-white text-xs font-medium ml-auto">resume.pdf</div>
                </div>
                
                {/* Resume content */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-gray-500" />
                    </div>
                    <div>
                      <div className="h-5 w-32 bg-gray-900 rounded"></div>
                      <div className="h-3 w-24 bg-gray-400 mt-1 rounded"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-3.5 w-24 bg-brand-600 rounded"></div>
                    <div className="h-2.5 w-full bg-gray-200 rounded"></div>
                    <div className="h-2.5 w-full bg-gray-200 rounded"></div>
                    <div className="h-2.5 w-3/4 bg-gray-200 rounded"></div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-3.5 w-32 bg-brand-600 rounded"></div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2.5 w-24 bg-gray-700 rounded"></div>
                      <div className="h-2 w-16 bg-gray-400 rounded"></div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2.5 w-28 bg-gray-700 rounded"></div>
                      <div className="h-2 w-20 bg-gray-400 rounded"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="h-3.5 w-20 bg-brand-600 rounded"></div>
                    <div className="h-2.5 w-full bg-gray-200 rounded"></div>
                    <div className="h-2.5 w-full bg-gray-200 rounded"></div>
                    <div className="h-2.5 w-2/3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
              
              {/* AI Enhancement Tags */}
              <div className="absolute -right-4 top-1/4 bg-white rounded-lg shadow-lg border border-brand-100 p-3 max-w-[180px] animate-fade-in z-10">
                <div className="flex items-center gap-2 text-brand-600 font-semibold text-sm">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> 
                  <span>Skills Match</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">Your resume matches 87% of requirements</div>
              </div>
              
              <div className="absolute -left-4 bottom-1/3 bg-white rounded-lg shadow-lg border border-teal-100 p-3 max-w-[220px] animate-fade-in z-10" style={{animationDelay: '300ms'}}>
                <div className="flex items-center gap-2 text-teal-600 font-semibold text-sm">
                  <Check className="h-4 w-4 bg-teal-500 text-white rounded-full p-0.5" />
                  <span>AI Enhancement</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">Added "data analysis" skills to match job requirements</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection