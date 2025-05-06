/**
 * Fallback Optimization Generator
 * 
 * This module provides a last-resort fallback in case all AI optimization
 * services fail. It generates:
 * 
 * 1. Basic optimized text (with minor improvements to the original)
 * 2. Generic improvement suggestions
 * 3. Extracted keywords from the text
 * 4. A simple ATS score calculation
 * 
 * While not as sophisticated as AI-generated optimizations, this ensures
 * the system always returns something useful to the user.
 */

import { OptimizationResult, FallbackParams } from '../../types';
import { processAIResponse, prepareOptimizedTextForEditor } from '@/utils/htmlProcessor';

/**
 * Generate a fallback optimization when all AI services fail
 * 
 * @param resumeText - Original resume text
 * @param language - Detected language of the resume
 * @returns Basic optimization result
 */
export function generateFallbackOptimization(
  resumeText: string,
  language: string = 'English'
): OptimizationResult {
  console.log(`Generating fallback optimization in ${language}`);
  
  // Try to improve the text layout even if we can't improve the content
  let improvedText = improveTextLayout(resumeText, language);
  
  // Process the text to ensure proper HTML structure
  try {
    improvedText = processAIResponse(improvedText);
    improvedText = prepareOptimizedTextForEditor(improvedText);
  } catch (error) {
    console.error("Error processing fallback text:", error);
    // If HTML processing fails, return the original text
    improvedText = resumeText;
  }
  
  // Generate generic suggestions
  const suggestions = generateFallbackSuggestions(resumeText, language);
  
  // Extract keywords from the text
  const keywordSuggestions = extractKeywords(resumeText, language);
  
  // Calculate a simple ATS score
  const atsScore = calculateAtsScore(resumeText);
  
  return {
    optimizedText: improvedText,
    suggestions,
    keywordSuggestions,
    atsScore,
    provider: 'fallback'
  };
}

/**
 * Improve text layout with basic formatting
 * 
 * @param text - Original text
 * @param language - Language of the text
 * @returns Text with improved layout
 */
function improveTextLayout(text: string, language: string): string {
  // If text already has HTML formatting, return as is
  if (text.includes('<') && text.includes('>')) {
    return text;
  }
  
  // Split the text into lines
  const lines = text.split('\n');
  let html = '';
  let currentSection: string | null = null;
  let inList = false;
  
  // Process each line
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      // Only add break tag if not at the beginning of a section
      if (currentSection) {
        html += '<br/>';
      }
      return;
    }
    
    // Detect section headers (usually all caps or short lines)
    const isHeader = 
      (trimmedLine === trimmedLine.toUpperCase() && 
       trimmedLine.length > 3 &&
       !trimmedLine.startsWith('•') &&
       !trimmedLine.startsWith('-')) ||
      (trimmedLine.length < 30 && 
       index > 0 && 
       !trimmedLine.endsWith('.') &&
       isSectionHeader(trimmedLine, language));
    
    // Close any open list
    if (inList && !trimmedLine.startsWith('•') && !trimmedLine.startsWith('-')) {
      html += '</ul>';
      inList = false;
    }
    
    // Handle new section header
    if (isHeader) {
      // Close previous section if any
      if (currentSection) {
        html += `</section>`;
      }
      
      // Create section ID from header (slug-case)
      const sectionId = trimmedLine
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
      
      // Use standard section IDs where possible
      let standardId = '';
      if (
        trimmedLine.includes('PROFIL') || 
        trimmedLine.includes('SUMMARY') || 
        trimmedLine.includes('ABOUT')
      ) {
        standardId = 'resume-summary';
      } else if (
        trimmedLine.includes('EXPÉRIENCE') || 
        trimmedLine.includes('EXPERIENCE') || 
        trimmedLine.includes('WORK')
      ) {
        standardId = 'resume-experience';
      } else if (
        trimmedLine.includes('FORMATION') || 
        trimmedLine.includes('EDUCATION') || 
        trimmedLine.includes('ÉTUDES')
      ) {
        standardId = 'resume-education';
      } else if (
        trimmedLine.includes('COMPÉTENCES') || 
        trimmedLine.includes('SKILLS') || 
        trimmedLine.includes('TECHNOLOGIES')
      ) {
        standardId = 'resume-skills';
      } else if (
        trimmedLine.includes('LANGUE') || 
        trimmedLine.includes('LANGUAGE')
      ) {
        standardId = 'resume-languages';
      } else if (
        trimmedLine.includes('CERTIFICATION') || 
        trimmedLine.includes('QUALIFICATION')
      ) {
        standardId = 'resume-certifications';
      } else if (
        trimmedLine.includes('PROJET') || 
        trimmedLine.includes('PROJECT')
      ) {
        standardId = 'resume-projects';
      } else if (
        trimmedLine.includes('RÉFÉRENCE') || 
        trimmedLine.includes('REFERENCE')
      ) {
        standardId = 'resume-references';
      } else {
        standardId = `resume-${sectionId}`;
      }
      
      // Start new section with standard ID
      html += `<section id="${standardId}">`;
      html += `<h2>${trimmedLine}</h2>`;
      currentSection = standardId;
    } 
    // Handle name/contact at the beginning (assuming first lines are the header)
    else if (index === 0) {
      html += `<section id="resume-header">`;
      html += `<h1>${trimmedLine}</h1>`;
      currentSection = 'resume-header';
    }
    // Handle subtitle in header
    else if (index === 1 && currentSection === 'resume-header') {
      html += `<h3>${trimmedLine}</h3>`;
    }
    // Handle contact info in header
    else if (index === 2 && currentSection === 'resume-header' && 
            (trimmedLine.includes('@') || 
             trimmedLine.includes('-') || 
             trimmedLine.includes('|'))) {
      html += `<p>${trimmedLine}</p>`;
    }
    // Handle sub-headers or job titles
    else if (trimmedLine.endsWith(':') || 
            (currentSection === 'resume-experience' && 
             trimmedLine.includes('|'))) {
      html += `<h3>${trimmedLine}</h3>`;
    }
    // Handle list items
    else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
      // Start a list if not already in one
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      // Add list item
      html += `<li>${trimmedLine.substring(1).trim()}</li>`;
    }
    // Everything else is a paragraph
    else {
      html += `<p>${trimmedLine}</p>`;
    }
  });
  
  // Close the last section and list if needed
  if (inList) {
    html += '</ul>';
  }
  if (currentSection) {
    html += `</section>`;
  }
  
  return html;
}

