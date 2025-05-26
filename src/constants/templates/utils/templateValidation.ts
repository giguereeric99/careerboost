/**
 * Template Validation and Testing Utilities
 * Functions for testing template functionality and debugging
 */
import {
  ResumeTemplateType,
  TemplateContentSections,
} from "../../../types/resumeTemplateTypes";

/**
 * Test template with sample data
 * Validates that template processes content correctly
 *
 * @param template - Template to test
 * @returns Test results with validation details
 */
export function testTemplate(template: ResumeTemplateType): {
  templateId: string;
  success: boolean;
  issues: string[];
  output: string;
} {
  console.log(`Testing template: ${template.id}`);

  const issues: string[] = [];

  // Create comprehensive test data
  const testSections: TemplateContentSections = {
    "resume-header": `
      <section id="resume-header">
        <h1 class="section-title name">John Doe Test</h1>
        <p class="title">Test Developer</p>
        <p>
          <span class="phone">418-261-9999</span>
          <span class="email">test@email.com</span>
          <span class="linkedin">linkedin.com/in/test</span>
        </p>
        <p><span class="address">Test Address<br>Quebec, QC</span></p>
      </section>
    `,
    "resume-summary": `
      <h2 class="section-title">Professional Summary</h2>
      <p>Experienced developer with strong technical skills and leadership experience.</p>
    `,
    "resume-experience": `
      <h2 class="section-title">Experience</h2>
      <div class="job">
        <h3>Senior Developer - TechCorp</h3>
        <p class="period">2020 - Present</p>
        <ul>
          <li>Led development team of 5 developers</li>
          <li>Implemented microservices architecture</li>
        </ul>
      </div>
    `,
    "resume-skills": `
      <h2 class="section-title">Skills</h2>
      <ul>
        <li>JavaScript/TypeScript</li>
        <li>React/Next.js</li>
        <li>Node.js</li>
        <li>PostgreSQL</li>
      </ul>
    `,
  };

  try {
    // Test template application
    const result = template.applyTemplate?.(testSections) || "";

    // Validate output
    if (!result || result.trim().length === 0) {
      issues.push("Template produced empty output");
    }

    // Check for unprocessed placeholders
    const unreplacedPlaceholders = result.match(/\{\{[^}]+\}\}/g);
    if (unreplacedPlaceholders) {
      issues.push(
        `Unprocessed placeholders: ${unreplacedPlaceholders.join(", ")}`
      );
    }

    // Check for separator issues
    if (result.includes("|</p>") || result.includes("| </p>")) {
      issues.push("Trailing separators found");
    }

    // Check for empty spans
    if (
      result.includes('<span class="phone"></span>') ||
      result.includes('<span class="email"></span>')
    ) {
      issues.push("Empty contact spans found");
    }

    // Check for required name element
    if (
      !result.includes('class="name"') &&
      !result.includes('class="professional-name"')
    ) {
      issues.push("Missing name element");
    }

    return {
      templateId: template.id,
      success: issues.length === 0,
      issues,
      output: result.substring(0, 500) + "...", // Truncated for readability
    };
  } catch (error) {
    return {
      templateId: template.id,
      success: false,
      issues: [`Error during template processing: ${error}`],
      output: "",
    };
  }
}

/**
 * Test all templates with various contact scenarios
 * Validates separator handling across different contact combinations
 *
 * @param templates - Array of templates to test
 * @returns Array of test results for each scenario
 */
export function testAllTemplatesSeparators(
  templates: ResumeTemplateType[]
): Array<{
  templateId: string;
  scenario: string;
  hasTrailingSeparator: boolean;
  hasEmptySpans: boolean;
  output: string;
}> {
  const scenarios = [
    {
      name: "All contacts",
      header: `
        <section id="resume-header">
          <h1 class="section-title name">John Doe</h1>
          <p class="title">Developer</p>
          <p>
            <span class="phone">418-261-9999</span>
            <span class="email">john@email.com</span>
            <span class="linkedin">linkedin.com/in/john</span>
            <span class="portfolio">john.dev</span>
          </p>
        </section>
      `,
    },
    {
      name: "Phone and email only",
      header: `
        <section id="resume-header">
          <h1 class="section-title name">Jane Smith</h1>
          <p>
            <span class="phone">514-555-1234</span>
            <span class="email">jane@email.com</span>
          </p>
        </section>
      `,
    },
    {
      name: "Email only",
      header: `
        <section id="resume-header">
          <h1 class="section-title name">Bob Johnson</h1>
          <p>
            <span class="email">bob@email.com</span>
          </p>
        </section>
      `,
    },
  ];

  const results: Array<{
    templateId: string;
    scenario: string;
    hasTrailingSeparator: boolean;
    hasEmptySpans: boolean;
    output: string;
  }> = [];

  templates.forEach((template) => {
    scenarios.forEach((scenario) => {
      try {
        const testSections: TemplateContentSections = {
          "resume-header": scenario.header,
        };

        const result = template.applyTemplate?.(testSections) || "";

        const hasTrailingSeparator =
          result.includes("|</p>") ||
          result.includes("| </p>") ||
          result.match(/\|\s*$/m);

        const hasEmptySpans =
          result.includes('<span class="phone"></span>') ||
          result.includes('<span class="email"></span>') ||
          result.includes('<span class="linkedin"></span>') ||
          result.includes('<span class="portfolio"></span>');

        results.push({
          templateId: template.id,
          scenario: `${template.id} - ${scenario.name}`,
          hasTrailingSeparator: !!hasTrailingSeparator,
          hasEmptySpans,
          output: result.substring(0, 300) + "...",
        });
      } catch (error) {
        results.push({
          templateId: template.id,
          scenario: `${template.id} - ${scenario.name}`,
          hasTrailingSeparator: true,
          hasEmptySpans: true,
          output: `Error: ${error}`,
        });
      }
    });
  });

  return results;
}

