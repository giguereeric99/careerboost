import { ResumeTemplateType } from './types/resumeTemplate';

// Resume template data
export const resumeTemplates: ResumeTemplateType[] = [
  {
    id: "basic",
    name: "Basic",
    isPro: false,
    previewClass: "border-l-4 border-brand-600",
    description: "Simple and clean layout suitable for most job applications"
  },
  {
    id: "professional",
    name: "Professional",
    isPro: true,
    previewClass: "border-t-4 border-teal-600",
    description: "Elegant design with modern styling for corporate positions"
  },
  {
    id: "creative",
    name: "Creative",
    isPro: true,
    previewClass: "bg-gradient-to-r from-brand-100 to-teal-100 border-none",
    description: "Unique layout for design and creative industry positions"
  },
  {
    id: "executive",
    name: "Executive",
    isPro: true,
    previewClass: "border-2 border-gray-800",
    description: "Sophisticated design for executive and leadership roles"
  },
  {
    id: "technical",
    name: "Technical",
    isPro: true,
    previewClass: "border-l-4 border-r-4 border-blue-500",
    description: "Specialized layout highlighting technical skills and projects"
  },
  {
    id: "compact",
    name: "Compact",
    isPro: true,
    previewClass: "border-b-4 border-amber-500",
    description: "Space-efficient design that fits more content on a single page"
  }
];