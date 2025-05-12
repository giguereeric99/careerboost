/**
   * Handle save button click
   */
const handleSave = useCallback(async () => {
  if (isSaving) return;
  
  try {
    setIsSaving(true);
    
    let combinedHtml = combineAllSections();
    combinedHtml = processContent(combinedHtml);
    
    if (combinedHtml.length < 50) {
      toast.error("Content too short", {
        description: "Resume content must be at least 50 characters."
      });
      return;
    }
    
    const saveResult = await Promise.resolve(onSave(combinedHtml));
    
    if (saveResult) {
      setContentModified(false);
      // Keep hasBeenModified true
      
      toast.success("Resume saved successfully");
      onTextChange(combinedHtml);
      setPreviewContent(combinedHtml);
      setEditMode(false);
    } else {
      toast.error("Failed to save resume");
    }
  } catch (error) {
    console.error("Error saving resume:", error);
    toast.error("Failed to save resume");
  } finally {
    setIsSaving(false);
  }
}, [isSaving, combineAllSections, processContent, onSave, onTextChange]);

/**
 * Toggle edit mode on/off with no confirmation dialog
 */
const toggleEditMode = useCallback(() => {
  setEditMode(prev => !prev);
}, []);

/**
 * Open preview in new window
 */
const openPreview = useCallback(() => {
  try {
    const template = getTemplateById(selectedTemplate);
    const contentToUse = editMode ? combineAllSections() : (previewContent || optimizedText);
    const completeHtml = createCompleteHtml(template, contentToUse);
    
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(completeHtml);
      previewWindow.document.close();
    }
  } catch (error) {
    console.error("Error opening preview:", error);
    toast.error("Failed to open preview");
  }
}, [selectedTemplate, combineAllSections, editMode, previewContent, optimizedText]);

/**
 * Reset modifications state (not the actual reset action)
 * Used after performing an actual reset operation
 */
const resetModificationsState = useCallback(() => {
  setContentModified(false);
  setHasBeenModified(false);
  setPreviewContent(optimizedText);
}, [optimizedText]);

/**
 * Get the content for display
 * Uses previewContent if available, falls back to optimizedText
 */
const displayContent = useMemo(() => {
  return previewContent || optimizedText;
}, [previewContent, optimizedText]);

// Return state and functions for component use
return {
  // State
  editMode,
  isSaving,
  sections,
  contentModified,
  hasBeenModified,
  previewContent,
  shouldShowReset,
  displayContent,
  
  // Actions
  setEditMode,
  toggleEditMode,
  handleSectionUpdate,
  handleSave,
  openPreview,
  combineAllSections,
  resetModificationsState,
  
  // Utilities
  processContent,
  sanitizeHtml
};