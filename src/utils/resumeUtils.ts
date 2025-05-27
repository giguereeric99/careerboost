/**
 * Resume Utils - Enhanced Section Management with Multilingual Support
 *
 * This module provides utilities for processing and manipulating resume content,
 * with a focus on standardized section management and HTML processing.
 *
 * ENHANCEMENT: Added multilingual support for section names to prevent empty sections
 * from displaying English titles when the resume is in another language.
 */

import { STANDARD_SECTIONS } from "@/constants/sections";
import DOMPurify from "dompurify";

import { Section } from "@/types/resumeTypes";

/**
 * Standard section names in English - Base language for section mapping
 * Maps section IDs to display names in English
 */
export const SECTION_NAMES: Record<string, string> = {
  "resume-header": "Personal Information",
  "resume-summary": "Professional Summary",
  "resume-experience": "Experience",
  "resume-education": "Education",
  "resume-skills": "Skills & Interests",
  "resume-languages": "Languages",
  "resume-certifications": "Certifications",
  "resume-projects": "Projects",
  "resume-awards": "Awards & Achievements",
  "resume-references": "References",
  "resume-publications": "Publications",
  "resume-volunteering": "Volunteering",
  "resume-additional": "Additional Information",
  "resume-interests": "Interests",
  // Legacy/alternate section IDs mapping to standard names
  "personal-information": "Personal Information",
  "website-social-links": "Contact & Social Links",
  "professional-summaries": "Professional Summary",
  experiences: "Experience",
  formations: "Education",
  certifications: "Certifications",
  "awards-achievements": "Awards & Achievements",
  projects: "Projects",
  "skills-interests": "Skills & Interests",
  volunteering: "Volunteering",
  publications: "Publications",
  referees: "References",
};

/**
 * ENHANCEMENT: Section names in French
 * Maps section IDs to display names in French
 */
export const SECTION_NAMES_FR: Record<string, string> = {
  "resume-header": "Informations Personnelles",
  "resume-summary": "Profil Professionnel",
  "resume-experience": "Expérience Professionnelle",
  "resume-education": "Formation",
  "resume-skills": "Compétences et Intérêts",
  "resume-languages": "Langues",
  "resume-certifications": "Certifications",
  "resume-projects": "Projets",
  "resume-awards": "Prix et Distinctions",
  "resume-references": "Références",
  "resume-publications": "Publications",
  "resume-volunteering": "Bénévolat",
  "resume-additional": "Informations Complémentaires",
  "resume-interests": "Centres d'Intérêt",
  // Legacy/alternate section IDs mapping to French names
  "personal-information": "Informations Personnelles",
  "website-social-links": "Contact et Liens Sociaux",
  "professional-summaries": "Profil Professionnel",
  experiences: "Expérience Professionnelle",
  formations: "Formation",
  certifications: "Certifications",
  "awards-achievements": "Prix et Distinctions",
  projects: "Projets",
  "skills-interests": "Compétences et Intérêts",
  volunteering: "Bénévolat",
  publications: "Publications",
  referees: "Références",
};

/**
 * ENHANCEMENT: Section names in Spanish
 * Maps section IDs to display names in Spanish
 */
export const SECTION_NAMES_ES: Record<string, string> = {
  "resume-header": "Información Personal",
  "resume-summary": "Perfil Profesional",
  "resume-experience": "Experiencia Profesional",
  "resume-education": "Formación Académica",
  "resume-skills": "Habilidades e Intereses",
  "resume-languages": "Idiomas",
  "resume-certifications": "Certificaciones",
  "resume-projects": "Proyectos",
  "resume-awards": "Premios y Reconocimientos",
  "resume-references": "Referencias",
  "resume-publications": "Publicaciones",
  "resume-volunteering": "Voluntariado",
  "resume-additional": "Información Adicional",
  "resume-interests": "Intereses",
  // Legacy/alternate section IDs mapping to Spanish names
  "personal-information": "Información Personal",
  "website-social-links": "Contacto y Enlaces Sociales",
  "professional-summaries": "Perfil Profesional",
  experiences: "Experiencia Profesional",
  formations: "Formación Académica",
  certifications: "Certificaciones",
  "awards-achievements": "Premios y Reconocimientos",
  projects: "Proyectos",
  "skills-interests": "Habilidades e Intereses",
  volunteering: "Voluntariado",
  publications: "Publicaciones",
  referees: "Referencias",
};

/**
 * ENHANCEMENT: Get section names based on language
 * Supports multiple languages with fallback to English
 *
 * @param language - Language code or full language name (e.g., "French", "français", "fr")
 * @returns Record mapping section IDs to localized section names
 */
export function getSectionNamesByLanguage(
  language: string
): Record<string, string> {
  // Normalize language for matching - handle various formats
  const normalizedLang = language.toLowerCase().trim();

  // French language detection (multiple variations)
  if (
    normalizedLang === "french" ||
    normalizedLang === "français" ||
    normalizedLang === "francais" ||
    normalizedLang === "fr"
  ) {
    return SECTION_NAMES_FR;
  }
  // Spanish language detection (multiple variations)
  else if (
    normalizedLang === "spanish" ||
    normalizedLang === "español" ||
    normalizedLang === "espanol" ||
    normalizedLang === "es"
  ) {
    return SECTION_NAMES_ES;
  }
  // Default to English for any other language
  else {
    return SECTION_NAMES;
  }
}

