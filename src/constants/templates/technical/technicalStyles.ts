/**
 * Technical Template Styles - MODERN TECH PROFESSIONAL DESIGN WITH CODE BRACES
 * Clean, modern design with authentic code styling and proper vertical alignment
 * Features syntax highlighting colors, terminal-like sections, and code-inspired styling
 * FIXED: Vertical alignment, container height, content overflow, and unified code block styling
 */

export const technicalStyles = `
  /* === GLOBAL STYLES WITH TECH THEME === */
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap');

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    margin: 0;
    padding: 40px;
    color: #1a202c;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    line-height: 1.6;
    font-size: 14px;
    min-height: 100vh;
  }

  /* === MAIN CONTAINER WITH TECH STYLING === */
  .technical-resume-container {
    background: #ffffff;
    max-width: 950px;
    margin: 0 auto;
    box-shadow: 
      0 25px 50px rgba(0, 0, 0, 0.15),
      0 0 0 1px rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    overflow: hidden;
    min-height: 800px;
    height: auto;
    position: relative;
  }

  /* === TECHNICAL HEADER SECTION === */
  .technical-header {
    background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
    color: #ffffff;
    padding: 40px;
    position: relative;
    overflow: hidden;
  }

  /* Terminal-like decorative accent line for tech feel */
  .technical-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #48bb78 0%, #38b2ac 50%, #4299e1 100%);
  }

  /* Code window dots decoration (red, yellow, green circles) */
  .technical-header::after {
    content: '';
    position: absolute;
    top: 15px;
    left: 20px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #48bb78;
    box-shadow: 
      20px 0 0 #ed8936,
      40px 0 0 #e53e3e;
  }

  /* Main name styling with modern typography */
  .technical-name {
    font-family: 'Inter', sans-serif;
    font-size: 36px;
    font-weight: 800;
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  /* Professional title with monospace font and terminal styling */
  .technical-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    font-weight: 500;
    margin: 0 0 25px 0;
    color: #48bb78;
    padding: 8px 16px;
    background: rgba(72, 187, 120, 0.1);
    border-radius: 6px;
    border-left: 3px solid #48bb78;
    display: inline-block;
  }

  /* === CONTACT INFORMATION WITH TECH STYLING === */
  .technical-contacts {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    margin: 25px 0 15px 0;
    font-size: 14px;
  }

  /* Individual contact items with glassmorphism effect */
  .technical-contact {
    color: #e2e8f0;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
  }

  /* Hover effects for contact items */
  .technical-contact:hover {
    background: rgba(72, 187, 120, 0.2);
    border-color: #48bb78;
    transform: translateY(-1px);
  }

  /* Contact icons styling */
  .technical-contact-icon {
    width: 16px;
    height: 16px;
    filter: invert(1); /* Make icons white on dark background */
  }

  /* Address styling with monospace font */
  .technical-address {
    color: #cbd5e0;
    font-size: 13px;
    margin: 20px 0 0 0;
    font-family: 'JetBrains Mono', monospace;
    opacity: 0.9;
  }

  /* === MAIN CONTENT LAYOUT === */
  .technical-content-wrapper {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0;
    min-height: 600px;
    height: auto;
    overflow: visible;
  }

  /* === TECHNICAL SIDEBAR WITH CODE BRACES STYLING === */
  .technical-sidebar {
    background: linear-gradient(180deg, #f7fafc 0%, #edf2f7 100%);
    padding: 30px 25px;
    border-right: 1px solid #e2e8f0;
    height: auto;
    overflow: visible;
    min-height: 500px;
    position: relative;
  }

  /* === FIX FOR ORDERED LISTS ALIGNMENT === */
  
  /* Fix ordered lists that extend too far left */
  ol {
    padding-left: 20px !important;
    margin-left: 0 !important;
  }

  .creative-section-content ol,
  .creative-main ol,
  .creative-sidebar ol {
    padding-left: 20px !important;
    margin-left: 0 !important;
  }

  ol li {
    padding-left: 0 !important;
    margin-left: 0 !important;
  }

  ol li:before {
    content: unset !important;
  }

  /* Sidebar accent line with vibrant tech colors */
  .technical-sidebar::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #48bb78 0%, #38b2ac 50%, #4299e1 100%);
  }

  /* Code block style section headers */
  .technical-sidebar h2 {
    color: #ffffff;
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 25px 0;
    padding: 15px 20px;
    background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
    border-radius: 8px;
    text-transform: lowercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-family: 'JetBrains Mono', monospace;
    position: relative;
    border: 1px solid #4a5568;
  }

  /* Opening brace decoration */
  .technical-sidebar h2::before {
    content: '{';
    color: #48bb78;
    font-size: 18px;
    font-weight: 700;
    margin-right: 4px;
  }

  /* Closing brace decoration */
  .technical-sidebar h2::after {
    content: '}';
    color: #48bb78;
    font-size: 18px;
    font-weight: 700;
    margin-left: auto;
  }

  /* FIXED: Sidebar icons with better visibility */
  .technical-sidebar h2 .technical-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    filter: invert(1) brightness(1.2);
    vertical-align: middle;
  }

  /* Sidebar sections spacing */
  .technical-sidebar .section {
    margin-bottom: 35px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* FIXED: Code array-style list with proper vertical alignment - BASE STYLES */
  .technical-sidebar ul {
    list-style: none;
    padding: 40px 20px 20px;
    margin: 0;
    background: #1a202c;
    border-radius: 8px;
    border: 1px solid #2d3748;
    position: relative;
    line-height: 1.8;
    min-height: 60px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    margin-bottom: 20px;
    margin-top: 10px;
  }

  /* FIXED: Array opening bracket with proper alignment - BASE STYLES */
  .technical-sidebar ul::before {
    content: 'array[] = [';
    position: absolute;
    top: 15px;
    left: 15px;
    background: #1a202c;
    color: #48bb78;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
  }

  /* FIXED: Array closing bracket with proper alignment - BASE STYLES */
  .technical-sidebar ul::after {
    content: '];';
    color: #48bb78;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    font-weight: 600;
    text-align: right;
    margin-top: auto;
    padding-top: 10px;
    animation: blink 1.5s infinite;
  }

  /* FIXED: Code string-style list items with proper vertical alignment - BASE STYLES */
  .technical-sidebar li {
    background: transparent;
    padding: 6px 0;
    border: none;
    box-shadow: none;
    font-size: 13px;
    color: #e2e8f0;
    font-weight: 400;
    transition: all 0.3s ease;
    word-wrap: break-word;
    position: relative;
    font-family: 'JetBrains Mono', monospace;
    border-left: none;
    line-height: 1.6;
    display: block;
    margin: 2px 0;
    padding-left: 15px;
  }

  /* String quotes and syntax highlighting - BASE STYLES */
  .technical-sidebar li::before {
    content: '"';
    color: #f56565;
    font-weight: 600;
    margin-right: 2px;
  }

  .technical-sidebar li::after {
    content: '",';
    color: #f56565;
    font-weight: 600;
    margin-left: 2px;
  }

  /* Remove comma from last item - BASE STYLES */
  .technical-sidebar li:last-child::after {
    content: '"';
  }

  /* Hover effect with syntax highlighting - BASE STYLES */
  .technical-sidebar li:hover {
    color: #4299e1;
    background: rgba(66, 153, 225, 0.1);
    border-radius: 4px;
  }

  /* === ROBUST FIX FOR NESTED CONTENT IN SIDEBAR LISTS === */
  
  /* Flatten all content inside sidebar list items to inline */
  .technical-sidebar li * {
    display: inline !important;
    margin: 0 !important;
    padding: 0 !important;
    line-height: inherit !important;
  }

  /* Preserve spacing between words */
  .technical-sidebar li *:not(:last-child)::after {
    content: ' ';
  }

  /* Ensure list items stay on one line with proper formatting */
  .technical-sidebar li {
    display: block;
    white-space: normal;
    word-wrap: break-word;
    line-height: 1.6;
  }

  /* === SECTION-SPECIFIC STYLING (HEADERS ONLY) === */
  
  /* Skills section - Blue theme */
  .technical-sidebar #resume-skills ul::before {
    content: 'skills[] = [';
    color: #4299e1;
  }

  .technical-sidebar #resume-skills ul::after {
    content: '];';
    color: #4299e1;
  }

  .technical-sidebar #resume-skills li:hover::before,
  .technical-sidebar #resume-skills li:hover::after {
    color: #68d391;
  }

  .technical-sidebar #resume-skills li:hover {
    text-shadow: 0 0 8px rgba(66, 153, 225, 0.5);
  }

  /* Languages section - Orange theme */
  .technical-sidebar #resume-languages ul::before {
    content: 'languages[] = [';
    color: #ed8936;
  }

  .technical-sidebar #resume-languages ul::after {
    content: '];';
    color: #ed8936;
  }

  .technical-sidebar #resume-languages li:hover::before,
  .technical-sidebar #resume-languages li:hover::after {
    color: #fbb6ce;
  }

  .technical-sidebar #resume-languages li:hover {
    text-shadow: 0 0 8px rgba(237, 137, 54, 0.5);
  }

  /* Certifications section - Purple theme */
  .technical-sidebar #resume-certifications ul::before {
    content: 'certifications[] = [';
    color: #9f7aea;
  }

  .technical-sidebar #resume-certifications ul::after {
    content: '];';
    color: #9f7aea;
  }

  .technical-sidebar #resume-certifications li:hover::before,
  .technical-sidebar #resume-certifications li:hover::after {
    color: #b794f6;
  }

  .technical-sidebar #resume-certifications li:hover {
    text-shadow: 0 0 8px rgba(159, 122, 234, 0.5);
  }

  /* Interests section - Pink theme with emoji */
  .technical-sidebar #resume-interests ul::before {
    content: 'interests[] = [';
    color: #f687b3;
  }

  .technical-sidebar #resume-interests ul::after {
    content: '];';
    color: #f687b3;
  }

  .technical-sidebar #resume-interests li::before {
    content: '🚀 "';
    color: #f56565;
    font-weight: 600;
    margin-right: 2px;
  }

  .technical-sidebar #resume-interests li:hover::before {
    content: '⭐ "';
  }

  .technical-sidebar #resume-interests li:hover {
    text-shadow: 0 0 8px rgba(246, 135, 179, 0.5);
  }

  /* Code comment styling for empty sections */
  .technical-sidebar .section:empty {
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(113, 128, 150, 0.05);
    border-radius: 8px;
    border: 2px dashed #cbd5e0;
  }

  .technical-sidebar .section:empty::before {
    content: '// No data available';
    color: #718096;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-style: italic;
  }

  /* === MAIN CONTENT AREA === */
  .technical-main {
    padding: 30px;
    background: #ffffff;
    height: auto;
    overflow: visible;
    min-height: 500px;
    position: relative;
  }

  /* Main content accent line with different gradient */
  .technical-main::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #4299e1 0%, #38b2ac 50%, #48bb78 100%);
  }

  /* Main section headers with terminal prompt styling */
  .technical-main h2 {
    color: #2d3748;
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 20px 0;
    padding: 12px 0 12px 40px;
    border-bottom: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    font-family: 'Inter', sans-serif;
  }

  /* Terminal prompt decoration for main section titles */
  .technical-main h2::before {
    content: '$ ';
    position: absolute;
    left: 0;
    color: #48bb78;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
  }

  /* Main content icons with improved visibility */
  .technical-main h2 .technical-icon {
    width: 20px;
    height: 20px;
    filter: invert(23%) sepia(12%) saturate(912%) hue-rotate(174deg) brightness(96%) contrast(91%) brightness(1.1);
  }

  /* Main content sections spacing */
  .technical-main .section {
    margin-bottom: 35px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Paragraph styling in main content */
  .technical-main p {
    margin: 0 0 12px 0;
    line-height: 1.7;
    color: #4a5568;
    word-wrap: break-word;
  }

  /* List styling in main content */
  .technical-main ul {
    padding-left: 0;
    margin: 15px 0;
    list-style: none;
  }

  /* List items with custom bullet points */
  .technical-main li {
    margin: 8px 0;
    line-height: 1.6;
    color: #4a5568;
    padding: 8px 0 8px 24px;
    position: relative;
    word-wrap: break-word;
  }

  /* Tech-inspired bullet points */
  .technical-main li::before {
    content: '▸';
    position: absolute;
    left: 0;
    color: #4299e1;
    font-weight: 600;
    font-size: 16px;
  }

  /* === EXPERIENCE STYLING WITH TECH THEME === */
  .technical-job {
    margin-bottom: 30px;
    padding: 25px;
    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    border-left: 5px solid #4299e1;
    position: relative;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
  }

  /* Tech badge decoration for active status */
  .technical-job::before {
    content: '';
    position: absolute;
    top: 20px;
    right: 20px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #48bb78;
    box-shadow: 0 0 0 3px rgba(72, 187, 120, 0.2);
  }

  /* Job title styling */
  .technical-job h3 {
    color: #2d3748;
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 8px 0;
    font-family: 'Inter', sans-serif;
    word-wrap: break-word;
  }

  /* Company name with tech styling */
  .technical-job .company {
    color: #4299e1;
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 6px 0;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Employment period with badge styling */
  .technical-job .period {
    color: #718096;
    font-size: 12px;
    font-weight: 500;
    margin: 0 0 15px 0;
    font-family: 'JetBrains Mono', monospace;
    background: rgba(66, 153, 225, 0.1);
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
  }

  /* Job description lists */
  .technical-job ul {
    margin: 12px 0 0 0;
  }

  .technical-job li {
    color: #4a5568;
    font-size: 14px;
    line-height: 1.6;
    word-wrap: break-word;
  }

  /* === EDUCATION STYLING === */
  .technical-education {
    margin-bottom: 25px;
    padding: 20px;
    background: linear-gradient(135deg, rgba(72, 187, 120, 0.05) 0%, rgba(56, 178, 172, 0.05) 100%);
    border-radius: 10px;
    border-left: 4px solid #48bb78;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
  }

  /* Education degree/title */
  .technical-education h3 {
    color: #2d3748;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    word-wrap: break-word;
  }

  /* Educational institution with tech styling */
  .technical-education .institution {
    color: #38b2ac;
    font-size: 14px;
    font-weight: 500;
    margin: 0 0 6px 0;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Education period */
  .technical-education .period {
    color: #718096;
    font-size: 12px;
    font-style: italic;
  }

  /* === PROJECTS STYLING === */
  .technical-project {
    margin-bottom: 25px;
    padding: 20px;
    background: linear-gradient(135deg, rgba(66, 153, 225, 0.05) 0%, rgba(56, 178, 172, 0.05) 100%);
    border-radius: 10px;
    border-left: 4px solid #4299e1;
    position: relative;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
  }

  /* Project status indicator */
  .technical-project::after {
    content: 'LIVE';
    position: absolute;
    top: 15px;
    right: 20px;
    background: #48bb78;
    color: #ffffff;
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Project title */
  .technical-project h3 {
    color: #2d3748;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 10px 0;
    word-wrap: break-word;
  }

  /* Project description */
  .technical-project p {
    color: #4a5568;
    font-size: 13px;
    margin: 0 0 10px 0;
    line-height: 1.6;
  }

  /* === SPECIAL EFFECTS FOR CODE BLOCKS === */
  
  /* Subtle glow effect on hover for code blocks */
  .technical-sidebar ul:hover {
    box-shadow: 
      0 4px 20px rgba(66, 153, 225, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  /* Terminal cursor blink effect */
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.3; }
  }

  /* Code block typing animation for initial load */
  .technical-sidebar ul {
    animation: codeBlockAppear 0.8s ease-out;
  }

  @keyframes codeBlockAppear {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* === RESPONSIVE DESIGN === */
  @media (max-width: 768px) {
    body {
      padding: 20px;
    }

    .technical-resume-container {
      max-width: 100%;
      height: auto;
      min-height: auto;
    }

    .technical-content-wrapper {
      grid-template-columns: 1fr;
      height: auto;
      min-height: auto;
    }

    .technical-sidebar {
      border-right: none;
      border-bottom: 1px solid #e2e8f0;
      height: auto;
      min-height: auto;
    }

    .technical-main {
      height: auto;
      min-height: auto;
    }

    .technical-header {
      padding: 30px 20px;
    }

    .technical-name {
      font-size: 28px;
    }

    .technical-contacts {
      flex-direction: column;
      gap: 10px;
      align-items: flex-start;
    }

    .technical-contact {
      width: 100%;
      justify-content: flex-start;
    }

    /* Mobile responsive for code blocks */
    .technical-sidebar ul {
      padding: 30px 15px 15px;
    }

    .technical-sidebar ul::before {
      font-size: 11px;
      left: 10px;
      top: 10px;
    }

    .technical-sidebar li {
      font-size: 12px;
      padding: 4px 0;
      padding-left: 10px;
    }

    .technical-sidebar h2 {
      font-size: 13px;
      padding: 12px 15px;
    }

    .technical-sidebar h2::before,
    .technical-sidebar h2::after {
      font-size: 16px;
    }
  }

  /* === PRINT STYLES === */
  @media print {
    body {
      margin: 0;
      padding: 0;
      background: white;
      font-size: 11pt;
    }

    * {
      page-break-before: auto !important;
      page-break-after: auto !important;
      page-break-inside: auto !important;
      break-before: auto !important;
      break-after: auto !important;
      break-inside: auto !important;
    }
    
    .technical-resume-container {
      box-shadow: none;
      border-radius: 0;
      max-width: 100%;
      height: auto;
      min-height: auto;
      overflow: visible;
    }

    .technical-header {
      background: #2d3748 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .technical-contacts {
      display: grid !important;
      grid-template-columns: repeat(3, auto) !important;
      justify-content: start !important;
      gap: 15px 20px !important;
      padding: 20px 0 !important;
      margin-top: 0 !important;
    }
    
    .technical-contact:nth-child(4) {
      grid-column: 1 / -1 !important; /* S'étend sur toutes les colonnes */
      grid-row: 2;
      justify-self: start !important;
      width: auto !important;
      max-width: none !important;
    }
    
    .technical-contact {
      display: block !important;
      background: rgba(255, 255, 255, 0.1) !important;
      padding: 8px 16px !important;
      border-radius: 8px !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    .technical-contact-icon {
      display: inline-block !important;
      vertical-align: middle;
      margin-right: 5px;
    }

    .technical-content-wrapper {
      grid-template-columns: 1fr 2fr;
      height: auto;
      min-height: auto;
    }

    .technical-sidebar {
      background: #f7fafc !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      height: auto;
      overflow: visible;
    }

    .technical-main {
      height: auto;
      overflow: visible;
    }

    /* Print styles for code blocks */
    .technical-sidebar ul {
      background: #f8f9fa !important;
      border: 1px solid #dee2e6 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .technical-sidebar li {
      color: #2d3748 !important;
      padding-left: 20px !important;
    }

    .technical-sidebar ul::before {
      background: #f8f9fa !important;
      color: #28a745 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .technical-sidebar ul::after {
      color: #28a745 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .technical-sidebar li::before,
    .technical-sidebar li::after {
      color: #dc3545 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .technical-job,
    .technical-education,
    .technical-project {
      break-inside: avoid;
      page-break-inside: avoid;
      overflow: visible;
    }

    .technical-name {
      font-size: 22pt;
    }

    .technical-title {
      font-size: 14pt;
    }

    .technical-main h2 {
      font-size: 16pt;
    }

    /* Hide animations in print */
    * {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
    }

    /* Ensure proper page breaks */
    .technical-sidebar .section {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .technical-main .section {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }

  /* === UTILITY CLASSES FOR CONTENT OVERFLOW === */
  
  /* Ensure long URLs or text don't break layout */
  .technical-contact,
  .technical-address {
    word-break: break-all;
    overflow-wrap: break-word;
  }

  /* Ensure tables are responsive */
  table {
    width: 100%;
    table-layout: fixed;
    word-wrap: break-word;
  }

  /* Ensure images don't overflow */
  img {
    max-width: 100%;
    height: auto;
  }

  /* === DARK MODE SUPPORT === */
  @media (prefers-color-scheme: dark) {
    .technical-sidebar {
      background: linear-gradient(180deg, #2d3748 0%, #1a202c 100%);
    }

    .technical-main {
      background: #1a202c;
      color: #e2e8f0;
    }

    /* Code blocks in dark mode */
    .technical-sidebar ul {
      background: #0d1117;
      border-color: #21262d;
    }

    .technical-sidebar li {
      color: #c9d1d9;
    }

    .technical-sidebar ul::before,
    .technical-sidebar ul::after {
      background: #0d1117;
      color: #7ee787;
    }

    .technical-sidebar li::before,
    .technical-sidebar li::after {
      color: #a5d6ff;
    }

    .technical-job {
      background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
    }

    .technical-education {
      background: linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(56, 178, 172, 0.1) 100%);
    }

    .technical-project {
      background: linear-gradient(135deg, rgba(66, 153, 225, 0.1) 0%, rgba(56, 178, 172, 0.1) 100%);
    }

  /* === ACCESSIBILITY ENHANCEMENTS === */
  
  /* Respect user's motion preferences */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .technical-sidebar ul {
      border: 2px solid #000 !important;
      background: #fff !important;
    }

    .technical-sidebar li {
      color: #000 !important;
    }
    
    .technical-contact {
      border: 1px solid #000;
    }
    
    .technical-job,
    .technical-education,
    .technical-project {
      border: 1px solid #000;
    }
  }

  /* === FOCUS STATES FOR KEYBOARD NAVIGATION === */
  .technical-sidebar li:focus {
    outline: 2px solid #4299e1;
    outline-offset: 2px;
  }

  .technical-contact:focus {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 2px;
  }

  .technical-job:focus,
  .technical-education:focus,
  .technical-project:focus {
    outline: 2px solid #4299e1;
    outline-offset: 2px;
  }

  /* Remove focus outline for mouse users */
  .technical-sidebar li:focus:not(:focus-visible) {
    outline: none;
  }

  .technical-contact:focus:not(:focus-visible) {
    outline: none;
  }

  /* === PERFORMANCE OPTIMIZATIONS === */
  /* Optimize animations for better performance */
  .technical-sidebar li {
    will-change: transform;
  }

  .technical-job,
  .technical-education,
  .technical-project {
    will-change: transform;
  }

  .technical-contact {
    will-change: transform, background-color;
  }

  /* === FALLBACK SUPPORT === */
  /* Fallback fonts for better compatibility */
  .technical-name {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .technical-title,
  .technical-contact,
  .technical-address {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
  }

  /* Fallback for grid support */
  @supports not (display: grid) {
    .technical-content-wrapper {
      display: table;
      width: 100%;
    }

    .technical-sidebar {
      display: table-cell;
      width: 33.33%;
      vertical-align: top;
    }

    .technical-main {
      display: table-cell;
      width: 66.67%;
      vertical-align: top;
    }
  }

  /* === ANIMATION ENHANCEMENTS === */
  /* Subtle fade-in animation for sections */
  .technical-sidebar .section {
    animation: fadeInUp 0.6s ease-out;
  }

  .technical-main .section {
    animation: fadeInLeft 0.6s ease-out;
  }

  /* Staggered animation delays */
  .technical-sidebar .section:nth-child(1) { animation-delay: 0.2s; }
  .technical-sidebar .section:nth-child(2) { animation-delay: 0.4s; }
  .technical-sidebar .section:nth-child(3) { animation-delay: 0.6s; }
  .technical-sidebar .section:nth-child(4) { animation-delay: 0.8s; }

  .technical-main .section:nth-child(1) { animation-delay: 0.1s; }
  .technical-main .section:nth-child(2) { animation-delay: 0.3s; }
  .technical-main .section:nth-child(3) { animation-delay: 0.5s; }
  .technical-main .section:nth-child(4) { animation-delay: 0.7s; }

  /* Keyframes for animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInLeft {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* === TEXT SELECTION IMPROVEMENTS === */
  /* Improve text selection */
  .technical-sidebar li::selection {
    background: rgba(66, 153, 225, 0.3);
    color: #ffffff;
  }

  .technical-main p::selection {
    background: rgba(72, 187, 120, 0.3);
  }

 /* === LOADING STATES === */
 /* Loading animation for sections */
  .technical-section-loading {
    opacity: 0.6;
    pointer-events: none;
    position: relative;
  }

  .technical-section-loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
    animation: loadingShimmer 1.5s infinite;
  }

  @keyframes loadingShimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

 /* === SMOOTH SCROLLING === */
 /* Smooth scrolling for better UX */
  html {
    scroll-behavior: smooth;
  }

 /* === FINAL PERFORMANCE TWEAKS === */
 /* GPU acceleration for smooth animations */
  .technical-sidebar ul,
  .technical-sidebar li,
  .technical-contact {
    transform: translateZ(0);
    backface-visibility: hidden;
  }

 /* Optimize font rendering */
  .technical-sidebar,
  .technical-main {
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

 /* === END OF STYLES === */
`;
