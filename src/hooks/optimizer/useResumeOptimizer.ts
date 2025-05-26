/**
 * useResumeOptimizer Hook - FINAL ULTRA-OPTIMIZED VERSION
 *
 * COMPLETELY FIXED FOR STABLE EDITING EXPERIENCE:
 * - Eliminated ALL focus loss issues during editing
 * - Prevented cascading re-renders that cause editor reinitialization
 * - Implemented stable section references with immutable updates
 * - Added debounced content updates for smooth typing experience
 * - Optimized memo dependencies to prevent unnecessary recalculations
 * - Maintained all original functionality while drastically improving performance
 *
 * KEY IMPROVEMENTS:
 * - Section updates use immutable patterns to preserve editor instances
 * - Content combination is deferred to prevent immediate re-renders
 * - Stable references returned when content hasn't actually changed
 * - Focus management optimized with proper debouncing
 * - All modification tracking optimized for minimal re-renders
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import {
  getLatestOptimizedResume,
  saveResumeComplete, // New atomic save function
  resetResumeToOriginal,
  updateResumeTemplate,
} from "@/services/resumeService";
import { parseOptimizedText, calculateAtsScore } from "@/services/resumeParser";
import {
  OptimizedResumeData,
  Suggestion,
  Keyword,
  Section,
} from "@/types/resumeTypes";
import {
  parseHtmlIntoSections,
  getSectionName,
  SECTION_NAMES,
  SECTION_ORDER,
  isSectionEmpty,
  ensureAllStandardSections,
} from "@/utils/resumeUtils";

/**
 * Type guard to check if a value is not null or undefined
 * Used for safer type narrowing in TypeScript
 *
 * @param value - Value to check
 * @returns Boolean indicating if value is defined (type predicate)
 */
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Normalizes a suggestion object to ensure consistent structure
 * Handles different property naming conventions (camelCase vs snake_case)
 *
 * @param suggestion - Raw suggestion from API or other source
 * @returns Normalized suggestion with consistent property names
 */
function normalizeSuggestion(suggestion: any): Suggestion {
  return {
    // Generate ID if missing with fallbacks
    id: suggestion.id || suggestion.suggestion_id || String(Math.random()),
    // Ensure basic text properties
    text: suggestion.text || suggestion.original_text || "",
    type: suggestion.type || "general",
    impact: suggestion.impact || "",
    // Handle both naming conventions for applied state
    isApplied: suggestion.isApplied || suggestion.is_applied || false,
    // Include pointImpact for score calculations
    pointImpact: suggestion.pointImpact || suggestion.point_impact || 2,
  };
}

/**
 * Normalizes a keyword object to ensure consistent structure
 * Handles different property naming conventions and formats
 *
 * @param keyword - Raw keyword from API (string or object)
 * @returns Normalized keyword with consistent property names
 */
function normalizeKeyword(keyword: any): Keyword {
  // Handle case where keyword is just a string
  if (typeof keyword === "string") {
    return {
      id: String(Math.random()),
      text: keyword,
      isApplied: false,
      relevance: 1,
      pointImpact: 1,
    };
  }

  // Handle keyword as an object with potential varying property names
  return {
    id: keyword.id || keyword.keyword_id || String(Math.random()),
    text: keyword.text || keyword.keyword || "",
    // Support all possible variations of the applied property
    isApplied:
      keyword.isApplied || keyword.is_applied || keyword.applied || false,
    relevance: keyword.relevance || 1,
    pointImpact: keyword.pointImpact || keyword.point_impact || 1,
  };
}

/**
 * Custom hook for resume optimization management - FINAL ULTRA-OPTIMIZED VERSION
 * Provides comprehensive state and operations for resume editing workflow
 *
 * CRITICAL OPTIMIZATIONS FOR STABLE EDITING:
 * - Immutable section updates to prevent editor re-initialization
 * - Debounced content combination to reduce re-render frequency
 * - Stable reference management for all computed values
 * - Optimized dependency arrays in all memoized functions
 * - Focus-preserving update patterns throughout
 *
 * @param userId - The user ID for data fetching
 * @returns Object containing state and methods for resume optimization
 */
