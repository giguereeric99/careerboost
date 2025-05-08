/**
 * Enhanced ScoreCard Component
 * 
 * This component displays the resume's ATS optimization score with an interactive
 * circular progress indicator, real-time feedback, and detailed performance metrics.
 * Features:
 * - Animated circular progress indicator with color coding
 * - Contextual feedback based on score ranges
 * - Improved progress animation for real-time score updates
 * - Detailed breakdown of score components
 * - Potential score improvement indicator
 * - Enhanced score transition animations
 * - Loading animation while score is being calculated
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  isCalculating?: boolean;         // Whether the score is currently being calculated
}

/**
 * ScoreCard component displays a circular visual representation of the resume score
 * along with contextual feedback and improvement metrics.
 * Enhanced to handle score updates smoothly with animations and show calculation state.
 */
const ScoreCard: React.FC<ScoreCardProps> = ({
  optimizationScore,
  resumeContent,
  suggestionsApplied = 0,
  keywordsApplied = 0,
  scoreBreakdown = null,
  potentialScore = null,
  initialScore = null,
  showDetails = true,
  isCalculating = false
}) => {
  // =========================================================================
  // State Management
  // =========================================================================
  
  // State for animated score display - enhanced for smoother transitions
  const [displayScore, setDisplayScore] = useState(optimizationScore || 65);
  const [previousScore, setPreviousScore] = useState(optimizationScore || 65);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  
  // =========================================================================
  // Animation References
  // =========================================================================
  
  // Ref to track animation in progress
  const animationInProgressRef = useRef(false);
  // Ref to store animation frame ID for cancellation
  const animationFrameRef = useRef<number | null>(null);
  // Animation start time tracking for smoother transitions
  const startTimeRef = useRef<number>(0);
  
  // =========================================================================
  // Animation Configuration
  // =========================================================================
  
  // Animation duration in milliseconds - faster for better user experience
  const ANIMATION_DURATION = 800; // 0.8 seconds
  // Target frames per second - higher for smoother animation
  const ANIMATION_FPS = 60;

  // =========================================================================
  // Utility Functions
  // =========================================================================
  
  /**
   * Get appropriate color based on score range
   * Maps score values to color codes with semantic meaning
   * Higher scores get more positive colors (green/blue)
   * Lower scores get warning colors (amber/red)
   * 
   * @param score - The score to get a color for (0-100)
   * @returns Color hex code for the score
   */
  const getScoreColor = useCallback((score: number): string => {
    if (score >= 85) return "#10b981"; // Green for excellent scores (85-100)
    if (score >= 70) return "#3b82f6"; // Blue for good scores (70-84)
    if (score >= 50) return "#f59e0b"; // Amber for average scores (50-69)
    return "#ef4444"; // Red for poor scores (0-49)
  }, []);

  /**
   * Calculate the stroke-dasharray value for SVG progress circle
   * Maps score (0-100) to circle circumference for accurate visual representation
   * 
   * @param score - Score value (0-100)
   * @returns SVG stroke-dasharray value as string
   */
  const getCircleProgress = useCallback((score: number): string => {
    // Circumference of a circle with radius 45 is 2 * π * 45 ≈ 282.7
    const circumference = 282.7;
    // Calculate filled portion based on score percentage
    const progressValue = score * circumference / 100;
    // Return filled and unfilled portions as required by SVG
    return `${progressValue} ${circumference - progressValue}`;
  }, []);

  // =========================================================================
  // Animation Functions
  // =========================================================================
  
  /**
   * Animate score changes using requestAnimationFrame for smoother transitions
   * This implementation provides better performance than setInterval by
   * synchronizing with the browser's refresh rate
   * 
   * @param targetScore - The final score to animate to
   * @param startScore - The starting score to animate from
   * @returns Cleanup function to cancel animation if component unmounts
   */
  const animateScoreChange = useCallback((targetScore: number, startScore: number) => {
    // Cancel any ongoing animation to prevent conflicts
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    // Set animation in progress flag to track state
    animationInProgressRef.current = true;
    
    // Record start time for animation timing
    startTimeRef.current = performance.now();
    
    /**
     * Animation frame function - called on each frame
     * Calculates intermediate values for smooth animation
     * 
     * @param timestamp - Current timestamp from requestAnimationFrame
     */
    const animate = (timestamp: number) => {
      // Calculate progress ratio (0 to 1) based on elapsed time
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      
      // Apply easing function for smoother animation (ease-out)
      // This makes the animation start fast and slow down at the end
      const easedProgress = 1 - Math.pow(1 - progress, 2);
      
      // Calculate current intermediate score value
      const currentValue = startScore + (targetScore - startScore) * easedProgress;
      
      // Update display score state with current value
      setDisplayScore(currentValue);
      
      // Continue animation if not complete (progress < 1)
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - ensure final value is exactly the target value
        setDisplayScore(targetScore);
        // Reset animation state
        animationInProgressRef.current = false;
        animationFrameRef.current = null;
      }
    };
    
    // Start animation by requesting first frame
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // Return cleanup function to cancel animation if component unmounts
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationInProgressRef.current = false;
        animationFrameRef.current = null;
      }
    };
  }, []);

  // =========================================================================
  // Effects
  // =========================================================================
  
  /**
   * Handle score changes and animate transitions
   * Triggers animation when the optimizationScore prop changes
   * Improved to detect and properly animate even small score changes
   */
  useEffect(() => {
    // Skip animation if score is being calculated
    if (isCalculating) {
      return;
    }
    
    // Ensure we have a valid score value
    const currentScore = optimizationScore || 65;
    
    // Log incoming score changes for debugging
    console.log(`ScoreCard: Score update received: ${currentScore} (previous: ${previousScore})`);
    
    // Skip if no change or invalid values to prevent unnecessary animations
    if (currentScore === previousScore || isNaN(currentScore)) {
      return;
    }
    
    // Determine if score is increasing or decreasing for UI feedback
    setIsIncreasing(currentScore > previousScore);
    
    // Store the previous score for future comparison
    setPreviousScore(currentScore);
    
    // Start animation from current display score to new target score
    animateScoreChange(currentScore, displayScore);
    
  }, [optimizationScore, previousScore, displayScore, animateScoreChange, isCalculating]);

  /**
   * Set appropriate feedback message based on score range
   * Updates when display score changes to provide contextual guidance
   */
  useEffect(() => {
    // Skip if score is being calculated
    if (isCalculating) {
      return;
    }
    
    // Round the display score for message selection
    const roundedScore = Math.round(displayScore);
    
    // Select appropriate feedback message based on score range
    if (roundedScore >= 90) {
      setFeedbackMessage("Excellent! Your resume is highly optimized for ATS systems.");
    } else if (roundedScore >= 80) {
      setFeedbackMessage("Great job! Your resume is well optimized for ATS systems.");
    } else if (roundedScore >= 70) {
      setFeedbackMessage("Good progress. Apply more suggestions to improve further.");
    } else if (roundedScore >= 60) {
      setFeedbackMessage("Your resume needs additional optimization to stand out.");
    } else {
      setFeedbackMessage("Your resume needs significant optimization to pass ATS filters.");
    }
  }, [displayScore, isCalculating]);

  /**
   * Clean up animations on component unmount
   * Prevents memory leaks by canceling any ongoing animations
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationInProgressRef.current = false;
      }
    };
  }, []);

  // =========================================================================
  // Calculated Values
  // =========================================================================
  
  // Get color based on current score
  const scoreColor = getScoreColor(displayScore);
  
  // Round display score for integer presentation
  const displayScoreRounded = Math.round(displayScore);
  
  // Calculate improvement metrics for display
  const improvement = initialScore ? Math.round((optimizationScore - initialScore) * 10) / 10 : 0;
  
  // Calculate potential remaining improvement
  const remainingPotential = potentialScore && potentialScore > optimizationScore 
    ? Math.round((potentialScore - optimizationScore) * 10) / 10 
    : 0;

  // =========================================================================
  // Component Rendering
  // =========================================================================
  
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
            {isCalculating ? (
              // Calculation in progress - show loading animation
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full mb-2"></div>
                <span className="text-sm text-gray-600">Calculating score...</span>
              </div>
            ) : (
              // Score display - show when calculation is complete
              <>
                {/* Score indicator with numeric display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold">{displayScoreRounded}%</span>
                  {/* Show improvement indicator when score is increasing */}
                  {isIncreasing && (
                    <span className="absolute -top-1 -right-1 text-xs text-green-500 font-medium animate-pulse">
                      +{(optimizationScore - previousScore).toFixed(1)}
                    </span>
                  )}
                </div>
                
                {/* SVG Circle Progress Indicator */}
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  {/* Background circle (light gray) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e6e6e6"
                    strokeWidth="10"
                  />
                  {/* Progress circle with dynamic color based on score */}
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="10"
                    strokeDasharray={getCircleProgress(displayScore)}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)" // Rotate to start from top
                    className="transition-all duration-300 ease-in-out"
                  />
                </svg>
              </>
            )}
          </div>
        </div>
        
        {/* Feedback message - contextual guidance based on score */}
        <p className="text-center text-sm mt-2">
          {isCalculating 
            ? "We're analyzing your resume to calculate the optimal ATS score..." 
            : feedbackMessage
          }
        </p>
        
        {/* Applied changes and improvement metrics - only show when not calculating */}
        {!isCalculating && showDetails && (suggestionsApplied > 0 || keywordsApplied > 0) && (
          <div className="mt-3 text-xs text-gray-600 border-t pt-2">
            <div className="flex justify-between">
              <span>Suggestions applied:</span>
              <span className="font-medium">{suggestionsApplied}</span>
            </div>
            <div className="flex justify-between">
              <span>Keywords applied:</span>
              <span className="font-medium">{keywordsApplied}</span>
            </div>
            
            {/* Show score improvement if positive */}
            {improvement > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Score improvement:</span>
                <span className="font-medium">+{improvement.toFixed(1)} points</span>
              </div>
            )}
            
            {/* Show potential improvement if available */}
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
        
        {/* Score breakdown by section - only show when not calculating */}
        {!isCalculating && showDetails && scoreBreakdown && (
          <div className="mt-3 pt-2 border-t border-gray-200">
            <h4 className="text-xs font-medium mb-1">Score Breakdown:</h4>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(scoreBreakdown.sectionScores || {}).map(([sectionId, score]) => {
                // Only show sections with non-zero scores
                if (score <= 0) return null;
                
                // Format section name from ID for better readability
                // Converts "resume-experience" to "Experience"
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