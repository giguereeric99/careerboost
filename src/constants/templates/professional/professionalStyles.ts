/**
 * Professional Template Styles - FIXED OVERFLOW VERSION
 * Modern, sophisticated design with 2-column layout and corporate styling
 * FIXED: Container height, content overflow, and text visibility issues
 */

export const professionalStyles = `
  /* === GLOBAL STYLES === */
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 40px;
    color: #2c2c2c;
    background-color: #f8f9fa;
    line-height: 1.6;
    font-size: 14px;
  }

  /* === MAIN CONTAINER - FIXED HEIGHT ISSUES === */
  .professional-resume-container {
    background: #ffffff;
    max-width: 900px;
    margin: 0 auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    overflow: hidden;
    /* FIXED: Remove fixed height constraints */
    min-height: 800px; /* Minimum height instead of fixed */
    height: auto; /* Allow container to grow with content */
  }

  /* === HEADER SECTION === */
  .professional-header {
    background: linear-gradient(135deg, #003366 0%, #004080 100%);
    color: #ffffff;
    padding: 40px;
    text-align: center;
    position: relative;
    /* FIXED: Ensure header doesn't constrain container height */
    flex-shrink: 0;
  }

  .professional-header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #00ccff 0%, #0099cc 100%);
  }

  .professional-name {
    font-size: 32px;
    font-weight: 700;
    margin: 0 0 8px 0;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #ffffff;
  }

  .professional-title {
    font-size: 18px;
    font-weight: 500;
    margin: 0 0 20px 0;
    color: #e3f2fd;
    font-style: italic;
  }

  /* === CONTACT INFORMATION - CLEAN DISPLAY === */
  .professional-contacts {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 20px;
    margin: 20px 0 10px 0;
    font-size: 14px;
  }

  .professional-contact {
    color: #ffffff;
    text-decoration: none;
    padding: 6px 12px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    transition: background-color 0.3s ease;
    display: inline-block;
  }

  .professional-contact:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .professional-address {
    color: #e3f2fd;
    font-size: 13px;
    margin: 15px 0 0 0;
    line-height: 1.4;
    text-align: center;
  }

  /* === MAIN CONTENT LAYOUT - FIXED OVERFLOW === */
  .professional-content-wrapper {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0;
    /* FIXED: Remove min-height constraint that causes overflow */
    min-height: auto; /* Changed from 600px to auto */
    height: auto; /* Allow content to determine height */
    overflow: visible; /* Ensure content is visible */
  }

  /* === SIDEBAR - FIXED OVERFLOW === */
  .professional-sidebar {
    background: #f8f9fa;
    padding: 30px 25px;
    border-right: 1px solid #e9ecef;
    /* FIXED: Allow sidebar to grow with content */
    height: auto; /* Remove fixed height */
    overflow: visible; /* Ensure all content is visible */
    min-height: 400px; /* Minimum height for visual balance */
  }

  .professional-sidebar h2 {
    color: #003366;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 15px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #003366;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .professional-sidebar .section {
    margin-bottom: 25px;
    /* FIXED: Ensure sections don't get cut off */
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .professional-sidebar ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .professional-sidebar li {
    padding: 4px 0;
    font-size: 13px;
    color: #495057;
    border-bottom: 1px solid #e9ecef;
    /* FIXED: Ensure list items wrap properly */
    word-wrap: break-word;
    word-break: break-word;
  }

  .professional-sidebar li:last-child {
    border-bottom: none;
  }

  /* Skill bars for sidebar */
  .professional-skill-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #e9ecef;
  }

  .professional-skill-name {
    font-weight: 500;
    color: #495057;
    /* FIXED: Prevent skill names from overflowing */
    flex: 1;
    margin-right: 10px;
    word-wrap: break-word;
  }

  .professional-skill-level {
    width: 60px;
    height: 6px;
    background: #e9ecef;
    border-radius: 3px;
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }

  .professional-skill-level::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 80%;
    background: linear-gradient(90deg, #003366, #0066cc);
    border-radius: 3px;
  }

  /* === MAIN CONTENT - FIXED OVERFLOW === */
  .professional-main {
    padding: 30px;
    background: #ffffff;
    /* FIXED: Allow main content to grow with content */
    height: auto; /* Remove fixed height */
    overflow: visible; /* Ensure all content is visible */
    min-height: 400px; /* Minimum height for visual balance */
  }

  /* FIXED: Improved section title alignment with icons */
  .professional-main h2 {
    color: #003366;
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 20px 0;
    padding-bottom: 10px;
    border-bottom: 2px solid #003366;
    display: flex;
    align-items: center;
    gap: 10px;
    line-height: 1.2;
  }

  .professional-main h2 .professional-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    filter: invert(18%) sepia(77%) saturate(1462%) hue-rotate(193deg) brightness(95%) contrast(101%);
    vertical-align: middle;
    margin-top: -2px; /* Fine-tune vertical alignment */
  }

  /* FIXED: Sidebar section icons alignment */
  .professional-sidebar h2 .professional-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    filter: invert(18%) sepia(77%) saturate(1462%) hue-rotate(193deg) brightness(95%) contrast(101%);
    vertical-align: middle;
    margin-top: -1px; /* Fine-tune vertical alignment */
  }

  .professional-main .section {
    margin-bottom: 30px;
    /* FIXED: Prevent sections from being cut off */
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .professional-main p {
    margin: 0 0 12px 0;
    line-height: 1.6;
    color: #495057;
    /* FIXED: Ensure text wraps properly */
    word-wrap: break-word;
    word-break: break-word;
  }

  .professional-main ul {
    padding-left: 20px;
    margin: 12px 0;
  }

  .professional-main li {
    margin: 6px 0;
    line-height: 1.5;
    color: #495057;
    /* FIXED: Ensure list items wrap properly */
    word-wrap: break-word;
    word-break: break-word;
  }

  /* === EXPERIENCE STYLING - FIXED OVERFLOW === */
  .professional-job {
    margin-bottom: 25px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #003366;
    /* FIXED: Prevent job sections from being cut off */
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
  }

  .professional-job h3 {
    color: #003366;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    /* FIXED: Ensure job titles wrap properly */
    word-wrap: break-word;
    word-break: break-word;
  }

  .professional-job .company {
    color: #6c757d;
    font-size: 14px;
    font-weight: 500;
    margin: 0 0 4px 0;
  }

  .professional-job .period {
    color: #868e96;
    font-size: 12px;
    font-style: italic;
    margin: 0 0 12px 0;
  }

  .professional-job ul {
    margin: 8px 0 0 0;
  }

  .professional-job li {
    color: #495057;
    font-size: 13px;
    line-height: 1.5;
    /* FIXED: Ensure job descriptions wrap properly */
    word-wrap: break-word;
    word-break: break-word;
  }

  /* === EDUCATION STYLING - FIXED OVERFLOW === */
  .professional-education {
    margin-bottom: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #0066cc;
    /* FIXED: Prevent education sections from being cut off */
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
  }

  .professional-education h3 {
    color: #003366;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 6px 0;
    /* FIXED: Ensure education titles wrap properly */
    word-wrap: break-word;
    word-break: break-word;
  }

  .professional-education .institution {
    color: #6c757d;
    font-size: 14px;
    margin: 0 0 4px 0;
  }

  .professional-education .period {
    color: #868e96;
    font-size: 12px;
    font-style: italic;
  }

  /* === PROJECTS STYLING - FIXED OVERFLOW === */
  .professional-project {
    margin-bottom: 20px;
    padding: 15px;
    background: #e3f2fd;
    border-radius: 6px;
    border-left: 4px solid #0099cc;
    /* FIXED: Prevent project sections from being cut off */
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
  }

  .professional-project h3 {
    color: #003366;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    /* FIXED: Ensure project titles wrap properly */
    word-wrap: break-word;
    word-break: break-word;
  }

  .professional-project p {
    color: #495057;
    font-size: 13px;
    margin: 0 0 8px 0;
  }

  /* === RESPONSIVE DESIGN - ENHANCED === */
  @media (max-width: 768px) {
    body {
      padding: 20px;
    }

    .professional-resume-container {
      max-width: 100%;
      /* FIXED: Ensure mobile container adapts to content */
      height: auto;
      min-height: auto;
    }

    .professional-content-wrapper {
      grid-template-columns: 1fr;
      /* FIXED: Remove height constraints on mobile */
      height: auto;
      min-height: auto;
    }

    .professional-sidebar {
      border-right: none;
      border-bottom: 1px solid #e9ecef;
      /* FIXED: Allow sidebar to size properly on mobile */
      height: auto;
      min-height: auto;
    }

    .professional-main {
      /* FIXED: Allow main content to size properly on mobile */
      height: auto;
      min-height: auto;
    }

    .professional-header {
      padding: 30px 20px;
    }

    .professional-name {
      font-size: 26px;
    }

    .professional-contacts {
      flex-direction: column;
      gap: 8px;
    }
  }

  /* === PRINT STYLES - ENHANCED FOR CONTENT OVERFLOW === */
  @media print {
    body {
      margin: 0;
      padding: 0;
      background: white;
      font-size: 11pt;
    }
    
    .professional-resume-container {
      box-shadow: none;
      border-radius: 0;
      max-width: 100%;
      /* FIXED: Ensure print version shows all content */
      height: auto;
      min-height: auto;
      overflow: visible;
    }

    .professional-header {
      background: #003366 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .professional-content-wrapper {
      grid-template-columns: 1fr 2fr;
      /* FIXED: Allow print version to expand as needed */
      height: auto;
      min-height: auto;
    }

    .professional-sidebar {
      background: #f8f9fa !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      /* FIXED: Ensure sidebar content is fully visible in print */
      height: auto;
      overflow: visible;
    }

    .professional-main {
      /* FIXED: Ensure main content is fully visible in print */
      height: auto;
      overflow: visible;
    }

    .professional-job,
    .professional-education,
    .professional-project {
      break-inside: avoid;
      page-break-inside: avoid;
      /* FIXED: Ensure sections don't get cut across pages */
      overflow: visible;
    }

    .professional-main h2 {
      font-size: 14pt;
    }

    .professional-name {
      font-size: 20pt;
    }

    .professional-title {
      font-size: 14pt;
    }
  }

  /* === UTILITY CLASSES FOR CONTENT OVERFLOW === */
  
  /* Ensure long URLs or text don't break layout */
  .professional-contact,
  .professional-address {
    word-break: break-all;
    overflow-wrap: break-word;
  }

  /* Ensure tables (if any) are responsive */
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
`;
