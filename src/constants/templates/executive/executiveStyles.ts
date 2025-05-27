/**
 * Executive Template Styles - PREMIUM EXECUTIVE DESIGN
 * Sophisticated and authoritative design for senior leadership positions
 * Features elegant typography, premium color scheme, and executive-level presentation
 * Optimized for C-level executives, VPs, Directors, and senior management roles
 */

export const executiveStyles = `
  /* === PREMIUM FONTS IMPORT === */
  @import url('https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700;800&display=swap');

  /* === GLOBAL EXECUTIVE STYLES === */
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    margin: 0;
    padding: 40px;
    color: #1a1a1a;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    line-height: 1.6;
    font-size: 15px;
    min-height: 100vh;
    font-weight: 400;
  }

  /* === MAIN EXECUTIVE CONTAINER === */
  .executive-resume-container {
    background: #ffffff;
    max-width: 900px;
    margin: 0 auto;
    box-shadow: 
      0 25px 50px rgba(0, 0, 0, 0.1),
      0 10px 25px rgba(0, 0, 0, 0.05);
    border-radius: 2px;
    overflow: hidden;
    min-height: 800px;
    height: auto;
    position: relative;
    border-top: 4px solid #1a365d;
  }

  /* Subtle premium border accent */
  .executive-resume-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, #1a365d, transparent);
    z-index: 1;
  }

  /* === EXECUTIVE HEADER SECTION === */
  .executive-header {
    background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
    color: #ffffff;
    padding: 60px 50px;
    text-align: left;
    position: relative;
    overflow: hidden;
  }

  /* Executive header background texture */
  .executive-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat;
    opacity: 0.1;
    z-index: 1;
  }

  /* Header content positioning */
  .executive-header-content {
    position: relative;
    z-index: 2;
    max-width: 800px;
  }

  /* Executive Name Styling */
  .executive-name {
    font-family: 'Crimson Text', serif;
    font-size: 48px;
    font-weight: 700;
    margin: 0 0 12px 0;
    letter-spacing: 1px;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    line-height: 1.1;
  }

  /* Executive Title/Position */
  .executive-title {
    font-family: 'Inter', sans-serif;
    font-size: 22px;
    font-weight: 300;
    margin: 0 0 30px 0;
    color: #cbd5e0;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    border-bottom: 1px solid rgba(203, 213, 224, 0.3);
    padding-bottom: 15px;
    display: inline-block;
  }

  /* === EXECUTIVE CONTACT INFORMATION === */
  .executive-contacts {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 30px;
    margin: 25px 0 15px 0;
  }

  .executive-contact {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #ffffff;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
  }

  .executive-contact:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .executive-contact-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  .executive-contact-icon img {
    width: 100%;
    height: 100%;
    filter: invert(1);
  }

  /* Executive Address */
  .executive-address {
    color: #cbd5e0;
    font-size: 14px;
    margin: 20px 0 0 0;
    line-height: 1.5;
    font-weight: 400;
  }

  /* === EXECUTIVE CONTENT LAYOUT === */
  .executive-content-wrapper {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 0;
    min-height: 600px;
    height: auto;
    overflow: visible;
  }

  /* === MAIN CONTENT AREA === */
  .executive-main {
    padding: 50px 45px;
    background: #ffffff;
    height: auto;
    overflow: visible;
    min-height: 500px;
    position: relative;
  }

  /* Subtle content separator line */
  .executive-main::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 1px;
    height: 100%;
    background: linear-gradient(180deg, transparent, #e2e8f0, transparent);
  }

  .executive-main-section {
    margin-bottom: 45px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Executive Section Titles */
  .executive-main h2 {
    font-family: 'Crimson Text', serif;
    color: #1a365d;
    font-size: 24px;
    font-weight: 600;
    margin: 0 0 25px 0;
    padding-bottom: 12px;
    border-bottom: 2px solid #1a365d;
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
  }

  /* Premium section title decoration */
  .executive-main h2::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, #2c5282, #4299e1);
  }

  .executive-main h2 .executive-icon {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    filter: invert(11%) sepia(78%) saturate(1847%) hue-rotate(194deg) brightness(93%) contrast(96%);
  }

  /* Executive Content Text */
  .executive-main p {
    margin: 0 0 16px 0;
    line-height: 1.7;
    color: #2d3748;
    font-size: 15px;
    font-weight: 400;
    word-wrap: break-word;
    word-break: break-word;
  }

  .executive-main ul {
    padding-left: 0;
    margin: 20px 0;
    list-style: none;
  }

  .executive-main li {
    margin: 12px 0;
    line-height: 1.6;
    color: #2d3748;
    font-size: 15px;
    padding-left: 25px;
    position: relative;
    word-wrap: break-word;
    word-break: break-word;
  }

  /* Premium bullet points */
  .executive-main li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    width: 6px;
    height: 6px;
    background: linear-gradient(135deg, #1a365d, #2c5282);
    border-radius: 50%;
    box-shadow: 0 1px 3px rgba(26, 54, 93, 0.3);
  }

  /* === EXECUTIVE EXPERIENCE STYLING === */
  .executive-experience {
    margin-bottom: 35px;
    padding: 30px;
    background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
    border-radius: 8px;
    border-left: 5px solid #1a365d;
    position: relative;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
  }

  /* Premium experience card shadow */
  .executive-experience::before {
    content: '';
    position: absolute;
    top: 0;
    left: -5px;
    width: 5px;
    height: 100%;
    background: linear-gradient(180deg, #1a365d, #2c5282, #4299e1);
    border-radius: 2px 0 0 2px;
  }

  .executive-experience h3 {
    font-family: 'Crimson Text', serif;
    color: #1a365d;
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 8px 0;
    word-wrap: break-word;
    word-break: break-word;
  }

  .executive-experience .company {
    color: #4a5568;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 6px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .executive-experience .period {
    color: #718096;
    font-size: 13px;
    font-weight: 500;
    margin: 0 0 20px 0;
    font-style: italic;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 10px;
  }

  .executive-experience ul {
    margin: 15px 0 0 0;
  }

  .executive-experience li {
    color: #2d3748;
    font-size: 14px;
    line-height: 1.6;
    margin: 10px 0;
    word-wrap: break-word;
    word-break: break-word;
  }

  /* === EXECUTIVE SIDEBAR === */
  .executive-sidebar {
    background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
    padding: 50px 35px;
    border-left: 1px solid #e2e8f0;
    height: auto;
    overflow: visible;
    min-height: 500px;
    position: relative;
  }

  /* Sidebar accent line */
  .executive-sidebar::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: linear-gradient(180deg, #1a365d, #2c5282, #4299e1);
  }

  .executive-sidebar-section {
    margin-bottom: 40px;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Executive Sidebar Titles */
  .executive-sidebar h2 {
    font-family: 'Inter', sans-serif;
    color: #1a365d;
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 20px 0;
    padding-bottom: 10px;
    border-bottom: 1px solid #1a365d;
    text-transform: uppercase;
    letter-spacing: 1px;
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
  }

  .executive-sidebar h2::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 40px;
    height: 1px;
    background: #2c5282;
  }

  .executive-sidebar h2 .executive-icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    filter: invert(11%) sepia(78%) saturate(1847%) hue-rotate(194deg) brightness(93%) contrast(96%);
  }

  /* Sidebar Content */
  .executive-sidebar ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .executive-sidebar li {
    padding: 10px 0;
    font-size: 14px;
    color: #2d3748;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 500;
    word-wrap: break-word;
    word-break: break-word;
    position: relative;
    transition: all 0.3s ease;
  }

  .executive-sidebar li:hover {
    color: #1a365d;
    padding-left: 10px;
  }

  .executive-sidebar li:last-child {
    border-bottom: none;
  }

  /* === EXECUTIVE EDUCATION STYLING === */
  .executive-education {
    margin-bottom: 25px;
    padding: 25px;
    background: linear-gradient(135deg, #f0f4f8 0%, #e6f3ff 100%);
    border-radius: 8px;
    border-left: 4px solid #2c5282;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
  }

  .executive-education h3 {
    font-family: 'Crimson Text', serif;
    color: #1a365d;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 6px 0;
    word-wrap: break-word;
    word-break: break-word;
  }

  .executive-education .institution {
    color: #4a5568;
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 4px 0;
  }

  .executive-education .period {
    color: #718096;
    font-size: 13px;
    font-style: italic;
    font-weight: 500;
  }

  /* === EXECUTIVE PROJECTS STYLING === */
  .executive-project {
    margin-bottom: 25px;
    padding: 25px;
    background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
    border-radius: 8px;
    border-left: 4px solid #4299e1;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
    position: relative;
  }

  .executive-project::after {
    content: '';
    position: absolute;
    top: 15px;
    right: 15px;
    width: 8px;
    height: 8px;
    background: linear-gradient(135deg, #4299e1, #63b3ed);
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(66, 153, 225, 0.3);
  }

  .executive-project h3 {
    font-family: 'Crimson Text', serif;
    color: #1a365d;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 10px 0;
    word-wrap: break-word;
    word-break: break-word;
  }

  .executive-project p {
    color: #2d3748;
    font-size: 14px;
    margin: 0 0 8px 0;
    line-height: 1.6;
  }

  /* === RESPONSIVE DESIGN === */
  @media (max-width: 768px) {
    body {
      padding: 20px;
    }

    .executive-resume-container {
      max-width: 100%;
      height: auto;
      min-height: auto;
    }

    .executive-content-wrapper {
      grid-template-columns: 1fr;
      height: auto;
      min-height: auto;
    }

    .executive-sidebar {
      border-left: none;
      border-top: 3px solid #1a365d;
      height: auto;
      min-height: auto;
    }

    .executive-main {
      height: auto;
      min-height: auto;
      padding: 30px 25px;
    }

    .executive-header {
      padding: 40px 25px;
    }

    .executive-name {
      font-size: 36px;
    }

    .executive-title {
      font-size: 18px;
    }

    .executive-contacts {
      flex-direction: column;
      gap: 15px;
    }

    .executive-contact {
      width: 100%;
      justify-content: center;
    }
  }

  /* === PRINT STYLES === */
  @media print {
    body {
      margin: 0;
      padding: 0;
      background: white;
      font-size: 12pt;
    }
    
    .executive-resume-container {
      box-shadow: none;
      border-radius: 0;
      max-width: 100%;
      height: auto;
      min-height: auto;
      overflow: visible;
    }

    .executive-header {
      background: #1a365d !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .executive-content-wrapper {
      grid-template-columns: 2fr 1fr;
      height: auto;
      min-height: auto;
    }

    .executive-sidebar {
      background: #f8fafc !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      height: auto;
      overflow: visible;
    }

    .executive-main {
      height: auto;
      overflow: visible;
    }

    .executive-experience,
    .executive-education,
    .executive-project {
      break-inside: avoid;
      page-break-inside: avoid;
      overflow: visible;
    }

    .executive-name {
      font-size: 28pt;
    }

    .executive-title {
      font-size: 16pt;
    }

    .executive-main h2 {
      font-size: 16pt;
    }
  }

  /* === EXECUTIVE PREMIUM ACCENTS === */
  
  /* Subtle geometric patterns for premium feel */
  .executive-main::after {
    content: '';
    position: absolute;
    bottom: 30px;
    right: 30px;
    width: 40px;
    height: 40px;
    background: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%231a365d' fill-opacity='0.05'%3E%3Cpath d='M20 20l20-20v20zm0 0l-20 20h20z'/%3E%3C/g%3E%3C/svg%3E") no-repeat;
    opacity: 0.3;
  }

  /* Executive watermark */
  .executive-sidebar::after {
    content: '';
    position: absolute;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 20px;
    background: linear-gradient(45deg, #1a365d, transparent);
    opacity: 0.1;
    transform: skew(-20deg);
  }

  /* === ACCESSIBILITY ENHANCEMENTS === */
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .executive-header {
      background: #000 !important;
    }
    
    .executive-contact {
      border: 2px solid #fff;
    }
    
    .executive-experience,
    .executive-education,
    .executive-project {
      border: 1px solid #000;
    }
  }

  /* Reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    .executive-contact {
      transition: none;
    }
    
    .executive-sidebar li {
      transition: none;
    }
  }

  /* === UTILITY CLASSES === */
  
  /* Text handling for executive content */
  .executive-contact,
  .executive-address {
    word-break: break-all;
    overflow-wrap: break-word;
  }

  /* Image responsiveness */
  img {
    max-width: 100%;
    height: auto;
  }

  /* Table responsiveness if needed */
  table {
    width: 100%;
    table-layout: fixed;
    word-wrap: break-word;
  }

  /* === FINAL EXECUTIVE TOUCHES === */
  
  /* Premium selection styling */
  ::selection {
    background: rgba(26, 54, 93, 0.2);
    color: #1a365d;
  }

  ::-moz-selection {
    background: rgba(26, 54, 93, 0.2);
    color: #1a365d;
  }

  /* Executive focus states */
  .executive-contact:focus {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 2px;
  }

  /* Scrollbar styling for webkit browsers */
  .executive-main::-webkit-scrollbar,
  .executive-sidebar::-webkit-scrollbar {
    width: 6px;
  }

  .executive-main::-webkit-scrollbar-track,
  .executive-sidebar::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  .executive-main::-webkit-scrollbar-thumb,
  .executive-sidebar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #1a365d, #2c5282);
    border-radius: 3px;
  }

  /* === END OF EXECUTIVE STYLES === */
`;
