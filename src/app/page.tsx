import React from 'react'
import HeroSection from "@/components/Home/heroSection";
import PricingSection from "@/components/Home/pricingSection";
import { Button } from "@/components/ui/button";
import FeaturesSection from "@/components/Home/featuresSection";
import ResumeOptimizer from "@/components/dashboard/resumeOptimizer";
import JobsSection from "@/components/Home/jobsSection";
import InterviewSection from "@/components/Home/interviewSection";

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