/**
 * Check if a line is likely to be a section header
 * 
 * @param line - Text line to check
 * @param language - Language of the text
 * @returns Boolean indicating if this is a section header
 */
function isSectionHeader(line: string, language: string): boolean {
  // Common section headers in different languages
  const sectionHeaders: Record<string, string[]> = {
    'English': [
      'summary', 'profile', 'objective', 'experience', 'work history', 'employment',
      'education', 'academic background', 'qualifications', 'skills', 'expertise',
      'competencies', 'languages', 'certifications', 'projects', 'achievements',
      'awards', 'publications', 'interests', 'hobbies', 'references', 'contact'
    ],
    'French': [
      'résumé', 'profil', 'objectif', 'expérience', 'parcours professionnel', 'emploi',
      'formation', 'éducation', 'études', 'compétences', 'expertises', 'savoir-faire',
      'langues', 'certifications', 'projets', 'réalisations', 'prix', 'publications',
      'centres d\'intérêt', 'loisirs', 'références', 'contact'
    ],
    'Spanish': [
      'resumen', 'perfil', 'objetivo', 'experiencia', 'historia laboral', 'empleo',
      'educación', 'formación', 'calificaciones', 'habilidades', 'competencias',
      'idiomas', 'certificaciones', 'proyectos', 'logros', 'premios', 'publicaciones',
      'intereses', 'aficiones', 'referencias', 'contacto'
    ]
  };
  
  // Get headers for the specified language, fallback to English
  const headers = sectionHeaders[language] || sectionHeaders['English'];
  
  // Check if line contains any of the headers
  return headers.some(header => 
    line.toLowerCase().includes(header.toLowerCase())
  );
}

/**
 * Generate generic suggestions for resume improvement
 * 
 * @param resumeText - Original resume text
 * @param language - Language of the resume
 * @returns Array of generic suggestions
 */
function generateFallbackSuggestions(resumeText: string, language: string): any[] {
  // Determine language and use appropriate suggestions
  if (language === 'French') {
    return [
      {
        type: "structure",
        text: "Améliorez la structure globale avec des titres de section clairs",
        impact: "Rend votre CV plus facile à parcourir pour les recruteurs pressés"
      },
      {
        type: "content",
        text: "Utilisez plus de verbes d'action et quantifiez vos réalisations",
        impact: "Rend vos accomplissements plus percutants et démontre des résultats mesurables"
      },
      {
        type: "skills",
        text: "Créez une section de compétences dédiée avec des mots-clés pertinents",
        impact: "Améliore la compatibilité ATS et met en valeur vos compétences essentielles"
      },
      {
        type: "language",
        text: "Développez les descriptions de vos expériences avec plus de détails",
        impact: "Donne aux employeurs une meilleure compréhension de vos capacités et réalisations"
      },
      {
        type: "formatting",
        text: "Utilisez des listes à puces pour présenter vos réalisations",
        impact: "Améliore la lisibilité et met en évidence vos contributions clés"
      }
    ];
  } else if (language === 'Spanish') {
    return [
      {
        type: "structure",
        text: "Mejore la estructura general con encabezados de sección claros",
        impact: "Hace que su currículum sea más fácil de escanear para los reclutadores ocupados"
      },
      {
        type: "content",
        text: "Utilice más verbos de acción y cuantifique sus logros",
        impact: "Hace que los logros sean más impactantes y demuestra resultados medibles"
      },
      {
        type: "skills",
        text: "Cree una sección de habilidades dedicada con palabras clave relevantes",
        impact: "Mejora la compatibilidad con ATS y muestra sus competencias principales"
      },
      {
        type: "language",
        text: "Amplíe las descripciones de sus experiencias con más detalles",
        impact: "Proporciona a los empleadores una mejor comprensión de sus capacidades y logros"
      },
      {
        type: "formatting",
        text: "Utilice viñetas para presentar sus logros",
        impact: "Mejora la legibilidad y destaca sus contribuciones clave"
      }
    ];
  } else {
    // Default to English
    return [
      {
        type: "structure",
        text: "Improve the overall structure with clear section headings",
        impact: "Makes your resume easier to scan for busy recruiters"
      },
      {
        type: "content",
        text: "Use more action verbs and quantify achievements",
        impact: "Makes accomplishments more impactful and demonstrates measurable results"
      },
      {
        type: "skills",
        text: "Create a dedicated skills section with relevant keywords",
        impact: "Improves ATS compatibility and showcases your core competencies"
      },
      {
        type: "language",
        text: "Expand descriptions of your experiences with more details",
        impact: "Gives employers a better understanding of your capabilities and achievements"
      },
      {
        type: "formatting",
        text: "Use bullet points to present your achievements",
        impact: "Improves readability and highlights your key contributions"
      }
    ];
  }
}

