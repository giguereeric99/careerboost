/**
 * Compact Template Styles - 2 COLUMNS SPACE-OPTIMIZED FOR MAXIMUM CONTENT DENSITY
 * Ultra-efficient design that maximizes content per page while maintaining readability
 * Features: Condensed spacing, optimized typography, 2-column layout, minimal margins
 * Perfect for professionals with extensive experience who need everything on one page
 */

export const compactStyles = `
  /* === GLOBAL STYLES WITH SPACE OPTIMIZATION === */
  body {
    font-family: 'Arial', 'Helvetica', sans-serif;
    margin: 0;
    padding: 20px; /* Reduced padding for space efficiency */
    color: #2c3e50;
    background-color: #ffffff;
    line-height: 1.4; /* Compact line height for density */
    font-size: 11px; /* Smaller base font for more content */
  }

  /* === MAIN CONTAINER WITH COMPACT DIMENSIONS === */
  .compact-resume-container {
    background: #ffffff;
    max-width: 850px; /* Optimized width for 2-column layout */
    margin: 0 auto;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    border-radius: 4px; /* Minimal border radius */
    overflow: hidden;
    min-height: 800px;
    height: auto;
    position: relative;
  }

  /* === ULTRA-COMPACT HEADER SECTION === */
  .compact-header {
    background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
    color: #ffffff;
    padding: 15px 25px; /* Minimal padding for space efficiency */
    border-bottom: 2px solid #3498db;
    position: relative;
  }

  .compact-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 15px;
  }

  .compact-header-primary {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .compact-name {
    font-size: 22px; /* Reduced from typical 28-32px */
    font-weight: 700;
    margin: 0;
    color: #ffffff;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .compact-title-separator {
    color: #bdc3c7;
    font-size: 18px;
    margin: 0 8px;
  }

  .compact-title {
    font-size: 14px; /* Compact title size */
    font-weight: 500;
    margin: 0;
    color: #ecf0f1;
    font-style: italic;
  }

  .compact-header-contacts {
    display: flex;
    align-items: center;
    gap: 4px; /* Minimal gap between contacts */
    flex-wrap: wrap;
    font-size: 10px; /* Very compact contact info */
  }

  .compact-contact-item {
    color: #ecf0f1;
    font-weight: 400;
    white-space: nowrap;
  }

  .compact-contact-separator {
    color: #bdc3c7;
    margin: 0 6px;
    font-size: 8px;
  }

  /* === 2-COLUMN LAYOUT WITH SPACE OPTIMIZATION === */
  .compact-content-wrapper {
    display: grid;
    grid-template-columns: 1fr 2fr; /* Balanced 2-column layout: 1:2 ratio */
    gap: 15px; /* Minimal gap between columns */
    padding: 15px; /* Reduced padding */
    min-height: 600px;
    height: auto;
    overflow: visible;
  }

  /* === LEFT COLUMN - SKILLS AND SUPPLEMENTARY INFO === */
  .compact-left-column {
    background: #f8f9fa;
    padding: 12px; /* Compact padding */
    border-radius: 4px;
    border-right: 1px solid #e9ecef;
    height: auto;
    overflow: visible;
  }

  /* === RIGHT COLUMN - PRIMARY CONTENT === */
  .compact-right-column {
    padding: 12px; /* Compact padding */
    background: #ffffff;
    height: auto;
    overflow: visible;
  }

  /* === COMPACT SECTION STYLING === */
  .compact-section {
    margin-bottom: 18px; /* Reduced section spacing */
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .compact-section-title {
    margin: 0 0 8px 0; /* Minimal title margin */
    position: relative;
  }

  .compact-section-title-wrapper {
    display: flex;
    align-items: center;
    gap: 6px; /* Compact gap */
    padding: 6px 8px; /* Minimal padding */
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    border-radius: 3px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .compact-section-icon {
    width: 12px; /* Small icon for space efficiency */
    height: 12px;
    filter: invert(1); /* White icons on colored background */
  }

  .compact-section-title-text {
    color: #ffffff;
    font-size: 11px; /* Compact title text */
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex: 1;
  }

  /* === SECTION CONTENT STYLING === */
  .compact-section-content {
    margin-top: 8px; /* Minimal content margin */
  }

  .compact-left-content {
    font-size: 10px; /* Smaller font for sidebar content */
    line-height: 1.3;
  }

  .compact-right-content {
    font-size: 11px; /* Slightly larger for main content */
    line-height: 1.4;
  }

  /* === TAGS DISPLAY STYLE - FOR SKILLS, LANGUAGES, INTERESTS === */
  .compact-tags-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px; /* Minimal gap between tags */
  }

  .compact-tag-item {
    background: #ffffff;
    border: 1px solid #dee2e6;
    padding: 4px 6px 2px; /* Compact tag padding */
    border-radius: 10px;
    font-size: 9px; /* Very compact tag text */
    font-weight: 500;
    color: #495057;
    transition: all 0.2s ease;
    display: inline-block;
    margin: 0;
  }

  .compact-tag-item > *,
  .compact-simple-item > *,
  .compact-left-content li > *,
  .compact-right-content li > * {
    margin: 0 !important;
    padding: 0 !important;
  }

  /* === FIX FOR ORDERED LISTS ALIGNMENT === */
  
  /* Fix ordered lists that extend too far left */
  ol {
    padding-left: 16px !important;
    margin-left: 0 !important;
  }

  .compact-section-content ol,
  .compact-left-content ol,
  .compact-right-content ol {
    padding-left: 16px !important;
    margin-left: 0 !important;
  }

  /* Ensure ordered list items have proper spacing */
  ol li {
    padding-left: 4px !important;
    margin-left: 0 !important;
  }

  ol li:before {
    content: unset !important;
  }

  .compact-tag-item:hover {
    background: #3498db;
    color: #ffffff;
    border-color: #3498db;
  }

  /* === TIMELINE STYLE - FOR EXPERIENCE === */
  .compact-timeline-item {
    position: relative;
    margin-bottom: 15px; /* Compact spacing between items */
    padding: 10px; /* Reduced padding */
    background: #f8f9fa;
    border-radius: 4px;
    border-left: 3px solid #3498db;
  }

  .compact-timeline-item h3 {
    color: #2c3e50;
    font-size: 13px; /* Compact job title */
    font-weight: 600;
    margin: 0 0 4px 0;
    line-height: 1.2;
  }

  .compact-timeline-item .company {
    color: #7f8c8d;
    font-size: 11px;
    font-weight: 500;
    margin: 0 0 3px 0;
  }

  .compact-timeline-item .period {
    color: #95a5a6;
    font-size: 9px;
    font-style: italic;
    margin: 0 0 8px 0;
  }

  .compact-timeline-item ul {
    margin: 6px 0 0 0;
    padding-left: 12px; /* Compact list padding */
  }

  .compact-timeline-item li {
    color: #2c3e50;
    font-size: 10px;
    line-height: 1.3;
    margin: 3px 0; /* Minimal list item spacing */
  }

  /* === CARD STYLE - FOR EDUCATION, PROJECTS, SUMMARY === */
  .compact-card-item {
    margin-bottom: 12px; /* Compact card spacing */
    padding: 8px; /* Reduced padding */
    background: #ffffff;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .compact-card-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-color: #3498db;
  }

  .compact-card-item h3 {
    color: #2c3e50;
    font-size: 12px; /* Compact card title */
    font-weight: 600;
    margin: 0 0 4px 0;
    line-height: 1.2;
  }

  .compact-card-item .institution,
  .compact-card-item .company {
    color: #7f8c8d;
    font-size: 10px;
    margin: 0 0 3px 0;
  }

  .compact-card-item .period {
    color: #95a5a6;
    font-size: 9px;
    font-style: italic;
    margin: 0 0 6px 0;
  }

  .compact-card-item p {
    margin: 0 0 6px 0;
    line-height: 1.3;
    font-size: 10px;
    color: #2c3e50;
  }

  /* === SIMPLE LIST STYLE - FOR PUBLICATIONS, VOLUNTEERING, REFERENCES === */
  .compact-simple-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .compact-simple-item {
    padding: 4px 0; /* Minimal item padding */
    border-bottom: 1px solid #f1f2f6;
    font-size: 10px;
    line-height: 1.3;
    color: #2c3e50;
    margin: 0;
  }

  .compact-simple-item:last-child {
    border-bottom: none;
  }

  .compact-simple-item:hover {
    background: rgba(52, 152, 219, 0.05);
    padding-left: 4px;
    transition: all 0.2s ease;
  }

  /* === SPECIFIC SECTION ENHANCEMENTS === */
  
  /* Skills Section - Enhanced tag display */
  .compact-skills-section .compact-tag-item {
    background: linear-gradient(135deg, #e8f4fd 0%, #d6eaff 100%);
    border-color: #3498db;
    color: #2980b9;
  }

  .compact-skills-section .compact-tag-item:hover {
    background: #3498db;
    color: #ffffff;
    transform: translateY(-1px);
  }

  /* Languages Section - Level indicators */
  .compact-languages-section .compact-tag-item {
    background: linear-gradient(135deg, #f0e6ff 0%, #e6d7ff 100%);
    border-color: #9b59b6;
    color: #8e44ad;
    position: relative;
  }

  .compact-languages-section .compact-tag-item:hover {
    background: #9b59b6;
    color: #ffffff;
  }

  /* Add language level dots for visual indication */
  .compact-languages-section .compact-tag-item::after {
    content: '●●●';
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 6px;
    opacity: 0.6;
  }

  /* Certifications Section - Date emphasis */
  .compact-certifications-section .compact-simple-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .compact-certifications-section .compact-simple-item .cert-date {
    font-size: 8px;
    color: #95a5a6;
    font-weight: 500;
  }

  /* Awards Section - Achievement styling */
  .compact-awards-section .compact-simple-item {
    padding-left: 12px;
    position: relative;
  }

  .compact-awards-section .compact-simple-item::before {
    content: '🏆';
    position: absolute;
    left: 0;
    top: 4px;
    font-size: 8px;
  }

  /* Experience Section - Timeline enhancements */
  .compact-experience-section .compact-timeline-item::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 15px;
    width: 8px;
    height: 8px;
    background: #3498db;
    border-radius: 50%;
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 1px #3498db;
  }

  /* Projects Section - Tech stack tags */
  .compact-projects-section .compact-card-item .tech-stack {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 6px;
  }

  .compact-projects-section .compact-card-item .tech-tag {
    background: #ecf0f1;
    padding: 1px 4px;
    border-radius: 8px;
    font-size: 8px;
    color: #2c3e50;
    border: 1px solid #bdc3c7;
  }

  /* Education Section - Degree emphasis */
  .compact-education-section .compact-card-item h3 {
    color: #27ae60;
  }

  .compact-education-section .compact-card-item {
    border-left: 3px solid #27ae60;
  }

  /* Summary Section - Quote styling */
  .compact-summary-section .compact-section-content {
    font-style: italic;
    padding: 8px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 4px;
    border-left: 3px solid #3498db;
    position: relative;
  }

  @media (max-width: 768px) {
    body {
      padding: 10px;
      font-size: 13px; /* Larger on mobile for readability */
    }

    .compact-resume-container {
      max-width: 100%;
      border-radius: 2px;
    }

    .compact-content-wrapper {
      grid-template-columns: 1fr; /* Single column on tablets */
      gap: 10px;
    }

    .compact-left-column {
      order: 2;
    }

    .compact-right-column {
      order: 1;
    }

    .compact-header {
      padding: 12px 15px;
    }

    .compact-header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .compact-header-primary {
      flex-direction: column;
      align-items: flex-start;
      gap: 5px;
    }

    .compact-title-separator {
      display: none; /* Hide separator on mobile */
    }

    .compact-header-contacts {
      flex-direction: column;
      align-items: flex-start;
      gap: 3px;
      font-size: 11px;
    }

    .compact-contact-separator {
      display: none; /* Hide separators on mobile */
    }

    .compact-name {
      font-size: 18px;
    }

    .compact-title {
      font-size: 13px;
    }

    /* Mobile optimizations for sections */
    .compact-left-column,
    .compact-right-column {
      padding: 10px;
      border: none;
      background: #ffffff;
    }

    .compact-section {
      margin-bottom: 15px;
    }

    .compact-section-title-text {
      font-size: 12px;
    }

    .compact-timeline-item,
    .compact-card-item {
      padding: 8px;
    }

    .compact-tags-list {
      gap: 3px;
    }

    .compact-tag-item {
      padding: 3px 6px;
      font-size: 10px;
    }
  }

  /* === PRINT STYLES WITH MAXIMUM SPACE EFFICIENCY === */
  @media print {
    body {
      margin: 0;
      padding: 0;
      background: white;
      font-size: 9pt; /* Very compact for print */
      line-height: 1.2;
    }

    /* Reset all page breaks to avoid spacing issues */
    * {
      page-break-before: auto !important;
      page-break-after: auto !important;
      page-break-inside: auto !important;
      break-before: auto !important;
      break-after: auto !important;
      break-inside: auto !important;
    }
    
    .compact-resume-container {
      box-shadow: none;
      border-radius: 0;
      max-width: 100%;
      height: auto;
      min-height: auto;
      overflow: visible;
    }

    .compact-header {
      background: #34495e !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 10px 15px; /* Minimal print padding */
    }

    .compact-header-contacts {
      display: block !important;
      text-align: left !important;
    }
    
    .compact-contact-item {
      display: inline-block !important;
      margin: 0 8px 10px !important;
      vertical-align: middle;
    }

    .compact-contact-separator {
      display: inline-block !important;
      margin: 0 2px 8px !important;
      vertical-align: middle;
    }

    .compact-content-wrapper {
      grid-template-columns: 1fr 2fr !important; /* Maintain 2-column for print */
      gap: 12px;
      padding: 12px;
      min-height: auto;
    }

    .compact-left-column {
      background: #f8f9fa !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 10px;
    }

    .compact-right-column {
      padding: 10px;
    }

    .compact-section {
      margin-bottom: 12px; /* Compact print spacing */
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .compact-timeline-item,
    .compact-card-item {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-bottom: 8px;
      padding: 6px;
    }

    .compact-section-title-wrapper {
      background: #3498db !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 4px 6px;
    }

    .compact-name {
      font-size: 16pt;
    }

    .compact-title {
      font-size: 11pt;
    }

    .compact-section-title-text {
      font-size: 9pt;
    }

    /* Print-specific tag styling */
    .compact-tag-item {
      background: #f8f9fa !important;
      border: 1px solid #dee2e6 !important;
      color: #495057 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 1px 4px;
      font-size: 8pt;
    }

    /* Disable hover effects for print */
    .compact-tag-item:hover,
    .compact-timeline-item:hover,
    .compact-card-item:hover,
    .compact-simple-item:hover {
      background: initial !important;
      transform: none !important;
      box-shadow: none !important;
    }

    /* Print optimization for contact info */
    .compact-header-contacts {
      font-size: 9pt;
    }

    .compact-contact-separator {
      margin: 0 4px;
    }

    /* Ensure all content is visible in print */
    * {
      overflow: visible !important;
    }
  }

  /* === UTILITY CLASSES FOR CONTENT OVERFLOW === */
  
  /* Ensure long text doesn't break layout */
  .compact-contact-item,
  .compact-timeline-item,
  .compact-card-item,
  .compact-simple-item {
    word-wrap: break-word;
    word-break: break-word;
    overflow-wrap: break-word;
  }

  /* Ensure tables are responsive */
  table {
    width: 100%;
    table-layout: fixed;
    word-wrap: break-word;
    font-size: 9px; /* Compact table text */
  }

  /* Ensure images don't overflow */
  img {
    max-width: 100%;
    height: auto;
  }

  /* === ACCESSIBILITY ENHANCEMENTS === */
  
  /* Respect reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .compact-section-title-wrapper {
      border: 2px solid #000;
      background: #000 !important;
    }
    
    .compact-tag-item {
      border: 2px solid #000 !important;
      background: #fff !important;
      color: #000 !important;
    }
    
    .compact-timeline-item,
    .compact-card-item {
      border: 1px solid #000;
    }

    .compact-header {
      background: #000 !important;
    }
  }

  /* === FOCUS STATES FOR KEYBOARD NAVIGATION === */
  .compact-tag-item:focus,
  .compact-timeline-item:focus,
  .compact-card-item:focus,
  .compact-simple-item:focus {
    outline: 2px solid #3498db;
    outline-offset: 1px;
  }

  /* === PERFORMANCE OPTIMIZATIONS === */
  
  /* Optimize animations for better performance */
  .compact-tag-item,
  .compact-timeline-item,
  .compact-card-item {
    will-change: transform;
  }

  /* === ADVANCED SPACE OPTIMIZATION === */
  
  /* Tighter spacing for content-heavy sections */
  .compact-section-content p {
    margin: 0 0 4px 0; /* Minimal paragraph spacing */
  }

  .compact-section-content ul {
    margin: 4px 0;
    padding-left: 12px;
  }

  .compact-section-content li {
    margin: 2px 0; /* Minimal list item spacing */
  }

  /* Compact headings within content */
  .compact-section-content h3 {
    margin: 0 0 3px 0;
    font-size: 12px;
    line-height: 1.2;
  }

  .compact-section-content h4 {
    margin: 0 0 2px 0;
    font-size: 11px;
    line-height: 1.2;
  }

  /* === COLUMN-SPECIFIC OPTIMIZATIONS === */
  
  /* Left column - Skills and supplementary focus */
  .compact-left-column .compact-section {
    margin-bottom: 14px; /* Slightly less spacing for sidebar */
  }

  /* Right column - Main content focus */
  .compact-right-column .compact-section {
    margin-bottom: 18px; /* More spacing for readability */
  }

  /* === CONTENT TYPE SPECIFIC STYLING === */
  
  /* Dates and periods - consistent formatting */
  .period,
  .cert-date,
  .graduation-date {
    font-size: 9px !important;
    color: #95a5a6 !important;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Company and institution names */
  .company,
  .institution {
    font-weight: 600 !important;
    color: #7f8c8d !important;
  }

  /* Job titles and degree names */
  .compact-timeline-item h3,
  .compact-card-item h3 {
    font-weight: 700 !important;
    text-transform: none;
  }

  /* === FINAL LAYOUT ADJUSTMENTS === */
  
  /* Ensure consistent column heights */
  .compact-left-column,
  .compact-right-column {
    align-self: start; /* Prevent columns from stretching */
  }

  /* Optimize for specific content patterns */
  .compact-section-content > *:first-child {
    margin-top: 0 !important;
  }

  .compact-section-content > *:last-child {
    margin-bottom: 0 !important;
  }

  /* Handle empty sections gracefully */
  .compact-section:empty {
    display: none;
  }

  /* === BROWSER-SPECIFIC OPTIMIZATIONS === */
  
  /* Webkit scrollbars for compact columns */
  .compact-left-column::-webkit-scrollbar {
    width: 4px;
  }

  .compact-left-column::-webkit-scrollbar-track {
    background: #f1f3f4;
  }

  .compact-left-column::-webkit-scrollbar-thumb {
    background: #bdc3c7;
    border-radius: 2px;
  }

  /* === END OF COMPACT STYLES === */
`;