/**
 * ENHANCED: Get standardized section name from ID with multilingual support
 * Now supports language parameter to return section names in the correct language
 *
 * @param id - Section ID
 * @param language - Language for the section name (default: "English")
 * @returns Standardized section name in the specified language
 */
export function getSectionName(
  id: string,
  language: string = "English"
): string {
  // SOLUTION: Get section names for the specified language
  const sectionNames = getSectionNamesByLanguage(language);

  // Try to find a predefined name in the specified language
  if (sectionNames[id]) {
    return sectionNames[id];
  }

  // If not found in standard names, create a formatted title from the ID
  // This handles custom or non-standard section IDs
  return id
    .replace("resume-", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

/**
 * Default order for sections - used for sorting sections in a logical order
 */
export const SECTION_ORDER = [
  "resume-header",
  "personal-information",
  "resume-summary",
  "professional-summaries",
  "resume-experience",
  "experiences",
  "resume-education",
  "formations",
  "resume-skills",
  "skills-interests",
  "resume-languages",
  "resume-certifications",
  "certifications",
  "resume-projects",
  "projects",
  "resume-awards",
  "awards-achievements",
  "resume-volunteering",
  "volunteering",
  "resume-publications",
  "publications",
  "resume-interests",
  "interests",
  "resume-references",
  "referees",
  "resume-additional",
  "additional",
];

/**
 * ENHANCEMENT: Standard placeholders with multilingual support
 * Returns appropriate placeholder text based on language
 *
 * @param language - Language for the placeholders
 * @returns Record mapping section IDs to localized placeholder text
 */
export function getSectionPlaceholders(
  language: string
): Record<string, string> {
  const normalizedLang = language.toLowerCase().trim();

  // French placeholders
  if (
    normalizedLang === "french" ||
    normalizedLang === "français" ||
    normalizedLang === "francais" ||
    normalizedLang === "fr"
  ) {
    return {
      "resume-header":
        "Votre Nom\nTitre Professionnel\nEmail | Téléphone | Localisation",
      "resume-summary":
        "Résumé professionnel mettant en évidence votre expérience, vos compétences et vos objectifs de carrière.",
      "resume-experience":
        "• Poste chez Nom de l'Entreprise (20XX - Présent)\n• Réalisé X en implémentant Y, résultant en Z.\n• Dirigé une équipe de X personnes pour accomplir l'objectif Y.",
      "resume-education":
        "• Diplôme en Domaine d'Études, Nom de l'Institution (20XX - 20XX)\n• Note: X.X/4.0 (si applicable)\n• Cours pertinents: Cours 1, Cours 2",
      "resume-skills":
        "• Techniques: Compétence 1, Compétence 2, Compétence 3\n• Savoir-être: Communication, Travail d'équipe, Résolution de problèmes",
      "resume-languages":
        "• Langue 1 (Courant)\n• Langue 2 (Intermédiaire)\n• Langue 3 (Débutant)",
      "resume-certifications":
        "• Nom de la Certification, Organisation Émettrice (Année)\n• Nom de la Certification, Organisation Émettrice (Année)",
      "resume-projects":
        "• Nom du Projet: Brève description et résultats\n• Nom du Projet: Brève description et résultats",
      "resume-awards":
        "• Nom du Prix, Organisation Émettrice (Année)\n• Reconnaissance, Émetteur (Année)",
      "resume-volunteering":
        "• Rôle de Bénévole, Organisation (Période)\n• Contributions clés ou responsabilités",
      "resume-publications":
        "• Titre de la Publication, Journal/Éditeur, Date\n• Auteurs, Titre de la Publication, Journal/Éditeur, Date",
      "resume-interests": "• Intérêt 1\n• Intérêt 2\n• Intérêt 3",
      "resume-references":
        "• Nom de la Référence, Poste, Entreprise\n• Email, Téléphone\n\nOU\n\nRéférences disponibles sur demande",
      "resume-additional":
        "Informations supplémentaires pertinentes telles que des ateliers, des conférences ou d'autres qualifications.",
    };
  }
  // Spanish placeholders
  else if (
    normalizedLang === "spanish" ||
    normalizedLang === "español" ||
    normalizedLang === "espanol" ||
    normalizedLang === "es"
  ) {
    return {
      "resume-header":
        "Su Nombre\nTítulo Profesional\nEmail | Teléfono | Ubicación",
      "resume-summary":
        "Resumen profesional destacando su experiencia, habilidades y objetivos de carrera.",
      "resume-experience":
        "• Puesto en Nombre de la Empresa (20XX - Presente)\n• Logré X implementando Y, resultando en Z.\n• Dirigí un equipo de X personas para lograr el objetivo Y.",
      "resume-education":
        "• Título en Campo de Estudio, Nombre de la Institución (20XX - 20XX)\n• Promedio: X.X/4.0 (si aplica)\n• Cursos relevantes: Curso 1, Curso 2",
      "resume-skills":
        "• Técnicas: Habilidad 1, Habilidad 2, Habilidad 3\n• Blandas: Comunicación, Trabajo en equipo, Resolución de problemas",
      "resume-languages":
        "• Idioma 1 (Fluido)\n• Idioma 2 (Intermedio)\n• Idioma 3 (Básico)",
      "resume-certifications":
        "• Nombre de la Certificación, Organización Emisora (Año)\n• Nombre de la Certificación, Organización Emisora (Año)",
      "resume-projects":
        "• Nombre del Proyecto: Breve descripción y resultados\n• Nombre del Proyecto: Breve descripción y resultados",
      "resume-awards":
        "• Nombre del Premio, Organización Emisora (Año)\n• Reconocimiento, Emisor (Año)",
      "resume-volunteering":
        "• Rol de Voluntario, Organización (Período)\n• Contribuciones clave o responsabilidades",
      "resume-publications":
        "• Título de la Publicación, Revista/Editorial, Fecha\n• Autores, Título de la Publicación, Revista/Editorial, Fecha",
      "resume-interests": "• Interés 1\n• Interés 2\n• Interés 3",
      "resume-references":
        "• Nombre de la Referencia, Puesto, Empresa\n• Email, Teléfono\n\nO\n\nReferencias disponibles bajo petición",
      "resume-additional":
        "Información adicional relevante como talleres, conferencias u otras calificaciones.",
    };
  }
  // Default English placeholders
  else {
    return {
      "resume-header": "Your Name\nJob Title\nEmail | Phone | Location",
      "resume-summary":
        "Professional summary highlighting your experience, skills, and career goals.",
      "resume-experience":
        "• Position at Company Name (20XX - Present)\n• Achieved X by implementing Y, resulting in Z.\n• Led a team of X people to accomplish Y goal.",
      "resume-education":
        "• Degree in Field of Study, Institution Name (20XX - 20XX)\n• GPA: X.X/4.0 (if applicable)\n• Relevant coursework: Course 1, Course 2",
      "resume-skills":
        "• Technical: Skill 1, Skill 2, Skill 3\n• Soft Skills: Communication, Teamwork, Problem-solving",
      "resume-languages":
        "• Language 1 (Fluent)\n• Language 2 (Intermediate)\n• Language 3 (Basic)",
      "resume-certifications":
        "• Certification Name, Issuing Organization (Year)\n• Certification Name, Issuing Organization (Year)",
      "resume-projects":
        "• Project Name: Brief description and outcomes\n• Project Name: Brief description and outcomes",
      "resume-awards":
        "• Award Name, Issuing Organization (Year)\n• Recognition, Issuer (Year)",
      "resume-volunteering":
        "• Volunteer Role, Organization (Period)\n• Key contributions or responsibilities",
      "resume-publications":
        "• Publication Title, Journal/Publisher, Date\n• Authors, Publication Title, Journal/Publisher, Date",
      "resume-interests": "• Interest 1\n• Interest 2\n• Interest 3",
      "resume-references":
        "• Reference Name, Position, Company\n• Email, Phone\n\nOR\n\nReferences available upon request",
      "resume-additional":
        "Additional relevant information such as workshops, conferences, or other qualifications.",
    };
  }
}

/**
 * LEGACY: Standard placeholders and default content for empty sections
 * Maintained for backward compatibility - defaults to English
 * @deprecated Use getSectionPlaceholders(language) instead
 */
export const SECTION_PLACEHOLDERS: Record<string, string> = {
  "resume-header": "Your Name\nJob Title\nEmail | Phone | Location",
  "resume-summary":
    "Professional summary highlighting your experience, skills, and career goals.",
  "resume-experience":
    "• Position at Company Name (20XX - Present)\n• Achieved X by implementing Y, resulting in Z.\n• Led a team of X people to accomplish Y goal.",
  "resume-education":
    "• Degree in Field of Study, Institution Name (20XX - 20XX)\n• GPA: X.X/4.0 (if applicable)\n• Relevant coursework: Course 1, Course 2",
  "resume-skills":
    "• Technical: Skill 1, Skill 2, Skill 3\n• Soft Skills: Communication, Teamwork, Problem-solving",
  "resume-languages":
    "• Language 1 (Fluent)\n• Language 2 (Intermediate)\n• Language 3 (Basic)",
  "resume-certifications":
    "• Certification Name, Issuing Organization (Year)\n• Certification Name, Issuing Organization (Year)",
  "resume-projects":
    "• Project Name: Brief description and outcomes\n• Project Name: Brief description and outcomes",
  "resume-awards":
    "• Award Name, Issuing Organization (Year)\n• Recognition, Issuer (Year)",
  "resume-volunteering":
    "• Volunteer Role, Organization (Period)\n• Key contributions or responsibilities",
  "resume-publications":
    "• Publication Title, Journal/Publisher, Date\n• Authors, Publication Title, Journal/Publisher, Date",
  "resume-interests": "• Interest 1\n• Interest 2\n• Interest 3",
  "resume-references":
    "• Reference Name, Position, Company\n• Email, Phone\n\nOR\n\nReferences available upon request",
  "resume-additional":
    "Additional relevant information such as workshops, conferences, or other qualifications.",
};

/**
 * Maps alternative section IDs to standard ones
 * Helps normalize section IDs from different sources
 *
 * @param id - Section ID to normalize
 * @returns Standardized section ID
 */
export function normalizeSectionId(id: string): string {
  // Map of alternative section IDs to standard ones
  const sectionIdMapping: Record<string, string> = {
    "personal-information": "resume-header",
    "professional-summaries": "resume-summary",
    experiences: "resume-experience",
    formations: "resume-education",
    "skills-interests": "resume-skills",
    certifications: "resume-certifications",
    projects: "resume-projects",
    "awards-achievements": "resume-awards",
    volunteering: "resume-volunteering",
    publications: "resume-publications",
    interests: "resume-interests",
    referees: "resume-references",
    additional: "resume-additional",
  };

  // Return the normalized ID or the original if not found
  return sectionIdMapping[id] || id;
}

/**
 * Checks if a section is empty based on its content
 * A section is considered empty if it has:
 * - No content
 * - Only whitespace
 * - Only heading with no meaningful content
 * - Only placeholder content
 *
 * @param content - Section content to check
 * @param sectionTitle - Title of the section (to detect placeholder content)
 * @returns Boolean indicating if the section is empty
 */
export function isSectionEmpty(content: string, sectionTitle: string): boolean {
  if (!content) return true;

  // Remove whitespace
  const trimmedContent = content.trim();
  if (!trimmedContent) return true;

  // Check for heading-only content
  const headingOnlyPatterns = [
    `<h1>${sectionTitle}</h1>`,
    `<h2>${sectionTitle}</h2>`,
    `<h3>${sectionTitle}</h3>`,
    `<h1 class="section-title">${sectionTitle}</h1>`,
    `<h2 class="section-title">${sectionTitle}</h2>`,
    `<h3 class="section-title">${sectionTitle}</h3>`,
  ];

  // Check for heading with empty paragraph
  const headingWithEmptyParagraphPatterns = [
    `<h1>${sectionTitle}</h1><p></p>`,
    `<h2>${sectionTitle}</h2><p></p>`,
    `<h3>${sectionTitle}</h3><p></p>`,
    `<h1 class="section-title">${sectionTitle}</h1><p></p>`,
    `<h2 class="section-title">${sectionTitle}</h2><p></p>`,
    `<h3 class="section-title">${sectionTitle}</h3><p></p>`,
  ];

  // Check if content is just a heading or heading with empty paragraph
  for (const pattern of [
    ...headingOnlyPatterns,
    ...headingWithEmptyParagraphPatterns,
  ]) {
    if (
      trimmedContent === pattern ||
      trimmedContent.replace(/\s+/g, "") === pattern.replace(/\s+/g, "")
    ) {
      return true;
    }
  }

  // Parse content to detect placeholder text or empty elements
  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmedContent, "text/html");
  const textContent = doc.body.textContent || "";

  // If there's almost no text content, section is likely empty
  if (textContent.trim().length < 5) {
    return true;
  }

  // Count the number of actual content elements
  const contentElements = doc.querySelectorAll("p, li, table, ul, ol");
  if (contentElements.length === 0) {
    return true;
  }

  // Check if all paragraphs/list items are empty
  let hasContentElement = false;
  contentElements.forEach((element) => {
    if ((element.textContent || "").trim().length > 0) {
      hasContentElement = true;
    }
  });

  return !hasContentElement;
}

/**
 * Normalizes HTML content regardless of its format
 * Handles both entity-encoded and regular HTML
 *
 * @param html - HTML content to normalize
 * @param sanitizeFn - Function to sanitize HTML (optional)
 * @returns Standardized HTML content
 */
export function normalizeHtmlContent(
  html: string,
  sanitizeFn?: (html: string) => string
): string {
  if (!html) return "";

  // Step 1: Decode any HTML entities to ensure consistent handling
  let normalized = html
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");

  // Step 2: Standardize section IDs to ensure they match our predefined structure
  STANDARD_SECTIONS.forEach(({ id }) => {
    // Find section tags with alternative IDs and standardize them
    normalized = normalized.replace(
      new RegExp(`<section\\s+id="${normalizeSectionId(id)}"`, "g"),
      `<section id="${id}"`
    );
  });

  // Step 4: Sanitize if a sanitize function is provided
  if (sanitizeFn) {
    normalized = sanitizeFn(normalized);
  }

  return normalized;
}

/**
 * Parse HTML content into resume sections
 * ENHANCED: Now supports language parameter for proper section name resolution
 *
 * @param html - HTML content to parse
 * @param getSectionNameFn - Function to get section name from ID (now supports language)
 * @param sectionNames - Map of section IDs to display names
 * @param sectionOrder - Order for sorting sections
 * @param language - Language for section name resolution (default: "English")
 * @returns Array of parsed sections
 */
export function parseHtmlIntoSections(
  html: string,
  getSectionNameFn: (id: string, language?: string) => string = getSectionName,
  sectionNames: Record<string, string> = SECTION_NAMES,
  sectionOrder: string[] = SECTION_ORDER,
  language: string = "English" // ENHANCEMENT: Added language parameter
): Section[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const parsedSections: Section[] = [];

  // Approach 1: Try to extract sections using section tags
  const sectionElements = doc.querySelectorAll("section");

  if (sectionElements.length > 0) {
    console.log(`Found ${sectionElements.length} sections with <section> tags`);

    sectionElements.forEach((section, index) => {
      // Get section ID or generate one
      const rawId =
        section.id || `section-${Math.random().toString(36).substring(2, 9)}`;
      // Normalize the ID to ensure it matches our standard format
      const id = normalizeSectionId(rawId);

      // ENHANCEMENT: Get the title using language-aware function
      const title = getSectionNameFn(id, language);

      // Create the section with all required properties
      parsedSections.push({
        id,
        title,
        content: section.innerHTML,
        type: guessTypeFromTitle(title),
        order: index,
        visible: true,
        isEmpty: isSectionEmpty(section.innerHTML, title),
      });
    });
  } else {
    // Approach 2: Try to identify sections by headings
    const headings = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");

    if (headings.length > 0) {
      console.log(`Found ${headings.length} sections with headings`);

      headings.forEach((heading, index) => {
        // Get heading text and create section ID
        const title = heading.textContent || `Section ${index + 1}`;
        // Try to find a standard section ID based on the heading text
        const languageSpecificNames = getSectionNamesByLanguage(language);
        const standardId = Object.entries(languageSpecificNames).find(
          ([_, name]) => name.toLowerCase() === title.toLowerCase()
        )?.[0];

        // Use standard ID or create one from the heading
        const rawId =
          standardId || `section-${title.toLowerCase().replace(/\s+/g, "-")}`;
        // Normalize the ID
        const id = normalizeSectionId(rawId);

        // ENHANCEMENT: Get the standardized title using language-aware function
        const standardTitle = getSectionNameFn(id, language);

        // Find content for this section (all nodes until next heading)
        let sectionContent = heading.outerHTML;
        let currentNode = heading.nextElementSibling;
        const nextHeading = headings[index + 1];

        // Collect all elements until the next heading
        while (
          currentNode &&
          (nextHeading === undefined || !currentNode.isEqualNode(nextHeading))
        ) {
          sectionContent += currentNode.outerHTML || "";
          currentNode = currentNode.nextElementSibling;

          // Break if we reached the end
          if (!currentNode) break;
        }

        if (sectionContent) {
          parsedSections.push({
            id,
            title: standardTitle,
            content: sectionContent,
            type: guessTypeFromTitle(standardTitle),
            order: index,
            visible: true,
            isEmpty: isSectionEmpty(sectionContent, standardTitle),
          });
        }
      });
    } else {
      // Approach 3: Try to identify sections by paragraph groupings
      const paragraphs = doc.querySelectorAll("p");

      if (paragraphs.length > 3) {
        console.log(
          `Found ${paragraphs.length} paragraphs, attempting to group into sections`
        );

        // Get language-specific section names for matching
        const languageSpecificNames = getSectionNamesByLanguage(language);
        const commonSectionNames = Object.values(languageSpecificNames);

        // Try to group the paragraphs into logical sections
        let currentSection: Section = {
          id: "resume-header",
          title: languageSpecificNames["resume-header"],
          content: "",
          type: "header",
          order: 0,
          visible: true,
          isEmpty: true,
        };

        let sectionIndex = 0;

        paragraphs.forEach((paragraph, index) => {
          // Check if paragraph might be a section title (short, no periods)
          const text = paragraph.textContent || "";
          const wordCount = text.split(/\s+/).filter(Boolean).length;

          // Check if this paragraph's text matches or is similar to a standard section name
          const matchedSectionName = commonSectionNames.find(
            (name) =>
              text.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(text.toLowerCase())
          );

          if (
            (wordCount < 5 && text.length < 50 && !text.includes(".")) ||
            matchedSectionName
          ) {
            // Save previous section if it has content
            if (currentSection.content) {
              currentSection.isEmpty = isSectionEmpty(
                currentSection.content,
                currentSection.title
              );
              parsedSections.push({ ...currentSection });
            }

            // Start a new section
            sectionIndex++;

            // Try to find a matching section ID
            let newSectionId = "section-" + sectionIndex;
            if (matchedSectionName) {
              const entry = Object.entries(languageSpecificNames).find(
                ([_, name]) => name === matchedSectionName
              );
              if (entry) {
                newSectionId = entry[0];
              }
            }

            const normalizedId = normalizeSectionId(newSectionId);
            const sectionTitle = getSectionNameFn(newSectionId, language);

            currentSection = {
              id: normalizedId,
              title: sectionTitle,
              content: paragraph.outerHTML,
              type: guessTypeFromTitle(sectionTitle),
              order: sectionIndex,
              visible: true,
              isEmpty: isSectionEmpty(paragraph.outerHTML, sectionTitle),
            };
          } else {
            // Add to current section content
            currentSection.content += paragraph.outerHTML;
          }
        });

        // Add the last section
        if (currentSection.content) {
          currentSection.isEmpty = isSectionEmpty(
            currentSection.content,
            currentSection.title
          );
          parsedSections.push(currentSection);
        }
      } else {
        // Approach 4: Just create a single section with all content
        console.log(
          "No clear section structure found, creating a single section"
        );

        const languageSpecificNames = getSectionNamesByLanguage(language);
        const sectionTitle = languageSpecificNames["resume-summary"];

        parsedSections.push({
          id: "resume-summary",
          title: sectionTitle,
          content: doc.body.innerHTML,
          type: "summary",
          order: 0,
          visible: true,
          isEmpty: isSectionEmpty(doc.body.innerHTML, sectionTitle),
        });
      }
    }
  }

  // If no sections were found, create a default one
  if (parsedSections.length === 0) {
    const languageSpecificNames = getSectionNamesByLanguage(language);
    const sectionTitle = languageSpecificNames["resume-summary"];

    parsedSections.push({
      id: "resume-summary",
      title: sectionTitle,
      content: html,
      type: "summary",
      order: 0,
      visible: true,
      isEmpty: isSectionEmpty(html, sectionTitle),
    });
  }

  // Sort sections according to predefined order
  return [...parsedSections].sort((a, b) => {
    // Find index in SECTION_ORDER (or large number if not found)
    const indexA = sectionOrder.findIndex(
      (id) => a.id.includes(id) || id.includes(a.id)
    );
    const indexB = sectionOrder.findIndex(
      (id) => b.id.includes(id) || id.includes(b.id)
    );

    // If both have defined positions, sort by that
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // If only one has defined position, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // Otherwise, sort alphabetically by title
    return a.title.localeCompare(b.title);
  });
}

/**
 * Tries to determine the section type based on its title
 * Useful for automatic categorization of sections
 * ENHANCED: Now supports multiple languages for better type detection
 *
 * @param title - Section title to analyze
 * @returns Best guess at section type
 */
export function guessTypeFromTitle(title: string): string {
  const lowerTitle = title.toLowerCase();

  // English keywords
  if (
    lowerTitle.includes("experience") ||
    lowerTitle.includes("emploi") ||
    lowerTitle.includes("work")
  )
    return "experience";
  if (
    lowerTitle.includes("education") ||
    lowerTitle.includes("formation") ||
    lowerTitle.includes("study")
  )
    return "education";
  if (
    lowerTitle.includes("skill") ||
    lowerTitle.includes("compétence") ||
    lowerTitle.includes("expertise") ||
    lowerTitle.includes("habilidad")
  )
    return "skills";
  if (
    lowerTitle.includes("summary") ||
    lowerTitle.includes("résumé") ||
    lowerTitle.includes("profile") ||
    lowerTitle.includes("profil") ||
    lowerTitle.includes("perfil")
  )
    return "summary";
  if (
    lowerTitle.includes("contact") ||
    lowerTitle.includes("personal") ||
    lowerTitle.includes("information") ||
    lowerTitle.includes("información")
  )
    return "header";
  if (
    lowerTitle.includes("language") ||
    lowerTitle.includes("langue") ||
    lowerTitle.includes("idioma")
  )
    return "languages";
  if (
    lowerTitle.includes("certification") ||
    lowerTitle.includes("diploma") ||
    lowerTitle.includes("certificación")
  )
    return "certifications";
  if (
    lowerTitle.includes("project") ||
    lowerTitle.includes("portfolio") ||
    lowerTitle.includes("projet") ||
    lowerTitle.includes("proyecto")
  )
    return "projects";
  if (
    lowerTitle.includes("award") ||
    lowerTitle.includes("achievement") ||
    lowerTitle.includes("prix") ||
    lowerTitle.includes("distinction") ||
    lowerTitle.includes("premio")
  )
    return "awards";
  if (
    lowerTitle.includes("volunteer") ||
    lowerTitle.includes("community") ||
    lowerTitle.includes("bénévolat") ||
    lowerTitle.includes("voluntario")
  )
    return "volunteering";
  if (
    lowerTitle.includes("reference") ||
    lowerTitle.includes("recommendation") ||
    lowerTitle.includes("référence") ||
    lowerTitle.includes("referencia")
  )
    return "references";

  // Default to general if no specific type can be determined
  return "general";
}

/**
 * Initialize all sections with proper required properties
 * Ensures all sections have the required properties even if parsed from minimal data
 *
 * @param sections - Array of potentially incomplete sections
 * @returns Complete sections with all required properties
 */
export function initializeAllSections(sections: Section[]): Section[] {
  return sections.map((section, index) => ({
    ...section,
    type: section.type || guessTypeFromTitle(section.title),
    order: section.order !== undefined ? section.order : index,
    visible: section.visible !== undefined ? section.visible : true,
    isEmpty:
      section.isEmpty !== undefined
        ? section.isEmpty
        : isSectionEmpty(section.content, section.title),
  }));
}

/**
 * Ensure all standard sections are represented
 * Fills in missing sections with empty content
 * ENHANCED: Now supports language parameter for proper section titles
 *
 * @param sections - Array of existing sections
 * @param language - Language for creating missing section titles (default: "English")
 * @returns Complete array with all standard sections
 */
export function ensureAllStandardSections(
  sections: Section[],
  language: string = "English"
): Section[] {
  // Create a map of existing sections by ID
  const existingSections = new Map(
    sections.map((section) => [section.id, section])
  );

  // Create the complete list with all standard sections
  const completeSections = STANDARD_SECTIONS.map(({ id }, index) => {
    const existingSection = existingSections.get(id);

    if (existingSection) {
      // Use existing section if found
      return existingSection;
    } else {
      // ENHANCEMENT: Create a new empty section with language-aware title
      const sectionTitle = getSectionName(id, language);
      const content = `<h2 class="section-title">${sectionTitle}</h2><p></p>`;

      return {
        id,
        title: sectionTitle,
        content,
        type: guessTypeFromTitle(sectionTitle),
        order: index,
        visible: true,
        isEmpty: true,
      };
    }
  });

  return completeSections;
}

/**
 * Escape HTML entities in a string
 *
 * @param text - String to escape
 * @returns Escaped string
 */
export function escapeHtml(text: string): string {
  if (!text) return "";

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Unescape HTML entities in a string
 *
 * @param text - String with HTML entities
 * @returns Unescaped string
 */
export function unescapeHtml(text: string): string {
  if (!text) return "";

  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Create a default section with proper HTML structure
 * ENHANCED: Now supports language parameter for proper section titles
 *
 * @param sectionId - Standard section ID
 * @param language - Language for the section title and placeholder (default: "English")
 * @returns HTML content for the section
 */
export function createDefaultSectionContent(
  sectionId: string,
  language: string = "English"
): string {
  const title = getSectionName(sectionId, language);
  const placeholders = getSectionPlaceholders(language);
  const placeholder = placeholders[sectionId] || "";

  return `
   <h2 class="section-title">${title}</h2>
   <p>${placeholder}</p>
 `;
}

/**
 * Combines sections into a complete HTML document
 * Only includes non-empty sections
 *
 * @param sections - Array of all sections
 * @returns HTML content with only non-empty sections
 */
export function combineNonEmptySections(sections: Section[]): string {
  return sections
    .filter((section) => !isSectionEmpty(section.content, section.title))
    .map(
      (section) => `<section id="${section.id}">${section.content}</section>`
    )
    .join("\n");
}

/**
 * Formats a date string to a standard format
 *
 * @param dateStr - Date string to format
 * @returns Formatted date
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr;
  }
}

/**
 * Extract text content from HTML
 * Useful for analyzing content without HTML tags
 *
 * @param html - HTML content to process
 * @returns Plain text without HTML tags
 */
export function extractTextContent(html: string): string {
  if (!html) return "";

  // Use DOMParser to safely extract text
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent || "";
}

/**
 * Detect language of text content
 * Basic implementation that can be expanded with more sophisticated detection
 * ENHANCED: Added support for more languages and better detection patterns
 *
 * @param text - Text to analyze
 * @returns Detected language code (en, fr, es, etc)
 */
export function detectLanguage(text: string): string {
  if (!text) return "en";

  // Common French words
  const frenchWords = [
    "le",
    "la",
    "les",
    "un",
    "une",
    "des",
    "et",
    "ou",
    "je",
    "tu",
    "il",
    "elle",
    "nous",
    "vous",
    "ils",
    "elles",
    "pour",
    "dans",
    "avec",
    "sur",
    "expérience",
    "compétences",
    "formation",
    "diplôme",
    "projets",
    "langues",
  ];

  // Common Spanish words
  const spanishWords = [
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "unos",
    "unas",
    "y",
    "o",
    "yo",
    "tú",
    "él",
    "ella",
    "nosotros",
    "vosotros",
    "ellos",
    "ellas",
    "para",
    "en",
    "con",
    "sobre",
    "experiencia",
    "habilidades",
    "educación",
    "proyectos",
    "idiomas",
  ];

  // Count word occurrences
  const words = text.toLowerCase().split(/\s+/);
  let frenchCount = 0;
  let spanishCount = 0;

  words.forEach((word) => {
    if (frenchWords.includes(word)) frenchCount++;
    if (spanishWords.includes(word)) spanishCount++;
  });

  // Determine language based on counts and threshold (at least 3% of words)
  const threshold = Math.max(3, words.length * 0.03);

  if (frenchCount > spanishCount && frenchCount >= threshold) {
    return "fr";
  } else if (spanishCount > frenchCount && spanishCount >= threshold) {
    return "es";
  }

  // Default to English
  return "en";
}

/**
 * Extract keywords from resume content
 * Identifies potential keywords for ATS optimization
 *
 * @param content - Resume HTML content
 * @returns Array of potential keywords
 */
export function extractKeywordsFromContent(content: string): string[] {
  if (!content) return [];

  // Extract plain text
  const text = extractTextContent(content);

  // Extract capitalized words (likely skills, technologies, etc.)
  const capitalizedRegex = /\b[A-Z][a-zA-Z0-9]*\b/g;
  const capitalizedMatches = text.match(capitalizedRegex) || [];

  // Common technical skills to look for
  const commonSkills = [
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "React",
    "Angular",
    "Vue",
    "Node.js",
    "Express",
    "MongoDB",
    "SQL",
    "AWS",
    "Azure",
    "Docker",
    "Kubernetes",
    "DevOps",
    "CI/CD",
    "Git",
    "REST",
    "API",
    "HTML",
    "CSS",
    "Sass",
    "SCSS",
    "Leadership",
    "Management",
    "Communication",
    "Problem-solving",
    "Teamwork",
    "Project Management",
    "Agile",
    "Scrum",
    "Kanban",
    "Microsoft Office",
    "Analytical",
    "Research",
    "Marketing",
    "Sales",
    "Customer Service",
    "SEO",
    "SEM",
    "Analytics",
    "Data Analysis",
    "Machine Learning",
    "AI",
  ];

  // Find common skills in the text
  const foundSkills = commonSkills.filter((skill) =>
    new RegExp(`\\b${skill}\\b`, "i").test(text)
  );

  // Combine, deduplicate, and filter out common stop words
  const stopWords = [
    "I",
    "A",
    "The",
    "An",
    "And",
    "Or",
    "But",
    "In",
    "On",
    "At",
    "To",
    "For",
  ];

  const keywords = [...new Set([...capitalizedMatches, ...foundSkills])].filter(
    (word) => word.length > 1 && !stopWords.includes(word)
  );

  return keywords;
}

/**
 * Find missing information in a resume
 * Identifies important sections that might be missing
 * ENHANCED: Now supports language parameter for proper recommendations
 *
 * @param sections - Array of resume sections
 * @param language - Language for generating recommendations (default: "English")
 * @returns Object with missing sections and recommendations
 */
export function findMissingInformation(
  sections: Section[],
  language: string = "English"
): {
  missingSections: string[];
  recommendations: string[];
} {
  // Create a map of section IDs for quick lookup
  const sectionMap = new Map(sections.map((section) => [section.id, section]));

  // Critical sections that should be present in a good resume
  const criticalSections = [
    "resume-header",
    "resume-summary",
    "resume-experience",
    "resume-education",
    "resume-skills",
  ];

  // Find missing critical sections
  const missingSections = criticalSections.filter(
    (id) =>
      !sectionMap.has(id) ||
      isSectionEmpty(
        sectionMap.get(id)?.content || "",
        getSectionName(id, language)
      )
  );

  // ENHANCEMENT: Generate recommendations based on missing sections in the appropriate language
  const recommendations = missingSections.map((id) => {
    const sectionName = getSectionName(id, language);
    const normalizedLang = language.toLowerCase().trim();

    // French recommendations
    if (
      normalizedLang === "french" ||
      normalizedLang === "français" ||
      normalizedLang === "francais" ||
      normalizedLang === "fr"
    ) {
      switch (id) {
        case "resume-header":
          return `Ajoutez vos informations personnelles incluant nom, titre et coordonnées.`;
        case "resume-summary":
          return `Incluez un profil professionnel pour mettre en évidence votre expérience et vos objectifs.`;
        case "resume-experience":
          return `Ajoutez votre expérience professionnelle avec des réalisations et responsabilités spécifiques.`;
        case "resume-education":
          return `Incluez votre formation académique avec diplômes, institutions et dates.`;
        case "resume-skills":
          return `Listez vos compétences clés pertinentes pour le poste visé.`;
        default:
          return `Ajoutez la section ${sectionName} pour améliorer votre CV.`;
      }
    }
    // Spanish recommendations
    else if (
      normalizedLang === "spanish" ||
      normalizedLang === "español" ||
      normalizedLang === "espanol" ||
      normalizedLang === "es"
    ) {
      switch (id) {
        case "resume-header":
          return `Agregue su información personal incluyendo nombre, título y datos de contacto.`;
        case "resume-summary":
          return `Incluya un perfil profesional para destacar su experiencia y objetivos.`;
        case "resume-experience":
          return `Agregue su experiencia laboral con logros y responsabilidades específicas.`;
        case "resume-education":
          return `Incluya su formación académica con títulos, instituciones y fechas.`;
        case "resume-skills":
          return `Liste sus habilidades clave relevantes para su puesto objetivo.`;
        default:
          return `Agregue la sección ${sectionName} para mejorar su currículum.`;
      }
    }
    // Default English recommendations
    else {
      switch (id) {
        case "resume-header":
          return `Add your personal information including name, title, and contact details.`;
        case "resume-summary":
          return `Include a professional summary to highlight your experience and goals.`;
        case "resume-experience":
          return `Add your work experience with specific achievements and responsibilities.`;
        case "resume-education":
          return `Include your educational background with degrees, institutions, and dates.`;
        case "resume-skills":
          return `List your key skills relevant to your target position.`;
        default:
          return `Add the ${sectionName} section to improve your resume.`;
      }
    }
  });

  return {
    missingSections,
    recommendations,
  };
}

/**
 * Ensures that all section titles have the required class
 * This function checks all h1 and h2 elements in each section and adds the section-title class if missing
 *
 * @param html - The HTML content to process
 * @returns Normalized HTML with correct section-title classes
 */
export function ensureSectionTitleClasses(html: string): string {
  try {
    // Create a DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Process all sections
    doc.querySelectorAll("section").forEach((section) => {
      // Find the first h1 or h2 in the section
      const heading = section.querySelector("h1, h2");

      // If a heading is found, ensure it has the section-title class
      if (heading) {
        if (!heading.classList.contains("section-title")) {
          heading.classList.add("section-title");
          console.log(
            `Added missing section-title class to heading in section ${section.id}`
          );
        }
      }

      // Ensure the section itself does not have the section-title class
      if (section.classList.contains("section-title")) {
        section.classList.remove("section-title");
        console.log(`Removed section-title class from section ${section.id}`);
      }
    });

    // Return the normalized HTML
    return doc.body.innerHTML;
  } catch (error) {
    console.error("Error ensuring section title classes:", error);
    return html; // Return original HTML if processing fails
  }
}

// New function to get the English title (for accordion)
export function getSectionNameEnglish(id: string): string {
  return SECTION_NAMES[id] || getSectionName(id, "English");
}
