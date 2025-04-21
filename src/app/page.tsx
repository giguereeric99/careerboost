import React from 'react'
import HeroSection from "@/components/home/heroSection";
import PricingSection from "@/components/home/pricingSection";
import { Button } from "@/components/ui/button";
import FeaturesSection from "@/components/home/featuresSection";
import ResumeOptimizer from "@/components/dashboard/resumeOptimizer";
import JobsSection from "@/components/home/jobsSection";
import InterviewSection from "@/components/home/interviewSection";

export default function Home() {

  return (
    <div className="relative w-full">
      
      <div className="flex flex-col">
        <HeroSection />
        <FeaturesSection />
        <ResumeOptimizer />
        <JobsSection />
        <InterviewSection />
        <PricingSection />
      </div>
    </div>
  );
}
