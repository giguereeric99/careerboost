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
 * - Score consistency protection to ensure accurate display
 * - Fixed score base implementation to accurately display score improvements
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles, Info, TrendingUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import the scoring logic if available
import { ScoreBreakdown } from "@/services/resumeScoreLogic";

// Props interface with detailed documentation
interface ScoreCardProps {
  optimizationScore: number; // Current ATS score (0-100)
  resumeContent?: string; // Resume content for analysis
  suggestionsApplied?: number; // Number of suggestions applied
  keywordsApplied?: number; // Number of keywords applied
  scoreBreakdown?: ScoreBreakdown | null; // Detailed score breakdown
  potentialScore?: number | null; // Maximum possible score with all recommendations
  initialScore?: number | null; // Starting score before any optimizations
  showDetails?: boolean; // Whether to show detailed metrics (default: true)
  isCalculating?: boolean; // Whether the score is currently being calculated
}

/**
 * ScoreCard component displays a circular visual representation of the resume score
 * along with contextual feedback and improvement metrics.
 * Enhanced to handle score updates smoothly with animations and show calculation state.
 * Added score consistency protection to ensure accuracy of displayed score.
 * Fixed base score calculation to ensure proper improvement display.
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
  isCalculating = false,
}) => {
  // =========================================================================
  // State Management
  // =========================================================================

  // State for animated score display - enhanced for smoother transitions
  // Using the actual optimization score or initial score as starting point
  const [displayScore, setDisplayScore] = useState(
    optimizationScore || initialScore || 65
  );
  const [previousScore, setPreviousScore] = useState(
    optimizationScore || initialScore || 65
  );
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
  // Track the highest score we've seen for reference
  const highestScoreRef = useRef<number>(
    optimizationScore || initialScore || 65
  );
  // Store the last valid score breakdown for consistency
  const lastValidBreakdownRef = useRef<ScoreBreakdown | null>(null);
  // Flag to indicate if we've received at least one genuine API score
  const hasReceivedApiScoreRef = useRef<boolean>(false);
  // Track score from last breakdown for comparison
  const lastBreakdownScoreRef = useRef<number | null>(null);
  // Debounce timer for feedback updates
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track the initial score for consistent improvement calculation
  const initialScoreRef = useRef<number | null>(initialScore);

  // =========================================================================
  // Animation Configuration
  // =========================================================================

  // Animation duration in milliseconds - faster for better user experience
  const ANIMATION_DURATION = 800; // 0.8 seconds
  // Target frames per second - higher for smoother animation
  const ANIMATION_FPS = 60;

  // =========================================================================
  // Score Processing Logic
  // =========================================================================

  /**
   * Process incoming score to ensure consistency and validity
   * Uses multiple strategies to determine the most accurate score to display
   * Updated to properly handle initial scores and avoid default fallbacks when actual scores exist
   */
  const processedScore = useMemo(() => {
    // Start with the provided optimization score
    let finalScore = optimizationScore;

    // Use initial score as fallback if available, otherwise use standard fallback
    const FALLBACK_SCORE = initialScore !== null ? initialScore : 65;

    // Log incoming score for debugging
    console.log(
      `ScoreCard: Processing incoming score: ${optimizationScore}, initialScore: ${initialScore}`
    );

    // STRATEGY 1: Check if this appears to be a direct API score (most reliable source)
    // If scoreBreakdown is present with matching total, this is likely a fresh API score
    if (scoreBreakdown && typeof scoreBreakdown.total === "number") {
      const breakdownTotal = scoreBreakdown.total;

      // Store breakdown score for future reference
      lastBreakdownScoreRef.current = breakdownTotal;
      lastValidBreakdownRef.current = scoreBreakdown;

      // Check if breakdown score matches optimization score (± small margin of error)
      const scoreMatchesBreakdown =
        Math.abs(breakdownTotal - (optimizationScore || 0)) <= 2;

      if (scoreMatchesBreakdown) {
        // This is a reliable API score, mark as received and use it
        hasReceivedApiScoreRef.current = true;
        finalScore = optimizationScore;
        console.log(
          `ScoreCard: Using matched score from API/breakdown: ${finalScore}`
        );
      }
      // If mismatch between breakdown.total and optimizationScore, prefer breakdown
      else if (breakdownTotal > 0) {
        console.log(
          `ScoreCard: Score mismatch - optimizationScore: ${optimizationScore}, breakdown.total: ${breakdownTotal}. Using breakdown score.`
        );
        finalScore = breakdownTotal;
        hasReceivedApiScoreRef.current = true;
      }
    }
    // When we have optimization score but no breakdown
    else if (optimizationScore !== undefined && optimizationScore !== null) {
      // If score is in valid range and appears to be from API
      if (optimizationScore >= 0 && optimizationScore <= 100) {
        // Valid score range, mark as API score
        hasReceivedApiScoreRef.current = true;
        // If initialScore is available, ensure we're using it for the first time
        if (initialScore !== null && !initialScoreRef.current) {
          initialScoreRef.current = initialScore;
        }
      }
    }

    // STRATEGY 2: Protection against incorrect score downgrades
    // Only apply if:
    // 1. We've already received a genuine API score
    // 2. We have a higher recorded score
    // 3. The current score drop is significant (>5 points) and doesn't come with a breakdown
    // 4. We're not in score calculation state
    if (
      !isCalculating &&
      hasReceivedApiScoreRef.current &&
      highestScoreRef.current &&
      finalScore !== null &&
      highestScoreRef.current > finalScore &&
      highestScoreRef.current - finalScore > 5 &&
      !scoreBreakdown
    ) {
      // This looks like a suspicious downgrade
      console.log(
        `ScoreCard: Suspicious score downgrade detected - from ${highestScoreRef.current} to ${finalScore}`
      );

      // Check if we have a valid last breakdown score for reference
      if (lastBreakdownScoreRef.current !== null) {
        console.log(
          `ScoreCard: Using last breakdown score: ${lastBreakdownScoreRef.current}`
        );
        finalScore = lastBreakdownScoreRef.current;
      } else {
        // If no breakdown reference, use highest recorded score
        console.log(
          `ScoreCard: Using highest recorded score: ${highestScoreRef.current}`
        );
        finalScore = highestScoreRef.current;
      }
    }

    // STRATEGY 3: If score is NULL or invalid but we have a previous valid score
    if (
      (finalScore === null ||
        finalScore === undefined ||
        isNaN(finalScore) ||
        finalScore < 0) &&
      lastBreakdownScoreRef.current
    ) {
      console.log(
        `ScoreCard: Invalid score detected, using last breakdown score: ${lastBreakdownScoreRef.current}`
      );
      finalScore = lastBreakdownScoreRef.current;
    }

    // STRATEGY 4: If we have an initial score but no API score yet, use the initial score
    // This is important to avoid defaulting to 65 when we actually have a real initial score
    if (
      (finalScore === null || finalScore === undefined || isNaN(finalScore)) &&
      !hasReceivedApiScoreRef.current &&
      initialScore !== null
    ) {
      console.log(
        `ScoreCard: Using initial score (${initialScore}) instead of default fallback`
      );
      finalScore = initialScore;
    }
    // Final fallback to default value if all else fails and we have no API score yet
    else if (
      (finalScore === null || finalScore === undefined || isNaN(finalScore)) &&
      !hasReceivedApiScoreRef.current
    ) {
      console.log(
        `ScoreCard: Using default score (${FALLBACK_SCORE}) as fallback - no API score received yet`
      );
      finalScore = FALLBACK_SCORE;
    }

    // Update highest score reference if we have a new high
    if (finalScore !== null && finalScore > highestScoreRef.current) {
      console.log(
        `ScoreCard: Updating highest score record from ${highestScoreRef.current} to ${finalScore}`
      );
      highestScoreRef.current = finalScore;
    }

    // Return the processed score
    return finalScore;
  }, [optimizationScore, scoreBreakdown, isCalculating, initialScore]);

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
    const progressValue = (score * circumference) / 100;
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
  const animateScoreChange = useCallback(
    (targetScore: number, startScore: number) => {
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
        const currentValue =
          startScore + (targetScore - startScore) * easedProgress;

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
    },
    []
  );

  // =========================================================================
  // Effects
  // =========================================================================

  /**
   * Initial effect to sync initial score reference
   * This ensures we track the initial score consistently for improvement calculations
   */
  useEffect(() => {
    if (initialScore !== null && initialScoreRef.current === null) {
      initialScoreRef.current = initialScore;
      console.log(
        `ScoreCard: Setting initial score reference to ${initialScore}`
      );
    }
  }, [initialScore]);

  /**
   * Handle score changes and animate transitions
   * Triggers animation when the processedScore changes
   * Improved to detect and properly animate even small score changes
   */
  useEffect(() => {
    // Skip if score is being calculated
    if (isCalculating) {
      return;
    }

    // Ensure we have a valid score value
    const currentScore = processedScore;

    // Log incoming score changes for debugging
    console.log(
      `ScoreCard: Score update received: ${currentScore} (previous: ${previousScore})`
    );

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
  }, [
    processedScore,
    previousScore,
    displayScore,
    animateScoreChange,
    isCalculating,
  ]);

  /**
   * Set appropriate feedback message based on score range
   * Updates when display score changes to provide contextual guidance
   */
  useEffect(() => {
    // Skip if score is being calculated
    if (isCalculating) {
      return;
    }

    // Debounce feedback updates to prevent flickering during animation
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    // Delay feedback update slightly to match animation
    feedbackTimeoutRef.current = setTimeout(() => {
      // Round the display score for message selection
      const roundedScore = Math.round(displayScore);

      // Select appropriate feedback message based on score range
      if (roundedScore >= 90) {
        setFeedbackMessage(
          "Excellent! Your resume is highly optimized for ATS systems."
        );
      } else if (roundedScore >= 80) {
        setFeedbackMessage(
          "Great job! Your resume is well optimized for ATS systems."
        );
      } else if (roundedScore >= 70) {
        setFeedbackMessage(
          "Good progress. Apply more suggestions to improve further."
        );
      } else if (roundedScore >= 60) {
        setFeedbackMessage(
          "Your resume needs additional optimization to stand out."
        );
      } else if (roundedScore >= 50) {
        setFeedbackMessage(
          "Your resume needs significant optimization to pass ATS filters."
        );
      } else if (roundedScore >= 30) {
        setFeedbackMessage(
          "Your resume needs major improvements to be considered by ATS systems."
        );
      } else {
        setFeedbackMessage(
          "Your resume requires a complete overhaul to meet ATS standards."
        );
      }
    }, 100); // Short delay to sync with animation

    // Clean up timeout on unmount
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
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

      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
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

  // FIXED: Calculate improvement based directly on the number of applied items
  // This ensures the improvement display is always accurate regardless of what initialScoreRef contains
  const suggestionsBonus = suggestionsApplied * 2; // Each suggestion contributes exactly 2 points
  const keywordsBonus = keywordsApplied * 1; // Each keyword contributes exactly 1 point
  const improvement = suggestionsBonus + keywordsBonus;

  // Calculate potential remaining improvement
  const remainingPotential =
    potentialScore && potentialScore > processedScore
      ? Math.round((potentialScore - processedScore) * 10) / 10
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
                <p>
                  This score represents how well your resume will perform with
                  Applicant Tracking Systems (ATS). A higher score means better
                  chances of getting through automated filters. Each suggestion
                  improves your ATS score by 2 points when applied. Each keyword
                  improves your ATS score by 1 point when applied.
                </p>
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
                <span className="text-sm text-gray-600">
                  Calculating score...
                </span>
              </div>
            ) : (
              // Score display - show when calculation is complete
              <>
                {/* Score indicator with numeric display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold">
                    {displayScoreRounded}%
                  </span>
                  {/* Show improvement indicator when score is increasing */}
                  {isIncreasing && (
                    <span className="absolute -top-1 -right-1 text-xs text-green-500 font-medium animate-pulse">
                      +{(processedScore - previousScore).toFixed(1)}
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
            : feedbackMessage}
        </p>

        {/* Applied changes and improvement metrics - only show when not calculating */}
        {!isCalculating &&
          showDetails &&
          (suggestionsApplied > 0 || keywordsApplied > 0) && (
            <div className="mt-3 text-xs text-gray-600 border-t pt-2">
              <div className="flex justify-between">
                <span>Suggestions applied:</span>
                <span className="font-medium">{suggestionsApplied}</span>
              </div>
              <div className="flex justify-between">
                <span>Keywords applied:</span>
                <span className="font-medium">{keywordsApplied}</span>
              </div>

              {/* Show score improvement if positive - using the fixed calculation */}
              {improvement > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Score improvement:</span>
                  <span className="font-medium">
                    +{improvement.toFixed(1)} points
                  </span>
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
              {Object.entries(scoreBreakdown.sectionScores || {}).map(
                ([sectionId, score]) => {
                  // Only show sections with non-zero scores
                  if (score <= 0) return null;

                  // Format section name from ID for better readability
                  // Converts "resume-experience" to "Experience"
                  const sectionName = sectionId
                    .replace("resume-", "")
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase());

                  return (
                    <div
                      key={sectionId}
                      className="flex justify-between text-xs"
                    >
                      <span>{sectionName}:</span>
                      <span className="font-medium">
                        {score.toFixed(0)}/100
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreCard;
