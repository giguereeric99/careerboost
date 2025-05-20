/**
 * Template Styles Constants
 * 
 * This file contains all CSS styles for different resume templates
 * Centralizing styles makes them easier to maintain and update
 */

/**
 * Basic template styling 
 * Clean and minimalist styling suitable for formal applications
 */
export const basicStyles = `
  /* Page setup and general typography */
  body {
    font-family: Arial, sans-serif;
    margin: 40px;
    padding: 0;
    color: #333;
    line-height: 1.6;
    font-size: 14px;
    background-color: #fff;
  }
  
  .resume-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  
  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 0;
    color: #222;
    font-weight: 600;
  }
  
  h1 {
    font-size: 28px;
    margin-bottom: 10px;
    text-transform: uppercase;
  }
  
  h2 {
    font-size: 20px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 5px;
    margin-top: 25px;
    margin-bottom: 15px;
    text-transform: uppercase;
  }
  
  h3 {
    font-size: 18px;
    margin-bottom: 5px;
  }
  
  h4 {
    font-size: 16px;
    margin-bottom: 5px;
  }
  
  /* Paragraphs and lists */
  p, li {
    margin: 5px 0;
  }
  
  ul {
    padding-left: 20px;
    margin: 10px 0;
  }
  
  /* Sections */
  .section {
    margin-bottom: 20px;
    break-inside: avoid;
  }
  
  /* Header section */
  #resume-header {
    margin-bottom: 25px;
    text-align: left;
  }
  
  /* Contact information styling */
  .email {
    font-weight: normal;
  }
  
  .phone {
    font-weight: normal;
  }
  
  .address {
    font-weight: normal;
  }
  
  /* Specific section styling */
  #resume-summary {
    margin-bottom: 25px;
  }
  
  #resume-summary p {
    font-style: italic;
    color: #333;
  }
  
  #resume-skills ul, 
  #resume-languages ul {
    columns: 2;
    list-style-type: disc;
  }
  
  /* Experience styling */
  #resume-experience li {
    margin-bottom: 10px;
  }
  
  #resume-experience strong {
    display: inline-block;
  }
  
  /* For print output */
  @media print {
    body {
      margin: 0;
      padding: 0;
      font-size: 12pt;
    }
    
    .resume-container {
      width: 100%;
      padding: 0;
      margin: 0;
    }
    
    h1 {
      font-size: 18pt;
    }
    
    h2 {
      font-size: 14pt;
    }
    
    h3 {
      font-size: 12pt;
    }
  }
`;

/**
 * Professional template styles (Pro)
 * Elegant design based on the provided example
 */
export const professionalStyles = `
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 40px;
    color: #2c2c2c;
    background-color: #f9f9f9;
  }
  .container {
    background: #fff;
    max-width: 800px;
    margin: auto;
    padding: 40px;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
  }
  h1, h2, h3 {
    color: #003366;
    margin-bottom: 5px;
  }
  h1 {
    font-size: 28px;
  }
  h2 {
    font-size: 22px;
    border-bottom: 2px solid #003366;
    padding-bottom: 4px;
    margin-top: 30px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  p {
    margin: 5px 0;
    line-height: 1.6;
  }
  .contact-info {
    font-size: 14px;
    color: #555;
    margin-bottom: 30px;
  }
  .section {
    margin-top: 20px;
  }
  .job {
    margin-bottom: 15px;
  }
  .job-title {
    font-weight: bold;
  }
  .job-period {
    font-style: italic;
    color: #666;
  }
  ul {
    margin: 5px 0 15px 20px;
  }
  .skills, .languages {
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    gap: 10px;
  }
  .skills ul, .languages ul {
    list-style: none;
    display: flex;
    padding: 0;
    margin: 0;
  }
  .badge,
  .skills ul li,
  .languages ul li {
    background-color: #003366;
    color: white;
    padding: 5px 10px;
    border-radius: 12px;
    font-size: 13px;
  }
  .icon {
    width: 20px;
    height: 20px;
    display: inline-block;
  }
`;

/**
 * Creative template styles (Pro)
 * Unique styling for creative industries
 */
export const creativeStyles = `
  body {
    font-family: 'Montserrat', Arial, sans-serif;
    margin: 40px;
    padding: 0;
    color: #333;
    line-height: 1.6;
    font-size: 14px;
    background-color: #fafafa;
  }
  h1, h2 {
    margin-bottom: 15px;
    color: #ff5722;
  }
  h1 {
    font-size: 32px;
    margin-top: 0;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  h2 {
    font-size: 22px;
    border-bottom: 2px solid #ff5722;
    padding-bottom: 8px;
    margin-top: 25px;
    text-transform: uppercase;
  }
  h3 {
    font-size: 20px;
    color: #ff5722;
    margin-top: 20px;
    margin-bottom: 10px;
  }
  h4 {
    font-size: 18px;
    color: #ff5722;
    margin-top: 15px;
    margin-bottom: 8px;
  }
  p, li {
    margin: 8px 0;
  }
  ul {
    padding-left: 25px;
  }
  .contact {
    background-color: #f5f5f5;
    padding: 15px;
    border-radius: 5px;
    margin-top: 10px;
    margin-bottom: 30px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .section {
    margin-bottom: 25px;
    padding: 0 10px;
  }
`;

/**
 * Executive template styles (Pro)
 * Sophisticated styling for executive positions
 */
export const executiveStyles = `
  body {
    font-family: 'Georgia', serif;
    margin: 40px;
    padding: 0;
    color: #1a1a1a;
    line-height: 1.6;
    font-size: 14px;
  }
  h1, h2 {
    margin-bottom: 15px;
    color: #2c3e50;
    font-family: 'Times New Roman', Times, serif;
  }
  h1 {
    font-size: 30px;
    margin-top: 0;
    text-align: center;
    border-bottom: 2px solid #2c3e50;
    padding-bottom: 10px;
    text-transform: uppercase;
  }
  h2 {
    font-size: 22px;
    border-bottom: 1px solid #2c3e50;
    padding-bottom: 8px;
    margin-top: 25px;
    text-transform: uppercase;
  }
  h3 {
    font-size: 20px;
    color: #2c3e50;
    margin-top: 20px;
    margin-bottom: 10px;
  }
  h4 {
    font-size: 18px;
    color: #2c3e50;
    margin-top: 15px;
    margin-bottom: 8px;
    font-style: italic;
  }
  p, li {
    margin: 8px 0;
  }
  ul {
    padding-left: 25px;
  }
  .contact {
    text-align: center;
    margin-top: 10px;
    margin-bottom: 40px;
    font-style: italic;
  }
  .section {
    margin-bottom: 30px;
  }
  .job-title {
    font-weight: bold;
    color: #2c3e50;
  }
`;

/**
 * Technical template styles (Pro)
 * Specialized layout for technical positions
 */
export const technicalStyles = `
  body {
    font-family: 'Consolas', 'Monaco', monospace;
    margin: 40px;
    padding: 0;
    color: #333;
    line-height: 1.6;
    font-size: 14px;
  }
  h1, h2 {
    margin-bottom: 15px;
    color: #0066cc;
    font-family: 'Arial', sans-serif;
  }
  h1 {
    font-size: 28px;
    margin-top: 0;
    text-transform: uppercase;
  }
  h2 {
    font-size: 20px;
    border-bottom: 2px solid #0066cc;
    padding-bottom: 8px;
    margin-top: 25px;
    text-transform: uppercase;
  }
  h3 {
    font-size: 18px;
    color: #0066cc;
    margin-top: 20px;
    margin-bottom: 10px;
    font-family: 'Arial', sans-serif;
  }
  h4 {
    font-size: 16px;
    color: #0066cc;
    margin-top: 15px;
    margin-bottom: 8px;
    font-family: 'Arial', sans-serif;
  }
  p, li {
    margin: 7px 0;
  }
  ul {
    padding-left: 20px;
    list-style-type: square;
  }
  .contact {
    background-color: #f8f8f8;
    padding: 10px;
    border-left: 4px solid #0066cc;
    font-family: 'Arial', sans-serif;
    margin-top: 10px;
    margin-bottom: 30px;
  }
  .section {
    margin-bottom: 25px;
  }
  .skill-item {
    display: inline-block;
    background-color: #e6f0ff;
    padding: 3px 8px;
    margin: 2px;
    border-radius: 3px;
    border: 1px solid #b3d1ff;
  }
`;

/**
 * Compact template styles (Pro)
 * Space-efficient design for condensing information
 */
export const compactStyles = `
  body {
    font-family: Arial, sans-serif;
    margin: 25px;
    padding: 0;
    color: #333;
    line-height: 1.4;
    font-size: 12px;
  }
  h1, h2 {
    margin-bottom: 8px;
    color: #222;
  }
  h1 {
    font-size: 22px;
    margin-top: 0;
    text-transform: uppercase;
  }
  h2 {
    font-size: 16px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
    margin-top: 20px;
    text-transform: uppercase;
  }
  h3 {
    font-size: 14px;
    margin-top: 15px;
    margin-bottom: 5px;
    text-transform: uppercase;
  }
  h4 {
    font-size: 13px;
    margin-top: 10px;
    margin-bottom: 5px;
  }
  p, li {
    margin: 3px 0;
  }
  ul {
    padding-left: 18px;
    margin: 5px 0;
  }
  .contact {
    margin-top: 5px;
    margin-bottom: 15px;
    font-size: 11px;
  }
  .section {
    margin-bottom: 15px;
  }
  .job-title {
    font-weight: bold;
  }
  .date {
    font-size: 11px;
    color: #666;
  }
`;