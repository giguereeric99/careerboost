/**
 * CSS Styles for TipTap Resume Editor
 * 
 * Contains basic styling for the editor content:
 * - Base typography and spacing
 * - Section-specific customizations
 * - Removed drag and drop functionality for a more rigid structure
 */

/**
 * CSS for styling the editor content
 * Simplified version without drag and drop styling
 */
export const editorStyles = `
  /* =============================================== */
  /* Base editor styles */
  /* =============================================== */
  
  .ProseMirror {
    padding: 1rem;
    min-height: 450px;
    position: relative;
  }
  
  .ProseMirror:focus {
    outline: none;
  }
  
  /* Base typography */
  .ProseMirror h1 {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  
  .ProseMirror h2 {
    font-size: 18px;
    font-weight: bold;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    border-bottom: 1px solid #ddd;
    padding-bottom: 0.25rem;
  }
  
  .ProseMirror h3 {
    font-size: 16px;
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .ProseMirror p {
    margin-bottom: 0.5rem;
  }
  
  /* Lists */
  .ProseMirror ul, .ProseMirror ol {
    padding-left: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  .ProseMirror li {
    margin-bottom: 0.25rem;
  }
  
  /* =============================================== */
  /* Section styling (simplified) */
  /* =============================================== */
  
  /* Base section styling - just visual separation */
  .ProseMirror section, 
  .ProseMirror div[data-section-id] {
    position: relative;
    margin-bottom: 1.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px dotted #eee;
    border-radius: 4px;
  }
  
  .ProseMirror section:last-child, 
  .ProseMirror div[data-section-id]:last-child {
    border-bottom: none;
  }
  
  /* Simple hover effect for visual feedback */
  .ProseMirror section:hover, 
  .ProseMirror div[data-section-id]:hover {
    background-color: rgba(59, 130, 246, 0.03);
  }
  
  /* =============================================== */
  /* Special Section Styling */
  /* =============================================== */
  
  /* Special styling for resume sections */
  .ProseMirror [id="resume-header"] h1, 
  .ProseMirror [data-section-id="resume-header"] h1 {
    font-size: 28px;
    color: #2c3e50;
  }
  
  .ProseMirror [id="resume-summary"],
  .ProseMirror [data-section-id="resume-summary"] {
    background-color: #f9f9f9;
    padding: 0.5rem;
    border-radius: 0.25rem;
  }
  
  .ProseMirror [id="resume-experience"] h3,
  .ProseMirror [data-section-id="resume-experience"] h3 {
    color: #2980b9;
  }
  
  .ProseMirror [id="resume-skills"] ul,
  .ProseMirror [data-section-id="resume-skills"] ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    list-style: none;
    padding-left: 0;
  }
  
  .ProseMirror [id="resume-skills"] li,
  .ProseMirror [data-section-id="resume-skills"] li {
    background-color: #e1f5fe;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }
  
  /* Interests section styling */
  .ProseMirror [id="resume-interests"] ul,
  .ProseMirror [data-section-id="resume-interests"] ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .ProseMirror [id="resume-interests"] li,
  .ProseMirror [data-section-id="resume-interests"] li {
    background-color: #f0f4f8;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }
  
  /* =============================================== */
  /* Editor Keywords and Suggestions Styling */
  /* =============================================== */
  
  .editor-keyword {
    color: #3498db;
    background-color: #e1f5fe;
    padding: 2px 4px;
    border-radius: 2px;
    font-size: 0.9em;
  }
  
  .editor-suggestion {
    color: #27ae60;
    background-color: #e8f5e9;
    padding: 2px 4px;
    border-radius: 2px;
    font-style: italic;
  }
  
  /* Remove any leftover drag handles created by AI */
  .drag-handle {
    display: none !important;
  }
`;