/**
 * Resume Metrics and Export Utilities
 * 
 * This module provides utilities for exporting resume optimization data,
 * tracking metrics for feedback, and saving optimization state.
 */

import { Suggestion, Keyword, ScoreBreakdown } from './resume-score-logic';

/**
 * Interface for storing optimization state
 */
interface OptimizationState {
  resumeId?: string;
  initialScore: number;
  currentScore: number;
  appliedSuggestions: Suggestion[];
  appliedKeywords: Keyword[];
  scoreBreakdown: ScoreBreakdown;
  lastUpdated: string;
}

/**
 * Interface for optimization metrics
 */
interface OptimizationMetrics {
  initialScore: number;
  finalScore: number;
  improvement: number;
  appliedSuggestionCount: number;
  appliedKeywordCount: number;
  topSuggestionTypes: Record<string, number>;
  topKeywordCategories: Record<string, number>;
  timeToOptimize: number; // In seconds
  sectionsImproved: string[];
}

/**
 * Generate metrics for the current optimization session
 * 
 * @param initialScore - Initial ATS score before optimization
 * @param currentScore - Current ATS score after applying changes
 * @param appliedSuggestions - Array of applied suggestions
 * @param appliedKeywords - Array of applied keywords
 * @param startTime - Time when optimization started
 * @returns Metrics object with detailed optimization statistics
 */
export function generateOptimizationMetrics(
  initialScore: number,
  currentScore: number,
  appliedSuggestions: Suggestion[],
  appliedKeywords: Keyword[],
  startTime: Date
): OptimizationMetrics {
  // Calculate improvement
  const improvement = currentScore - initialScore;
  
  // Count applied suggestions by type
  const topSuggestionTypes: Record<string, number> = {};
  appliedSuggestions.forEach(suggestion => {
    const type = suggestion.type;
    topSuggestionTypes[type] = (topSuggestionTypes[type] || 0) + 1;
  });
  
  // Count applied keywords by category
  const topKeywordCategories: Record<string, number> = {};
  appliedKeywords.forEach(keyword => {
    const category = keyword.category || 'general';
    topKeywordCategories[category] = (topKeywordCategories[category] || 0) + 1;
  });
  
  // Calculate time to optimize
  const endTime = new Date();
  const timeToOptimize = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  
  // Identify improved sections
  const sectionsImproved = [...new Set(
    appliedSuggestions
      .map(suggestion => suggestion.section)
      .filter(Boolean) as string[]
  )];
  
  return {
    initialScore,
    finalScore: currentScore,
    improvement,
    appliedSuggestionCount: appliedSuggestions.length,
    appliedKeywordCount: appliedKeywords.length,
    topSuggestionTypes,
    topKeywordCategories,
    timeToOptimize,
    sectionsImproved
  };
}

/**
 * Save the current optimization state to localStorage
 * 
 * @param state - Current optimization state
 * @returns Boolean indicating success
 */
export function saveOptimizationState(state: OptimizationState): boolean {
  try {
    const stateJson = JSON.stringify(state);
    localStorage.setItem(`resume_optimization_${state.resumeId || 'latest'}`, stateJson);
    return true;
  } catch (error) {
    console.error("Error saving optimization state:", error);
    return false;
  }
}

/**
 * Load optimization state from localStorage
 * 
 * @param resumeId - ID of the resume to load state for
 * @returns Optimization state or null if not found
 */
export function loadOptimizationState(resumeId?: string): OptimizationState | null {
  try {
    const key = `resume_optimization_${resumeId || 'latest'}`;
    const stateJson = localStorage.getItem(key);
    
    if (!stateJson) return null;
    
    return JSON.parse(stateJson) as OptimizationState;
  } catch (error) {
    console.error("Error loading optimization state:", error);
    return null;
  }
}

/**
 * Export optimization results to different formats
 */