/**
 * Generate comprehensive test report
 * Creates detailed analysis of all templates
 *
 * @param templates - Array of templates to analyze
 * @returns Detailed test report
 */
export function generateTemplateTestReport(templates: ResumeTemplateType[]): {
  summary: {
    totalTemplates: number;
    passedTests: number;
    failedTests: number;
    overallSuccess: boolean;
  };
  details: Array<{
    templateId: string;
    testsPassed: number;
    totalTests: number;
    issues: string[];
    recommendations: string[];
  }>;
} {
  console.log("Generating comprehensive template test report");

  const details = templates.map((template) => {
    const basicTest = testTemplate(template);
    const separatorTests = testAllTemplatesSeparators([template]);

    const issues: string[] = [...basicTest.issues];
    const recommendations: string[] = [];

    // Analyze separator test results
    const failedSeparatorTests = separatorTests.filter(
      (test) => test.hasTrailingSeparator || test.hasEmptySpans
    );

    if (failedSeparatorTests.length > 0) {
      issues.push(`${failedSeparatorTests.length} separator tests failed`);
      recommendations.push(
        "Review CSS separator handling and empty span cleanup"
      );
    }

    // Add specific recommendations based on issues
    if (issues.some((issue) => issue.includes("placeholder"))) {
      recommendations.push("Implement comprehensive placeholder replacement");
    }

    if (issues.some((issue) => issue.includes("separator"))) {
      recommendations.push(
        "Use CSS ::before for separators instead of manual separators"
      );
    }

    const totalTests = 1 + separatorTests.length; // Basic test + separator tests
    const passedTests = totalTests - issues.length;

    return {
      templateId: template.id,
      testsPassed: Math.max(0, passedTests),
      totalTests,
      issues,
      recommendations,
    };
  });

  const passedTemplates = details.filter((d) => d.issues.length === 0).length;

  return {
    summary: {
      totalTemplates: templates.length,
      passedTests: passedTemplates,
      failedTests: templates.length - passedTemplates,
      overallSuccess: passedTemplates === templates.length,
    },
    details,
  };
}

/**
 * Debug template processing step by step
 * Provides detailed debugging information for a specific template
 *
 * @param template - Template to debug
 * @param sections - Test sections to use
 * @returns Detailed debugging information
 */
export function debugTemplateProcessing(
  template: ResumeTemplateType,
  sections: TemplateContentSections
): {
  templateId: string;
  steps: Array<{
    step: string;
    input: string;
    output: string;
    issues: string[];
  }>;
  finalResult: string;
  summary: {
    success: boolean;
    totalIssues: number;
    criticalIssues: string[];
  };
} {
  console.log(`Debugging template processing for: ${template.id}`);

  const steps: Array<{
    step: string;
    input: string;
    output: string;
    issues: string[];
  }> = [];

  try {
    // Step 1: Initial template
    steps.push({
      step: "Initial Template",
      input: "Template HTML structure",
      output: (template.template || "").substring(0, 200) + "...",
      issues: template.template ? [] : ["No template HTML structure defined"],
    });

    // Step 2: Apply template function
    const result = template.applyTemplate?.(sections) || "";

    steps.push({
      step: "Template Application",
      input: `${Object.keys(sections).length} sections provided`,
      output: result.substring(0, 200) + "...",
      issues: result ? [] : ["Template application produced no output"],
    });

    // Step 3: Placeholder analysis
    const unreplacedPlaceholders = result.match(/\{\{[^}]+\}\}/g) || [];
    steps.push({
      step: "Placeholder Replacement",
      input: `Template with placeholders`,
      output: `${unreplacedPlaceholders.length} unreplaced placeholders`,
      issues:
        unreplacedPlaceholders.length > 0
          ? [`Unreplaced: ${unreplacedPlaceholders.join(", ")}`]
          : [],
    });

    // Step 4: Separator analysis
    const separatorIssues: string[] = [];
    if (result.includes("|</p>"))
      separatorIssues.push("Trailing separator before </p>");
    if (result.includes("| </p>"))
      separatorIssues.push("Trailing separator with space");
    if (result.includes("||")) separatorIssues.push("Double separators");

    steps.push({
      step: "Separator Validation",
      input: "Processed content",
      output: `${separatorIssues.length} separator issues found`,
      issues: separatorIssues,
    });

    // Collect all issues
    const allIssues = steps.flatMap((step) => step.issues);
    const criticalIssues = allIssues.filter(
      (issue) =>
        issue.includes("No template") ||
        issue.includes("no output") ||
        issue.includes("Unreplaced")
    );

    return {
      templateId: template.id,
      steps,
      finalResult: result,
      summary: {
        success: allIssues.length === 0,
        totalIssues: allIssues.length,
        criticalIssues,
      },
    };
  } catch (error) {
    return {
      templateId: template.id,
      steps: [
        {
          step: "Error",
          input: "Template processing",
          output: `Error: ${error}`,
          issues: [`Critical error during processing: ${error}`],
        },
      ],
      finalResult: "",
      summary: {
        success: false,
        totalIssues: 1,
        criticalIssues: [`Processing error: ${error}`],
      },
    };
  }
}
