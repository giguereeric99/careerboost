/**
 * Impact Preview Component
 * 
 * This component provides visual feedback about the potential impact
 * of applying a suggestion or keyword on the ATS score.
 * 
 * Features:
 * - Visual score impact indicator with circular progress bar
 * - Color-coded impact levels for clear visual hierarchy
 * - Animated preview of new score with smooth transitions
 * - Detailed impact description with contextual information
 * - Apply button with impact visualization
 */

import React, { useState, useEffect } from 'react';
import { ImpactLevel } from '@/services/resumeScoreLogic';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

/**
 * Props for ImpactPreview component
 */
export interface ImpactPreviewProps {
  currentScore: number;          // Current ATS score
  newScore: number;              // Projected new score after applying
  pointImpact: number;           // Point impact on score
  impactLevel: ImpactLevel;      // Impact severity level
  description: string;           // Impact description
  isApplied: boolean;            // Whether the item is already applied
  onApply?: () => void;          // Handler for applying the item
  isDisabled?: boolean;          // Whether the apply button should be disabled
  showApplyButton?: boolean;     // Whether to show the apply button (default: true)
  isCollapsible?: boolean;       // Whether the component can be collapsed
  defaultOpen?: boolean;         // Initial collapsed state (if collapsible)
}

/**
 * Get the appropriate color for an impact level
 * Maps impact level enum to specific color codes
 * 
 * @param level - Impact level enum value
 * @returns CSS color code as string
 */
const getImpactColor = (level: ImpactLevel): string => {
  switch (level) {
    case ImpactLevel.CRITICAL:
      return '#ef4444'; // Red for critical impact
    case ImpactLevel.HIGH:
      return '#f59e0b'; // Amber for high impact
    case ImpactLevel.MEDIUM:
      return '#3b82f6'; // Blue for medium impact
    case ImpactLevel.LOW:
    default:
      return '#6b7280'; // Gray for low impact
  }
};

/**
 * Get a human-readable label for an impact level
 * Translates enum values to user-friendly labels
 * 
 * @param level - Impact level enum value
 * @returns Human-readable impact level label
 */
const getImpactLabel = (level: ImpactLevel): string => {
  switch (level) {
    case ImpactLevel.CRITICAL:
      return 'Critical Impact';
    case ImpactLevel.HIGH:
      return 'High Impact';
    case ImpactLevel.MEDIUM:
      return 'Medium Impact';
    case ImpactLevel.LOW:
      return 'Low Impact';
    default:
      return 'Unknown Impact';
  }
};

/**
 * Impact content component containing the main preview content
 * Extracted for reuse between collapsible and non-collapsible versions
 */
