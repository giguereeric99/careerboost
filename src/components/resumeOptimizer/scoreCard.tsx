/**
 * Enhanced ScoreCard Component
 * 
 * This component displays the resume's ATS optimization score with an interactive
 * circular progress indicator, real-time feedback, and detailed performance metrics.
 * Features:
 * - Animated circular progress indicator with color coding
 * - Contextual feedback based on score ranges
 * - Progress animation when score changes
 * - Detailed breakdown of score components
 * - Potential score improvement indicator
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles, Info, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import the scoring logic if available
import { ScoreBreakdown } from '@/services/resumeScoreLogic';

// Props interface with detailed documentation
interface ScoreCardProps {
  optimizationScore: number;       // Current ATS score (0-100)
  resumeContent?: string;          // Resume content for analysis
  suggestionsApplied?: number;     // Number of suggestions applied
  keywordsApplied?: number;        // Number of keywords applied
  scoreBreakdown?: ScoreBreakdown | null; // Detailed score breakdown
  potentialScore?: number | null;  // Maximum possible score with all recommendations
  initialScore?: number | null;    // Starting score before any optimizations
  showDetails?: boolean;           // Whether to show detailed metrics (default: true)
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
  potentialScore = null,
  initialScore = null,
  showDetails = true
}) => {
  // State for animated score display
  const [displayScore, setDisplayScore] = useState(optimizationScore);
  const [previousScore, setPreviousScore] = useState(optimizationScore);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  
  // Animation configuration
  const ANIMATION_DURATION = 1000; // 1 second
  const ANIMATION_FPS = 30; // frames per second

  /**
   * Get appropriate color based on score range
   * Higher scores get more positive colors
   */
  const getScoreColor = useCallback((score: number): string => {
    if (score >= 85) return "#10b981"; // Green for excellent scores
    if (score >= 70) return "#3b82f6"; // Blue for good scores
    if (score >= 50) return "#f59e0b"; // Amber for average scores
    return "#ef4444"; // Red for poor scores
  }, []);

  /**
   * Animate score changes for visual feedback
   * Uses smooth transition with calculated steps
   */
  useEffect(() => {
    // Only animate when score actually changes
    if (optimizationScore !== previousScore) {
      // Determine if score is increasing or decreasing
      setIsIncreasing(optimizationScore > previousScore);
      setPreviousScore(optimizationScore);
      
      // Calculate animation parameters
      const steps = ANIMATION_DURATION / 1000 * ANIMATION_FPS;
      const increment = (optimizationScore - displayScore) / steps;
      
      // Perform animation using interval
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
      }, 1000 / ANIMATION_FPS);
      
      // Clean up interval on component unmount or when optimizationScore changes
      return () => clearInterval(intervalId);
    }
  }, [optimizationScore, previousScore, displayScore, ANIMATION_FPS]);

  /**
   * Set appropriate feedback message based on score range
   */
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

  /**
   * Calculate the stroke-dasharray value for SVG progress circle
   * Maps score (0-100) to circle circumference
   */
  const getCircleProgress = useCallback((score: number): string => {
    // Circumference of a circle with radius 45 is 2 * π * 45 ≈ 282.7
    const circumference = 282.7;
    const progressValue = score * circumference / 100;
    return `${progressValue} ${circumference - progressValue}`;
  }, []);

  // Calculate metrics for display
  const scoreColor = getScoreColor(displayScore);
  const improvement = initialScore ? optimizationScore - initialScore : 0;
  const remainingPotential = potentialScore && potentialScore > optimizationScore 
    ? potentialScore - optimizationScore 
    : 0;

  return (
    <Card className="bg-gray-50 border">
      <CardHeader className="pb-2">
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
        {/* Score Display Circle */}
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
              {/* Progress circle with animation */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={scoreColor}
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
        {showDetails && (suggestionsApplied > 0 || keywordsApplied > 0) && (
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
                <span className="font-medium flex items-center">
                  +{remainingPotential.toFixed(1)} points
                  <TrendingUp className="h-3 w-3 ml-1" />
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Score breakdown (if available and details should be shown) */}
        {showDetails && scoreBreakdown && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <h4 className="text-xs font-medium mb-1">Score Breakdown:</h4>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(scoreBreakdown.sectionScores || {}).map(([sectionId, score]) => {
                // Only show sections with non-zero scores
                if (score <= 0) return null;
                
                // Format section name from ID
                const sectionName = sectionId
                  .replace('resume-', '')
                  .replace(/-/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());
                
                return (
                  <div key={sectionId} className="flex justify-between text-xs">
                    <span>{sectionName}:</span>
                    <span className="font-medium">{score.toFixed(0)}/100</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreCard;