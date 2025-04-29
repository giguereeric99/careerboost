import React from 'react'
import HeroSection from "@/components/Home/HeroSection";
import PricingSection from "@/components/Home/PricingSection";
import { Button } from "@/components/ui/Button";
import FeaturesSection from "@/components/Home/FeaturesSection";
import ResumeOptimizer from "@/components/dashboard/ResumeOptimizer";
import JobsSection from "@/components/Home/JobsSection";
import InterviewSection from "@/components/Home/InterviewSection";

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
