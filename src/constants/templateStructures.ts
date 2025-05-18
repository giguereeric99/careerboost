/**
 * Template Structures Constants
 * 
 * This file contains HTML structures for different resume templates
 * Each template has its own HTML layout with placeholders for content
 */

/**
 * Basic template HTML structure
 * Simple and clean layout with standard sections
 */
export const basicTemplate = `
<div id="resume-header">
  {{resume-header}}
</div>
<div class="contact">
  {{resume-contact}}
</div>
<div class="section" id="resume-summary">
  {{resume-summary}}
</div>
<div class="section" id="resume-experience">
  {{resume-experience}}
</div>
<div class="section" id="resume-education">
  {{resume-education}}
</div>
<div class="section" id="resume-skills">
  {{resume-skills}}
</div>
<div class="section" id="resume-languages">
  {{resume-languages}}
</div>
<div class="section" id="resume-certifications">
  {{resume-certifications}}
</div>
<div class="section" id="resume-projects">
  {{resume-projects}}
</div>
<div class="section" id="resume-awards">
  {{resume-awards}}
</div>
<div class="section" id="resume-volunteering">
  {{resume-volunteering}}
</div>
<div class="section" id="resume-publications">
  {{resume-publications}}
</div>
<div class="section" id="resume-interests">
  {{resume-interests}}
</div>
<div class="section" id="resume-references">
  {{resume-references}}
</div>
<div class="section" id="resume-additional">
  {{resume-additional}}
</div>
`;

/**
 * Professional template HTML structure
 * Based on the provided example with container and icons
 */
export const professionalTemplate = `
<div class="container">
  <div id="resume-header">
    {{resume-header}}
  </div>
  <div class="contact-info">
    {{resume-contact}}
  </div>
  
  <div class="section" id="resume-summary">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/person-fill.svg" alt="Summary"> Professional Summary</h2>
    {{resume-summary}}
  </div>
  
  <div class="section" id="resume-experience">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/briefcase-fill.svg" alt="Experience"> Experience</h2>
    {{resume-experience}}
  </div>
  
  <div class="section" id="resume-education">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/mortarboard-fill.svg" alt="Education"> Education</h2>
    {{resume-education}}
  </div>
  
  <div class="section" id="resume-skills">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/gear-fill.svg" alt="Skills"> Skills</h2>
    <div class="skills">
      {{resume-skills}}
    </div>
  </div>
  
  <div class="section" id="resume-certifications">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/award-fill.svg" alt="Certifications"> Certifications</h2>
    {{resume-certifications}}
  </div>
  
  <div class="section" id="resume-languages">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/globe2.svg" alt="Languages"> Languages</h2>
    <div class="languages">
      {{resume-languages}}
    </div>
  </div>
  
  <div class="section" id="resume-projects">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/layers-fill.svg" alt="Projects"> Projects</h2>
    {{resume-projects}}
  </div>
  
  <div class="section" id="resume-awards">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/trophy-fill.svg" alt="Awards"> Awards & Achievements</h2>
    {{resume-awards}}
  </div>
  
  <div class="section" id="resume-references">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/people-fill.svg" alt="References"> References</h2>
    {{resume-references}}
  </div>
  
  <div class="section" id="resume-publications">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/journal-text.svg" alt="Publications"> Publications</h2>
    {{resume-publications}}
  </div>
  
  <div class="section" id="resume-volunteering">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/heart-fill.svg" alt="Volunteering"> Volunteering</h2>
    {{resume-volunteering}}
  </div>
  
  <div class="section" id="resume-additional">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/info-circle-fill.svg" alt="Additional"> Additional Information</h2>
    {{resume-additional}}
  </div>
  
  <div class="section" id="resume-interests">
    <h2><img class="icon" src="https://cdn.jsdelivr.net/npm/bootstrap-icons/icons/star-fill.svg" alt="Interests"> Interests</h2>
    {{resume-interests}}
  </div>
</div>
`;

/**
 * Creative template HTML structure
 * Modern layout with creative elements
 */
export const creativeTemplate = `
<div class="creative-container">
  <div id="resume-header">
    {{resume-header}}
  </div>
  <div class="contact-creative">
    {{resume-contact}}
  </div>
  
  <div class="section-creative" id="resume-summary">
    <h2>About Me</h2>
    {{resume-summary}}
  </div>
  
  <div class="section-creative" id="resume-experience">
    <h2>Work Experience</h2>
    {{resume-experience}}
  </div>
  
  <div class="section-creative" id="resume-education">
    <h2>Education</h2>
    {{resume-education}}
  </div>
  
  <div class="section-creative" id="resume-skills">
    <h2>Skills & Expertise</h2>
    {{resume-skills}}
  </div>
  
  <div class="section-creative" id="resume-certifications">
    <h2>Certifications</h2>
    {{resume-certifications}}
  </div>
  
  <div class="section-creative" id="resume-languages">
    <h2>Languages</h2>
    {{resume-languages}}
  </div>
  
  <div class="section-creative" id="resume-projects">
    <h2>Projects</h2>
    {{resume-projects}}
  </div>
  
  <div class="section-creative" id="resume-awards">
    <h2>Achievements</h2>
    {{resume-awards}}
  </div>
  
  <div class="section-creative" id="resume-references">
    <h2>References</h2>
    {{resume-references}}
  </div>
  
  <div class="section-creative" id="resume-publications">
    <h2>Publications</h2>
    {{resume-publications}}
  </div>
  
  <div class="section-creative" id="resume-volunteering">
    <h2>Volunteering</h2>
    {{resume-volunteering}}
  </div>
  
  <div class="section-creative" id="resume-additional">
    <h2>Additional Info</h2>
    {{resume-additional}}
  </div>
  
  <div class="section-creative" id="resume-interests">
    <h2>Interests & Hobbies</h2>
    {{resume-interests}}
  </div>
</div>
`;

/**
 * Executive template HTML structure
 * Elegant and sophisticated layout
 */
export const executiveTemplate = `
<div class="executive-container">
  <div id="resume-header">
    {{resume-header}}
  </div>
  <div class="contact">
    {{resume-contact}}
  </div>
  
  <div class="section" id="resume-summary">
    <h2>Executive Summary</h2>
    {{resume-summary}}
  </div>
  
  <div class="section" id="resume-experience">
    <h2>Professional Experience</h2>
    {{resume-experience}}
  </div>
  
  <div class="section" id="resume-education">
    <h2>Education & Credentials</h2>
    {{resume-education}}
  </div>
  
  <div class="section" id="resume-skills">
    <h2>Areas of Expertise</h2>
    {{resume-skills}}
  </div>
  
  <div class="section" id="resume-certifications">
    <h2>Professional Certifications</h2>
    {{resume-certifications}}
  </div>
  
  <div class="section" id="resume-languages">
    <h2>Languages</h2>
    {{resume-languages}}
  </div>
  
  <div class="section" id="resume-projects">
    <h2>Key Projects & Initiatives</h2>
    {{resume-projects}}
  </div>
  
  <div class="section" id="resume-awards">
    <h2>Honors & Distinctions</h2>
    {{resume-awards}}
  </div>
  
  <div class="section" id="resume-references">
    <h2>Professional References</h2>
    {{resume-references}}
  </div>
  
  <div class="section" id="resume-publications">
    <h2>Publications & Speaking</h2>
    {{resume-publications}}
  </div>
  
  <div class="section" id="resume-volunteering">
    <h2>Board & Volunteer Work</h2>
    {{resume-volunteering}}
  </div>
  
  <div class="section" id="resume-additional">
    <h2>Additional Information</h2>
    {{resume-additional}}
  </div>
  
  <div class="section" id="resume-interests">
    <h2>Interests</h2>
    {{resume-interests}}
  </div>
</div>
`;

/**
 * Technical template HTML structure
 * Specialized for technical careers
 */
export const technicalTemplate = `
<div class="technical-container">
  <div id="resume-header">
    {{resume-header}}
  </div>
  <div class="contact">
    {{resume-contact}}
  </div>
  
  <div class="section" id="resume-summary">
    <h2>Technical Profile</h2>
    {{resume-summary}}
  </div>
  
  <div class="section" id="resume-skills">
    <h2>Technical Skills</h2>
    {{resume-skills}}
  </div>
  
  <div class="section" id="resume-experience">
    <h2>Professional Experience</h2>
    {{resume-experience}}
  </div>
  
  <div class="section" id="resume-projects">
    <h2>Projects</h2>
    {{resume-projects}}
  </div>
  
  <div class="section" id="resume-education">
    <h2>Education</h2>
    {{resume-education}}
  </div>
  
  <div class="section" id="resume-certifications">
    <h2>Certifications</h2>
    {{resume-certifications}}
  </div>
  
  <div class="section" id="resume-languages">
    <h2>Languages</h2>
    {{resume-languages}}
  </div>
  
  <div class="section" id="resume-publications">
    <h2>Publications</h2>
    {{resume-publications}}
  </div>
  
  <div class="section" id="resume-awards">
    <h2>Awards</h2>
    {{resume-awards}}
  </div>
  
  <div class="section" id="resume-volunteering">
    <h2>Volunteering</h2>
    {{resume-volunteering}}
  </div>
  
  <div class="section" id="resume-references">
    <h2>References</h2>
    {{resume-references}}
  </div>
  
  <div class="section" id="resume-additional">
    <h2>Additional Info</h2>
    {{resume-additional}}
  </div>
  
  <div class="section" id="resume-interests">
    <h2>Interests</h2>
    {{resume-interests}}
  </div>
</div>
`;

/**
 * Compact template HTML structure
 * Space-efficient layout
 */
export const compactTemplate = `
<div class="compact-container">
  <div id="resume-header">
    {{resume-header}}
  </div>
  <div class="contact">
    {{resume-contact}}
  </div>
  
  <div class="section" id="resume-summary">
    <h2>Summary</h2>
    {{resume-summary}}
  </div>
  
  <div class="section" id="resume-experience">
    <h2>Experience</h2>
    {{resume-experience}}
  </div>
  
  <div class="section" id="resume-education">
    <h2>Education</h2>
    {{resume-education}}
  </div>
  
  <div class="section" id="resume-skills">
    <h2>Skills</h2>
    {{resume-skills}}
  </div>
  
  <div class="section" id="resume-certifications">
    <h2>Certifications</h2>
    {{resume-certifications}}
  </div>
  
  <div class="section" id="resume-languages">
    <h2>Languages</h2>
    {{resume-languages}}
  </div>
  
  <div class="section" id="resume-projects">
    <h2>Projects</h2>
    {{resume-projects}}
  </div>
  
  <div class="section" id="resume-awards">
    <h2>Awards</h2>
    {{resume-awards}}
  </div>
  
  <div class="section" id="resume-references">
    <h2>References</h2>
    {{resume-references}}
  </div>
  
  <div class="section" id="resume-publications">
    <h2>Publications</h2>
    {{resume-publications}}
  </div>
  
  <div class="section" id="resume-volunteering">
    <h2>Volunteering</h2>
    {{resume-volunteering}}
  </div>
  
  <div class="section" id="resume-additional">
    <h2>Additional</h2>
    {{resume-additional}}
  </div>
  
  <div class="section" id="resume-interests">
    <h2>Interests</h2>
    {{resume-interests}}
  </div>
</div>
`;