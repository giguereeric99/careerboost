/**
 * Enhanced ScoreCard Component
 * 
 * This component displays the resume's ATS optimization score with an interactive
 * circular progress indicator, real-time feedback, and detailed performance metrics.
 * It maintains the same UI appearance as the original but adds enhanced score calculation.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import the scoring logic
import { ScoreBreakdown } from '@/services/resumeScoreLogic';

interface ScoreCardProps {
  optimizationScore: number;
  resumeContent?: string;
  suggestionsApplied?: number;
  keywordsApplied?: number;
  scoreBreakdown?: ScoreBreakdown | null;
  potentialScore?: number;
  initialScore?: number;
}

/**
 * ScoreCard component displays a circular visual representation of the resume score
 * along with contextual feedback and improvement metrics
 */
const ScoreCard: React.FC<ScoreCardProps> = ({
  optimizationScore,
  resumeContent,
  suggestionsApplied = 0,
  keywordsApplied = 0,
  scoreBreakdown = null,
  potentialScore,
  initialScore
}) => {
  // Track score changes for animations
  const [displayScore, setDisplayScore] = useState(optimizationScore);
  const [previousScore, setPreviousScore] = useState(optimizationScore);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Color mapping based on score ranges
  const getScoreColor = (score: number): string => {
    if (score >= 85) return "#10b981"; // Green for excellent scores
    if (score >= 70) return "#3b82f6"; // Blue for good scores
    if (score >= 50) return "#f59e0b"; // Amber for average scores
    return "#ef4444"; // Red for poor scores
  };

  // Generate contextual feedback based on score
  useEffect(() => {
    // Only animate when score actually changes
    if (optimizationScore !== previousScore) {
      // Determine if score is increasing or decreasing
      setIsIncreasing(optimizationScore > previousScore);
      setPreviousScore(optimizationScore);
      
      // Animate score change
      const animationDuration = 1000; // 1 second
      const fps = 30; // frames per second
      const steps = animationDuration / 1000 * fps;
      const increment = (optimizationScore - displayScore) / steps;
      
      let currentStep = 0;
      const intervalId = setInterval(() => {
        if (currentStep < steps) {
          setDisplayScore(prev => {
            // Get closer to target score
            const newScore = prev + increment;
            // Ensure we don't overshoot
            return increment > 0 
              ? Math.min(optimizationScore, newScore) 
              : Math.max(optimizationScore, newScore);
          });
          currentStep++;
        } else {
          // Ensure we end exactly at the target score
          setDisplayScore(optimizationScore);
          clearInterval(intervalId);
        }
      }, 1000 / fps);
      
      return () => clearInterval(intervalId);
    }
  }, [optimizationScore, previousScore, displayScore]);

  // Set feedback message based on score
  useEffect(() => {
    if (optimizationScore >= 90) {
      setFeedbackMessage("Excellent! Your resume is highly optimized for ATS systems.");
    } else if (optimizationScore >= 80) {
      setFeedbackMessage("Great job! Your resume is well optimized for ATS systems.");
    } else if (optimizationScore >= 70) {
      setFeedbackMessage("Good progress. Apply more suggestions to improve further.");
    } else if (optimizationScore >= 60) {
      setFeedbackMessage("Your resume needs additional optimization to stand out.");
    } else {
      setFeedbackMessage("Your resume needs significant optimization to pass ATS filters.");
    }
  }, [optimizationScore]);

  // Calculate the stroke-dasharray value for the progress circle
  const getCircleProgress = (score: number): string => {
    // Circumference of a circle with radius 45 is 2 * π * 45 ≈ 282.7
    const circumference = 282.7;
    const progressValue = score * circumference / 100;
    return `${progressValue} ${circumference - progressValue}`;
  };

  // Calculate improvement metrics
  const improvement = initialScore ? optimizationScore - initialScore : 0;
  const remainingPotential = potentialScore ? potentialScore - optimizationScore : 0;

  return (
    <Card className="bg-gray-50 border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          Resume Score
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>This score represents how well your resume will perform with Applicant Tracking Systems (ATS). A higher score means better chances of getting through automated filters.</p>
                {scoreBreakdown && (
                  <ul className="mt-2 text-xs">
                    <li>Base Score: {scoreBreakdown.base}</li>
                    <li>From Suggestions: +{scoreBreakdown.suggestions}</li>
                    <li>From Keywords: +{scoreBreakdown.keywords}</li>
                  </ul>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <div className="relative w-32 h-32">
            {/* Score indicator */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold">{Math.round(displayScore)}%</span>
              {isIncreasing && (
                <span className="absolute -top-1 -right-1 text-xs text-green-500 font-medium">
                  +{(optimizationScore - previousScore).toFixed(1)}
                </span>
              )}
            </div>
            
            {/* Score progress circle */}
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e6e6e6"
                strokeWidth="10"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={getScoreColor(displayScore)}
                strokeWidth="10"
                strokeDasharray={getCircleProgress(displayScore)}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-300 ease-in-out"
              />
            </svg>
          </div>
        </div>
        
        {/* Feedback message */}
        <p className="text-center text-sm mt-2">
          {feedbackMessage}
        </p>
        
        {/* Applied changes and improvement metrics */}
        {(suggestionsApplied > 0 || keywordsApplied > 0) && (
          <div className="mt-3 text-xs text-gray-600 border-t pt-2">
            <div className="flex justify-between">
              <span>Suggestions applied:</span>
              <span className="font-medium">{suggestionsApplied}</span>
            </div>
            <div className="flex justify-between">
              <span>Keywords applied:</span>
              <span className="font-medium">{keywordsApplied}</span>
            </div>
            
            {improvement > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Score improvement:</span>
                <span className="font-medium">+{improvement.toFixed(1)} points</span>
              </div>
            )}
            
            {remainingPotential > 0 && (
              <div className="flex justify-between text-blue-500">
                <span>Potential improvement:</span>
                <span className="font-medium">+{remainingPotential.toFixed(1)} points</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreCard;