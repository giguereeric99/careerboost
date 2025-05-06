// src/constants/sections.ts

/**
 * Standard section definitions for resume structure
 * These sections represent all possible parts of a professional resume
 */
export const STANDARD_SECTIONS = [
  { id: 'resume-header', titleKey: 'resume-header' },
  { id: 'resume-summary', titleKey: 'resume-summary' },
  { id: 'resume-experience', titleKey: 'resume-experience' },
  { id: 'resume-education', titleKey: 'resume-education' },
  { id: 'resume-skills', titleKey: 'resume-skills' },
  { id: 'resume-languages', titleKey: 'resume-languages' },
  { id: 'resume-certifications', titleKey: 'resume-certifications' },
  { id: 'resume-projects', titleKey: 'resume-projects' },
  { id: 'resume-awards', titleKey: 'resume-awards' },
  { id: 'resume-volunteering', titleKey: 'resume-volunteering' },
  { id: 'resume-publications', titleKey: 'resume-publications' },
  { id: 'resume-interests', titleKey: 'resume-interests' },
  { id: 'resume-references', titleKey: 'resume-references' },
  { id: 'resume-additional', titleKey: 'resume-additional' }
];

/**
 * Alternative section IDs that map to standard sections
 * This helps with backwards compatibility and different naming conventions
 */
export const ALTERNATIVE_SECTION_IDS = {
  'personal-information': 'resume-header',
  'professional-summaries': 'resume-summary',
  'experiences': 'resume-experience',
  'formations': 'resume-education',
  'skills-interests': 'resume-skills',
  'certifications': 'resume-certifications',
  'projects': 'resume-projects',
  'awards-achievements': 'resume-awards',
  'volunteering': 'resume-volunteering',
  'publications': 'resume-publications',
  'interests': 'resume-interests',
  'referees': 'resume-references',
  'additional': 'resume-additional'
};