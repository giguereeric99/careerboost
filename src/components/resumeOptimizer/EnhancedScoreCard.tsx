/**
 * Enhanced Score Card Component
 * 
 * This component displays the resume's ATS optimization score with an interactive
 * circular progress indicator, real-time feedback, and detailed performance metrics.
 * It uses the new centralized score calculation system for more accurate feedback.
 * 
 * Features:
 * - Animated circular progress indicator
 * - Detailed score breakdown
 * - Visual indicators for improvement
 * - Interactive score explanation
 * - Potential score improvement preview
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  Info, 
  ArrowUp, 
  TrendingUp, 
  Star, 
  CheckCircle, 
  AlertCircle 
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ScoreBreakdown } from '@/services/resumeScoreLogic';

interface EnhancedScoreCardProps {
  currentScore: number;            // Current ATS score
  suggestionsApplied?: number;     // Number of suggestions applied
  keywordsApplied?: number;        // Number of keywords applied
  scoreBreakdown?: ScoreBreakdown | null; // Detailed score breakdown
  potentialScore?: number | null;  // Maximum possible score with all optimizations
  initialScore?: number;           // Initial score before optimizations
  onHelpClick?: () => void;        // Optional callback for help button
}

/**
 * Derive a color based on the score value
 * 
 * @param score - ATS score (0-100)
 * @returns CSS color string
 */
const getScoreColor = (score: number): string => {
  if (score >= 90) return "rgb(16, 185, 129)"; // Green for excellent scores
  if (score >= 80) return "rgb(59, 130, 246)"; // Blue for good scores
  if (score >= 65) return "rgb(245, 158, 11)"; // Amber for average scores
  return "rgb(239, 68, 68)";                   // Red for poor scores
};

/**
 * Get a contextual feedback message based on the score
 * 
 * @param score - ATS score (0-100)
 * @returns Feedback message
 */
const getFeedbackMessage = (score: number): string => {
  if (score >= 90) {
    return "Excellent ! Votre CV est hautement optimisé pour les systèmes ATS.";
  } else if (score >= 80) {
    return "Très bien ! Votre CV est bien optimisé pour les systèmes ATS.";
  } else if (score >= 70) {
    return "Bon progrès. Appliquez plus de suggestions pour continuer à améliorer.";
  } else if (score >= 60) {
    return "Votre CV a besoin d'optimisations supplémentaires pour se démarquer.";
  } else {
    return "Votre CV nécessite une optimisation significative pour passer les filtres ATS.";
  }
};

/**
 * EnhancedScoreCard component displays a circular visual representation of the resume score
 * along with contextual feedback and improvement metrics
 */