export const useResumeOptimizer = (userId?: string) => {
  // ===== CORE RESUME CONTENT STATE =====

  // Resume content state
  const [resumeData, setResumeData] = useState<OptimizedResumeData | null>(
    null
  );
  const [originalText, setOriginalText] = useState<string>(""); // Original optimized text from AI
  const [optimizedText, setOptimizedText] = useState<string>(""); // Current displayed text (either original or edited)

  // ===== ULTRA-OPTIMIZED EDITING STATE MANAGEMENT =====

  // SINGLE source of truth for edit mode - no more conflicts!
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Temporary content during editing session - preserves changes when switching modes
  const [tempEditedContent, setTempEditedContent] = useState<string>("");

  // CRITICAL: Stable sections array that prevents editor re-initialization
  const [tempSections, setTempSections] = useState<Section[]>([]);

  // Ref to track the last stable sections to prevent unnecessary updates
  const lastStableSectionsRef = useRef<Section[]>([]);

  // Flag to track if temporary content has been modified
  const [hasTempChanges, setHasTempChanges] = useState<boolean>(false);

  // Debouncing refs for content updates to prevent excessive re-renders
  const contentUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContentUpdateRef = useRef<boolean>(false);

  // ===== SCORING AND ENHANCEMENT DATA =====

  const [originalAtsScore, setOriginalAtsScore] = useState<number | null>(null); // Original AI score
  const [currentAtsScore, setCurrentAtsScore] = useState<number | null>(null); // Current/edited score
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);

  // Track initial score for accurate improvement calculation
  const initialScoreRef = useRef<number | null>(null);

  // ===== UI STATE =====

  const [selectedTemplate, setSelectedTemplate] = useState<string>("basic");
  const [contentModified, setContentModified] = useState<boolean>(false);
  const [scoreModified, setScoreModified] = useState<boolean>(false);
  const [templateModified, setTemplateModified] = useState<boolean>(false);

  // ===== LOADING STATES =====

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // ===== RESUME STATUS =====

  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");

  // ===== INTERNAL REFS AND FLAGS =====

  // Track initial load attempt to prevent infinite loops
  const loadAttemptRef = useRef<number>(0);
  const hasLoadedDataRef = useRef<boolean>(false);

  // Toast management to prevent duplicates
  const [toastShown, setToastShown] = useState<boolean>(false);
  const welcomeToastDisplayedRef = useRef<boolean>(false);
  const previousLoadingState = useRef<boolean>(true); // Start as true to prevent immediate toast

  // ===== ULTRA-OPTIMIZED COMPUTED VALUES =====

  /**
   * Get the current content to display based on editing state - PERFORMANCE OPTIMIZED
   * Priority: temporary content (if editing) > optimized text > empty string
   * Uses stable references to prevent cascading re-renders
   */
  const currentDisplayContent = useMemo(() => {
    if (isEditing && tempEditedContent) {
      return tempEditedContent;
    }
    return optimizedText;
  }, [isEditing, tempEditedContent, optimizedText]);

  /**
   * Get the current sections based on editing state - ULTRA-STABLE REFERENCES
   * Returns the exact same array reference when possible to prevent editor re-initialization
   */
  const currentSections = useMemo(() => {
    if (isEditing && tempSections.length > 0) {
      // CRITICAL: Check if sections actually changed before returning new reference
      const sectionsChanged =
        tempSections.length !== lastStableSectionsRef.current.length ||
        tempSections.some((section, index) => {
          const lastSection = lastStableSectionsRef.current[index];
          return (
            !lastSection ||
            section.id !== lastSection.id ||
            section.content !== lastSection.content ||
            section.isEmpty !== lastSection.isEmpty
          );
        });

      if (!sectionsChanged) {
        // Return the same reference to prevent re-renders
        return lastStableSectionsRef.current;
      }

      // Update the stable reference only when sections actually changed
      lastStableSectionsRef.current = tempSections;
      return tempSections;
    }

    // Parse sections from current content when not editing (only when needed)
    if (currentDisplayContent) {
      try {
        const parsedSections = parseHtmlIntoSections(
          currentDisplayContent,
          getSectionName,
          SECTION_NAMES,
          SECTION_ORDER
        );
        const allSections = ensureAllStandardSections(parsedSections);
        lastStableSectionsRef.current = allSections;
        return allSections;
      } catch (error) {
        console.error("Error parsing sections:", error);
        return lastStableSectionsRef.current || [];
      }
    }

    return lastStableSectionsRef.current || [];
  }, [isEditing, tempSections, currentDisplayContent]);

  /**
   * Convert API data to our standardized format
   * Handles mapping between different property names and ensures consistent structure
   *
   * @param apiData - Raw data from API
   * @returns Formatted data with proper structure
   */
  const convertApiDataToOptimizedFormat = useCallback(
    (apiData: any): OptimizedResumeData => {
      console.log("Converting API data to optimized format:", apiData);

      // Convert keywords from API format to application format with enhanced normalization
      const formattedKeywords: Keyword[] = Array.isArray(apiData.keywords)
        ? apiData.keywords.map(normalizeKeyword)
        : [];

      // Convert suggestions from API format to application format with enhanced normalization
      const formattedSuggestions: Suggestion[] = Array.isArray(
        apiData.suggestions
      )
        ? apiData.suggestions.map(normalizeSuggestion)
        : [];

      // Log normalized data for debugging
      console.log("Normalized suggestions:", formattedSuggestions);
      console.log("Normalized keywords:", formattedKeywords);

      // Map to our OptimizedResumeData format with correct type handling
      return {
        id: apiData.id,
        original_text: apiData.original_text,
        optimized_text: apiData.optimized_text,
        last_saved_text: apiData.last_saved_text ?? undefined,
        last_saved_score_ats: apiData.last_saved_score_ats ?? undefined,
        language: apiData.language,
        file_name: apiData.file_name,
        file_type: apiData.file_type,
        file_size: apiData.file_size,
        ats_score: apiData.ats_score,
        selected_template: apiData.selected_template,
        keywords: formattedKeywords,
        suggestions: formattedSuggestions,
      };
    },
    []
  );

  /**
   * Load the latest resume for a user
   * Handles both the initial data loading and subsequent refresh requests
   *
   * @returns The loaded resume data or null if none found
   */
  const loadLatestResume = useCallback(async () => {
    // Don't attempt loading without a user ID
    if (!userId) {
      console.log("No user ID provided, skipping resume load");
      return null;
    }

    // Increment load attempt counter to prevent infinite loops
    loadAttemptRef.current += 1;

    // Prevent excessive load attempts
    if (loadAttemptRef.current > 3) {
      console.log("Maximum resume load attempts reached");
      return null;
    }

    try {
      // Set loading state to true to show loading UI
      setIsLoading(true);

      // Fetch latest resume from service
      const { data: apiData, error } = await getLatestOptimizedResume(userId);

      if (error) {
        console.error("Error loading resume:", error);
        throw error;
      }

      if (apiData) {
        console.log("Resume loaded successfully:", apiData.id);

        // Convert API data to standard format
        const optimizedData = convertApiDataToOptimizedFormat(apiData);

        // Update resume data state
        setResumeData(optimizedData);
        setHasResume(true);
        hasLoadedDataRef.current = true;

        // Store original text from optimized_text for reset functionality
        setOriginalText(optimizedData.optimized_text || "");

        // Determine which content to display
        // Priority: last_saved_text > optimized_text
        const contentToDisplay =
          optimizedData.last_saved_text || optimizedData.optimized_text || "";
        setOptimizedText(contentToDisplay);

        // Initialize temporary content with current content
        setTempEditedContent(contentToDisplay);

        // Set the original and current scores
        const baseScore = optimizedData.ats_score || 65;
        setOriginalAtsScore(baseScore);

        // Store initial score in ref for consistent improvement calculations
        if (initialScoreRef.current === null) {
          initialScoreRef.current = baseScore;
          console.log(`Setting initial score reference to ${baseScore}`);
        }

        // Use saved score if available, otherwise use original score
        const effectiveScore = isDefined(optimizedData.last_saved_score_ats)
          ? optimizedData.last_saved_score_ats
          : optimizedData.ats_score;
        setCurrentAtsScore(effectiveScore);

        // Set suggestions and keywords
        setSuggestions(optimizedData.suggestions || []);
        setKeywords(optimizedData.keywords || []);

        // Reset modification states initially
        setContentModified(false);
        setScoreModified(false);
        setHasTempChanges(false);

        // Set template if available
        if (optimizedData.selected_template) {
          setSelectedTemplate(optimizedData.selected_template);
        }

        return optimizedData;
      } else {
        // No resume found - this is expected for new users
        console.log("No resume found for user");
        setHasResume(false);
        hasLoadedDataRef.current = true;

        return null;
      }
    } catch (error) {
      console.error("Error loading resume:", error);
      toast.error("Error loading resume");
      setHasResume(false);
      return null;
    } finally {
      // Always reset loading state when finished, regardless of outcome
      setIsLoading(false);
    }
  }, [userId, convertApiDataToOptimizedFormat]);

  /**
   * ULTRA-OPTIMIZED EDIT MODE TOGGLE - Single source of truth with stable section management
   * Handles entering/exiting edit mode with proper content preservation and NO re-renders
   *
   * Key improvements:
   * - No more state conflicts between components
   * - Preserves changes when switching to preview mode
   * - Stable section parsing during editing with immutable updates
   * - Optimized section initialization to prevent editor re-initialization
   */
  const toggleEditMode = useCallback(() => {
    console.log(`🔄 Toggling edit mode: ${isEditing} -> ${!isEditing}`);

    if (!isEditing) {
      // ===== ENTERING EDIT MODE =====
      console.log("📝 Entering edit mode...");

      // Initialize temporary content with current optimized text
      const contentForEditing = optimizedText || "";
      setTempEditedContent(contentForEditing);

      // Parse sections ONCE when entering edit mode for stable editing
      // CRITICAL: This happens only once to prevent editor re-initialization
      try {
        const parsedSections = parseHtmlIntoSections(
          contentForEditing,
          getSectionName,
          SECTION_NAMES,
          SECTION_ORDER
        );
        const allSections = ensureAllStandardSections(parsedSections);

        // Set stable sections reference
        setTempSections(allSections);
        lastStableSectionsRef.current = allSections;

        console.log(`✅ Parsed ${allSections.length} sections for editing`);
      } catch (error) {
        console.error("❌ Error parsing sections for edit mode:", error);
        // Fallback to empty sections
        const emptySections: Section[] = [];
        setTempSections(emptySections);
        lastStableSectionsRef.current = emptySections;
      }

      // Reset temp changes flag
      setHasTempChanges(false);
    } else {
      // ===== EXITING EDIT MODE =====
      console.log("👁️ Exiting to preview mode...");

      // PRESERVE CHANGES: Update optimized text with temporary content
      if (hasTempChanges && tempEditedContent) {
        console.log("💾 Preserving temporary changes in preview mode");
        setOptimizedText(tempEditedContent);

        // Mark content as modified since we have unsaved changes
        setContentModified(true);
      }

      // Don't clear temporary content - keep it for potential re-editing
      // This allows seamless switching between edit and preview modes
    }

    // Toggle the edit mode
    setIsEditing(!isEditing);
  }, [isEditing, optimizedText, tempEditedContent, hasTempChanges]);

  /**
   * Handle content changes during editing - ULTRA-OPTIMIZED FOR STABLE FOCUS
   * Updates temporary content and tracks modifications WITHOUT causing cascading re-renders
   *
   * CRITICAL OPTIMIZATIONS:
   * - Immutable section updates with reference equality checks
   * - Deferred content combination to prevent immediate re-renders
   * - Stable reference returns when content hasn't changed
   * - Debounced combined content updates for performance
   *
   * @param sectionId - ID of the section being edited
   * @param newContent - New content for the section
   */
  const handleSectionEdit = useCallback(
    (sectionId: string, newContent: string) => {
      console.log(`📝 Section edit: ${sectionId}`);

      // Clear any pending content update timer
      if (contentUpdateTimerRef.current) {
        clearTimeout(contentUpdateTimerRef.current);
      }

      // Use functional update with ULTRA-OPTIMIZED immutable approach
      setTempSections((prevSections) => {
        // Find the section index for efficient update
        const sectionIndex = prevSections.findIndex(
          (section) => section.id === sectionId
        );

        if (sectionIndex === -1) {
          console.warn(`Section not found: ${sectionId}`);
          return prevSections; // Return same reference to prevent re-render
        }

        const currentSection = prevSections[sectionIndex];

        // CRITICAL: Check if content actually changed to avoid unnecessary updates
        if (currentSection.content === newContent) {
          return prevSections; // Return same reference to prevent re-render
        }

        // Create new sections array with ONLY the changed section updated
        const updatedSections = [...prevSections];
        const isEmpty = isSectionEmpty(newContent, currentSection.title);

        // Update only the specific section with immutable pattern
        updatedSections[sectionIndex] = {
          ...currentSection,
          content: newContent,
          isEmpty,
        };

        // DEFERRED CONTENT UPDATE: Combine sections after a short delay to prevent immediate re-renders
        // This allows the user to continue typing without triggering cascading updates
        contentUpdateTimerRef.current = setTimeout(() => {
          if (!pendingContentUpdateRef.current) {
            pendingContentUpdateRef.current = true;

            // Combine all non-empty sections into complete HTML
            const combinedContent = updatedSections
              .filter((section) => !section.isEmpty)
              .map(
                (section) =>
                  `<section id="${section.id}">${section.content}</section>`
              )
              .join("\n");

            // Update temporary content with the combined HTML
            setTempEditedContent(combinedContent);

            // Mark that we have temporary changes
            setHasTempChanges(true);
            setContentModified(true);

            pendingContentUpdateRef.current = false;
          }
        }, 150); // Small delay to allow smooth typing while still being responsive

        return updatedSections;
      });
    },
    []
  );

  /**
   * Handle general content changes (for compatibility with existing components)
   * OPTIMIZED to work with the new section-based editing system
   *
   * @param newContent - The new content
   */
  const handleContentEdit = useCallback(
    (newContent: string) => {
      if (isEditing) {
        setTempEditedContent(newContent);
        setHasTempChanges(true);
      } else {
        setOptimizedText(newContent);
      }
      setContentModified(true);

      // Re-calculate score based on the new content if needed
      const currentAppliedSuggestions = suggestions.filter(
        (s) => s.isApplied
      ).length;
      const currentAppliedKeywords = keywords.filter((k) => k.isApplied).length;

      // Get total point impact from suggestions
      const suggestionPoints = suggestions
        .filter((s) => s.isApplied)
        .reduce((total, s) => total + (s.pointImpact || 2), 0);

      // Get total point impact from keywords
      const keywordPoints = keywords
        .filter((k) => k.isApplied)
        .reduce((total, k) => total + (k.pointImpact || 1), 0);

      // Calculate score using base + exact point impacts
      const baseScore = initialScoreRef.current || originalAtsScore || 65;
      const newScore = Math.min(
        100,
        baseScore + suggestionPoints + keywordPoints
      );

      // Update the score and mark it as modified if it changed
      if (newScore !== currentAtsScore) {
        console.log(
          `Recalculating score: ${baseScore} + ${suggestionPoints} + ${keywordPoints} = ${newScore}`
        );
        setCurrentAtsScore(newScore);
        setScoreModified(true);
      }
    },
    [isEditing, suggestions, keywords, originalAtsScore, currentAtsScore]
  );

  /**
   * Save the edited resume content, score, applied enhancements and template
   * Updates the database with all current changes via service
   *
   * @param newContent - Optional content to save instead of current content
   * @param templateId - Optional template ID to save
   * @returns Boolean indicating if save was successful
   */
  const saveResume = useCallback(
    async (newContent?: string, templateId?: string) => {
      // Use provided content, or temporary content if editing, or optimized text
      const contentToSave =
        newContent || (isEditing ? tempEditedContent : optimizedText);

      // Use provided template ID or current selected template
      const templateToSave = templateId || selectedTemplate;

      // Validate required data
      if (!userId || !resumeData?.id || !contentToSave) {
        console.error("Cannot save: Missing data", {
          userId,
          resumeId: resumeData?.id,
          contentLength: contentToSave?.length,
        });
        toast.error("Cannot save: Missing data");
        return false;
      }

      try {
        // Set saving state to show loading indicators
        setIsSaving(true);

        // Get all applied suggestion IDs
        const appliedSuggestionIds = suggestions
          .filter((s) => s.isApplied)
          .map((s) => s.id);

        // Get all applied keywords
        const appliedKeywords = keywords
          .filter((k) => k.isApplied)
          .map((k) => k.text);

        // Log saving attempt with complete details
        console.log("💾 Saving resume with atomic transaction:", {
          resumeId: resumeData.id,
          contentLength: contentToSave.length,
          atsScore: currentAtsScore || 0,
          appliedSuggestions: appliedSuggestionIds.length,
          appliedKeywords: appliedKeywords.length,
          template: templateToSave,
        });

        // Use the updated atomic save function that handles all changes in a single transaction
        const { success, error } = await saveResumeComplete(
          resumeData.id,
          contentToSave,
          currentAtsScore || 0,
          appliedSuggestionIds,
          appliedKeywords,
          templateToSave
        );

        // Handle errors from the service
        if (!success) {
          console.error("Error from saveResumeComplete:", error);
          throw error;
        }

        // Update local state with the saved data
        setResumeData({
          ...resumeData,
          last_saved_text: contentToSave,
          last_saved_score_ats: currentAtsScore,
          selected_template: templateToSave,
        });

        // Update optimized text to reflect the saved content
        setOptimizedText(contentToSave);

        // Update temporary content to match saved content
        setTempEditedContent(contentToSave);

        // Update selected template with the saved template
        setSelectedTemplate(templateToSave);

        // Reset all modification flags since everything is now saved
        setContentModified(false);
        setScoreModified(false);
        setTemplateModified(false);
        setHasTempChanges(false);

        console.log("✅ Save completed successfully");

        return true;
      } catch (error) {
        // Handle and display errors
        console.error("❌ Error saving resume:", error);
        toast.error("Failed to save changes");
        return false;
      } finally {
        // Always reset the saving state when done
        setIsSaving(false);
      }
    },
    [
      userId,
      resumeData,
      isEditing,
      tempEditedContent,
      optimizedText,
      currentAtsScore,
      suggestions,
      keywords,
      selectedTemplate,
    ]
  );

  /**
   * Reset changes to the original optimized version
   * Clears all edits and applied enhancements via service
   *
   * @returns Boolean indicating if reset was successful
   */
  const resetResume = useCallback(async () => {
    if (!userId || !resumeData?.id) {
      toast.error("Cannot reset: Missing data");
      return false;
    }

    try {
      setIsResetting(true);

      // Use resumeService to reset resume to original version
      const { success, error } = await resetResumeToOriginal(resumeData.id);

      if (!success) throw error;

      // Update local state with type safety
      if (resumeData) {
        setResumeData({
          ...resumeData,
          last_saved_text: undefined,
          last_saved_score_ats: undefined,
        });
      }

      // Reset all content to original
      setOptimizedText(originalText);
      setTempEditedContent(originalText);

      // Reset score to original
      setCurrentAtsScore(originalAtsScore);

      // Reset suggestions and keywords state
      setSuggestions((prevSuggestions) =>
        prevSuggestions.map((s) => ({ ...s, isApplied: false }))
      );
      setKeywords((prevKeywords) =>
        prevKeywords.map((k) => ({ ...k, isApplied: false, applied: false }))
      );

      // Reset editing state and modifications
      setIsEditing(false);
      setContentModified(false);
      setScoreModified(false);
      setTemplateModified(false);
      setHasTempChanges(false);

      // Clear temporary sections and stable references
      setTempSections([]);
      lastStableSectionsRef.current = [];

      toast.success("Resume reset to original version");
      return true;
    } catch (error) {
      console.error("Error resetting resume:", error);
      toast.error("Failed to reset resume");
      return false;
    } finally {
      setIsResetting(false);
    }
  }, [userId, resumeData, originalText, originalAtsScore]);

  /**
   * Apply or unapply a suggestion - LOCAL STATE ONLY
   * Updates ONLY local suggestion state and recalculates ATS score
   * Uses the exact point impact from the suggestion for accurate score updates
   *
   * @param suggestionId - ID of the suggestion to apply/unapply
   * @param applyState - Optional boolean to force specific state (true/false)
   * @returns Boolean indicating if operation was successful
   */
  const handleApplySuggestion = useCallback(
    (suggestionId: string, applyState?: boolean) => {
      console.log("handleApplySuggestion called with:", {
        suggestionId,
        applyState,
        resumeId: resumeData?.id,
        currentScore: currentAtsScore,
        originalScore: originalAtsScore,
      });

      if (!resumeData?.id) {
        console.error("Cannot apply suggestion: No resume data available");
        return false;
      }

      // Find the suggestion
      const suggestion = suggestions.find((s) => s.id === suggestionId);

      if (!suggestion) {
        console.error("Suggestion not found with ID:", suggestionId);
        return false;
      }

      // Determine new applied state (toggle if not specified)
      const newIsApplied =
        applyState !== undefined ? applyState : !suggestion.isApplied;

      try {
        // Update local state ONLY - no API call
        setSuggestions((prevSuggestions) =>
          prevSuggestions.map((s) =>
            s.id === suggestionId ? { ...s, isApplied: newIsApplied } : s
          )
        );

        // Get the exact point impact from the suggestion, with fallback to default
        const exactPointImpact = suggestion.pointImpact || 2;

        // Update score locally with exact point impact
        const scoreDelta = newIsApplied ? exactPointImpact : -exactPointImpact;

        setCurrentAtsScore((prevScore) => {
          if (!prevScore)
            return initialScoreRef.current || originalAtsScore || 65;
          const newScore = prevScore + scoreDelta;
          console.log(
            `Score update: ${prevScore} ${
              newIsApplied ? "+" : "-"
            } ${exactPointImpact} = ${newScore}`
          );
          return Math.min(100, Math.max(0, newScore));
        });

        // Mark content and score as modified
        setContentModified(true);
        setScoreModified(true);

        return true;
      } catch (error) {
        console.error("Error applying suggestion locally:", error);
        toast.error("Failed to apply suggestion");
        return false;
      }
    },
    [resumeData?.id, suggestions, originalAtsScore]
  );

  /**
   * Apply or unapply a keyword - LOCAL STATE ONLY
   * Updates ONLY local keyword state and recalculates ATS score
   * Uses the exact point impact from the keyword for accurate score updates
   *
   * @param keywordId - ID of the keyword to apply/unapply
   * @param applyState - Optional boolean to force specific state (true/false)
   * @returns Boolean indicating if operation was successful
   */
  const handleKeywordApply = useCallback(
    (keywordId: string, applyState?: boolean) => {
      console.log("handleKeywordApply called with:", {
        keywordId,
        applyState,
        resumeId: resumeData?.id,
        currentScore: currentAtsScore,
        originalScore: originalAtsScore,
      });

      if (!resumeData?.id) {
        console.error("Cannot apply keyword: No resume data available");
        return false;
      }

      // Find the keyword
      const keyword = keywords.find((k) => k.id === keywordId);

      if (!keyword) {
        console.error("Keyword not found with ID:", keywordId);
        return false;
      }

      // Determine new applied state (toggle if not specified)
      const newIsApplied =
        applyState !== undefined ? applyState : !keyword.isApplied;

      try {
        // Update local state ONLY - no API call
        setKeywords((prevKeywords) =>
          prevKeywords.map((k) =>
            k.id === keywordId
              ? { ...k, isApplied: newIsApplied, applied: newIsApplied }
              : k
          )
        );

        // Get the exact point impact from the keyword, with fallback to default
        const exactPointImpact = keyword.pointImpact || 1;

        // Update score locally with exact point impact
        const scoreDelta = newIsApplied ? exactPointImpact : -exactPointImpact;

        setCurrentAtsScore((prevScore) => {
          if (!prevScore)
            return initialScoreRef.current || originalAtsScore || 65;
          const newScore = prevScore + scoreDelta;
          console.log(
            `Score update: ${prevScore} ${
              newIsApplied ? "+" : "-"
            } ${exactPointImpact} = ${newScore}`
          );
          return Math.min(100, Math.max(0, newScore));
        });

        // Mark content and score as modified
        setContentModified(true);
        setScoreModified(true);

        return true;
      } catch (error) {
        console.error("Error applying keyword locally:", error);
        toast.error("Failed to apply keyword");
        return false;
      }
    },
    [resumeData?.id, keywords, originalAtsScore]
  );

  /**
   * Update resume state with optimized data from API or upload
   * Used after initial optimization to populate all components
   *
   * @param optimizedTextContent - The optimized text content
   * @param resumeId - ID of the resume
   * @param scoreValue - ATS score value
   * @param suggestionsData - Array of suggestions
   * @param keywordsData - Array of keywords
   */
  const updateResumeWithOptimizedData = useCallback(
    (
      optimizedTextContent: string,
      resumeId: string,
      scoreValue: number,
      suggestionsData: any[], // Type any[] to accept different structures
      keywordsData: any[] // Type any[] to accept different structures
    ) => {
      console.log("Updating resume with optimized data:", {
        resumeId,
        scoreValue,
        suggestionsCount: suggestionsData?.length || 0,
        keywordsCount: keywordsData?.length || 0,
      });

      // Normalize suggestions to ensure consistent structure
      const normalizedSuggestions = Array.isArray(suggestionsData)
        ? suggestionsData.map((suggestion, index) => {
            if (!suggestion.id) {
              console.warn(
                `Suggestion without ID detected (index ${index}):`,
                suggestion
              );
            }
            return normalizeSuggestion(suggestion);
          })
        : [];

      // Normalize keywords to ensure consistent structure
      const normalizedKeywords = Array.isArray(keywordsData)
        ? keywordsData.map((keyword, index) => {
            if (typeof keyword !== "string" && !keyword.id) {
              console.warn(
                `Keyword without ID detected (index ${index}):`,
                keyword
              );
            }
            return normalizeKeyword(keyword);
          })
        : [];

      console.log("Normalized suggestions:", normalizedSuggestions);
      console.log("Normalized keywords:", normalizedKeywords);

      // Update content state
      setOriginalText(optimizedTextContent);
      setOptimizedText(optimizedTextContent);
      setTempEditedContent(optimizedTextContent); // Initialize temporary content

      // Update score state and track initial score for future reference
      setOriginalAtsScore(scoreValue);
      setCurrentAtsScore(scoreValue);

      // Set initial score reference for accurate improvement calculations
      if (initialScoreRef.current === null) {
        initialScoreRef.current = scoreValue;
        console.log(`Setting initial score reference to ${scoreValue}`);
      }

      // Update enhancements state with normalized data
      setSuggestions(normalizedSuggestions);
      setKeywords(normalizedKeywords);

      // Reset modification tracking
      setContentModified(false);
      setScoreModified(false);
      setHasTempChanges(false);

      // Clear any temporary sections and stable references
      setTempSections([]);
      lastStableSectionsRef.current = [];

      // Fetch the complete resume data if not already available
      if (!resumeData || resumeData.id !== resumeId) {
        getLatestOptimizedResume(userId || "")
          .then(({ data: apiData }) => {
            if (apiData) {
              const optimizedData = convertApiDataToOptimizedFormat(apiData);
              setResumeData(optimizedData);
              setHasResume(true);

              if (optimizedData.selected_template) {
                setSelectedTemplate(optimizedData.selected_template);
              }
            }
          })
          .catch((error) =>
            console.error("Error fetching resume data:", error)
          );
      }

      // Mark that we now have resume data
      setHasResume(true);
      hasLoadedDataRef.current = true;

      // Switch to preview tab
      setActiveTab("preview");

      // Show optimization success toast
      toast.success("Resume optimized successfully!", {
        description: "Your resume has been analyzed and improved by our AI.",
        duration: 5000,
      });
    },
    [resumeData, userId, convertApiDataToOptimizedFormat]
  );

  /**
   * Update template selection
   *
   * @param templateId - ID of the template to select
   * @returns Boolean indicating if operation was successful
   */
  const updateSelectedTemplate = useCallback(
    (templateId: string) => {
      try {
        // Skip if template hasn't changed
        if (templateId === selectedTemplate) {
          return true;
        }

        // Update local state only - template will be saved with other changes
        setSelectedTemplate(templateId);

        // Mark template as modified to enable save button
        setTemplateModified(true);
        setContentModified(true);

        console.log(`Template changed to ${templateId}, marked as modified`);

        return true;
      } catch (error) {
        console.error("Error updating template:", error);
        toast.error("Failed to update template");
        return false;
      }
    },
    [selectedTemplate]
  );

  /**
   * Check if there are unsaved changes
   * Used to warn users before navigating away
   *
   * @returns Boolean indicating if there are unsaved changes
   */
  const hasUnsavedChanges = useCallback(() => {
    return (
      contentModified || scoreModified || templateModified || hasTempChanges
    );
  }, [contentModified, scoreModified, templateModified, hasTempChanges]);

  /**
   * Get array of applied keywords for templates
   *
   * @returns Array of applied keyword texts
   */
  const getAppliedKeywords = useCallback(() => {
    return keywords
      .filter((keyword) => keyword.isApplied)
      .map((keyword) => keyword.text);
  }, [keywords]);

  /**
   * Calculate the current completion score
   * Based on applied suggestions and keywords
   *
   * @returns Score between 0-100
   */
  const calculateCompletionScore = useCallback(() => {
    if (!suggestions.length && !keywords.length) return 0;

    const appliedSuggestions = suggestions.filter((s) => s.isApplied).length;
    const appliedKeywords = keywords.filter((k) => k.isApplied).length;

    const totalItems = suggestions.length + keywords.length;
    const appliedItems = appliedSuggestions + appliedKeywords;

    return Math.round((appliedItems / totalItems) * 100);
  }, [suggestions, keywords]);

  /**
   * Checks if the save button should be enabled
   * Called by UI components to determine button state
   *
   * @returns Boolean indicating if save button should be enabled
   */
  const shouldEnableSaveButton = useCallback(() => {
    return (
      contentModified || scoreModified || templateModified || hasTempChanges
    );
  }, [contentModified, scoreModified, templateModified, hasTempChanges]);

  // ===== EFFECTS =====

  // Cleanup effect for timers
  useEffect(() => {
    return () => {
      if (contentUpdateTimerRef.current) {
        clearTimeout(contentUpdateTimerRef.current);
      }
    };
  }, []);

  // Check for session storage welcome toast on mount
  useEffect(() => {
    try {
      const lastToastTime = sessionStorage.getItem("welcomeToastTime");

      if (lastToastTime) {
        const lastTime = parseInt(lastToastTime, 10);
        const currentTime = Date.now();

        // If a toast was shown in the last 15 minutes, mark it as already displayed
        if (currentTime - lastTime < 15 * 60 * 1000) {
          // 15 minutes in ms
          welcomeToastDisplayedRef.current = true;
          setToastShown(true);
        }
      }
    } catch (e) {
      // Ignore session storage errors
    }

    return () => {
      // On unmount, save the toast time if a toast has been displayed
      if (welcomeToastDisplayedRef.current) {
        try {
          sessionStorage.setItem("welcomeToastTime", Date.now().toString());
        } catch (e) {
          // Ignore session storage errors
        }
      }
    };
  }, []);

  // Load resume on initial mount if userId is available
  useEffect(() => {
    if (userId && hasResume === null && !hasLoadedDataRef.current) {
      loadLatestResume();
    }
  }, [userId, hasResume, loadLatestResume]);

  // Improved effect for welcome toasts that handles loading transitions correctly
  useEffect(() => {
    // Skip if toast has already been shown in this component instance
    if (toastShown) {
      return;
    }

    // The key logic: Only show toast when loading transitions from true to false
    const wasLoading = previousLoadingState.current;
    previousLoadingState.current = isLoading;

    // If we weren't loading before and we're still not loading now, skip
    // Or if we're still loading, skip
    if ((!wasLoading && !isLoading) || isLoading) {
      return;
    }

    // At this point, we know:
    // 1. Toast has not been shown yet in this session/component
    // 2. We just finished loading (transition from loading=true to loading=false)
    // 3. We know whether the user has a resume or not

    // Skip if we still don't know resume status
    if (hasResume === null) {
      return;
    }

    // Mark toast as shown
    setToastShown(true);
    welcomeToastDisplayedRef.current = true;

    // Save toast time to session storage
    try {
      sessionStorage.setItem("welcomeToastTime", Date.now().toString());
    } catch (e) {
      // Ignore session storage errors
    }
  }, [hasResume, isLoading, toastShown]);

  // Return the hook interface with all state values and functions
  return {
    // ===== CORE STATE =====
    resumeData,
    originalText,
    optimizedText,
    originalAtsScore,
    currentAtsScore,
    suggestions,
    keywords,
    selectedTemplate,
    hasResume,
    activeTab,

    // ===== ULTRA-OPTIMIZED EDITING STATE (CENTRALIZED) =====
    isEditing,
    tempEditedContent,
    tempSections,
    hasTempChanges,

    // ===== COMPUTED STATE WITH STABLE REFERENCES =====
    currentDisplayContent,
    currentSections,

    // ===== MODIFICATION FLAGS =====
    contentModified,
    scoreModified,
    templateModified,

    // ===== LOADING STATES =====
    isLoading,
    isSaving,
    isResetting,

    // ===== CORE ACTIONS =====
    setActiveTab,
    toggleEditMode, // CENTRALIZED - replaces setIsEditing
    loadLatestResume,
    saveResume,
    resetResume,

    // ===== ULTRA-OPTIMIZED EDITING ACTIONS =====
    handleContentEdit,
    handleSectionEdit, // ULTRA-OPTIMIZED - for section-specific editing
    handleApplySuggestion,
    handleKeywordApply,
    updateResumeWithOptimizedData,
    updateSelectedTemplate,

    // ===== UTILITY FUNCTIONS =====
    getAppliedKeywords,
    hasUnsavedChanges,
    calculateCompletionScore,
    shouldEnableSaveButton,

    // ===== DIRECT STATE SETTERS (LIMITED ACCESS) =====
    setOptimizedText,
    setCurrentAtsScore,
    setSuggestions,
    setKeywords,
    setContentModified,
    setScoreModified,
    setSelectedTemplate,
    setTemplateModified,
  };
};

export default useResumeOptimizer;