export const exportFormats = {
  /**
   * Export optimization metrics as JSON
   * 
   * @param metrics - Optimization metrics
   * @returns JSON string
   */
  toJSON: (metrics: OptimizationMetrics): string => {
    return JSON.stringify(metrics, null, 2);
  },
  
  /**
   * Export optimization metrics as CSV
   * 
   * @param metrics - Optimization metrics
   * @returns CSV string
   */
  toCSV: (metrics: OptimizationMetrics): string => {
    const rows = [
      ['Metric', 'Value'],
      ['Initial Score', metrics.initialScore.toString()],
      ['Final Score', metrics.finalScore.toString()],
      ['Improvement', metrics.improvement.toString()],
      ['Applied Suggestions', metrics.appliedSuggestionCount.toString()],
      ['Applied Keywords', metrics.appliedKeywordCount.toString()],
      ['Time to Optimize (seconds)', metrics.timeToOptimize.toString()]
    ];
    
    // Add suggestion types
    Object.entries(metrics.topSuggestionTypes).forEach(([type, count]) => {
      rows.push([`Suggestion Type: ${type}`, count.toString()]);
    });
    
    // Add keyword categories
    Object.entries(metrics.topKeywordCategories).forEach(([category, count]) => {
      rows.push([`Keyword Category: ${category}`, count.toString()]);
    });
    
    return rows.map(row => row.join(',')).join('\n');
  },
  
  /**
   * Export optimization metrics as markdown
   * 
   * @param metrics - Optimization metrics
   * @returns Markdown string
   */
  toMarkdown: (metrics: OptimizationMetrics): string => {
    let markdown = `# Resume Optimization Report\n\n`;
    
    markdown += `## Overall Results\n\n`;
    markdown += `- **Initial Score**: ${metrics.initialScore}\n`;
    markdown += `- **Final Score**: ${metrics.finalScore}\n`;
    markdown += `- **Improvement**: +${metrics.improvement} points\n`;
    markdown += `- **Applied Suggestions**: ${metrics.appliedSuggestionCount}\n`;
    markdown += `- **Applied Keywords**: ${metrics.appliedKeywordCount}\n`;
    markdown += `- **Time to Optimize**: ${metrics.timeToOptimize} seconds\n\n`;
    
    markdown += `## Top Suggestion Types\n\n`;
    Object.entries(metrics.topSuggestionTypes).forEach(([type, count]) => {
      markdown += `- **${type}**: ${count}\n`;
    });
    
    markdown += `\n## Top Keyword Categories\n\n`;
    Object.entries(metrics.topKeywordCategories).forEach(([category, count]) => {
      markdown += `- **${category}**: ${count}\n`;
    });
    
    if (metrics.sectionsImproved.length > 0) {
      markdown += `\n## Sections Improved\n\n`;
      metrics.sectionsImproved.forEach(section => {
        markdown += `- ${section}\n`;
      });
    }
    
    return markdown;
  }
};

/**
 * Create a downloadable file from optimization data
 * 
 * @param content - The content to download
 * @param filename - The name of the file
 * @param mimeType - The MIME type of the file
 */
export function downloadOptimizationReport(
  content: string,
  filename: string,
  mimeType: string
): void {
  // Create a blob with the content
  const blob = new Blob([content], { type: mimeType });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a download link
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append the link to the document
  document.body.appendChild(link);
  
  // Click the link to download the file
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Send optimization feedback to the server
 * 
 * @param metrics - Optimization metrics
 * @param feedback - User feedback
 * @param resumeId - ID of the resume
 * @returns Promise that resolves when feedback is sent
 */
export async function sendOptimizationFeedback(
  metrics: OptimizationMetrics,
  feedback: {
    rating: number;
    comments?: string;
    helpfulness?: number;
  },
  resumeId?: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        resumeId,
        metrics,
        feedback
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send feedback');
    }
    
    return true;
  } catch (error) {
    console.error("Error sending optimization feedback:", error);
    return false;
  }
}

/**
 * Helper hook to track optimization state
 */
export function useOptimizationTracking(resumeId?: string) {
  const [startTime] = useState<Date>(new Date());
  const [metrics, setMetrics] = useState<OptimizationMetrics | null>(null);
  
  // Save state when component unmounts
  useEffect(() => {
    return () => {
      // This runs when component unmounts
      if (metrics) {
        // Save metrics to localStorage
        saveOptimizationState({
          resumeId,
          initialScore: metrics.initialScore,
          currentScore: metrics.finalScore,
          appliedSuggestions: [], // Would need to be passed in
          appliedKeywords: [], // Would need to be passed in
          scoreBreakdown: {} as ScoreBreakdown, // Would need to be passed in
          lastUpdated: new Date().toISOString()
        });
      }
    };
  }, [metrics, resumeId]);
  
  /**
   * Update metrics with current optimization state
   */
  const updateMetrics = (
    initialScore: number,
    currentScore: number,
    appliedSuggestions: Suggestion[],
    appliedKeywords: Keyword[]
  ) => {
    const newMetrics = generateOptimizationMetrics(
      initialScore,
      currentScore,
      appliedSuggestions,
      appliedKeywords,
      startTime
    );
    
    setMetrics(newMetrics);
    return newMetrics;
  };
  
  /**
   * Export the current metrics
   */
  const exportMetrics = (format: 'json' | 'csv' | 'markdown' = 'json') => {
    if (!metrics) return;
    
    let content: string;
    let mimeType: string;
    let extension: string;
    
    switch (format) {
      case 'json':
        content = exportFormats.toJSON(metrics);
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = exportFormats.toCSV(metrics);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      case 'markdown':
      default:
        content = exportFormats.toMarkdown(metrics);
        mimeType = 'text/markdown';
        extension = 'md';
        break;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `resume-optimization-${timestamp}.${extension}`;
    
    downloadOptimizationReport(content, filename, mimeType);
  };
  
  return {
    metrics,
    updateMetrics,
    exportMetrics,
    sendFeedback: (feedback: { rating: number; comments?: string; helpfulness?: number }) => {
      if (!metrics) return Promise.resolve(false);
      return sendOptimizationFeedback(metrics, feedback, resumeId);
    }
  };
}