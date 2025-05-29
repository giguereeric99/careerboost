/**
 * Basic Template Styles
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
    font-size: 16px;
    background-color: #fff;
  }
  
  .resume-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  p.title {
    font-size: 18px;
    font-weight: bold;
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
  
  /* Contact information styling with CSS separators */
  .phone {
    font-weight: normal;
  }

  .email {
    font-weight: normal;
  }

  .email::before { 
    content: " | "; 
    color: #666;
  }

  .linkedin {
    font-weight: normal;
  }

  .linkedin::before { 
    content: " | "; 
    color: #666;
  }

  .portfolio {
    font-weight: normal;
  }

  .portfolio::before { 
    content: " | "; 
    color: #666;
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

  /* === FIX FOR ORDERED LISTS ALIGNMENT === */
  
  /* Fix ordered lists that extend too far left */
  ol {
    padding-left: 20px !important;
    margin-left: 0 !important;
  }

  .section ol {
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
  
  /* For print output */
  @media print {
    body {
      margin: 0;
      padding: 0;
      font-size: 12pt;
    }

    * {
      page-break-before: auto !important;
      page-break-after: auto !important;
      page-break-inside: auto !important;
      break-before: auto !important;
      break-after: auto !important;
      break-inside: auto !important;
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