const ImpactContent: React.FC<Omit<ImpactPreviewProps, 'isCollapsible' | 'defaultOpen'>> = ({
  currentScore,
  newScore,
  pointImpact,
  impactLevel,
  description,
  isApplied,
  onApply,
  showApplyButton = true
}) => {
  // State for animating the score display
  const [displayScore, setDisplayScore] = useState(currentScore);
  
  // Calculate score difference and ensure it's positive
  const scoreDifference = Math.max(0, newScore - currentScore);
  
  // Determine impact color based on level
  const impactColor = getImpactColor(impactLevel);
  
  // Animation configuration
  const animationDuration = 1000; // ms
  const animationSteps = 20;
  
  // Animate the score when it changes
  useEffect(() => {
    // If already applied, show the current score without animation
    if (isApplied) {
      setDisplayScore(currentScore);
      return;
    }
    
    // Animation setup
    const scoreStep = scoreDifference / animationSteps;
    let currentStep = 0;
    let animationFrameId: number;
    
    // Reset to current score before animation
    setDisplayScore(currentScore);
    
    // Animation timing function
    const easeOutQuad = (t: number) => t * (2 - t);
    
    // Animation frame function
    const animateScore = () => {
      if (currentStep < animationSteps) {
        // Calculate progress (0-1) with easing function
        const progress = easeOutQuad(currentStep / animationSteps);
        
        // Update displayed score based on animation progress
        setDisplayScore(currentScore + scoreStep * currentStep);
        
        // Increment step for next frame
        currentStep++;
        
        // Request next animation frame
        animationFrameId = requestAnimationFrame(animateScore);
      } else {
        // Ensure final value is exactly the target
        setDisplayScore(newScore);
      }
    };
    
    // Start animation after a short delay
    const timeoutId = setTimeout(() => {
      animationFrameId = requestAnimationFrame(animateScore);
    }, 300);
    
    // Clean up animation on unmount or when props change
    return () => {
      clearTimeout(timeoutId);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [currentScore, newScore, scoreDifference, isApplied]);
  
  return (
    <div className="flex items-center justify-between">
      {/* Left side - Impact description */}
      <div className="flex-1 mr-4">
        {/* Impact level header with color indicator */}
        <div className="flex items-center mb-1">
          <div 
            className="w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: impactColor }}
          />
          <h4 className="text-sm font-medium">{getImpactLabel(impactLevel)}</h4>
        </div>
        
        {/* Impact description text */}
        <p className="text-xs text-gray-600">{description}</p>
        
        {/* Apply button - only show if not already applied and if showApplyButton is true */}
        {!isApplied && showApplyButton && onApply && (
          <button
            onClick={onApply}
            className="mt-2 px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 flex items-center"
            style={{ 
              backgroundColor: `${impactColor}20`, // 20% opacity background
              color: impactColor,
              border: `1px solid ${impactColor}40` // 40% opacity border
            }}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Apply (+{pointImpact.toFixed(1)} points)
          </button>
        )}
        
        {/* Already applied indicator */}
        {isApplied && (
          <span className="mt-2 inline-block px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-full border border-green-200 flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Already applied
          </span>
        )}
      </div>
      
      {/* Right side - Score preview with circular progress */}
      <div className="w-16 h-16 relative">
        {/* Circular progress indicator */}
        <CircularProgressbar
          value={displayScore}
          minValue={0}
          maxValue={100}
          text={`${Math.round(displayScore)}%`}
          styles={buildStyles({
            // Customize text size and colors
            textSize: '1.6rem',
            // Use impact color or green if already applied
            pathColor: isApplied ? '#10b981' : impactColor,
            textColor: isApplied ? '#10b981' : impactColor,
            // Light gray background track
            trailColor: '#e6e6e6'
          })}
        />
        
        {/* Show tooltip with score difference when not applied */}
        {!isApplied && scoreDifference > 0 && (
          <AnimatePresence>
            <motion.div
              // Animation settings
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              // Visual styling
              className="absolute -top-2 -right-2 bg-white rounded-full shadow-sm border px-1.5 py-0.5 text-xs font-medium"
              style={{ color: impactColor }}
            >
              +{scoreDifference.toFixed(1)}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

/**
 * ImpactPreview component displays a visual representation of the impact
 * of applying a suggestion or keyword on the ATS score
 */
const ImpactPreview: React.FC<ImpactPreviewProps> = (props) => {
  // Destructure props with default values for collapsible behavior
  const { isCollapsible = false, defaultOpen = true } = props;
  
  // State to track collapsed state if component is collapsible
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // If not collapsible, render the content directly
  if (!isCollapsible) {
    return (
      <div className="p-3 bg-white border rounded-lg shadow-sm impact-4">
        <ImpactContent {...props} />
      </div>
    );
  }
  
  // If collapsible, wrap in Collapsible component
  return ( 
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden impact-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div 
                className="w-2 h-2 rounded-full mr-2 "
                style={{ backgroundColor: getImpactColor(props.impactLevel) }}
              />
              <h4 className="text-sm font-medium">{getImpactLabel(props.impactLevel)}</h4>
            </div>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} 
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <CollapsibleContent>
            <ImpactContent {...props} />
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export default ImpactPreview;