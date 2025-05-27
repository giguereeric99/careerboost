/**
 * Creative Template Styles - SIMPLIFIED ARTISTIC DESIGN WITH COLORED SECTIONS
 * Innovative design with colored section backgrounds instead of individual tags
 * This approach works reliably with any resume content structure
 * Each sidebar section has its own unique color scheme for visual distinction
 */

export const creativeStyles = `
  /* === GLOBAL STYLES WITH CREATIVE FLAIR === */
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap');

  body {
    font-family: 'Poppins', sans-serif;
    margin: 0;
    padding: 40px;
    color: #2d3748;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    line-height: 1.7;
    font-size: 14px;
    min-height: 100vh;
  }

  /* === MAIN CONTAINER WITH ARTISTIC STYLING === */
  .creative-resume-container {
    background: #ffffff;
    max-width: 1000px;
    margin: 0 auto;
    box-shadow: 
      0 20px 60px rgba(0, 0, 0, 0.15),
      0 8px 25px rgba(0, 0, 0, 0.1);
    border-radius: 20px;
    overflow: hidden;
    min-height: 800px;
    height: auto;
    position: relative;
    animation: containerFadeIn 1s ease-out;
  }

  /* Container entrance animation for visual appeal */
  @keyframes containerFadeIn {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* === ARTISTIC HEADER SECTION === */
  .creative-header {
    position: relative;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    padding: 50px 40px;
    text-align: center;
    overflow: hidden;
    min-height: 200px;
  }

  /* Background artistic shapes for visual appeal */
  .creative-header-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    z-index: 1;
  }

  .creative-shape {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    animation: floatAnimation 6s ease-in-out infinite;
  }

  /* Individual floating shapes with different sizes and positions */
  .creative-shape-1 {
    width: 150px;
    height: 150px;
    top: -75px;
    left: -75px;
    animation-delay: 0s;
  }

  .creative-shape-2 {
    width: 100px;
    height: 100px;
    top: 20%;
    right: -50px;
    animation-delay: 2s;
  }

  .creative-shape-3 {
    width: 80px;
    height: 80px;
    bottom: -40px;
    left: 30%;
    animation-delay: 4s;
  }

  /* Floating animation for background shapes */
  @keyframes floatAnimation {
    0%, 100% {
      transform: translateY(0px) rotate(0deg);
    }
    50% {
      transform: translateY(-20px) rotate(180deg);
    }
  }

  /* Header content styling with z-index to appear above shapes */
  .creative-header-content {
    position: relative;
    z-index: 2;
  }

  .creative-name {
    font-family: 'Playfair Display', serif;
    font-size: 42px;
    font-weight: 700;
    margin: 0 0 15px 0;
    letter-spacing: 2px;
    color: #ffffff;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    animation: nameSlideIn 1s ease-out 0.5s both;
  }

  /* Name entrance animation */
  @keyframes nameSlideIn {
    from {
      opacity: 0;
      transform: translateY(-30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .creative-title {
    font-size: 20px;
    font-weight: 400;
    margin: 0 0 30px 0;
    color: rgba(255, 255, 255, 0.9);
    font-style: italic;
    letter-spacing: 1px;
    animation: titleFadeIn 1s ease-out 0.8s both;
  }

  /* Title entrance animation */
  @keyframes titleFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* === CREATIVE CONTACT INFORMATION === */
  .creative-contacts {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    gap: 25px;
    margin: 30px 0 20px 0;
    animation: contactsSlideUp 1s ease-out 1s both;
  }

  /* Contacts entrance animation */
  @keyframes contactsSlideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .creative-contact-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.15);
    padding: 12px 18px;
    border-radius: 25px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
    cursor: pointer;
  }

  /* Contact item hover effects for interactivity */
  .creative-contact-item:hover {
    background: rgba(255, 255, 255, 0.25);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }

  .creative-contact-icon {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .creative-contact-icon img {
    width: 100%;
    height: 100%;
    filter: invert(1); /* Make icons white on dark background */
  }

  .creative-contact-text {
    color: #ffffff;
    font-size: 14px;
    font-weight: 500;
  }

  .creative-address {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 20px 0 0 0;
    animation: addressFadeIn 1s ease-out 1.2s both;
  }

  /* Address entrance animation */
  @keyframes addressFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .creative-address-text {
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    line-height: 1.4;
  }

  /* === MAIN CONTENT LAYOUT === */
  .creative-content-wrapper {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 0;
    min-height: 600px;
    height: auto;
    overflow: visible;
  }

  /* === CREATIVE SIDEBAR WITH DECORATIVE ELEMENTS === */
  .creative-sidebar {
    background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
    padding: 8px 30px 120px 30px; /* Extra bottom padding for decoration */
    border-right: 3px solid #e2e8f0;
    height: auto;
    overflow: visible;
    min-height: 500px;
    position: relative;
  }

  /* Sidebar top accent line for visual separation */
  .creative-sidebar::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  }

  .creative-sidebar-section {
    margin-bottom: 35px;
    animation: sectionSlideIn 0.8s ease-out both;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Staggered animation delays for sidebar sections */
  .creative-sidebar-section:nth-child(1) { animation-delay: 0.2s; }
  .creative-sidebar-section:nth-child(2) { animation-delay: 0.4s; }
  .creative-sidebar-section:nth-child(3) { animation-delay: 0.6s; }
  .creative-sidebar-section:nth-child(4) { animation-delay: 0.8s; }

  /* Section entrance animation */
  @keyframes sectionSlideIn {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* === SIMPLIFIED COLORED SECTION BACKGROUNDS === */
  
  /* Skills Section - Blue Theme */
  .creative-skills-section .creative-section-content {
    background: rgba(102, 126, 234, 0.05);
    border-left: 4px solid #667eea;
    border-radius: 12px;
    padding: 20px;
    margin: 10px 0;
    transition: all 0.3s ease;
  }

  .creative-skills-section .creative-section-content:hover {
    background: rgba(102, 126, 234, 0.08);
    transform: translateX(3px);
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.15);
  }

  /* Languages Section - Purple/Pink Theme */
  .creative-languages-section .creative-section-content {
    background: rgba(240, 147, 251, 0.05);
    border-left: 4px solid #f093fb;
    border-radius: 12px;
    padding: 20px;
    margin: 10px 0;
    transition: all 0.3s ease;
  }

  .creative-languages-section .creative-section-content:hover {
    background: rgba(240, 147, 251, 0.08);
    transform: translateX(3px);
    box-shadow: 0 4px 15px rgba(240, 147, 251, 0.15);
  }

  /* Certifications Section - Green Theme */
  .creative-certifications-section .creative-section-content {
    background: rgba(67, 233, 123, 0.05);
    border-left: 4px solid #43e97b;
    border-radius: 12px;
    padding: 20px;
    margin: 10px 0;
    transition: all 0.3s ease;
  }

  .creative-certifications-section .creative-section-content:hover {
    background: rgba(67, 233, 123, 0.08);
    transform: translateX(3px);
    box-shadow: 0 4px 15px rgba(67, 233, 123, 0.15);
  }

  /* Interests Section - Orange Theme */
  .creative-interests-section .creative-section-content {
    background: rgba(255, 152, 0, 0.05);
    border-left: 4px solid #ff9800;
    border-radius: 12px;
    padding: 20px;
    margin: 10px 0;
    transition: all 0.3s ease;
  }

  .creative-interests-section .creative-section-content:hover {
    background: rgba(255, 152, 0, 0.08);
    transform: translateX(3px);
    box-shadow: 0 4px 15px rgba(255, 152, 0, 0.15);
  }

  /* === SIDEBAR DECORATIVE ELEMENT === */
  .creative-sidebar-decoration {
    position: absolute;
    bottom: 30px;
    left: 30px;
    right: 30px;
    text-align: center;
    opacity: 0.6;
  }

  .decoration-shape {
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    opacity: 0.1;
  }

  .decoration-shape-1 {
    width: 40px;
    height: 40px;
    top: -20px;
    left: 10px;
    animation: floatSlow 4s ease-in-out infinite;
  }

  .decoration-shape-2 {
    width: 25px;
    height: 25px;
    top: -10px;
    right: 20px;
    animation: floatSlow 4s ease-in-out infinite 1s;
  }

  .decoration-shape-3 {
    width: 15px;
    height: 15px;
    bottom: 10px;
    left: 50%;
    animation: floatSlow 4s ease-in-out infinite 2s;
  }

  .decoration-text {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 20px;
    font-size: 10px;
    color: #a0aec0;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .decoration-line {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, transparent, #cbd5e0, transparent);
  }

  /* Slow floating animation for decoration */
  @keyframes floatSlow {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  /* === CREATIVE SECTION TITLES === */
  .creative-section-title {
    margin: 0 0 25px 0;
    position: relative;
  }

  .creative-section-title-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px 20px;
    border-radius: 15px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  /* Shimmer effect for section titles */
  .creative-section-title-wrapper::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    animation: shimmer 3s infinite;
  }

  /* Shimmer animation for visual appeal */
  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }

  .creative-section-icon {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    flex-shrink: 0;
  }

  .creative-section-icon img {
    width: 16px;
    height: 16px;
    filter: invert(1); /* Make icons white on colored background */
  }

  .creative-section-title-text {
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    flex: 1;
  }

  .creative-section-decoration {
    width: 30px;
    height: 2px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 1px;
    flex-shrink: 0;
  }

  /* === SIMPLIFIED SIDEBAR CONTENT STYLING === */
  .creative-sidebar-list {
    list-style: none;
    padding: 0;
    margin: 10px 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .creative-sidebar-item {
    background: rgba(255, 255, 255, 0.8);
    padding: 4px 8px !important;
    border-radius: 15px;
    font-size: 12px;
    font-weight: 500;
    border: 1px solid rgba(0, 0, 0, 0.1);
    opacity: 0;
    animation: itemFadeIn 0.6s ease-out both;
    transition: all 0.3s ease;
    word-wrap: break-word;
    word-break: break-word;
  }

  .creative-sidebar-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.95);
  }

  .creative-section-content .creative-sidebar-item p {
    margin: 0;
  }

  .creative-sidebar-item:last-child {
    border-bottom: none;
  }

  /* Item entrance animation with staggered delays */
  @keyframes itemFadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* === MAIN CONTENT AREA === */
  .creative-main {
    padding: 40px;
    background: #ffffff;
    height: auto;
    overflow: visible;
    min-height: 500px;
    position: relative;
  }

  /* Main content top accent line for visual separation */
  .creative-main::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
  }

  .creative-main-section {
    margin-bottom: 40px;
    animation: mainSectionSlideIn 0.8s ease-out both;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .creative-main .creative-main-section ul {
    list-style: none;
    padding: 0;
    margin: 15px 0;
  }

  .creative-main .creative-main-section li {
    position: relative;
    padding: 12px 0 12px 25px;
    margin: 8px 0;
    border-left: 3px solid transparent;
    border-radius: 6px;
    transition: all 0.3s ease;
    line-height: 1.6;
    color: #4a5568;
  }

  /* FIXED: Custom bullet points for main content lists */
  .creative-main .creative-main-section li::before {
    content: '●';
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: #667eea;
    font-size: 14px;
    font-weight: bold;
  }

  /* FIXED: Hover effect for main content list items */
  .creative-main .creative-main-section li:hover {
    background: rgba(102, 126, 234, 0.05);
    border-left-color: #667eea;
    transform: translateX(5px);
    padding-left: 30px;
  }

  /* Staggered animation delays for main sections */
  .creative-main-section:nth-child(1) { animation-delay: 0.3s; }
  .creative-main-section:nth-child(2) { animation-delay: 0.5s; }
  .creative-main-section:nth-child(3) { animation-delay: 0.7s; }
  .creative-main-section:nth-child(4) { animation-delay: 0.9s; }

  /* Main section entrance animation */
  @keyframes mainSectionSlideIn {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .creative-content-text {
    margin: 0 0 15px 0;
    line-height: 1.7;
    color: #4a5568;
    word-wrap: break-word;
    word-break: break-word;
  }

  /* === CREATIVE EXPERIENCE TIMELINE === */
  .creative-experience-item {
    position: relative;
    margin-bottom: 30px;
    padding: 25px;
    background: linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(241, 245, 249, 0.8) 100%);
    border-radius: 15px;
    border-left: 4px solid transparent;
    background-clip: padding-box;
    transition: all 0.3s ease;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
  }

  /* Timeline border effect for experience items */
  .creative-experience-item::before {
    content: '';
    position: absolute;
    left: -4px;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #f093fb 0%, #f5576c 100%);
    border-radius: 2px;
  }

  /* Experience item hover effects for interactivity */
  .creative-experience-item:hover {
    transform: translateX(5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  }

  .creative-timeline-marker {
    position: absolute;
    left: -12px;
    top: 25px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid #ffffff;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
  }

  .creative-experience-item h3 {
    color: #2d3748;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 8px 0;
    word-wrap: break-word;
    word-break: break-word;
  }

  .creative-experience-item .company {
    color: #718096;
    font-size: 14px;
    font-weight: 500;
    margin: 0 0 6px 0;
  }

  .creative-experience-item .period {
    color: #a0aec0;
    font-size: 12px;
    font-style: italic;
    margin: 0 0 15px 0;
  }

  .creative-experience-item ul {
    margin: 10px 0 0 0;
    padding-left: 20px;
  }

  .creative-experience-item li {
    color: #4a5568;
    font-size: 14px;
    line-height: 1.6;
    margin: 8px 0;
    word-wrap: break-word;
    word-break: break-word;
  }

  /* === CREATIVE PROJECT CARDS === */
  .creative-project-card {
    margin-bottom: 25px;
    padding: 25px;
    border-radius: 15px;
    border: 2px solid transparent;
    background: linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(248,249,250,1) 100%);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Project card top accent for visual appeal */
  .creative-project-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
  }

  /* Project card hover effects for interactivity */
  .creative-project-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 40px rgba(79, 172, 254, 0.2);
    border-color: rgba(79, 172, 254, 0.3);
  }

  .creative-project-card h3 {
    color: #2d3748;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 10px 0;
    word-wrap: break-word;
    word-break: break-word;
  }

  /* === CREATIVE EDUCATION CARDS === */
  .creative-education-card {
    margin-bottom: 25px;
    padding: 20px;
    background: linear-gradient(135deg, rgba(67, 233, 123, 0.1) 0%, rgba(56, 249, 215, 0.1) 100%);
    border-radius: 12px;
    border-left: 4px solid #43e97b;
    transition: all 0.3s ease;
    page-break-inside: avoid;
    break-inside: avoid;
    overflow: visible;
  }

  /* Education card hover effects for interactivity */
  .creative-education-card:hover {
    transform: translateX(5px);
    box-shadow: 0 8px 25px rgba(67, 233, 123, 0.2);
  }

  .creative-education-card h3 {
    color: #2d3748;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px 0;
    word-wrap: break-word;
    word-break: break-word;
  }

  .creative-education-card .institution {
    color: #718096;
    font-size: 14px;
    margin: 0 0 6px 0;
  }

  .creative-education-card .period {
    color: #a0aec0;
    font-size: 12px;
    font-style: italic;
  }

  /* === RESPONSIVE DESIGN === */
  @media (max-width: 768px) {
    body {
      padding: 20px;
    }

    .creative-resume-container {
      max-width: 100%;
      border-radius: 15px;
      height: auto;
      min-height: auto;
    }

    .creative-content-wrapper {
      grid-template-columns: 1fr;
      height: auto;
      min-height: auto;
    }

    .creative-sidebar {
      border-right: none;
      border-bottom: 3px solid #e2e8f0;
      height: auto;
      min-height: auto;
      padding-bottom: 60px;
    }

    .creative-main {
      height: auto;
      min-height: auto;
      padding: 30px 20px;
    }

    .creative-header {
      padding: 40px 20px;
    }

    .creative-name {
      font-size: 32px;
    }

    .creative-title {
      font-size: 18px;
    }

    .creative-contacts {
      flex-direction: column;
      gap: 15px;
    }

    .creative-contact-item {
      width: 100%;
      justify-content: center;
    }

    .creative-section-title-text {
      font-size: 14px;
    }

    .creative-experience-item,
    .creative-project-card,
    .creative-education-card {
      margin-left: 0;
      padding: 20px;
    }

    .creative-timeline-marker {
      display: none; /* Hide timeline markers on mobile for cleaner look */
    }

    /* Mobile responsive for sidebar content */
    .creative-sidebar-list {
      gap: 6px;
    }

    .creative-sidebar-item {
      padding: 5px 10px;
      font-size: 11px;
    }

    /* Mobile decoration adjustments */
    .creative-sidebar-decoration {
      bottom: 15px;
      left: 20px;
      right: 20px;
    }

    .decoration-text {
      font-size: 9px;
    }

    /* Adjust section content padding on mobile */
    .creative-skills-section .creative-section-content,
    .creative-languages-section .creative-section-content,
    .creative-certifications-section .creative-section-content,
    .creative-interests-section .creative-section-content {
      padding: 15px;
      margin: 8px 0;
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
    
    .creative-resume-container {
      box-shadow: none;
      border-radius: 0;
      max-width: 100%;
      height: auto;
      min-height: auto;
      overflow: visible;
    }

    .creative-header {
      background: #667eea !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .creative-content-wrapper {
      grid-template-columns: 1fr 2fr;
      height: auto;
      min-height: auto;
    }

    .creative-sidebar {
      background: #f8fafc !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      height: auto;
      overflow: visible;
      padding-bottom: 30px;
    }

    .creative-main {
      height: auto;
      overflow: visible;
    }

    .creative-experience-item,
    .creative-project-card,
    .creative-education-card {
      break-inside: avoid;
      page-break-inside: avoid;
      overflow: visible;
    }

    .creative-name {
      font-size: 24pt;
    }

    .creative-title {
      font-size: 16pt;
    }

    .creative-section-title-text {
      font-size: 12pt;
    }

    /* Print optimization for colored sections */
    .creative-skills-section .creative-section-content,
    .creative-languages-section .creative-section-content,
    .creative-certifications-section .creative-section-content,
    .creative-interests-section .creative-section-content {
      background: #f8f9fa !important;
      border: 1px solid #dee2e6 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 15px;
    }

    .creative-sidebar-item {
      background: #f8f9fa !important;
      border: 1px solid #dee2e6 !important;
      color: #495057 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 10px;
      padding: 4px 8px;
    }

    /* Hide decoration on print for cleaner output */
    .creative-sidebar-decoration {
      display: none;
    }

    /* Disable animations for print performance */
    * {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      }
  }

  /* === UTILITY CLASSES FOR CONTENT OVERFLOW === */
  
  /* Ensure long URLs or text don't break layout */
  .creative-contact-text,
  .creative-address-text {
    word-break: break-all;
    overflow-wrap: break-word;
  }

  /* Ensure tables (if any) are responsive */
  table {
    width: 100%;
    table-layout: fixed;
    word-wrap: break-word;
  }

  /* Ensure images don't overflow container */
  img {
    max-width: 100%;
    height: auto;
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

  /* High contrast mode support for better accessibility */
  @media (prefers-contrast: high) {
    .creative-section-title-wrapper {
      border: 2px solid #000;
    }
    
    .creative-contact-item {
      border: 1px solid #000;
    }
    
    .creative-experience-item,
    .creative-project-card,
    .creative-education-card {
      border: 1px solid #000;
    }

    .creative-sidebar-item {
      border: 2px solid #000 !important;
      background: #fff !important;
      color: #000 !important;
    }

    /* High contrast for colored sections */
    .creative-skills-section .creative-section-content,
    .creative-languages-section .creative-section-content,
    .creative-certifications-section .creative-section-content,
    .creative-interests-section .creative-section-content {
      border: 2px solid #000 !important;
      background: #fff !important;
    }
  }

  /* === FOCUS STATES FOR KEYBOARD NAVIGATION === */
  .creative-sidebar-item:focus {
    outline: 2px solid #667eea;
    outline-offset: 2px;
  }

  .creative-contact-item:focus {
    outline: 2px solid rgba(255, 255, 255, 0.8);
    outline-offset: 2px;
  }

  .creative-experience-item:focus,
  .creative-project-card:focus,
  .creative-education-card:focus {
    outline: 2px solid #667eea;
    outline-offset: 2px;
  }

  /* === PERFORMANCE OPTIMIZATIONS === */
  
  /* Optimize animations for better performance */
  .creative-sidebar-item {
    will-change: transform;
  }

  .creative-experience-item,
  .creative-project-card,
  .creative-education-card {
    will-change: transform;
  }

  .creative-contact-item {
    will-change: transform, background-color;
  }

  /* === DARK MODE SUPPORT (OPTIONAL) === */
  @media (prefers-color-scheme: dark) {
    .creative-sidebar {
      background: linear-gradient(180deg, #1a202c 0%, #2d3748 100%);
    }

    .creative-main {
      background: #1a202c;
      color: #e2e8f0;
    }

    .creative-content-text {
      color: #cbd5e0;
    }

    .creative-sidebar-item {
      background: rgba(45, 55, 72, 0.8) !important;
      color: #e2e8f0 !important;
      border-color: rgba(226, 232, 240, 0.2) !important;
    }

    .creative-experience-item {
      background: linear-gradient(135deg, rgba(45, 55, 72, 0.8) 0%, rgba(74, 85, 104, 0.8) 100%);
    }

    .creative-project-card {
      background: linear-gradient(135deg, rgba(26, 32, 44, 1) 0%, rgba(45, 55, 72, 1) 100%);
    }

    .creative-education-card {
      background: linear-gradient(135deg, rgba(67, 233, 123, 0.2) 0%, rgba(56, 249, 215, 0.2) 100%);
    }

    /* Dark mode for colored sections */
    .creative-skills-section .creative-section-content {
      background: rgba(102, 126, 234, 0.15);
      border-left-color: #8a9cff;
    }

    .creative-languages-section .creative-section-content {
      background: rgba(240, 147, 251, 0.15);
      border-left-color: #f5a3ff;
    }

    .creative-certifications-section .creative-section-content {
      background: rgba(67, 233, 123, 0.15);
      border-left-color: #7df29e;
    }

    .creative-interests-section .creative-section-content {
      background: rgba(255, 152, 0, 0.15);
      border-left-color: #ffb347;
    }
  }

  /* === ADVANCED HOVER EFFECTS === */
  .creative-sidebar-item {
    position: relative;
    overflow: hidden;
  }

  /* Subtle shine effect on hover for sidebar items */
  .creative-sidebar-item::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
    transition: all 0.3s ease;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    pointer-events: none;
  }

  .creative-sidebar-item:hover::after {
    width: 60px;
    height: 60px;
  }

  /* === ANIMATION PERFORMANCE OPTIMIZATION === */
  @media (prefers-reduced-motion: no-preference) {
    .creative-sidebar-item {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .creative-experience-item,
    .creative-project-card,
    .creative-education-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .creative-contact-item {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Smooth transitions for colored sections */
    .creative-skills-section .creative-section-content,
    .creative-languages-section .creative-section-content,
    .creative-certifications-section .creative-section-content,
    .creative-interests-section .creative-section-content {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  /* === SECTION DIVIDERS (OPTIONAL ENHANCEMENT) === */
  .creative-sidebar-section:not(:last-child)::after {
    content: '';
    display: block;
    width: 50px;
    height: 1px;
    background: linear-gradient(90deg, transparent, #cbd5e0, transparent);
    margin: 25px auto;
  }

  /* === CUSTOM SCROLLBAR (WEBKIT BROWSERS) === */
  .creative-sidebar::-webkit-scrollbar {
    width: 6px;
  }

  .creative-sidebar::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  .creative-sidebar::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 3px;
  }

  .creative-sidebar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #5a6fd8 0%, #6b4190 100%);
  }

  /* === CONTENT FLEXIBILITY ENHANCEMENTS === */
  
  /* Handle different content structures gracefully */
  .creative-section-content p {
    margin: 8px 0;
    line-height: 1.6;
  }

  .creative-section-content ul {
    margin: 10px 0;
    padding-left: 0;
  }

  .creative-section-content li {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  /* Ensure consistent spacing for various content types */
  .creative-section-content > *:first-child {
    margin-top: 0;
  }

  .creative-section-content > *:last-child {
    margin-bottom: 0;
  }

  /* Handle text content that might not be in lists */
  .creative-section-content {
    line-height: 1.6;
    font-size: 13px;
    color: #4a5568;
  }

  /* === LOADING STATES (OPTIONAL) === */
  .creative-section-loading {
    opacity: 0.6;
    pointer-events: none;
  }

  .creative-section-loading::after {
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
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  /* === ERROR STATES (OPTIONAL) === */
  .creative-section-error {
    border: 2px dashed #ff6b6b;
    background: rgba(255, 107, 107, 0.1);
    color: #c92a2a;
    text-align: center;
    padding: 20px;
    border-radius: 8px;
  }

  .creative-section-error::before {
    content: '⚠️';
    display: block;
    font-size: 24px;
    margin-bottom: 10px;
  }

  /* === PRINT ENHANCEMENTS === */
  @media print {
    /* Force color printing for better visual hierarchy */
    .creative-skills-section .creative-section-content,
    .creative-languages-section .creative-section-content,
    .creative-certifications-section .creative-section-content,
    .creative-interests-section .creative-section-content {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Optimize spacing for print */
    .creative-sidebar-section {
      margin-bottom: 25px;
    }

    .creative-main-section {
      margin-bottom: 30px;
    }

    /* Ensure content doesn't get cut off */
    .creative-section-content {
      overflow: visible;
      page-break-inside: avoid;
    }
  }

  /* === FINAL FALLBACKS === */
  
  /* Fallback fonts for better compatibility */
  .creative-name {
    font-family: 'Playfair Display', 'Times New Roman', serif;
  }

  body {
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  }

  /* Fallback for grid support */
  @supports not (display: grid) {
    .creative-content-wrapper {
      display: table;
      width: 100%;
    }

    .creative-sidebar {
      display: table-cell;
      width: 33.33%;
      vertical-align: top;
    }

    .creative-main {
      display: table-cell;
      width: 66.67%;
      vertical-align: top;
    }
  }

 /* === END OF STYLES === */
`;