/**
 * Extract potential keywords from the resume text
 * 
 * @param text - Resume text to analyze
 * @param language - Language of the resume
 * @returns Array of extracted keywords
 */
function extractKeywords(text: string, language: string): string[] {
  // Common industry keywords to look for based on language
  let commonKeywords: string[] = [];
  
  // Select appropriate keywords based on language
  if (language === 'French') {
    commonKeywords = [
      // Tech/IT
      "JavaScript", "Python", "React", "Node.js", "AWS", "Cloud", "DevOps", "Docker",
      "Kubernetes", "Agile", "Scrum", "Machine Learning", "Analyse de données", "SQL",
      
      // Business/Management
      "Gestion de projet", "Leadership", "Stratégie", "Marketing", "Ventes", "Finance",
      "Service client", "Opérations", "RH", "Développement commercial",
      
      // Soft Skills
      "Communication", "Travail d'équipe", "Résolution de problèmes", "Esprit critique",
      "Gestion du temps", "Créativité", "Collaboration"
    ];
  } else if (language === 'Spanish') {
    commonKeywords = [
      // Tech/IT
      "JavaScript", "Python", "React", "Node.js", "AWS", "Cloud", "DevOps", "Docker",
      "Kubernetes", "Agile", "Scrum", "Machine Learning", "Análisis de datos", "SQL",
      
      // Business/Management
      "Gestión de proyectos", "Liderazgo", "Estrategia", "Marketing", "Ventas", "Finanzas",
      "Servicio al cliente", "Operaciones", "RRHH", "Desarrollo de negocios",
      
      // Soft Skills
      "Comunicación", "Trabajo en equipo", "Resolución de problemas", "Pensamiento crítico",
      "Gestión del tiempo", "Creatividad", "Colaboración"
    ];
  } else {
    // Default to English
    commonKeywords = [
      // Tech/IT
      "JavaScript", "Python", "React", "Node.js", "AWS", "Cloud", "DevOps", "Docker",
      "Kubernetes", "Agile", "Scrum", "Machine Learning", "Data Analysis", "SQL",
      
      // Business/Management
      "Project Management", "Leadership", "Strategy", "Marketing", "Sales", "Finance",
      "Customer Service", "Operations", "HR", "Business Development",
      
      // Soft Skills
      "Communication", "Teamwork", "Problem-solving", "Critical Thinking",
      "Time Management", "Creativity", "Collaboration"
    ];
  }
  
  // Find matches in the text
  const matches = commonKeywords.filter(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Extract capitalized words as potential technical skills
  const capitalizedKeywords = (text.match(/\b[A-Z][a-zA-Z0-9]+\b/g) || [])
    .filter(word => 
      word.length > 2 && 
      !["I", "A", "The", "An", "And", "For", "With"].includes(word)
    );
  
  // Combine, deduplicate, and limit to 10 keywords
  return [...new Set([...matches, ...capitalizedKeywords])].slice(0, 10);
}

/**
 * Calculate a simple ATS score based on resume content
 * 
 * @param text - Resume text to analyze
 * @returns Score between 0-100
 */
function calculateAtsScore(text: string): number {
  let score = 65; // Base score
  
  // Check for important sections
  if (text.match(/experience|work history/i)) score += 5;
  if (text.match(/education|degree|university/i)) score += 5;
  if (text.match(/skills|competencies/i)) score += 5;
  if (text.match(/summary|profile|objective/i)) score += 5;
  
  // Check for contact details
  if (text.match(/email|@/i)) score += 2;
  if (text.match(/phone|mobile/i)) score += 2;
  if (text.match(/linkedin|github/i)) score += 1;
  
  // Check for formatting quality
  const bulletPoints = (text.match(/•|-|\*/g) || []).length;
  score += Math.min(5, bulletPoints / 3); // Max 5 points from bullets
  
  // Check for quantifiable achievements
  const metrics = (text.match(/\d+%|\$\d+|\d+ years/g) || []).length;
  score += Math.min(5, metrics); // Max 5 points from metrics
  
  // Cap at 100
  return Math.min(100, Math.round(score));
}