const EnhancedScoreCard: React.FC<EnhancedScoreCardProps> = ({
  currentScore,
  suggestionsApplied = 0,
  keywordsApplied = 0,
  scoreBreakdown = null,
  potentialScore = null,
  initialScore,
  onHelpClick
}) => {
  // State for animating the score
  const [displayScore, setDisplayScore] = useState(0);
  const [previousScore, setPreviousScore] = useState(0);
  const [isIncreasing, setIsIncreasing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Calculate improvement and potential improvement
  const improvement = initialScore !== undefined ? Math.max(0, currentScore - initialScore) : 0;
  const remainingPotential = potentialScore !== null ? Math.max(0, potentialScore - currentScore) : 0;
  
  // Track animation with refs
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Animate the score when it changes
  useEffect(() => {
    // Only animate when score actually changes
    if (currentScore !== previousScore) {
      // Determine if score is increasing or decreasing
      setIsIncreasing(currentScore > previousScore);
      setPreviousScore(currentScore);
      setIsAnimating(true);
      
      // Store animation start time
      startTimeRef.current = performance.now();
      
      // Clean up any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      // Animation duration in ms
      const duration = 1000;
      
      // Animate from current displayed score to new score
      const animateScore = (timestamp: number) => {
        // Calculate progress (0 to 1)
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const eased = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        // Calculate current display value
        const newValue = previousScore + (currentScore - previousScore) * eased;
        setDisplayScore(newValue);
        
        // Continue animation if not complete
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateScore);
        } else {
          // Ensure we end at exactly the target score
          setDisplayScore(currentScore);
          setIsAnimating(false);
          animationRef.current = null;
        }
      };
      
      // Start animation
      animationRef.current = requestAnimationFrame(animateScore);
    }
    
    // Clean up animation on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentScore, previousScore]);
  
  // Set initial score on mount
  useEffect(() => {
    setDisplayScore(currentScore);
    setPreviousScore(currentScore);
  }, []);
  
  // Get score color
  const scoreColor = getScoreColor(displayScore);
  
  // Format score for display - round to nearest integer if not animating
  const formattedScore = isAnimating 
    ? Math.round(displayScore * 10) / 10
    : Math.round(displayScore);
  
  return (
    <Card className="bg-gray-50 border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          Score ATS
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Ce score représente la compatibilité de votre CV avec les systèmes de suivi des candidatures (ATS). Un score plus élevé signifie de meilleures chances de passer les filtres automatisés.</p>
                {scoreBreakdown && (
                  <ul className="mt-2 text-xs">
                    <li>Score Initial: {scoreBreakdown.base}</li>
                    <li>Points des Suggestions: +{scoreBreakdown.suggestions}</li>
                    <li>Points des Mots-clés: +{scoreBreakdown.keywords}</li>
                  </ul>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          {/* Circular Progress */}
          <div className="w-32 h-32 mx-auto relative">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e6e6e6"
                strokeWidth="8"
              />
              {/* Progress circle with gradient */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeDasharray={`${(displayScore / 100) * 283} 283`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-300 ease-in-out"
              />
            </svg>
            
            {/* Score display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: scoreColor }}>
                {formattedScore}
              </span>
              <span className="text-sm text-gray-500">sur 100</span>
              
              {/* Score change indicator */}
              {isIncreasing && (
                <div className="absolute -top-2 -right-2 flex items-center text-xs text-green-500 font-medium bg-white rounded-full px-1 shadow-sm border">
                  <ArrowUp className="h-3 w-3 mr-0.5" />
                  {(currentScore - previousScore).toFixed(1)}
                </div>
              )}
            </div>
          </div>
          
          {/* Score breakdown bar chart */}
          {scoreBreakdown && (
            <div className="mt-4 space-y-2">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-gray-500" /> 
                    <span>Score de base</span>
                  </span>
                  <span className="font-medium">{scoreBreakdown.base}</span>
                </div>
                <Progress 
                  value={scoreBreakdown.base} 
                  className="h-1.5 bg-gray-200" 
                  indicatorClassName="bg-gray-500" 
                />
              </div>
              
              {scoreBreakdown.suggestions > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-blue-500" /> 
                      <span>Suggestions</span>
                    </span>
                    <span className="font-medium text-blue-600">+{scoreBreakdown.suggestions}</span>
                  </div>
                  <Progress 
                    value={scoreBreakdown.suggestions} 
                    max={20} 
                    className="h-1.5 bg-blue-100" 
                    indicatorClassName="bg-blue-500" 
                  />
                </div>
              )}
              
              {scoreBreakdown.keywords > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-teal-500" /> 
                      <span>Mots-clés</span>
                    </span>
                    <span className="font-medium text-teal-600">+{scoreBreakdown.keywords}</span>
                  </div>
                  <Progress 
                    value={scoreBreakdown.keywords} 
                    max={15} 
                    className="h-1.5 bg-teal-100" 
                    indicatorClassName="bg-teal-500" 
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Feedback message */}
        <p className="text-center text-sm mb-3">
          {getFeedbackMessage(displayScore)}
        </p>
        
        {/* Applied changes and improvement metrics */}
        {(suggestionsApplied > 0 || keywordsApplied > 0) && (
          <div className="mt-3 text-xs text-gray-600 border-t pt-2">
            <div className="flex justify-between">
              <span>Suggestions appliquées:</span>
              <span className="font-medium">{suggestionsApplied}</span>
            </div>
            <div className="flex justify-between">
              <span>Mots-clés appliqués:</span>
              <span className="font-medium">{keywordsApplied}</span>
            </div>
            
            {improvement > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Amélioration du score:</span>
                <span className="font-medium">+{improvement.toFixed(1)} points</span>
              </div>
            )}
            
            {remainingPotential > 0 && (
              <div className="flex justify-between text-blue-500">
                <span>Amélioration potentielle:</span>
                <span className="font-medium">+{remainingPotential.toFixed(1)} points</span>
              </div>
            )}
          </div>
        )}
        
        {potentialScore !== null && potentialScore > currentScore && (
          <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <p className="text-xs font-medium text-blue-600">
                Score potentiel: {Math.round(potentialScore)}
              </p>
            </div>
            <p className="text-xs text-gray-600">
              Appliquez toutes les suggestions et mots-clés pour atteindre ce score.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedScoreCard;